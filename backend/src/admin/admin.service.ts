import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerFilterDto,
  UpdateCustomerStatusDto,
  ActivityLogFilterDto,
  DashboardFilterDto,
} from './dto';
import { createPaginatedResponse } from '../common/utils';

interface DashboardDateWindow {
  start: Date | null;
  end: Date | null;
}

interface DashboardPerformanceMetrics {
  orders_created: number;
  paid_orders: number;
  successful_payments: number;
  gross_sales: number;
  collected_revenue: number;
  discounts: number;
  average_order_value: number;
  new_customers: number;
  purchasing_customers: number;
}

function money(value: unknown): number {
  return Math.round(Number(value || 0) * 100) / 100;
}

function comparison(current: number, previous: number | null) {
  return {
    previous,
    change_percentage:
      previous && previous !== 0
        ? Math.round(((current - previous) / previous) * 1000) / 10
        : null,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // 1. Dashboard KPIs
  async getDashboardStats(query: DashboardFilterDto = {}) {
    const selectedWindow = this.dashboardWindow(query);
    const previousWindow = this.previousDashboardWindow(selectedWindow);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      customersToday,
      customersMonth,
      totalOrders,
      ordersToday,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      paidRevenueAgg,
      todayRevenueAgg,
      monthRevenueAgg,
      topPackagesAgg,
      recentOrders,
      paymentsAgg,
    ] = await Promise.all([
      // Customers stats
      this.prisma.users.count({ where: { role: 'customer' } }),
      this.prisma.users.count({
        where: { role: 'customer', created_at: { gte: startOfToday } },
      }),
      this.prisma.users.count({
        where: { role: 'customer', created_at: { gte: startOfMonth } },
      }),

      // Orders count
      this.prisma.orders.count(),
      this.prisma.orders.count({
        where: { created_at: { gte: startOfToday } },
      }),
      this.prisma.orders.count({
        where: { status: { in: ['pending', 'pending_payment'] } },
      }),
      this.prisma.orders.count({
        where: { status: { in: ['in_progress', 'under_review', 'received'] } },
      }),
      this.prisma.orders.count({ where: { status: 'completed' } }),

      // Revenue is money actually collected, not the catalog value of an
      // order. Temporary bypass records deliberately have amount=0.
      this.prisma.payments.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', amount: { gt: 0 } },
      }),
      this.prisma.payments.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          amount: { gt: 0 },
          payment_date: { gte: startOfToday },
        },
      }),
      this.prisma.payments.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          amount: { gt: 0 },
          payment_date: { gte: startOfMonth },
        },
      }),

      // Top selling packages
      this.prisma.orders.groupBy({
        by: ['package_id'],
        where: {
          package_id: { not: null },
          payments: { some: { status: 'paid', amount: { gt: 0 } } },
        },
        _count: { package_id: true },
        _sum: { final_amount: true },
        orderBy: { _count: { package_id: 'desc' } },
        take: 5,
      }),

      // Recent 8 orders
      this.prisma.orders.findMany({
        select: {
          id: true,
          order_number: true,
          customer_name: true,
          customer_email: true,
          status: true,
          final_amount: true,
          created_at: true,
          package: { select: { id: true, name_ar: true, name_en: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),

      // Payment counts by status
      this.prisma.payments.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const [orderStatusAgg, performance, previousPerformance] =
      await Promise.all([
        this.prisma.orders.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.getPerformanceMetrics(selectedWindow),
        previousWindow
          ? this.getPerformanceMetrics(previousWindow)
          : Promise.resolve(null),
      ]);

    const statusCounts = new Map<string, number>(
      orderStatusAgg.map((item) => [item.status, item._count.id]),
    );
    const countStatuses = (...statuses: string[]) =>
      statuses.reduce(
        (sum, status) => sum + (statusCounts.get(status) || 0),
        0,
      );

    // Enhance top packages with names
    const packageIds = topPackagesAgg
      .map((p) => p.package_id)
      .filter((id): id is number => id !== null);

    const packages = await this.prisma.packages.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name_ar: true, name_en: true, price: true },
    });

    const topPackages = topPackagesAgg.map((p) => {
      const pkg = packages.find((pkgItem) => pkgItem.id === p.package_id);
      return {
        package_id: p.package_id,
        name_ar: pkg?.name_ar || 'Unknown',
        name_en: pkg?.name_en || 'Unknown',
        order_count: p._count.package_id,
        total_revenue: Number(p._sum.final_amount || 0),
      };
    });

    return {
      payment_mode:
        this.configService.get<string>('PAYMENT_PROVIDER') || 'mock',
      period: {
        start: selectedWindow.start?.toISOString() ?? null,
        end: selectedWindow.end?.toISOString() ?? null,
      },
      operational: {
        total: totalOrders,
        awaiting_payment: countStatuses('pending', 'pending_payment'),
        paid_awaiting_start: countStatuses('paid'),
        awaiting_information: countStatuses('awaiting_information'),
        in_progress: countStatuses('received', 'in_progress', 'under_review'),
        ready: countStatuses('ready'),
        completed: countStatuses('completed'),
        cancelled: countStatuses('cancelled'),
        refunded: countStatuses('refunded'),
      },
      performance: {
        ...performance,
        currency: 'AED',
      },
      comparison: {
        orders_created: comparison(
          performance.orders_created,
          previousPerformance?.orders_created ?? null,
        ),
        paid_orders: comparison(
          performance.paid_orders,
          previousPerformance?.paid_orders ?? null,
        ),
        successful_payments: comparison(
          performance.successful_payments,
          previousPerformance?.successful_payments ?? null,
        ),
        gross_sales: comparison(
          performance.gross_sales,
          previousPerformance?.gross_sales ?? null,
        ),
        collected_revenue: comparison(
          performance.collected_revenue,
          previousPerformance?.collected_revenue ?? null,
        ),
        discounts: comparison(
          performance.discounts,
          previousPerformance?.discounts ?? null,
        ),
        average_order_value: comparison(
          performance.average_order_value,
          previousPerformance?.average_order_value ?? null,
        ),
        new_customers: comparison(
          performance.new_customers,
          previousPerformance?.new_customers ?? null,
        ),
        purchasing_customers: comparison(
          performance.purchasing_customers,
          previousPerformance?.purchasing_customers ?? null,
        ),
      },
      overview: {
        customers: {
          total: totalCustomers,
          new_today: customersToday,
          new_this_month: customersMonth,
        },
        orders: {
          total: totalOrders,
          today: ordersToday,
          pending: pendingOrders,
          in_progress: inProgressOrders,
          completed: completedOrders,
        },
        revenue: {
          total: Number(paidRevenueAgg._sum.amount || 0),
          today: Number(todayRevenueAgg._sum.amount || 0),
          this_month: Number(monthRevenueAgg._sum.amount || 0),
          currency: 'AED',
        },
      },
      top_packages: topPackages,
      recent_orders: recentOrders,
      payment_statistics: paymentsAgg.map((p) => ({
        status: p.status,
        count: p._count.id,
        total_amount: Number(p._sum.amount || 0),
      })),
    };
  }

  private dashboardWindow(query: DashboardFilterDto): DashboardDateWindow {
    const start = query.start_date ? new Date(query.start_date) : null;
    const end = query.end_date ? new Date(query.end_date) : null;

    if (start && end && start > end) {
      throw new BadRequestException({
        message: 'Dashboard start date must not be after the end date',
        code: 'INVALID_DASHBOARD_DATE_RANGE',
      });
    }

    return { start, end };
  }

  private previousDashboardWindow(
    window: DashboardDateWindow,
  ): DashboardDateWindow | null {
    if (!window.start || !window.end) return null;

    const duration = window.end.getTime() - window.start.getTime();
    const previousEnd = new Date(window.start.getTime() - 1);
    return {
      start: new Date(previousEnd.getTime() - duration),
      end: previousEnd,
    };
  }

  private async getPerformanceMetrics(
    window: DashboardDateWindow,
  ): Promise<DashboardPerformanceMetrics> {
    const createdAt = this.dateConstraint(window);
    const paymentDate = this.dateConstraint(window);
    const paidPaymentWhere = {
      status: 'paid',
      amount: { gt: 0 },
      ...(paymentDate ? { payment_date: paymentDate } : {}),
    };
    const paidOrderWhere = {
      payments: { some: paidPaymentWhere },
    };

    const [
      ordersCreated,
      paidOrders,
      paidOrderAmounts,
      paidPayments,
      newCustomers,
      purchasingCustomers,
    ] = await Promise.all([
      this.prisma.orders.count(
        createdAt ? { where: { created_at: createdAt } } : { where: {} },
      ),
      this.prisma.orders.count({ where: paidOrderWhere }),
      this.prisma.orders.aggregate({
        _sum: { final_amount: true, discount_amount: true },
        where: paidOrderWhere,
      }),
      this.prisma.payments.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: paidPaymentWhere,
      }),
      this.prisma.users.count({
        where: {
          role: 'customer',
          ...(createdAt ? { created_at: createdAt } : {}),
        },
      }),
      this.prisma.orders.findMany({
        where: {
          user_id: { not: null },
          ...paidOrderWhere,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      }),
    ]);

    const collectedRevenue = money(paidPayments._sum.amount);
    const paidOrderCount = Number(paidOrders || 0);

    return {
      orders_created: Number(ordersCreated || 0),
      paid_orders: paidOrderCount,
      successful_payments: Number(paidPayments._count?.id || 0),
      gross_sales: money(paidOrderAmounts._sum.final_amount),
      collected_revenue: collectedRevenue,
      discounts: money(paidOrderAmounts._sum.discount_amount),
      average_order_value: paidOrderCount
        ? money(money(paidOrderAmounts._sum.final_amount) / paidOrderCount)
        : 0,
      new_customers: Number(newCustomers || 0),
      purchasing_customers: purchasingCustomers.length,
    };
  }

  private dateConstraint(window: DashboardDateWindow) {
    if (!window.start && !window.end) return null;
    return {
      ...(window.start ? { gte: window.start } : {}),
      ...(window.end ? { lte: window.end } : {}),
    };
  }

  // 2. Customers List
  async getCustomers(query: CustomerFilterDto) {
    const where: Record<string, any> = { role: 'customer' };

    if (query.account_locked !== undefined) {
      where.account_locked = query.account_locked;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          first_name: true,
          last_name: true,
          gender: true,
          role: true,
          email_verified: true,
          account_locked: true,
          last_login: true,
          created_at: true,
          _count: { select: { orders: true } },
          orders: {
            select: {
              id: true,
              status: true,
              final_amount: true,
              created_at: true,
              payments: {
                where: { status: 'paid', amount: { gt: 0 } },
                select: { amount: true },
              },
            },
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.users.count({ where }),
    ]);

    const formatted = users.map((u) => {
      const completedOrdersCount = u.orders.filter(
        (o) => o.status === 'completed',
      ).length;
      const totalSpent = u.orders.reduce(
        (sum, order) =>
          sum +
          order.payments.reduce(
            (paymentSum, payment) => paymentSum + Number(payment.amount),
            0,
          ),
        0,
      );

      const lastOrder = u.orders[0] || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        first_name: u.first_name,
        last_name: u.last_name,
        gender: u.gender,
        role: u.role,
        email_verified: u.email_verified,
        account_locked: u.account_locked,
        last_login: u.last_login,
        created_at: u.created_at,
        total_orders: u._count.orders,
        completed_orders: completedOrdersCount,
        total_spent: Math.round(totalSpent * 100) / 100,
        last_order: lastOrder
          ? {
              id: lastOrder.id,
              status: lastOrder.status,
              created_at: lastOrder.created_at,
            }
          : null,
      };
    });

    return createPaginatedResponse(formatted, total, query.page, query.limit);
  }

  // 3. Single Customer details
  async getCustomerDetails(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        gender: true,
        role: true,
        email_verified: true,
        account_locked: true,
        last_login: true,
        failed_login_attempts: true,
        locked_until: true,
        created_at: true,
        orders: {
          include: {
            package: { select: { id: true, name_ar: true, name_en: true } },
            payments: { select: { id: true, status: true, amount: true } },
          },
          orderBy: { created_at: 'desc' },
        },
        user_sessions: {
          where: { is_active: true },
          select: {
            id: true,
            ip_address: true,
            user_agent: true,
            last_activity: true,
          },
          take: 5,
        },
      },
    });

    if (!user) throw new NotFoundException('Customer not found');

    const totalSpent = user.orders.reduce(
      (sum, order) =>
        sum +
        order.payments
          .filter((payment) => payment.status === 'paid')
          .reduce(
            (paymentSum, payment) => paymentSum + Number(payment.amount),
            0,
          ),
      0,
    );

    return {
      ...user,
      total_spent: Math.round(totalSpent * 100) / 100,
    };
  }

  // 4. Update customer status (lock / unlock)
  async updateCustomerStatus(
    id: number,
    dto: UpdateCustomerStatusDto,
    adminId: number,
  ) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user || user.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.users.update({
        where: { id },
        data: {
          account_locked: dto.account_locked,
          locked_until: dto.account_locked
            ? new Date(Date.now() + 30 * 86400000)
            : null,
          failed_login_attempts: dto.account_locked ? undefined : 0,
          token_version: { increment: 1 },
        },
      });
      await tx.user_sessions.updateMany({
        where: { user_id: id },
        data: { is_active: false },
      });
      await tx.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: dto.account_locked
            ? 'lock_customer_account'
            : 'unlock_customer_account',
          table_name: 'users',
          record_id: id,
          description: `Customer account ${user.email} ${dto.account_locked ? 'locked' : 'unlocked'}. Reason: ${dto.reason || 'Admin action'}`,
          changes: { account_locked: dto.account_locked, reason: dto.reason },
        },
      });
      return result;
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      account_locked: updated.account_locked,
      message: `Customer account successfully ${dto.account_locked ? 'locked' : 'unlocked'}`,
    };
  }

  // 5. Activity Logs
  async getActivityLogs(query: ActivityLogFilterDto) {
    const where: Record<string, any> = {};
    if (query.action) where.action = query.action;
    if (query.table_name) where.table_name = query.table_name;
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { admin: { name: { contains: query.search, mode: 'insensitive' } } },
        { admin: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.admin_activity_log.findMany({
        where,
        include: {
          admin: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.admin_activity_log.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }
}
