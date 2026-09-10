import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import {
  ConfirmManualPaymentDto,
  CreatePaymentDto,
  PaymentFilterDto,
  PaymentWebhookDto,
} from './dto';
import { createPaginatedResponse } from '../common/utils';
import { ConfigService } from '@nestjs/config';
import {
  createPaymentBypassResponse,
  createPaymentBypassTransactionId,
  PAYMENT_BYPASS_PROVIDER,
  PAYMENT_BYPASS_TRANSACTION_PREFIX,
} from './payment-bypass';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: MockPaymentProvider,
    private readonly configService: ConfigService,
  ) {}

  // Customer initiates payment for an order
  async createPayment(userId: number, dto: CreatePaymentDto) {
    if (this.configService.get<string>('PAYMENT_PROVIDER') === 'manual') {
      throw new BadRequestException({
        message:
          'Online checkout is disabled. Continue with the SANAD team on WhatsApp to arrange payment.',
        code: 'MANUAL_PAYMENT_ONLY',
      });
    }

    const paymentBypassed =
      this.configService.get<string>('PAYMENT_PROVIDER') ===
      PAYMENT_BYPASS_PROVIDER;

    if (dto.return_url) {
      const allowedOrigin = new URL(
        this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      ).origin;
      let returnOrigin: string;
      try {
        returnOrigin = new URL(dto.return_url).origin;
      } catch {
        throw new BadRequestException('Invalid payment return URL');
      }
      if (returnOrigin !== allowedOrigin) {
        throw new BadRequestException('Payment return URL is not allowed');
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${dto.order_id} FOR UPDATE`;
        const order = await tx.orders.findUnique({
          where: { id: dto.order_id },
          include: { package: true },
        });

        if (!order) {
          throw new NotFoundException({
            message: 'Order not found',
            code: 'ORDER_NOT_FOUND',
          });
        }
        if (order.user_id !== userId) {
          throw new ForbiddenException({
            message: 'You do not have access to this order',
            code: 'ORDER_FORBIDDEN',
          });
        }
        if (
          paymentBypassed &&
          (order.status === 'paid' || order.status === 'completed')
        ) {
          const existingBypass = await tx.payments.findFirst({
            where: {
              order_id: order.id,
              transaction_id: {
                startsWith: PAYMENT_BYPASS_TRANSACTION_PREFIX,
              },
            },
            orderBy: { created_at: 'desc' },
          });
          if (existingBypass) {
            return this.formatBypassResult(
              existingBypass,
              Number(order.final_amount),
              true,
            );
          }
        }
        if (order.status === 'paid' || order.status === 'completed') {
          throw new BadRequestException({
            message: 'This order has already been paid for',
            code: 'ORDER_ALREADY_PAID',
          });
        }
        if (order.status === 'cancelled' || order.status === 'refunded') {
          throw new BadRequestException({
            message: `Cannot pay for an order in status: ${order.status}`,
            code: 'ORDER_INVALID_STATUS',
          });
        }

        if (paymentBypassed) {
          if (!['pending', 'pending_payment'].includes(order.status)) {
            throw new BadRequestException({
              message: `Cannot bypass payment for an order in status: ${order.status}`,
              code: 'ORDER_INVALID_STATUS',
            });
          }

          const now = new Date();
          // Invalidate sessions created before bypass mode was enabled so a
          // late webhook cannot create a second financial event.
          await tx.payments.updateMany({
            where: { order_id: order.id, status: 'pending' },
            data: { status: 'failed', payment_date: now },
          });

          const transactionId = createPaymentBypassTransactionId();
          const payment = await tx.payments.create({
            data: {
              order_id: order.id,
              transaction_id: transactionId,
              payment_method: 'other',
              amount: 0,
              currency: 'AED',
              status: 'paid',
              payment_date: now,
              payment_response: createPaymentBypassResponse(
                Number(order.final_amount),
              ),
            },
          });

          const updatedOrder = await tx.orders.updateMany({
            where: {
              id: order.id,
              status: { in: ['pending', 'pending_payment'] },
            },
            data: { status: 'paid' },
          });
          if (updatedOrder.count !== 1) {
            throw new BadRequestException({
              message: 'Order status changed and cannot bypass payment',
              code: 'ORDER_STATUS_CONFLICT',
            });
          }

          await tx.order_status_history.create({
            data: {
              order_id: order.id,
              from_status: order.status,
              to_status: 'paid',
              changed_by: userId,
              note: `Payment temporarily bypassed (${transactionId})`,
            },
          });
          await tx.notifications.create({
            data: {
              user_id: userId,
              order_id: order.id,
              title_ar: 'تم تأكيد طلبك بنجاح',
              title_en: 'Order Confirmed Successfully',
              message_ar: `تم تأكيد طلبك رقم ${order.order_number} وسيبدأ فريق سند العمل عليه قريبًا.`,
              message_en: `Your order #${order.order_number} is confirmed and the SANAD team will begin work soon.`,
              notification_type: 'order_confirmed',
            },
          });
          await tx.email_queue.create({
            data: {
              recipient_email: order.customer_email,
              recipient_name: order.customer_name,
              subject: `تأكيد الطلب رقم ${order.order_number}`,
              body_html: `<p>تم تأكيد طلبك رقم <strong>${order.order_number}</strong> وسيبدأ فريق سند العمل عليه قريبًا.</p>`,
              body_text: `تم تأكيد طلبك رقم ${order.order_number} وسيبدأ فريق سند العمل عليه قريبًا.`,
              template_name: 'order_payment_bypassed',
              template_data: {
                order_number: order.order_number,
                order_amount: Number(order.final_amount),
                charged_amount: 0,
                currency: 'AED',
              },
              status: 'pending',
            },
          });

          this.logger.warn(
            `Payment bypass applied to order ${order.order_number}; charged amount is 0 AED`,
          );
          return this.formatBypassResult(
            payment,
            Number(order.final_amount),
            false,
          );
        }

        const pending = await tx.payments.findFirst({
          where: { order_id: order.id, status: 'pending' },
          orderBy: { created_at: 'desc' },
        });
        if (pending) {
          const response = pending.payment_response as Record<string, unknown>;
          return {
            payment_id: pending.id,
            transaction_id: pending.transaction_id,
            payment_url: response?.paymentUrl,
            amount: Number(pending.amount),
            currency: pending.currency,
            status: pending.status,
            reused: true,
          };
        }

        const intent = await this.paymentProvider.createPaymentIntent({
          orderId: order.id,
          orderNumber: order.order_number,
          amount: Number(order.final_amount),
          currency: 'AED',
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          returnUrl: dto.return_url,
        });
        const payment = await tx.payments.create({
          data: {
            order_id: order.id,
            transaction_id: intent.transactionId,
            payment_method: dto.payment_method || 'card',
            amount: order.final_amount,
            currency: intent.currency,
            status: 'pending',
            payment_response: { ...intent },
          },
        });
        if (order.status === 'pending') {
          await tx.orders.update({
            where: { id: order.id },
            data: { status: 'pending_payment' },
          });
        }

        return {
          payment_id: payment.id,
          transaction_id: intent.transactionId,
          payment_url: intent.paymentUrl,
          amount: intent.amount,
          currency: intent.currency,
          status: 'pending',
        };
      },
      { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 15_000 },
    );
  }

  // Admin confirms money collected outside the website (payment link, QR,
  // bank transfer, cash, or another reconciled channel).
  async confirmManualPayment(adminId: number, dto: ConfirmManualPaymentDto) {
    const paymentDate = dto.payment_date
      ? new Date(dto.payment_date)
      : new Date();
    if (paymentDate.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException({
        message: 'Payment date cannot be in the future',
        code: 'PAYMENT_DATE_IN_FUTURE',
      });
    }

    const payment = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${dto.order_id} FOR UPDATE`;
        const order = await tx.orders.findUnique({
          where: { id: dto.order_id },
        });

        if (!order) {
          throw new NotFoundException({
            message: 'Order not found',
            code: 'ORDER_NOT_FOUND',
          });
        }
        if (!['pending', 'pending_payment'].includes(order.status)) {
          throw new BadRequestException({
            message: `Cannot confirm payment for an order in status: ${order.status}`,
            code: 'ORDER_INVALID_STATUS',
          });
        }

        const existingCollectedPayment = await tx.payments.findFirst({
          where: {
            order_id: order.id,
            status: { in: ['paid', 'success'] },
            amount: { gt: 0 },
          },
        });
        if (existingCollectedPayment) {
          throw new ConflictException({
            message: 'A collected payment is already recorded for this order',
            code: 'PAYMENT_ALREADY_CONFIRMED',
          });
        }

        const receivedMinorUnits = Math.round(dto.amount * 100);
        const expectedMinorUnits = Math.round(Number(order.final_amount) * 100);
        if (receivedMinorUnits !== expectedMinorUnits) {
          throw new BadRequestException({
            message: `Payment amount must exactly match the order total (${Number(order.final_amount).toFixed(2)} AED)`,
            code: 'PAYMENT_AMOUNT_MISMATCH',
          });
        }

        // A manual confirmation supersedes any online session that might have
        // been created before the checkout mode changed.
        await tx.payments.updateMany({
          where: { order_id: order.id, status: 'pending' },
          data: { status: 'failed', payment_date: paymentDate },
        });

        const transactionId = `manual_${crypto.randomUUID()}`;
        const created = await tx.payments.create({
          data: {
            order_id: order.id,
            transaction_id: transactionId,
            payment_method: dto.payment_method,
            amount: dto.amount,
            currency: 'AED',
            status: 'paid',
            payment_date: paymentDate,
            payment_response: {
              source: 'manual_admin_confirmation',
              confirmed_by: adminId,
              ...(dto.transaction_reference?.trim()
                ? { external_reference: dto.transaction_reference.trim() }
                : {}),
              ...(dto.note?.trim() ? { note: dto.note.trim() } : {}),
            },
          },
        });

        const updatedOrder = await tx.orders.updateMany({
          where: {
            id: order.id,
            status: { in: ['pending', 'pending_payment'] },
          },
          data: { status: 'paid' },
        });
        if (updatedOrder.count !== 1) {
          throw new ConflictException({
            message: 'Order status changed; reload before confirming payment',
            code: 'ORDER_STATUS_CONFLICT',
          });
        }

        await tx.order_status_history.create({
          data: {
            order_id: order.id,
            from_status: order.status,
            to_status: 'paid',
            changed_by: adminId,
            note: `External payment confirmed by admin (${transactionId})`,
          },
        });
        await tx.admin_activity_log.create({
          data: {
            admin_id: adminId,
            action: 'confirm_manual_payment',
            table_name: 'payments',
            record_id: created.id,
            description: `Confirmed ${dto.amount.toFixed(2)} AED for order #${order.order_number}`,
            changes: {
              order_id: order.id,
              payment_method: dto.payment_method,
              amount: dto.amount,
              transaction_reference: dto.transaction_reference?.trim() || null,
              payment_date: paymentDate.toISOString(),
            },
          },
        });

        if (order.user_id) {
          await tx.notifications.create({
            data: {
              user_id: order.user_id,
              order_id: order.id,
              title_ar: 'تم تأكيد استلام الدفع',
              title_en: 'Payment received',
              message_ar: `تم تأكيد استلام مبلغ ${dto.amount.toFixed(2)} AED للطلب رقم ${order.order_number}.`,
              message_en: `We confirmed receipt of ${dto.amount.toFixed(2)} AED for order #${order.order_number}.`,
              notification_type: 'payment_confirmed',
            },
          });
          await tx.email_queue.create({
            data: {
              recipient_email: order.customer_email,
              recipient_name: order.customer_name,
              subject: `Payment received for order ${order.order_number}`,
              body_html: `<p>We confirmed receipt of <strong>${dto.amount.toFixed(2)} AED</strong> for order <strong>${order.order_number}</strong>.</p>`,
              body_text: `We confirmed receipt of ${dto.amount.toFixed(2)} AED for order ${order.order_number}.`,
              template_name: 'manual_payment_confirmation',
              template_data: {
                order_number: order.order_number,
                amount: dto.amount,
                currency: 'AED',
                payment_method: dto.payment_method,
              },
              status: 'pending',
            },
          });
        }

        return created;
      },
      { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 15_000 },
    );

    this.logger.log(
      `Manual payment ${payment.transaction_id} confirmed for order ${dto.order_id} by admin ${adminId}`,
    );
    return payment;
  }

  // Customer or Admin gets payment status
  async getPayment(
    paymentId: number,
    userId: number,
    isAdmin: boolean = false,
  ) {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            user_id: true,
            status: true,
            customer_name: true,
            customer_email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({
        message: 'Payment record not found',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    if (!isAdmin && payment.order.user_id !== userId) {
      throw new ForbiddenException({
        message: 'Access denied to this payment record',
        code: 'PAYMENT_FORBIDDEN',
      });
    }

    if (!isAdmin) {
      const { payment_response: _privateReconciliation, ...customerPayment } =
        payment;
      return customerPayment;
    }

    return payment;
  }

  // Process a verified gateway callback idempotently.
  async handleWebhook(
    payload: PaymentWebhookDto,
    signature: string,
    rawBody: Buffer,
  ) {
    this.logger.log(
      `Processing payment webhook for transaction ${payload.transaction_id}`,
    );

    const verified = await this.paymentProvider.verifyWebhook(
      payload,
      signature,
      rawBody,
    );
    const { transactionId, orderId, status, amount, currency } = verified;

    const existingPayment = await this.prisma.payments.findUnique({
      where: { transaction_id: transactionId },
    });
    if (!existingPayment) {
      throw new BadRequestException({
        message: 'Unknown payment transaction',
        code: 'UNKNOWN_PAYMENT_TRANSACTION',
      });
    }
    if (existingPayment.order_id !== orderId) {
      throw new BadRequestException({
        message: 'Transaction does not belong to the supplied order',
        code: 'PAYMENT_ORDER_MISMATCH',
      });
    }

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    const amountInMinorUnits = Math.round(amount * 100);
    const expectedOrderAmount = Math.round(Number(order.final_amount) * 100);
    const expectedPaymentAmount = Math.round(
      Number(existingPayment.amount) * 100,
    );
    if (
      !Number.isFinite(amount) ||
      amountInMinorUnits !== expectedOrderAmount ||
      amountInMinorUnits !== expectedPaymentAmount
    ) {
      throw new BadRequestException({
        message: 'Payment amount does not match order amount',
        code: 'PAYMENT_AMOUNT_MISMATCH',
      });
    }

    const normalizedCurrency = currency.toUpperCase();
    const expectedCurrency = (existingPayment.currency || 'AED').toUpperCase();
    if (normalizedCurrency !== expectedCurrency) {
      throw new BadRequestException({
        message: 'Payment currency does not match payment intent',
        code: 'PAYMENT_CURRENCY_MISMATCH',
      });
    }

    if (existingPayment.status === 'paid') {
      return {
        received: true,
        idempotent: true,
        message: 'Payment already processed and verified',
      };
    }
    if (existingPayment.status !== 'pending') {
      return {
        received: true,
        idempotent: true,
        ignored: true,
        message: `Payment is already in terminal status: ${existingPayment.status}`,
      };
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payments.updateMany({
        where: { id: existingPayment.id, status: { not: 'paid' } },
        data: {
          status: status === 'paid' ? 'paid' : 'failed',
          payment_date: new Date(),
          payment_response: {
            transaction_id: payload.transaction_id,
            order_id: payload.order_id,
            status: payload.status,
            amount: payload.amount,
            currency: payload.currency || 'AED',
          },
        },
      });

      if (updatedPayment.count === 0) return { idempotent: true };

      if (status === 'paid') {
        if (['cancelled', 'refunded'].includes(order.status)) {
          throw new BadRequestException({
            message: `Cannot pay an order in status ${order.status}`,
            code: 'ORDER_INVALID_STATUS',
          });
        }

        const updatedOrder = await tx.orders.updateMany({
          where: {
            id: orderId,
            status: { notIn: ['cancelled', 'refunded'] },
          },
          data: { status: 'paid' },
        });
        if (updatedOrder.count !== 1) {
          throw new BadRequestException({
            message: 'Order status changed and cannot accept payment',
            code: 'ORDER_STATUS_CONFLICT',
          });
        }
        await tx.order_status_history.create({
          data: {
            order_id: orderId,
            from_status: order.status,
            to_status: 'paid',
            changed_by: order.user_id,
            note: `Payment confirmed via webhook (${transactionId})`,
          },
        });

        if (order.user_id) {
          await tx.notifications.create({
            data: {
              user_id: order.user_id,
              order_id: orderId,
              title_ar: 'تم تأكيد الدفع بنجاح',
              title_en: 'Payment Confirmed Successfully',
              message_ar: `تم استلام دفعتك بنجاح لطلبك رقم ${order.order_number}. فريق سند سيبدأ العمل على طلبك قريباً.`,
              message_en: `Your payment of ${amount} ${normalizedCurrency} for order #${order.order_number} has been confirmed.`,
              notification_type: 'payment_confirmed',
            },
          });
          await tx.email_queue.create({
            data: {
              recipient_email: order.customer_email,
              recipient_name: order.customer_name,
              subject: `تأكيد استلام الدفع - طلب رقم ${order.order_number}`,
              body_html: `<p>تم تأكيد دفع طلب رقم <strong>${order.order_number}</strong> بمبلغ ${amount} ${normalizedCurrency}.</p>`,
              body_text: `تم تأكيد دفع طلب رقم ${order.order_number} بمبلغ ${amount} ${normalizedCurrency}.`,
              template_name: 'payment_confirmation',
              template_data: {
                order_number: order.order_number,
                amount,
                currency: normalizedCurrency,
              },
              status: 'pending',
            },
          });
        }
      }

      return { idempotent: false };
    });

    if (outcome.idempotent) {
      return {
        received: true,
        idempotent: true,
        message: 'Payment already processed and verified',
      };
    }

    return {
      received: true,
      processed: true,
      transaction_id: transactionId,
      status,
    };
  }

  // --- Admin Queries ---

  async findAllAdmin(query: PaymentFilterDto) {
    const where: Record<string, any> = {};

    if (query.status) where.status = query.status;
    if (query.order_id) where.order_id = query.order_id;
    if (query.transaction_id) {
      where.transaction_id = {
        contains: query.transaction_id,
        mode: 'insensitive',
      };
    }
    if (query.search) {
      where.OR = [
        { transaction_id: { contains: query.search, mode: 'insensitive' } },
        {
          order: {
            order_number: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          order: {
            customer_name: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          order: {
            customer_email: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payments.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              order_number: true,
              customer_name: true,
              customer_email: true,
              status: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.payments.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const payment = await this.prisma.payments.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            package: { select: { id: true, name_ar: true, name_en: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment record not found');
    return payment;
  }

  private formatBypassResult(
    payment: {
      id: number;
      transaction_id: string;
      currency: string | null;
    },
    orderAmount: number,
    reused: boolean,
  ) {
    return {
      payment_id: payment.id,
      transaction_id: payment.transaction_id,
      payment_url: null,
      amount: orderAmount,
      charged_amount: 0,
      currency: payment.currency || 'AED',
      status: 'paid',
      bypassed: true,
      requires_payment: false,
      reused,
    };
  }
}
