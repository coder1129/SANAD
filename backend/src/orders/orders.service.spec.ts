import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutService } from '../checkout/checkout.service';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../common/enums';

const pricing = (overrides: Record<string, unknown> = {}) => ({
  package_id: 1,
  original_price: 600,
  offer_id: null,
  offer_discount_amount: 0,
  coupon_code: null,
  coupon_discount_amount: 0,
  total_amount: 630,
  final_amount: 630,
  delivery_days: 5,
  ...overrides,
});

const storedOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  order_number: 'SANAD-2026-ABC-DEF',
  user_id: 1,
  package: {},
  payments: [],
  order_files: [],
  order_status_history: [],
  ...overrides,
});

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
    throw new Error('expected the call to reject');
  } catch (error) {
    const response = (error as BadRequestException).getResponse?.();
    return (response as { code?: string })?.code;
  }
};

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let checkoutService: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      orders: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      users: { findUnique: vi.fn() },
      coupons: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      coupon_usage: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
      },
      order_status_history: { create: vi.fn() },
      notifications: { create: vi.fn() },
      payments: { create: vi.fn() },
      admin_activity_log: { create: vi.fn() },
      $transaction: vi.fn(async (input: any, options?: unknown) => {
        prisma.__transactionOptions = options;
        return typeof input === 'function' ? input(prisma) : Promise.all(input);
      }),
      __transactionOptions: undefined,
    };

    checkoutService = {
      calculatePricing: vi.fn().mockResolvedValue(pricing()),
    };
    configService = { get: vi.fn().mockReturnValue('mock') };

    service = new OrdersService(
      prisma as PrismaService,
      checkoutService as CheckoutService,
      configService as ConfigService,
    );
  });

  const activeCustomer = (overrides: Record<string, unknown> = {}) =>
    prisma.users.findUnique.mockResolvedValue({
      id: 1,
      name: 'Abdallah',
      email: 'abdallah@sanad.ae',
      phone: '+971500000000',
      account_locked: false,
      ...overrides,
    });

  describe('create — guards', () => {
    it('rejects an order for an account that no longer exists', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.create(1, { package_id: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an order from a locked account', async () => {
      activeCustomer({ account_locked: true });

      await expect(service.create(1, { package_id: 1 })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create — pricing and transaction', () => {
    beforeEach(() => {
      activeCustomer();
      prisma.orders.create.mockResolvedValue(storedOrder());
      prisma.orders.findUnique.mockResolvedValue(storedOrder());
    });

    // Serializable is what stops two concurrent orders from both redeeming the
    // last use of a coupon; a weaker level would let both commit.
    it('runs the whole reservation at Serializable isolation', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.__transactionOptions).toEqual(
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });

    it('bounds the transaction so a stuck lock cannot hold a connection open', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.__transactionOptions).toEqual(
        expect.objectContaining({ maxWait: 5_000, timeout: 15_000 }),
      );
    });

    // Prices are always recomputed server-side; the client never supplies them.
    it('prices the order through the checkout service inside the transaction', async () => {
      await service.create(1, {
        package_id: 1,
        coupon_code: 'SAVE20',
        offer_id: 4,
      });

      expect(checkoutService.calculatePricing).toHaveBeenCalledWith(
        { package_id: 1, offer_id: 4, coupon_code: 'SAVE20' },
        1,
        prisma,
        true,
      );
    });

    it('writes the server-computed amounts onto the order', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({
          original_price: 600,
          offer_discount_amount: 60,
          coupon_discount_amount: 40,
          vat_amount: 25,
          total_amount: 525,
          final_amount: 525,
        }),
      );

      await service.create(1, { package_id: 1 });

      expect(prisma.orders.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          original_amount: 600,
          discount_amount: 100,
          vat_amount: 0,
          total_amount: 525,
          final_amount: 525,
        }),
      );
    });

    it('generates a collision-resistant order number', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.orders.create.mock.calls[0][0].data.order_number).toMatch(
        /^SANAD-\d{4}-[0-9A-Z]+-[0-9A-F]{8}$/,
      );
    });

    it('does not reuse an order number across calls', async () => {
      await service.create(1, { package_id: 1 });
      await service.create(1, { package_id: 1 });

      const [first, second] = prisma.orders.create.mock.calls.map(
        (call: any) => call[0].data.order_number,
      );
      expect(first).not.toBe(second);
    });

    it('derives the delivery date from the package lead time', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ delivery_days: 5 }),
      );

      await service.create(1, { package_id: 1 });

      const { delivery_date } = prisma.orders.create.mock.calls[0][0].data;
      const days = Math.round(
        (delivery_date.getTime() - Date.now()) / 86_400_000,
      );
      expect(days).toBe(5);
    });

    it('falls back to a seven day lead time when the package has none', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ delivery_days: null }),
      );

      await service.create(1, { package_id: 1 });

      const { delivery_date } = prisma.orders.create.mock.calls[0][0].data;
      const days = Math.round(
        (delivery_date.getTime() - Date.now()) / 86_400_000,
      );
      expect(days).toBe(7);
    });

    it('copies the contact details from the account by default', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.orders.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          customer_name: 'Abdallah',
          customer_email: 'abdallah@sanad.ae',
          customer_phone: '+971500000000',
        }),
      );
    });

    it('prefers the contact details supplied with the order', async () => {
      await service.create(1, {
        package_id: 1,
        customer_name: '  Sara Al Otaibi  ',
        customer_email: '  sara@example.com  ',
        customer_phone: '  +971555555555  ',
      });

      expect(prisma.orders.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          customer_name: 'Sara Al Otaibi',
          customer_email: 'sara@example.com',
          customer_phone: '+971555555555',
        }),
      );
    });

    it('tolerates an account with no stored phone number', async () => {
      activeCustomer({ phone: null });

      await service.create(1, { package_id: 1 });

      expect(prisma.orders.create.mock.calls[0][0].data.customer_phone).toBe(
        '',
      );
    });

    it('defaults the requirements payload to an empty object', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.orders.create.mock.calls[0][0].data.requirements).toEqual(
        {},
      );
    });

    it('records the opening status history entry', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.order_status_history.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          from_status: null,
          to_status: OrderStatus.PENDING,
          changed_by: 1,
        }),
      );
    });

    it('notifies the customer in both languages', async () => {
      await service.create(1, { package_id: 1 });

      const { data } = prisma.notifications.create.mock.calls[0][0];
      expect(data.notification_type).toBe('order_created');
      expect(data.title_ar).toBeTruthy();
      expect(data.title_en).toBeTruthy();
    });
  });

  describe('create — coupon reservation', () => {
    beforeEach(() => {
      activeCustomer();
      prisma.orders.create.mockResolvedValue(storedOrder());
      prisma.orders.findUnique.mockResolvedValue(storedOrder());
    });

    it('records the redemption and increments the counter', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ coupon_code: 'SAVE20', coupon_discount_amount: 60 }),
      );
      prisma.coupons.findUnique.mockResolvedValue({ id: 9, code: 'SAVE20' });

      await service.create(1, { package_id: 1, coupon_code: 'SAVE20' });

      expect(prisma.coupon_usage.create.mock.calls[0][0].data).toEqual({
        coupon_id: 9,
        user_id: 1,
        order_id: 101,
        discount_amount: 60,
      });
      expect(prisma.coupons.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { times_used: { increment: 1 } },
      });
    });

    it('aborts when the coupon disappears mid-transaction', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ coupon_code: 'SAVE20', coupon_discount_amount: 60 }),
      );
      prisma.coupons.findUnique.mockResolvedValue(null);

      expect(
        await errorCode(
          service.create(1, { package_id: 1, coupon_code: 'SAVE20' }),
        ),
      ).toBe('COUPON_NOT_FOUND');
      expect(prisma.coupon_usage.create).not.toHaveBeenCalled();
    });

    it('records no redemption when no coupon was applied', async () => {
      await service.create(1, { package_id: 1 });

      expect(prisma.coupon_usage.create).not.toHaveBeenCalled();
      expect(prisma.coupons.update).not.toHaveBeenCalled();
    });

    // A coupon that resolves to no discount must not consume a redemption.
    it('records no redemption for a zero-value coupon', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ coupon_code: 'ZERO', coupon_discount_amount: 0 }),
      );

      await service.create(1, { package_id: 1, coupon_code: 'ZERO' });

      expect(prisma.coupon_usage.create).not.toHaveBeenCalled();
    });
  });

  describe('create — payment bypass mode', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('bypass');
      activeCustomer();
    });

    it('confirms the order as paid without charging', async () => {
      prisma.orders.create.mockResolvedValue(
        storedOrder({ id: 102, status: 'paid' }),
      );
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({ id: 102, status: 'paid' }),
      );

      const order = await service.create(1, { package_id: 1 });

      expect(order.status).toBe('paid');
      expect(prisma.orders.create.mock.calls[0][0].data.status).toBe(
        OrderStatus.PAID,
      );
    });

    // Revenue reporting reads the payments table, so a bypass row must record
    // the zero actually collected while the catalog value stays auditable.
    it('writes a zero-amount payment row that keeps the catalog value auditable', async () => {
      checkoutService.calculatePricing.mockResolvedValue(
        pricing({ final_amount: 630 }),
      );
      prisma.orders.create.mockResolvedValue(storedOrder({ id: 102 }));
      prisma.orders.findUnique.mockResolvedValue(storedOrder({ id: 102 }));

      await service.create(1, { package_id: 1 });

      const { data } = prisma.payments.create.mock.calls[0][0];
      expect(data.amount).toBe(0);
      expect(data.status).toBe('paid');
      expect(data.payment_method).toBe('other');
      expect(JSON.stringify(data.payment_response)).toContain('630');
    });

    it('marks the status history so the bypass is traceable', async () => {
      prisma.orders.create.mockResolvedValue(storedOrder({ id: 102 }));
      prisma.orders.findUnique.mockResolvedValue(storedOrder({ id: 102 }));

      await service.create(1, { package_id: 1 });

      expect(
        prisma.order_status_history.create.mock.calls[0][0].data.note,
      ).toContain('bypass');
    });

    it('writes no payment row in normal mode', async () => {
      configService.get.mockReturnValue('mock');
      prisma.orders.create.mockResolvedValue(storedOrder());
      prisma.orders.findUnique.mockResolvedValue(storedOrder());

      await service.create(1, { package_id: 1 });

      expect(prisma.payments.create).not.toHaveBeenCalled();
      expect(prisma.orders.create.mock.calls[0][0].data.status).toBe(
        OrderStatus.PENDING,
      );
    });
  });

  describe('findAllCustomer', () => {
    it('scopes the list to the requesting customer', async () => {
      await service.findAllCustomer(7, {
        page: 1,
        limit: 20,
        skip: 0,
      } as never);

      expect(prisma.orders.findMany.mock.calls[0][0].where).toEqual({
        user_id: 7,
      });
    });

    it('applies the status filter alongside the ownership filter', async () => {
      await service.findAllCustomer(7, {
        page: 1,
        limit: 20,
        skip: 0,
        status: OrderStatus.PAID,
      } as never);

      expect(prisma.orders.findMany.mock.calls[0][0].where).toEqual({
        user_id: 7,
        status: OrderStatus.PAID,
      });
    });

    it('returns the paginated envelope', async () => {
      prisma.orders.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.orders.count.mockResolvedValue(1);

      const result = await service.findAllCustomer(7, {
        page: 1,
        limit: 20,
        skip: 0,
      } as never);

      expect(result.data.meta.total).toBe(1);
    });
  });

  describe('findOneCustomer', () => {
    it('throws NotFoundException for an unknown order', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(service.findOneCustomer(200, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("refuses to disclose another customer's order", async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 200, user_id: 99 });

      expect(await errorCode(service.findOneCustomer(200, 1))).toBe(
        'ORDER_FORBIDDEN',
      );
    });

    it('returns the order to its owner', async () => {
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({ id: 200, user_id: 1 }),
      );

      await expect(service.findOneCustomer(200, 1)).resolves.toEqual(
        expect.objectContaining({ id: 200 }),
      );
    });
  });

  describe('findByNumberCustomer', () => {
    it('normalizes the public order number before lookup', async () => {
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({
          status: OrderStatus.PAID,
          payments: [{ status: 'paid' }],
        }),
      );

      await service.findByNumberCustomer('  sanad-2026-abc-def  ', 1);

      expect(prisma.orders.findUnique.mock.calls[0][0].where).toEqual({
        order_number: 'SANAD-2026-ABC-DEF',
      });
    });

    it("refuses to disclose another customer's success page", async () => {
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({
          user_id: 99,
          status: OrderStatus.PAID,
          payments: [{ status: 'paid' }],
        }),
      );

      expect(
        await errorCode(service.findByNumberCustomer('SANAD-2026-ABC-DEF', 1)),
      ).toBe('ORDER_FORBIDDEN');
    });

    it('does not expose a success page for an unpaid order', async () => {
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({
          status: OrderStatus.PENDING_PAYMENT,
          payments: [{ status: 'pending' }],
        }),
      );

      expect(
        await errorCode(service.findByNumberCustomer('SANAD-2026-ABC-DEF', 1)),
      ).toBe('ORDER_NOT_CONFIRMED');
    });

    it('returns a confirmed paid order to its owner', async () => {
      prisma.orders.findUnique.mockResolvedValue(
        storedOrder({
          status: OrderStatus.IN_PROGRESS,
          payments: [{ status: 'success' }],
        }),
      );

      await expect(
        service.findByNumberCustomer('SANAD-2026-ABC-DEF', 1),
      ).resolves.toEqual(expect.objectContaining({ id: 101, user_id: 1 }));
    });
  });

  describe('cancelCustomer', () => {
    it('cancels a pending order and releases the coupon redemption', async () => {
      const pending = {
        id: 201,
        user_id: 1,
        order_number: 'SANAD-PENDING',
        status: OrderStatus.PENDING,
      };
      prisma.orders.findUnique
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce({ ...pending, status: OrderStatus.CANCELLED });
      prisma.coupon_usage.findMany.mockResolvedValue([{ coupon_id: 9 }]);

      await service.cancelCustomer(201, 1);

      expect(prisma.orders.updateMany).toHaveBeenCalledWith({
        where: {
          id: 201,
          user_id: 1,
          status: { in: [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT] },
        },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(prisma.coupon_usage.deleteMany).toHaveBeenCalledWith({
        where: { order_id: 201 },
      });
      // The guard keeps times_used from going negative if it was already zeroed.
      expect(prisma.coupons.updateMany).toHaveBeenCalledWith({
        where: { id: 9, times_used: { gt: 0 } },
        data: { times_used: { decrement: 1 } },
      });
    });

    it('cancels an awaiting-payment order', async () => {
      const order = {
        id: 202,
        user_id: 1,
        order_number: 'SANAD-AWAIT',
        status: OrderStatus.PENDING_PAYMENT,
      };
      prisma.orders.findUnique
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: OrderStatus.CANCELLED });

      await service.cancelCustomer(202, 1);

      expect(prisma.orders.updateMany).toHaveBeenCalled();
    });

    it.each([
      OrderStatus.PAID,
      OrderStatus.IN_PROGRESS,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ])('refuses to cancel an order in %s', async (status) => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 203,
        user_id: 1,
        order_number: 'SANAD-X',
        status,
      });

      expect(await errorCode(service.cancelCustomer(203, 1))).toBe(
        'ORDER_CANNOT_BE_CANCELLED',
      );
      expect(prisma.orders.updateMany).not.toHaveBeenCalled();
    });

    // The status is re-checked inside the write, so a payment that lands between
    // the read and the update cannot be cancelled out from under itself.
    it('aborts when the status changed between the read and the write', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 204,
        user_id: 1,
        order_number: 'SANAD-RACE',
        status: OrderStatus.PENDING,
      });
      prisma.orders.updateMany.mockResolvedValue({ count: 0 });

      expect(await errorCode(service.cancelCustomer(204, 1))).toBe(
        'ORDER_CANNOT_BE_CANCELLED',
      );
      expect(prisma.order_status_history.create).not.toHaveBeenCalled();
    });

    it("refuses to cancel another customer's order", async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 205,
        user_id: 99,
        status: OrderStatus.PENDING,
      });

      await expect(service.cancelCustomer(205, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('skips the coupon release when none was applied', async () => {
      const pending = {
        id: 206,
        user_id: 1,
        order_number: 'SANAD-NOCOUPON',
        status: OrderStatus.PENDING,
      };
      prisma.orders.findUnique
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce(pending);
      prisma.coupon_usage.findMany.mockResolvedValue([]);

      await service.cancelCustomer(206, 1);

      expect(prisma.coupon_usage.deleteMany).not.toHaveBeenCalled();
      expect(prisma.coupons.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllAdmin', () => {
    it('searches order number, name, email, and phone', async () => {
      await service.findAllAdmin({
        page: 1,
        limit: 20,
        skip: 0,
        search: 'sara',
      } as never);

      expect(prisma.orders.findMany.mock.calls[0][0].where.OR).toHaveLength(4);
    });

    it('filters by package', async () => {
      await service.findAllAdmin({
        page: 1,
        limit: 20,
        skip: 0,
        package_id: 3,
      } as never);

      expect(prisma.orders.findMany.mock.calls[0][0].where.package_id).toBe(3);
    });

    // An end date is inclusive for the operator: orders placed that afternoon
    // must appear in the report.
    it('extends an end date filter to the end of that day', async () => {
      await service.findAllAdmin({
        page: 1,
        limit: 20,
        skip: 0,
        start_date: '2026-08-01',
        end_date: '2026-08-28',
      } as never);

      const { created_at } = prisma.orders.findMany.mock.calls[0][0].where;
      expect(created_at.gte).toEqual(new Date('2026-08-01'));
      expect(created_at.lte.getHours()).toBe(23);
      expect(created_at.lte.getMinutes()).toBe(59);
    });

    it('lists everything when no filter is supplied', async () => {
      await service.findAllAdmin({ page: 1, limit: 20, skip: 0 } as never);

      expect(prisma.orders.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('findOneAdmin', () => {
    it('throws NotFoundException for an unknown order', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(service.findOneAdmin(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the order with its audit trail', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 9 });

      await service.findOneAdmin(9);

      expect(prisma.orders.findUnique.mock.calls[0][0].include).toHaveProperty(
        'order_status_history',
      );
    });
  });

  describe('updateStatusAdmin — transition matrix', () => {
    const stored = (status: OrderStatus) => ({
      id: 300,
      order_number: 'SANAD-2026-X',
      user_id: 7,
      status,
    });

    it.each([
      [OrderStatus.PENDING, OrderStatus.PAID],
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID],
      [OrderStatus.PAID, OrderStatus.IN_PROGRESS],
      [OrderStatus.PAID, OrderStatus.REFUNDED],
      [OrderStatus.RECEIVED, OrderStatus.AWAITING_INFORMATION],
      [OrderStatus.IN_PROGRESS, OrderStatus.UNDER_REVIEW],
      [OrderStatus.UNDER_REVIEW, OrderStatus.READY],
      [OrderStatus.READY, OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
    ])('allows %s to %s', async (from, to) => {
      prisma.orders.findUnique
        .mockResolvedValueOnce(stored(from))
        .mockResolvedValueOnce({ ...stored(from), status: to });

      await service.updateStatusAdmin(300, 42, { status: to } as never);

      expect(prisma.orders.updateMany).toHaveBeenCalledWith({
        where: { id: 300, status: from },
        data: { status: to },
      });
    });

    it.each([
      [OrderStatus.PENDING, OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED, OrderStatus.PAID],
      [OrderStatus.PAID, OrderStatus.PENDING],
      [OrderStatus.READY, OrderStatus.PAID],
    ])('rejects %s to %s', async (from, to) => {
      prisma.orders.findUnique.mockResolvedValue(stored(from));

      expect(
        await errorCode(
          service.updateStatusAdmin(300, 42, { status: to } as never),
        ),
      ).toBe('INVALID_ORDER_STATUS_TRANSITION');
      expect(prisma.orders.updateMany).not.toHaveBeenCalled();
      expect(prisma.order_status_history.create).not.toHaveBeenCalled();
    });

    // Cancelled and refunded are terminal: money has moved or the order is
    // closed, and reopening it would desynchronise the payment record.
    it.each([OrderStatus.CANCELLED, OrderStatus.REFUNDED])(
      'treats %s as terminal',
      async (from) => {
        prisma.orders.findUnique.mockResolvedValue(stored(from));

        for (const to of [
          OrderStatus.PAID,
          OrderStatus.IN_PROGRESS,
          OrderStatus.COMPLETED,
        ]) {
          expect(
            await errorCode(
              service.updateStatusAdmin(300, 42, { status: to } as never),
            ),
          ).toBe('INVALID_ORDER_STATUS_TRANSITION');
        }
      },
    );

    it('treats a repeat of the current status as a no-op', async () => {
      prisma.orders.findUnique.mockResolvedValue(stored(OrderStatus.PAID));

      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.PAID,
      } as never);

      expect(prisma.orders.updateMany).not.toHaveBeenCalled();
      expect(prisma.admin_activity_log.create).not.toHaveBeenCalled();
    });

    it('rejects a status change on an unknown order', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatusAdmin(300, 42, {
          status: OrderStatus.PAID,
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatusAdmin — side effects', () => {
    const paid = {
      id: 300,
      order_number: 'SANAD-2026-X',
      user_id: 7,
      status: OrderStatus.PAID,
    };

    beforeEach(() => {
      prisma.orders.findUnique
        .mockResolvedValueOnce(paid)
        .mockResolvedValue({ ...paid, status: OrderStatus.IN_PROGRESS });
    });

    it('records the transition in the status history', async () => {
      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.IN_PROGRESS,
        note: 'writer assigned',
      } as never);

      expect(prisma.order_status_history.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          order_id: 300,
          from_status: OrderStatus.PAID,
          to_status: OrderStatus.IN_PROGRESS,
          changed_by: 42,
          note: 'writer assigned',
        }),
      );
    });

    it('attributes the change to the acting admin in the activity log', async () => {
      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.IN_PROGRESS,
      } as never);

      expect(prisma.admin_activity_log.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          admin_id: 42,
          action: 'update_order_status',
          table_name: 'orders',
          record_id: 300,
        }),
      );
    });

    it('notifies the customer in both languages', async () => {
      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.IN_PROGRESS,
      } as never);

      const { data } = prisma.notifications.create.mock.calls[0][0];
      expect(data.user_id).toBe(7);
      expect(data.notification_type).toBe('order_in_progress');
      expect(data.title_ar).toBe('جاري العمل على طلبك');
    });

    it('falls back to a generic Arabic title for an unmapped status', async () => {
      prisma.orders.findUnique.mockReset();
      prisma.orders.findUnique
        .mockResolvedValueOnce({ ...paid, status: OrderStatus.RECEIVED })
        .mockResolvedValue({
          ...paid,
          status: OrderStatus.AWAITING_INFORMATION,
        });

      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.AWAITING_INFORMATION,
      } as never);

      expect(
        prisma.notifications.create.mock.calls[0][0].data.title_ar,
      ).toContain('تحديث حالة الطلب');
    });

    it('skips the notification for a guest order', async () => {
      prisma.orders.findUnique.mockReset();
      prisma.orders.findUnique
        .mockResolvedValueOnce({ ...paid, user_id: null })
        .mockResolvedValue({
          ...paid,
          user_id: null,
          status: OrderStatus.IN_PROGRESS,
        });

      await service.updateStatusAdmin(300, 42, {
        status: OrderStatus.IN_PROGRESS,
      } as never);

      expect(prisma.notifications.create).not.toHaveBeenCalled();
      expect(prisma.order_status_history.create).toHaveBeenCalled();
    });

    // Two admins acting on the same order must not both write history entries
    // claiming to have made the same transition.
    it('aborts when another admin already moved the order', async () => {
      prisma.orders.updateMany.mockResolvedValue({ count: 0 });

      expect(
        await errorCode(
          service.updateStatusAdmin(300, 42, {
            status: OrderStatus.IN_PROGRESS,
          } as never),
        ),
      ).toBe('ORDER_STATUS_CONFLICT');
    });
  });

  describe('updateAdmin', () => {
    it('rejects an update to an unknown order', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAdmin(300, 42, { admin_notes: 'x' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes only the supplied fields', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 300,
        order_number: 'SANAD-2026-X',
      });

      await service.updateAdmin(300, 42, {
        admin_notes: 'call the customer',
      } as never);

      expect(prisma.orders.update.mock.calls[0][0].data).toEqual({
        admin_notes: 'call the customer',
      });
    });

    it('parses a rescheduled delivery date', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 300,
        order_number: 'SANAD-2026-X',
      });

      await service.updateAdmin(300, 42, {
        delivery_date: '2026-09-15',
      } as never);

      expect(
        prisma.orders.update.mock.calls[0][0].data.delivery_date,
      ).toBeInstanceOf(Date);
    });

    it('logs the edit against the acting admin', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 300,
        order_number: 'SANAD-2026-X',
      });

      await service.updateAdmin(300, 42, { notes: 'rush' } as never);

      expect(prisma.admin_activity_log.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          admin_id: 42,
          action: 'update_order_details',
          record_id: 300,
        }),
      );
    });
  });
});
