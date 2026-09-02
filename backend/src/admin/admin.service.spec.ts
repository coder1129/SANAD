import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const aggregate = (amount: number | null) => ({ _sum: { amount } });

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      users: { update: vi.fn() },
      user_sessions: { updateMany: vi.fn() },
      admin_activity_log: { create: vi.fn() },
    };
    prisma = {
      users: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      orders: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      payments: {
        aggregate: vi.fn().mockResolvedValue(aggregate(0)),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      packages: { findMany: vi.fn().mockResolvedValue([]) },
      admin_activity_log: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn(async (input: any) =>
        typeof input === 'function' ? input(tx) : Promise.all(input),
      ),
    };
    service = new AdminService(prisma as PrismaService);
  });

  describe('getDashboardStats', () => {
    it('counts revenue only from collected payments, excluding bypass rows', async () => {
      await service.getDashboardStats();

      for (const call of prisma.payments.aggregate.mock.calls) {
        expect(call[0].where).toEqual(
          expect.objectContaining({ status: 'paid', amount: { gt: 0 } }),
        );
      }
    });

    it('reports revenue totals from the payments table', async () => {
      prisma.payments.aggregate
        .mockResolvedValueOnce(aggregate(5000))
        .mockResolvedValueOnce(aggregate(500))
        .mockResolvedValueOnce(aggregate(1500));

      const result = await service.getDashboardStats();

      expect(result.overview.revenue).toEqual({
        total: 5000,
        today: 500,
        this_month: 1500,
        currency: 'AED',
      });
    });

    it('treats an empty revenue aggregate as zero rather than null', async () => {
      prisma.payments.aggregate.mockResolvedValue(aggregate(null));

      const result = await service.getDashboardStats();

      expect(result.overview.revenue.total).toBe(0);
    });

    it('groups customer counts by role', async () => {
      prisma.users.count
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(28);

      const result = await service.getDashboardStats();

      expect(result.overview.customers).toEqual({
        total: 120,
        new_today: 3,
        new_this_month: 28,
      });
      expect(prisma.users.count.mock.calls[0][0].where.role).toBe('customer');
    });

    it('ranks top packages only by orders that were actually paid', async () => {
      prisma.orders.groupBy.mockResolvedValue([
        { package_id: 1, _count: { package_id: 4 }, _sum: { final_amount: 2000 } },
      ]);
      prisma.packages.findMany.mockResolvedValue([
        { id: 1, name_ar: 'باقة', name_en: 'Package', price: 500 },
      ]);

      const result = await service.getDashboardStats();

      expect(prisma.orders.groupBy.mock.calls[0][0].where.payments).toEqual({
        some: { status: 'paid', amount: { gt: 0 } },
      });
      expect(result.top_packages[0]).toEqual({
        package_id: 1,
        name_ar: 'باقة',
        name_en: 'Package',
        order_count: 4,
        total_revenue: 2000,
      });
    });

    it('falls back to Unknown when the ranked package was deleted', async () => {
      prisma.orders.groupBy.mockResolvedValue([
        { package_id: 7, _count: { package_id: 1 }, _sum: { final_amount: 100 } },
      ]);
      prisma.packages.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats();

      expect(result.top_packages[0].name_en).toBe('Unknown');
    });
  });

  describe('getCustomers', () => {
    it('never returns staff accounts', async () => {
      await service.getCustomers({ page: 1, limit: 20, skip: 0 } as never);

      expect(prisma.users.findMany.mock.calls[0][0].where.role).toBe('customer');
    });

    it('never selects credential columns', async () => {
      await service.getCustomers({ page: 1, limit: 20, skip: 0 } as never);

      const { select } = prisma.users.findMany.mock.calls[0][0];
      expect(select).not.toHaveProperty('password_hash');
      expect(select).not.toHaveProperty('token_version');
    });

    it('sums lifetime spend from paid payments only', async () => {
      prisma.users.findMany.mockResolvedValue([
        {
          id: 7,
          name: 'Customer',
          email: 'c@example.com',
          phone: null,
          role: 'customer',
          email_verified: true,
          account_locked: false,
          last_login: null,
          created_at: new Date('2026-01-01'),
          _count: { orders: 3 },
          orders: [
            { id: 3, status: 'completed', created_at: new Date('2026-03-01'), payments: [{ amount: 500 }] },
            { id: 2, status: 'completed', created_at: new Date('2026-02-01'), payments: [{ amount: 300 }] },
            { id: 1, status: 'cancelled', created_at: new Date('2026-01-05'), payments: [] },
          ],
        },
      ]);
      prisma.users.count.mockResolvedValue(1);

      const result = await service.getCustomers({
        page: 1,
        limit: 20,
        skip: 0,
      } as never);

      expect(result.data.items[0].total_spent).toBe(800);
      expect(result.data.items[0].completed_orders).toBe(2);
      expect(result.data.items[0].total_orders).toBe(3);
      expect(result.data.items[0].last_order.id).toBe(3);
    });

    it('reports a null last order for a customer who never ordered', async () => {
      prisma.users.findMany.mockResolvedValue([
        {
          id: 7,
          name: 'Customer',
          email: 'c@example.com',
          _count: { orders: 0 },
          orders: [],
        },
      ]);

      const result = await service.getCustomers({
        page: 1,
        limit: 20,
        skip: 0,
      } as never);

      expect(result.data.items[0].last_order).toBeNull();
      expect(result.data.items[0].total_spent).toBe(0);
    });

    it('filters by lock state when requested', async () => {
      await service.getCustomers({
        page: 1,
        limit: 20,
        skip: 0,
        account_locked: true,
      } as never);

      expect(prisma.users.findMany.mock.calls[0][0].where.account_locked).toBe(
        true,
      );
    });
  });

  describe('getCustomerDetails', () => {
    it('throws NotFoundException for an unknown customer', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerDetails(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('excludes unpaid payments from the lifetime total', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 7,
        orders: [
          {
            id: 1,
            payments: [
              { id: 1, status: 'paid', amount: 400 },
              { id: 2, status: 'failed', amount: 900 },
            ],
          },
        ],
        user_sessions: [],
      });

      const result = await service.getCustomerDetails(7);

      expect(result.total_spent).toBe(400);
    });
  });

  describe('updateCustomerStatus', () => {
    it('refuses to act on a non-customer account', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 2, role: 'admin' });

      await expect(
        service.updateCustomerStatus(2, { account_locked: true } as never, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('invalidates every token and session when locking an account', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 7,
        role: 'customer',
        email: 'c@example.com',
      });
      tx.users.update.mockResolvedValue({
        id: 7,
        name: 'Customer',
        email: 'c@example.com',
        account_locked: true,
      });

      await service.updateCustomerStatus(
        7,
        { account_locked: true, reason: 'chargeback fraud' } as never,
        42,
      );

      expect(tx.users.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          account_locked: true,
          token_version: { increment: 1 },
        }),
      );
      expect(tx.user_sessions.updateMany).toHaveBeenCalledWith({
        where: { user_id: 7 },
        data: { is_active: false },
      });
    });

    it('clears the failed-attempt counter when unlocking', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 7,
        role: 'customer',
        email: 'c@example.com',
      });
      tx.users.update.mockResolvedValue({ id: 7, account_locked: false });

      await service.updateCustomerStatus(
        7,
        { account_locked: false } as never,
        42,
      );

      expect(tx.users.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          account_locked: false,
          locked_until: null,
          failed_login_attempts: 0,
        }),
      );
    });

    it('writes an audit entry naming the acting admin', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 7,
        role: 'customer',
        email: 'c@example.com',
      });
      tx.users.update.mockResolvedValue({ id: 7, account_locked: true });

      await service.updateCustomerStatus(
        7,
        { account_locked: true } as never,
        42,
      );

      expect(tx.admin_activity_log.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          admin_id: 42,
          action: 'lock_customer_account',
          record_id: 7,
        }),
      );
    });
  });

  describe('getActivityLogs', () => {
    it('filters by action and table', async () => {
      await service.getActivityLogs({
        page: 1,
        limit: 20,
        skip: 0,
        action: 'update_order_status',
        table_name: 'orders',
      } as never);

      expect(prisma.admin_activity_log.findMany.mock.calls[0][0].where).toEqual({
        action: 'update_order_status',
        table_name: 'orders',
      });
    });

    it('searches descriptions and the acting admin', async () => {
      await service.getActivityLogs({
        page: 1,
        limit: 20,
        skip: 0,
        search: 'refund',
      } as never);

      expect(
        prisma.admin_activity_log.findMany.mock.calls[0][0].where.OR,
      ).toHaveLength(3);
    });
  });
});
