import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutService } from '../checkout/checkout.service';
import {
  CreateOrderDto,
  OrderFilterDto,
  UpdateOrderStatusDto,
  UpdateOrderAdminDto,
} from './dto';
import { createPaginatedResponse } from '../common/utils';
import { OrderStatus } from '../common/enums';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  createPaymentBypassResponse,
  createPaymentBypassTransactionId,
  PAYMENT_BYPASS_PROVIDER,
} from '../payments/payment-bypass';

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [
    OrderStatus.RECEIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.AWAITING_INFORMATION]: [
    OrderStatus.RECEIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.RECEIVED]: [
    OrderStatus.AWAITING_INFORMATION,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.IN_PROGRESS]: [
    OrderStatus.AWAITING_INFORMATION,
    OrderStatus.UNDER_REVIEW,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.UNDER_REVIEW]: [
    OrderStatus.IN_PROGRESS,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.READY]: [
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

const COMPLETABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.AWAITING_INFORMATION,
  OrderStatus.RECEIVED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.UNDER_REVIEW,
  OrderStatus.READY,
];

const REUSABLE_CAREER_PROFILE_FIELDS = [
  'target_job_title',
  'target_industry',
  'years_of_experience',
  'education',
  'key_skills',
  'linkedin_url',
  'portfolio_url',
  'target_country',
  'career_goals',
] as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
    private readonly configService: ConfigService,
  ) {}

  // Collision-resistant human-readable order number without count-based races.
  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `SANAD-${year}-${timestamp}-${random}`;
  }

  // Customer creates order
  async create(userId: number, dto: CreateOrderDto) {
    // 1. Fetch User details
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        message: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.account_locked) {
      throw new ForbiddenException({
        message: 'Account is locked. Please contact customer support.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    const customerName = dto.customer_name?.trim() || user.name;
    const customerEmail = dto.customer_email?.trim() || user.email;
    const customerPhone = dto.customer_phone?.trim() || user.phone || '';
    const paymentProvider =
      this.configService.get<string>('PAYMENT_PROVIDER') || 'mock';
    const paymentBypassed = paymentProvider === PAYMENT_BYPASS_PROVIDER;
    const paymentHandledManually = paymentProvider === 'manual';

    const order = await this.prisma.$transaction(
      async (tx) => {
        // Pricing and coupon reservation run inside the same transaction. A coupon
        // row lock prevents concurrent requests from exceeding its limits.
        const pricing = await this.checkoutService.calculatePricing(
          {
            package_id: dto.package_id,
            offer_id: dto.offer_id,
            secondary_package_id: dto.secondary_package_id,
            coupon_code: dto.coupon_code,
          },
          userId,
          tx,
          true,
        );
        const deliveryDate = new Date();
        deliveryDate.setDate(
          deliveryDate.getDate() + (pricing.delivery_days || 7),
        );
        const orderNumber = this.generateOrderNumber();
        const initialStatus = paymentBypassed
          ? OrderStatus.PAID
          : paymentHandledManually
            ? OrderStatus.PENDING_PAYMENT
            : OrderStatus.PENDING;

        const newOrder = await tx.orders.create({
          data: {
            order_number: orderNumber,
            user_id: user.id,
            package_id: pricing.package_id,
            secondary_package_id: pricing.secondary_package_id,
            offer_id: pricing.offer_id,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            status: initialStatus,
            original_amount: pricing.original_price,
            discount_amount:
              pricing.offer_discount_amount + pricing.coupon_discount_amount,
            secondary_original_amount: pricing.secondary_original_price || null,
            secondary_discount_amount: pricing.secondary_discount_amount,
            vat_amount: 0,
            total_amount: pricing.total_amount,
            final_amount: pricing.final_amount,
            coupon_code: pricing.coupon_code,
            delivery_date: deliveryDate,
            notes: dto.notes,
            requirements: dto.requirements ? { ...dto.requirements } : {},
          },
        });

        if (dto.requirements) {
          const existingCareerProfile =
            user.career_profile &&
            typeof user.career_profile === 'object' &&
            !Array.isArray(user.career_profile)
              ? user.career_profile
              : {};
          const reusableCareerProfile = Object.fromEntries(
            REUSABLE_CAREER_PROFILE_FIELDS.flatMap((field) => {
              const value = dto.requirements?.[field];
              return typeof value === 'string' && value.trim()
                ? [[field, value.trim()]]
                : [];
            }),
          );
          if (Object.keys(reusableCareerProfile).length > 0) {
            await tx.users.update({
              where: { id: user.id },
              data: {
                career_profile: {
                  ...existingCareerProfile,
                  ...reusableCareerProfile,
                },
              },
            });
          }
        }

        if (pricing.coupon_code && pricing.coupon_discount_amount > 0) {
          const coupon = await tx.coupons.findUnique({
            where: { code: pricing.coupon_code },
          });
          if (!coupon) {
            throw new BadRequestException({
              message: 'Coupon became unavailable',
              code: 'COUPON_NOT_FOUND',
            });
          }
          await tx.coupon_usage.create({
            data: {
              coupon_id: coupon.id,
              user_id: user.id,
              order_id: newOrder.id,
              discount_amount: pricing.coupon_discount_amount,
            },
          });

          await tx.coupons.update({
            where: { id: coupon.id },
            data: { times_used: { increment: 1 } },
          });
        }

        if (paymentBypassed) {
          await tx.payments.create({
            data: {
              order_id: newOrder.id,
              transaction_id: createPaymentBypassTransactionId(),
              payment_method: 'other',
              // Store what was actually collected; the catalog amount remains
              // on the order and in payment_response for audit purposes.
              amount: 0,
              currency: 'AED',
              status: 'paid',
              payment_date: new Date(),
              payment_response: createPaymentBypassResponse(
                pricing.final_amount,
              ),
            },
          });
        }

        await tx.order_status_history.create({
          data: {
            order_id: newOrder.id,
            from_status: null,
            to_status: initialStatus,
            changed_by: user.id,
            note: paymentBypassed
              ? 'Order created with temporary payment bypass'
              : paymentHandledManually
                ? 'Order created; external payment arrangement pending'
                : 'Order created by customer',
          },
        });

        await tx.notifications.create({
          data: {
            user_id: user.id,
            order_id: newOrder.id,
            title_ar: paymentBypassed
              ? 'تم تأكيد طلبك بنجاح'
              : 'تم استلام طلبك بنجاح',
            title_en: paymentBypassed
              ? 'Order Confirmed Successfully'
              : paymentHandledManually
                ? 'Order Request Received'
                : 'Order Placed Successfully',
            message_ar: paymentBypassed
              ? `تم تأكيد طلبك رقم ${orderNumber} وسيبدأ فريق سند العمل عليه قريبًا.`
              : `تم استلام طلبك رقم ${orderNumber} بنجاح وهو بانتظار إتمام الدفع.`,
            message_en: paymentBypassed
              ? `Your order #${orderNumber} is confirmed and the SANAD team will begin work soon.`
              : paymentHandledManually
                ? `Your order #${orderNumber} has been received. Continue on WhatsApp to arrange payment and share your requirements.`
                : `Your order #${orderNumber} has been received and is awaiting payment.`,
            notification_type: 'order_created',
          },
        });

        return newOrder;
      },
      { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 15_000 },
    );

    return this.findOneCustomer(order.id, userId);
  }

  // Customer lists their orders
  async findAllCustomer(userId: number, query: OrderFilterDto) {
    const where: Record<string, any> = { user_id: userId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        include: {
          package: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              delivery_days: true,
              package_images: { where: { is_primary: true }, take: 1 },
            },
          },
          secondary_package: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              delivery_days: true,
              package_images: { where: { is_primary: true }, take: 1 },
            },
          },
          offers: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              discount_percentage: true,
            },
          },
          payments: {
            select: {
              id: true,
              transaction_id: true,
              payment_method: true,
              amount: true,
              status: true,
              payment_date: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.orders.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  // Customer gets single order details
  async findOneCustomer(id: number, userId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        package: {
          include: {
            package_images: true,
          },
        },
        secondary_package: {
          include: {
            package_images: true,
          },
        },
        offers: true,
        payments: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            transaction_id: true,
            payment_method: true,
            amount: true,
            currency: true,
            status: true,
            payment_date: true,
            created_at: true,
          },
        },
        order_status_history: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            from_status: true,
            to_status: true,
            note: true,
            created_at: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException({
        message: 'Access denied to this order',
        code: 'ORDER_FORBIDDEN',
      });
    }

    return order;
  }

  async findByNumberCustomer(orderNumber: string, userId: number) {
    const normalized = orderNumber.trim().toUpperCase();
    const order = await this.prisma.orders.findUnique({
      where: { order_number: normalized },
      include: {
        package: { include: { package_images: true } },
        secondary_package: { include: { package_images: true } },
        offers: true,
        payments: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            transaction_id: true,
            payment_method: true,
            amount: true,
            currency: true,
            status: true,
            payment_date: true,
            created_at: true,
          },
        },
        order_status_history: { orderBy: { created_at: 'asc' } },
        package_review: true,
      },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
    }
    if (order.user_id !== userId) {
      throw new ForbiddenException({
        message: 'Access denied to this order',
        code: 'ORDER_FORBIDDEN',
      });
    }
    return order;
  }

  // Customer cancels their pending order
  async cancelCustomer(id: number, userId: number) {
    const order = await this.findOneCustomer(id, userId);

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException({
        message: `Order in status "${order.status}" cannot be cancelled`,
        code: 'ORDER_CANNOT_BE_CANCELLED',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orders.updateMany({
        where: {
          id,
          user_id: userId,
          status: { in: [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT] },
        },
        data: { status: OrderStatus.CANCELLED },
      });
      if (updated.count !== 1) {
        throw new BadRequestException({
          message: 'Order status changed and can no longer be cancelled',
          code: 'ORDER_CANNOT_BE_CANCELLED',
        });
      }

      const usages = await tx.coupon_usage.findMany({
        where: { order_id: id },
        select: { coupon_id: true },
      });
      if (usages.length > 0) {
        await tx.coupon_usage.deleteMany({ where: { order_id: id } });
        for (const usage of usages) {
          await tx.coupons.updateMany({
            where: { id: usage.coupon_id, times_used: { gt: 0 } },
            data: { times_used: { decrement: 1 } },
          });
        }
      }

      await tx.order_status_history.create({
        data: {
          order_id: id,
          from_status: order.status,
          to_status: OrderStatus.CANCELLED,
          changed_by: userId,
          note: 'Cancelled by customer',
        },
      });

      await tx.notifications.create({
        data: {
          user_id: userId,
          order_id: id,
          title_ar: 'تم إلغاء الطلب',
          title_en: 'Order Cancelled',
          message_ar: `تم إلغاء طلبك رقم ${order.order_number} بنجاح.`,
          message_en: `Your order #${order.order_number} has been cancelled.`,
          notification_type: 'order_cancelled',
        },
      });

      return tx.orders.findUnique({ where: { id } });
    });
  }

  // --- Admin Methods ---

  async findAllAdmin(query: OrderFilterDto) {
    const where: Record<string, any> = {};

    if (query.queue === 'awaiting_payment') {
      where.status = { in: ['pending', 'pending_payment'] };
    } else if (query.queue === 'in_progress') {
      where.status = { in: ['received', 'in_progress', 'under_review'] };
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.package_id) {
      where.package_id = query.package_id;
    }
    if (query.search) {
      where.OR = [
        { order_number: { contains: query.search, mode: 'insensitive' } },
        { customer_name: { contains: query.search, mode: 'insensitive' } },
        { customer_email: { contains: query.search, mode: 'insensitive' } },
        { customer_phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.start_date || query.end_date) {
      where.created_at = {};
      if (query.start_date) where.created_at.gte = new Date(query.start_date);
      if (query.end_date) {
        const end = new Date(query.end_date);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          package: {
            select: { id: true, name_ar: true, name_en: true, price: true },
          },
          secondary_package: {
            select: { id: true, name_ar: true, name_en: true, price: true },
          },
          offers: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              discount_percentage: true,
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              payment_method: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.orders.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            created_at: true,
          },
        },
        package: {
          include: {
            package_images: true,
          },
        },
        secondary_package: {
          include: {
            package_images: true,
          },
        },
        offers: true,
        payments: {
          orderBy: { created_at: 'desc' },
        },
        order_status_history: {
          orderBy: { created_at: 'asc' },
        },
        coupon_usage: {
          include: {
            coupon: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
    }

    return order;
  }

  // Admin update order status with history & notification
  async updateStatusAdmin(
    id: number,
    adminId: number,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
      });
    }

    const previousStatus = order.status;
    const newStatus = dto.status;

    const allowed =
      ALLOWED_STATUS_TRANSITIONS[previousStatus as OrderStatus] || [];
    if (previousStatus === newStatus) return this.findOneAdmin(id);
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({
        message: `Cannot transition order from ${previousStatus} to ${newStatus}`,
        code: 'INVALID_ORDER_STATUS_TRANSITION',
      });
    }

    if (newStatus === OrderStatus.PAID) {
      throw new BadRequestException({
        message:
          'Record the collected payment from the payment section instead of changing the order status directly',
        code: 'PAYMENT_CONFIRMATION_REQUIRED',
      });
    }

    if (newStatus === OrderStatus.COMPLETED) {
      const collectedPaymentCount = await this.prisma.payments.count({
        where: {
          order_id: id,
          status: { in: ['paid', 'success'] },
          amount: { gt: 0 },
        },
      });
      if (collectedPaymentCount === 0) {
        throw new BadRequestException({
          message: 'A collected payment is required before completing an order',
          code: 'COLLECTED_PAYMENT_REQUIRED',
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orders.updateMany({
        where: { id, status: previousStatus },
        data: { status: newStatus },
      });
      if (updated.count !== 1) {
        throw new BadRequestException({
          message: 'Order status changed concurrently; reload and retry',
          code: 'ORDER_STATUS_CONFLICT',
        });
      }

      // Record audit history
      await tx.order_status_history.create({
        data: {
          order_id: id,
          from_status: previousStatus,
          to_status: newStatus,
          changed_by: adminId,
          note: dto.note || `Status updated to ${newStatus}`,
        },
      });

      // Log admin activity
      await tx.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: 'update_order_status',
          table_name: 'orders',
          record_id: id,
          description: `Order #${order.order_number} status changed from ${previousStatus} to ${newStatus}`,
          changes: { from: previousStatus, to: newStatus, note: dto.note },
        },
      });

      // Notify customer if associated
      if (order.user_id) {
        const statusArabicTitles: Record<string, string> = {
          paid: 'تم تأكيد الدفع',
          in_progress: 'جاري العمل على طلبك',
          under_review: 'طلبك قيد المراجعة والتدقيق',
          ready: 'الملفات النهائية جاهزة للتحميل',
          completed: 'تم اكتمال طلبك بنجاح',
          cancelled: 'تم إلغاء الطلب',
          refunded: 'تم استرداد المبلغ',
        };

        const titleAr =
          statusArabicTitles[newStatus] || `تحديث حالة الطلب: ${newStatus}`;
        const titleEn = `Order Status Update: ${newStatus.replace('_', ' ')}`;

        await tx.notifications.create({
          data: {
            user_id: order.user_id,
            order_id: id,
            title_ar: titleAr,
            title_en: titleEn,
            message_ar: `تم تغيير حالة طلبك رقم ${order.order_number} إلى: ${titleAr}`,
            message_en: `Your order #${order.order_number} status is now: ${newStatus.replace('_', ' ')}`,
            notification_type: `order_${newStatus}`,
          },
        });
      }
    });

    return this.findOneAdmin(id);
  }

  async completeBulkAdmin(orderIds: number[], adminId: number) {
    const uniqueOrderIds = [...new Set(orderIds)];

    return this.prisma.$transaction(
      async (tx) => {
        const orders = await tx.orders.findMany({
          where: { id: { in: uniqueOrderIds } },
          select: {
            id: true,
            order_number: true,
            user_id: true,
            status: true,
            payments: { select: { status: true, amount: true } },
          },
        });

        if (orders.length !== uniqueOrderIds.length) {
          throw new NotFoundException({
            message: 'One or more selected orders were not found',
            code: 'ORDERS_NOT_FOUND',
          });
        }

        const invalidStatus = orders.find(
          (order) =>
            !COMPLETABLE_ORDER_STATUSES.includes(order.status as OrderStatus),
        );
        if (invalidStatus) {
          throw new BadRequestException({
            message: `Order #${invalidStatus.order_number} cannot be completed from status: ${invalidStatus.status}`,
            code: 'ORDER_NOT_COMPLETABLE',
          });
        }

        const unpaidOrder = orders.find(
          (order) =>
            !order.payments.some(
              (payment) =>
                ['paid', 'success'].includes(payment.status) &&
                Number(payment.amount) > 0,
            ),
        );
        if (unpaidOrder) {
          throw new BadRequestException({
            message: `A collected payment is required before completing order #${unpaidOrder.order_number}`,
            code: 'COLLECTED_PAYMENT_REQUIRED',
          });
        }

        const updated = await tx.orders.updateMany({
          where: {
            OR: orders.map((order) => ({
              id: order.id,
              status: order.status,
            })),
          },
          data: { status: OrderStatus.COMPLETED },
        });
        if (updated.count !== orders.length) {
          throw new BadRequestException({
            message: 'One or more order statuses changed; reload and retry',
            code: 'ORDER_STATUS_CONFLICT',
          });
        }

        const completedAt = new Date();
        await tx.order_status_history.createMany({
          data: orders.map((order) => ({
            order_id: order.id,
            from_status: order.status,
            to_status: OrderStatus.COMPLETED,
            changed_by: adminId,
            note: 'Order completed using the bulk completion action',
            created_at: completedAt,
          })),
        });
        await tx.admin_activity_log.createMany({
          data: orders.map((order) => ({
            admin_id: adminId,
            action: 'complete_order',
            table_name: 'orders',
            record_id: order.id,
            description: `Order #${order.order_number} marked completed`,
            changes: { from: order.status, to: OrderStatus.COMPLETED },
            created_at: completedAt,
          })),
        });

        const customerOrders = orders.filter((order) => order.user_id);
        if (customerOrders.length > 0) {
          await tx.notifications.createMany({
            data: customerOrders.map((order) => ({
              user_id: order.user_id,
              order_id: order.id,
              title_ar: 'اكتمل طلبك بنجاح',
              title_en: 'Order Status Update: completed',
              message_ar: `اكتمل طلبك رقم ${order.order_number} بنجاح. يمكنك الآن تقييم الخدمة من حسابك.`,
              message_en: `Your order #${order.order_number} is complete. You can now review the service from your account.`,
              notification_type: 'order_completed',
              created_at: completedAt,
            })),
          });
        }

        return {
          completed_count: orders.length,
          order_ids: orders.map((order) => order.id),
        };
      },
      { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 15_000 },
    );
  }

  // Admin updates order notes / delivery date
  async updateAdmin(id: number, adminId: number, dto: UpdateOrderAdminDto) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const data: Record<string, any> = {};
    if (dto.admin_notes !== undefined) data.admin_notes = dto.admin_notes;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.delivery_date !== undefined)
      data.delivery_date = new Date(dto.delivery_date);

    await this.prisma.$transaction([
      this.prisma.orders.update({ where: { id }, data }),
      this.prisma.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: 'update_order_details',
          table_name: 'orders',
          record_id: id,
          description: `Updated details for order #${order.order_number}`,
          changes: data,
        },
      }),
    ]);

    return this.findOneAdmin(id);
  }
}
