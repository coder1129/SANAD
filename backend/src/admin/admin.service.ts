import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerFilterDto,
  UpdateCustomerStatusDto,
  ActivityLogFilterDto,
} from './dto';
import { createPaginatedResponse } from '../common/utils';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Dashboard KPIs
  async getDashboardStats() {
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
