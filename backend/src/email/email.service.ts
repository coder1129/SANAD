import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface QueueEmailOptions {
  to: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  templateName?: string;
  templateData?: Record<string, any>;
  priority?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly smtpTransporter: nodemailer.Transporter | null = null;
  private readonly emailFrom: string;
  private readonly providerType: 'resend' | 'smtp' | 'mock';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      'SANAD <notifications@sanad.ae>';

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const smtpHost = this.configService.get<string>('SMTP_HOST');

    if (smtpHost) {
      // 1. SMTP Provider (Gmail, SES, Sendgrid, custom SMTP)
      const smtpPort = parseInt(
        this.configService.get<string>('SMTP_PORT') || '587',
        10,
      );
      const isSecure =
        this.configService.get<string>('SMTP_SECURE') === 'true' ||
        smtpPort === 465;
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASSWORD');

      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth:
          smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      });

      this.providerType = 'smtp';
      this.logger.log(
        `SMTP email provider initialized successfully (host: ${smtpHost}, port: ${smtpPort})`,
      );
    } else if (resendApiKey && resendApiKey !== 're_placeholder') {
      // 2. Resend Provider
      this.resend = new Resend(resendApiKey);
      this.providerType = 'resend';
      this.logger.log('Resend email provider initialized successfully');
    } else {
      // 3. Mock fallback in Development
      this.providerType = 'mock';
      this.logger.warn(
        'Neither SMTP nor RESEND_API_KEY is configured. Development email delivery will be simulated without logging message bodies.',
      );
    }
  }

  // Queue an email to the DB queue for non-blocking asynchronous dispatch
  async queueEmail(options: QueueEmailOptions) {
    return this.prisma.email_queue.create({
      data: {
        recipient_email: options.to,
        recipient_name: options.recipientName || '',
        subject: options.subject,
        body_html: options.bodyHtml,
        body_text: options.bodyText || '',
        template_name: options.templateName,
        template_data: options.templateData || {},
        priority: options.priority ?? 5,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      },
    });
  }

  // Directly send email via SMTP, Resend or Mock
  async sendDirect(options: {
    to: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (this.providerType === 'smtp' && this.smtpTransporter) {
      try {
        const info = await this.smtpTransporter.sendMail({
          from: this.emailFrom,
          to: options.to,
          subject: options.subject,
          html: options.bodyHtml,
          text: options.bodyText,
        });

        return { success: true, id: info.messageId };
      } catch (err: any) {
        this.logger.error(`SMTP send failed: ${err.message}`, err.stack);
        return { success: false, error: err.message };
      }
    } else if (this.providerType === 'resend' && this.resend) {
      try {
        const data = await this.resend.emails.send({
          from: this.emailFrom,
          to: [options.to],
          subject: options.subject,
          html: options.bodyHtml,
          text: options.bodyText,
        });

        return { success: true, id: data.data?.id };
      } catch (err: any) {
        this.logger.error(`Resend send failed: ${err.message}`, err.stack);
        return { success: false, error: err.message };
      }
    } else {
      // Mock delivery for dev/testing
      this.logger.log(
        `[MOCK EMAIL SENT] To: ${options.to} | Subject: ${options.subject}`,
      );
      return { success: true, id: `mock_email_${Date.now()}` };
    }
  }

  // Standard email builders
  async sendWelcomeEmail(email: string, name: string) {
    const safeName = this.escapeHtml(name);
    const subject = 'مرحباً بك في منصة سند | Welcome to SANAD';
    const bodyHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>مرحباً بك يا ${safeName} في منصة سند</h2>
        <p>يسعدنا انضمامك إلى منصة سند لتطوير مسارك المهني والارتقاء بسيرتك الذاتية وتجهيزك للفرص الوظيفية الأفضل.</p>
        <p>يمكنك تصفح باقاتنا وخدماتنا المهنية الآن من خلال لوحة التحكم الخاصة بك.</p>
        <br/>
        <p>فريق سند للخدمات المهنية</p>
      </div>
    `;

    return this.queueEmail({
      to: email,
      recipientName: name,
      subject,
      bodyHtml,
      templateName: 'welcome',
      templateData: { name },
    });
  }

  async sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
    const safeName = this.escapeHtml(name);
    const safeResetUrl = this.escapeHtml(resetUrl);
    const subject = 'إعادة تعيين كلمة المرور - منصة سند';
    const bodyHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>طلب إعادة تعيين كلمة المرور</h2>
        <p>مرحباً ${safeName}،</p>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في منصة سند. اضغط على الرابط أدناه لتعيين كلمة مرور جديدة:</p>
        <p><a href="${safeResetUrl}" style="display:inline-block; padding:10px 20px; background-color:#1e3a8a; color:#fff; text-decoration:none; border-radius:5px;">إعادة تعيين كلمة المرور</a></p>
        <p>الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب ذلك بنفسك، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
    `;

    return this.queueEmail({
      to: email,
      recipientName: name,
      subject,
      bodyHtml,
      templateName: 'password_reset',
      templateData: { name, resetUrl },
      priority: 1,
    });
  }

  async sendOtpEmail(email: string, otp: string) {
    const safeOtp = this.escapeHtml(otp);
    const subject = 'Your SANAD verification code';
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Your SANAD verification code</h2>
        <p style="font-size: 15px; line-height: 1.6; margin: 16px 0;">Your verification code is:</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center;">
          <span style="font-family: monospace, Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">${safeOtp}</span>
        </div>
        <p style="font-size: 14px; color: #475569; margin: 16px 0;">This code expires in 10 minutes.</p>
        <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0 0;">If you did not request this code, you can ignore this email.</p>
      </div>
    `;
    const bodyText = `Your verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can ignore this email.`;

    await this.queueEmail({
      to: email,
      subject,
      bodyHtml,
      bodyText,
      templateName: 'otp_verification',
      templateData: { otp },
      priority: 1,
    });

    await this.sendDirect({ to: email, subject, bodyHtml, bodyText });
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character] || character,
    );
  }
}
