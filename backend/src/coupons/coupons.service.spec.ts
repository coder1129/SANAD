import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/utils';

const query = (overrides: Partial<PaginationDto> = {}) =>
  Object.assign(new PaginationDto(), overrides);

const coupon = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  code: 'SAVE20',
  is_active: true,
  discount_type: 'percentage',
  discount_value: 20,
  min_order_amount: null,
  max_discount_amount: null,
  usage_limit: null,
  usage_per_user: 1,
  times_used: 0,
  start_date: null,
  end_date: null,
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

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      coupons: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      coupon_usage: { count: vi.fn().mockResolvedValue(0) },
      packages: { findUnique: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    service = new CouponsService(prisma as PrismaService);
  });

  const activePackage = (price = 500) =>
    prisma.packages.findUnique.mockResolvedValue({
      id: 1,
      price,
      is_active: true,
    });

  describe('validateCoupon — eligibility', () => {
    it('rejects an unknown code', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);

      expect(await errorCode(service.validateCoupon('NOPE', 1, 1))).toBe(
        'COUPON_NOT_FOUND',
      );
    });

    it('normalizes the submitted code before lookup', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      activePackage();

      await service.validateCoupon('  save20  ', 1, 1);

      expect(prisma.coupons.findUnique).toHaveBeenCalledWith({
        where: { code: 'SAVE20' },
      });
    });

    it('rejects a deactivated coupon', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ is_active: false }),
      );

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_INACTIVE',
      );
    });

    it('rejects a coupon whose window has not opened', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ start_date: new Date(Date.now() + 86_400_000) }),
      );

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_NOT_STARTED',
      );
    });

    it('rejects a coupon whose window has closed', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ end_date: new Date(Date.now() - 86_400_000) }),
      );

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_EXPIRED',
      );
    });

    it('accepts a coupon inside its window', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({
          start_date: new Date(Date.now() - 86_400_000),
          end_date: new Date(Date.now() + 86_400_000),
        }),
      );
      activePackage();

      await expect(
        service.validateCoupon('SAVE20', 1, 1),
      ).resolves.toEqual(expect.objectContaining({ valid: true }));
    });

    it('rejects a coupon that has reached its global limit', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ usage_limit: 100, times_used: 100 }),
      );

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_LIMIT_REACHED',
      );
    });

    it('accepts a coupon one redemption below its global limit', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ usage_limit: 100, times_used: 99 }),
      );
      activePackage();

      await expect(
        service.validateCoupon('SAVE20', 1, 1),
      ).resolves.toEqual(expect.objectContaining({ valid: true }));
    });

    it('treats a null usage_limit as unlimited', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ usage_limit: null, times_used: 5_000 }),
      );
      activePackage();

      await expect(
        service.validateCoupon('SAVE20', 1, 1),
      ).resolves.toEqual(expect.objectContaining({ valid: true }));
    });

    it('rejects a second redemption by the same customer', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ usage_per_user: 1 }),
      );
      prisma.coupon_usage.count.mockResolvedValue(1);

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 7))).toBe(
        'COUPON_ALREADY_USED',
      );
      expect(prisma.coupon_usage.count).toHaveBeenCalledWith({
        where: { coupon_id: 1, user_id: 7 },
      });
    });

    it('allows a repeat redemption up to usage_per_user', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ usage_per_user: 3 }),
      );
      prisma.coupon_usage.count.mockResolvedValue(2);
      activePackage();

      await expect(
        service.validateCoupon('SAVE20', 1, 7),
      ).resolves.toEqual(expect.objectContaining({ valid: true }));
    });

    // A checkout preview has no authenticated user; the per-user cap is
    // enforced when the order is actually placed.
    it('skips the per-user check for an anonymous preview', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      activePackage();

      await service.validateCoupon('SAVE20', 1, 0);

      expect(prisma.coupon_usage.count).not.toHaveBeenCalled();
    });

    it('rejects a coupon applied to a missing package', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      prisma.packages.findUnique.mockResolvedValue(null);

      expect(await errorCode(service.validateCoupon('SAVE20', 99, 1))).toBe(
        'PACKAGE_INVALID',
      );
    });

    it('rejects a coupon applied to a withdrawn package', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      prisma.packages.findUnique.mockResolvedValue({
        id: 1,
        price: 500,
        is_active: false,
      });

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'PACKAGE_INVALID',
      );
    });

    it('rejects an order below the minimum spend', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ min_order_amount: 600 }),
      );
      activePackage(500);

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_MIN_AMOUNT',
      );
    });

    it('accepts an order exactly at the minimum spend', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ min_order_amount: 500 }),
      );
      activePackage(500);

      await expect(
        service.validateCoupon('SAVE20', 1, 1),
      ).resolves.toEqual(expect.objectContaining({ valid: true }));
    });

    // The minimum is checked against the post-offer subtotal, so a package
    // discounted below the threshold cannot also take the coupon.
    it('checks the minimum against the supplied subtotal, not the list price', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ min_order_amount: 450 }),
      );
      activePackage(500);

      expect(
        await errorCode(
          service.validateCoupon('SAVE20', 1, 1, prisma, { subtotal: 400 }),
        ),
      ).toBe('COUPON_MIN_AMOUNT');
    });
  });

  describe('validateCoupon — discount arithmetic', () => {
    it('computes a percentage discount off the package price', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_type: 'percentage', discount_value: 20 }),
      );
      activePackage(500);

      await expect(service.validateCoupon('SAVE20', 1, 1)).resolves.toEqual(
        expect.objectContaining({
          discountType: 'percentage',
          couponId: 1,
          subtotal: 500,
          discountAmount: 100,
          total: 400,
        }),
      );
    });

    it('caps a percentage discount at max_discount_amount', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 50, max_discount_amount: 100 }),
      );
      activePackage(500);

      const result = await service.validateCoupon('SAVE20', 1, 1);

      expect(result.discountAmount).toBe(100);
      expect(result.total).toBe(400);
    });

    it('leaves a percentage discount below the cap untouched', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 10, max_discount_amount: 100 }),
      );
      activePackage(500);

      expect((await service.validateCoupon('SAVE20', 1, 1)).discountAmount).toBe(
        50,
      );
    });

    it('rejects a percentage coupon configured above 100', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 120 }),
      );
      activePackage(500);

      expect(await errorCode(service.validateCoupon('SAVE20', 1, 1))).toBe(
        'COUPON_VALUE_INVALID',
      );
    });

    it('allows a 100 percent coupon and zeroes the total', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 100 }),
      );
      activePackage(500);

      await expect(service.validateCoupon('SAVE20', 1, 1)).resolves.toEqual(
        expect.objectContaining({ discountAmount: 500, total: 0 }),
      );
    });

    it('rounds a fractional percentage discount to two decimals', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 15 }),
      );
      activePackage(333.33);

      const result = await service.validateCoupon('SAVE20', 1, 1);

      expect(result.discountAmount).toBe(50);
      expect(result.total).toBe(283.33);
    });

    it('computes a fixed discount', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_type: 'fixed', discount_value: 75 }),
      );
      activePackage(500);

      await expect(service.validateCoupon('SAVE20', 1, 1)).resolves.toEqual(
        expect.objectContaining({ discountAmount: 75, total: 425 }),
      );
    });

    // A fixed coupon worth more than the basket must not produce a negative
    // total that would turn into a refund at checkout.
    it('clamps a fixed discount to the subtotal', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_type: 'fixed', discount_value: 900 }),
      );
      activePackage(500);

      const result = await service.validateCoupon('SAVE20', 1, 1);

      expect(result.discountAmount).toBe(500);
      expect(result.total).toBe(0);
    });

    it('applies the discount to the offer-adjusted subtotal when given one', async () => {
      prisma.coupons.findUnique.mockResolvedValue(
        coupon({ discount_value: 10 }),
      );
      activePackage(500);

      const result = await service.validateCoupon('SAVE20', 1, 1, prisma, {
        subtotal: 400,
      });

      expect(result.subtotal).toBe(400);
      expect(result.discountAmount).toBe(40);
      expect(result.total).toBe(360);
    });
  });

  describe('validateCoupon — concurrency', () => {
    // Without the row lock two simultaneous orders can both read times_used
    // below the limit and both redeem the last use of a coupon.
    it('locks the coupon row when reserving inside a transaction', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      activePackage();

      await service.validateCoupon('SAVE20', 1, 1, prisma, {
        lockForUpdate: true,
      });

      const sql = Array.from(prisma.$queryRaw.mock.calls[0][0] as string[]).join(
        ' ',
      );
      expect(sql).toContain('FOR UPDATE');
      expect(prisma.$queryRaw.mock.calls[0][1]).toBe('SAVE20');
    });

    it('does not lock during a read-only preview', async () => {
      prisma.coupons.findUnique.mockResolvedValue(coupon());
      activePackage();

      await service.validateCoupon('SAVE20', 1, 1);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('reads through the supplied transaction client', async () => {
      const tx = {
        coupons: { findUnique: vi.fn().mockResolvedValue(coupon()) },
        coupon_usage: { count: vi.fn().mockResolvedValue(0) },
        packages: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: 1, price: 500, is_active: true }),
        },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };

      await service.validateCoupon('SAVE20', 1, 1, tx as never);

      expect(tx.coupons.findUnique).toHaveBeenCalled();
      expect(prisma.coupons.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findAllAdmin', () => {
    it('searches by code and paginates', async () => {
      prisma.coupons.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.coupons.count.mockResolvedValue(1);

      const result = await service.findAllAdmin(query({ search: 'save' }));

      expect(prisma.coupons.findMany.mock.calls[0][0].where).toEqual({
        code: { contains: 'save', mode: 'insensitive' },
      });
      expect(result.data.meta.total).toBe(1);
    });

    it('lists every coupon when no search term is given', async () => {
      await service.findAllAdmin(query());

      expect(prisma.coupons.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('findOneAdmin', () => {
    it('throws NotFoundException for an unknown id', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);

      await expect(service.findOneAdmin(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the redemption history with the coupon', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });

      await service.findOneAdmin(1);

      expect(prisma.coupons.findUnique.mock.calls[0][0].include).toHaveProperty(
        'coupon_usage',
      );
    });
  });

  describe('create', () => {
    it('rejects a percentage coupon above 100 before touching the database', async () => {
      expect(
        await errorCode(
          service.create({
            code: 'HALF',
            discount_type: 'percentage',
            discount_value: 150,
          } as never),
        ),
      ).toBe('COUPON_VALUE_INVALID');
      expect(prisma.coupons.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a window that ends before it starts', async () => {
      expect(
        await errorCode(
          service.create({
            code: 'WINDOW',
            discount_type: 'fixed',
            discount_value: 50,
            start_date: '2026-03-01T00:00:00.000Z',
            end_date: '2026-02-01T00:00:00.000Z',
          } as never),
        ),
      ).toBe('COUPON_DATE_RANGE_INVALID');
    });

    it('rejects a duplicate code', async () => {
      prisma.coupons.findUnique.mockResolvedValue({ id: 1, code: 'SAVE20' });

      expect(
        await errorCode(
          service.create({
            code: 'save20',
            discount_type: 'percentage',
            discount_value: 20,
          } as never),
        ),
      ).toBe('COUPON_CODE_EXISTS');
      expect(prisma.coupons.create).not.toHaveBeenCalled();
    });

    it('stores the code uppercased and trimmed', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);
      prisma.coupons.create.mockResolvedValue({ id: 2 });

      await service.create({
        code: '  newyear  ',
        discount_type: 'fixed',
        discount_value: 50,
      } as never);

      expect(prisma.coupons.create.mock.calls[0][0].data.code).toBe('NEWYEAR');
    });

    it('applies defaults for the optional limits', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);
      prisma.coupons.create.mockResolvedValue({ id: 2 });

      await service.create({
        code: 'NEWYEAR',
        discount_type: 'fixed',
        discount_value: 50,
      } as never);

      expect(prisma.coupons.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          min_order_amount: 0,
          usage_per_user: 1,
          is_active: true,
          start_date: null,
          end_date: null,
        }),
      );
    });
  });

  describe('update', () => {
    it('validates the merged definition, not just the patch', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        discount_type: 'percentage',
        discount_value: 20,
        start_date: null,
        end_date: null,
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });

      expect(
        await errorCode(service.update(1, { discount_value: 150 } as never)),
      ).toBe('COUPON_VALUE_INVALID');
      expect(prisma.coupons.update).not.toHaveBeenCalled();
    });

    it('validates a new end date against the stored start date', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        discount_type: 'fixed',
        discount_value: 50,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });

      expect(
        await errorCode(
          service.update(1, { end_date: '2026-02-01T00:00:00.000Z' } as never),
        ),
      ).toBe('COUPON_DATE_RANGE_INVALID');
    });

    it('writes only the supplied fields', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        discount_type: 'fixed',
        discount_value: 50,
        start_date: null,
        end_date: null,
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });
      prisma.coupons.update.mockResolvedValue({ id: 1 });

      await service.update(1, { is_active: false } as never);

      expect(prisma.coupons.update.mock.calls[0][0].data).toEqual({
        is_active: false,
      });
    });

    it('uppercases a renamed code', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        discount_type: 'fixed',
        discount_value: 50,
        start_date: null,
        end_date: null,
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });
      prisma.coupons.update.mockResolvedValue({ id: 1 });

      await service.update(1, { code: ' summer ' } as never);

      expect(prisma.coupons.update.mock.calls[0][0].data.code).toBe('SUMMER');
    });

    it('rejects an update to a missing coupon', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);

      await expect(
        service.update(9, { is_active: false } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    // Deleting a redeemed coupon would orphan the discount recorded on past
    // orders, so a used coupon is only deactivated.
    it('deactivates a coupon that has been redeemed', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        coupon_usage: [],
        _count: { coupon_usage: 3 },
      });
      prisma.coupons.update.mockResolvedValue({ id: 1, is_active: false });

      await service.remove(1);

      expect(prisma.coupons.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { is_active: false },
      });
      expect(prisma.coupons.delete).not.toHaveBeenCalled();
    });

    it('deletes a coupon that was never redeemed', async () => {
      prisma.coupons.findUnique.mockResolvedValue({
        id: 1,
        coupon_usage: [],
        _count: { coupon_usage: 0 },
      });
      prisma.coupons.delete.mockResolvedValue({ id: 1 });

      await service.remove(1);

      expect(prisma.coupons.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.coupons.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown coupon', async () => {
      prisma.coupons.findUnique.mockResolvedValue(null);

      await expect(service.remove(9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
