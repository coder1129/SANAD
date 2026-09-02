import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as Sentry from '@sentry/node';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { email_queue } from '@prisma/client';

@Injectable()
export class EmailWorker {
  private readonly logger = new Logger(EmailWorker.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * A row that reached max_attempts is terminal: nothing retries it and nobody
   * reads the table. Password resets and email verification live in this queue,
   * so a silent dead letter is a customer locked out of their account. Raise it
   * where the on-call rotation actually looks.
   */
  private reportDeadLetter(email: email_queue, reason: string) {
    this.logger.error(
      `Email #${email.id} dead-lettered after ${email.attempts} attempt(s): ${reason}`,
    );
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('email.dead_letter', 'true');
      scope.setTag('email.template', email.template_name || 'unknown');
      scope.setContext('email', {
        id: email.id,
        template: email.template_name,
        attempts: email.attempts,
        maxAttempts: email.max_attempts,
        reason,
      });
      Sentry.captureMessage(
        `Email delivery permanently failed: ${email.template_name || 'unknown template'}`,
      );
    });
  }

  @Interval(10000) // Poll queue every 10 seconds
  async processEmailQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      await this.prisma.email_queue.updateMany({
        where: {
          status: 'processing',
          updated_at: { lt: new Date(now.getTime() - 10 * 60_000) },
        },
        data: {
          status: 'pending',
          scheduled_at: now,
          error_message: 'Recovered after an interrupted worker attempt',
        },
      });

      // Claim rows atomically. SKIP LOCKED prevents duplicate sends across app instances.
      const pendingEmails = await this.prisma.$queryRaw<email_queue[]>`
        UPDATE email_queue
        SET status = 'processing',
            attempts = COALESCE(attempts, 0) + 1,
            updated_at = NOW()
        WHERE id IN (
          SELECT id
          FROM email_queue
          WHERE status = 'pending'
            AND scheduled_at <= NOW()
          ORDER BY priority ASC, created_at ASC
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `;

      if (pendingEmails.length === 0) {
        this.isRunning = false;
        return;
      }

      this.logger.log(
        `Processing ${pendingEmails.length} pending email(s) from email_queue...`,
      );

      for (const email of pendingEmails) {
        try {
          const result = await this.emailService.sendDirect({
            to: email.recipient_email,
            subject: email.subject,
            bodyHtml: email.body_html,
            bodyText: email.body_text || undefined,
          });

          if (result.success) {
            await this.prisma.email_queue.update({
              where: { id: email.id },
              data: {
                status: 'sent',
                sent_at: new Date(),
                error_message: null,
              },
            });
            this.logger.log(
              `Email #${email.id} sent successfully to ${email.recipient_email}`,
            );
          } else {
            const currentAttempts = email.attempts || 1;
            const maxAttempts = email.max_attempts || 3;
            const isFinalFail = currentAttempts >= maxAttempts;

            await this.prisma.email_queue.update({
              where: { id: email.id },
              data: {
                status: isFinalFail ? 'failed' : 'pending',
                error_message: result.error || 'Failed to dispatch email',
                scheduled_at: isFinalFail
                  ? undefined
                  : new Date(Date.now() + 60_000 * 2 ** (currentAttempts - 1)),
              },
            });

            if (isFinalFail) {
              this.reportDeadLetter(
                email,
                result.error || 'Failed to dispatch email',
              );
            } else {
              this.logger.warn(
                `Email #${email.id} failed (attempt ${currentAttempts}/${maxAttempts}): ${result.error}`,
              );
            }
          }
        } catch (err: any) {
          const currentAttempts = email.attempts || 1;
          const maxAttempts = email.max_attempts || 3;
          const isFinalFail = currentAttempts >= maxAttempts;

          await this.prisma.email_queue.update({
            where: { id: email.id },
            data: {
              status: isFinalFail ? 'failed' : 'pending',
              error_message: err.message,
              scheduled_at: isFinalFail
                ? undefined
                : new Date(Date.now() + 60_000 * 2 ** (currentAttempts - 1)),
            },
          });

          if (isFinalFail) {
            this.reportDeadLetter(email, err.message);
          } else {
            this.logger.error(
              `Exception sending email #${email.id}: ${err.message}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in EmailWorker: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
