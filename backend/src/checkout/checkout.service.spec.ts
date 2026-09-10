import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: any;
  let couponsService: any;

  beforeEach(() => {
    prisma = {
      packages: {
        findUnique: vi.fn(),
      },
      offers: {
        findFirst: vi.fn(),
      },
      settings: {
        findUnique: vi.fn(),
      },
    };
    couponsService = {
      validateCoupon: vi.fn(),
    };
    service = new CheckoutService(
      prisma as PrismaService,
      couponsService as CouponsService,
    );
  });

  describe('calculatePricing', () => {
    it('should throw if package is inactive', async () => {
      prisma.packages.findUnique.mockResolvedValue({
        id: 1,
        is_active: false,
        price: 300,
      });

      await expect(service.calculatePricing({ package_id: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate base price correctly', async () => {
      prisma.packages.findUnique.mockResolvedValue({
        id: 1,
        name_ar: 'الباقة المتقدمة',
        name_en: 'Advanced Package',
        price: 1000,
        delivery_days: 5,
        is_active: true,
      });
      prisma.offers.findFirst.mockResolvedValue(null);
      prisma.settings.findUnique.mockImplementation(({ where }: any) => {
        if (where.setting_key === 'currency')
          return Promise.resolve({ setting_value: 'AED' });
        return Promise.resolve(null);
      });

      const pricing = await service.calculatePricing({ package_id: 1 });
      expect(pricing.original_price).toBe(1000);
      expect(pricing.offer_discount_amount).toBe(0);
      expect(pricing.coupon_discount_amount).toBe(0);
      expect(pricing.subtotal_after_discounts).toBe(1000);
      expect(pricing.total_amount).toBe(1000);
      expect(pricing.currency).toBe('AED');
    });

    it('should apply offer and coupon cumulatively server-side', async () => {
      prisma.packages.findUnique.mockResolvedValue({
        id: 2,
        name_ar: 'باقة السيرة الذاتية',
        name_en: 'CV Package',
        price: 500,
        delivery_days: 3,
        is_active: true,
      });
      prisma.offers.findFirst.mockResolvedValue({
        id: 10,
        discount_percentage: 20, // 20% off 500 = 100
      });
      couponsService.validateCoupon.mockResolvedValue({
        valid: true,
        discountAmount: 50,
      });
      prisma.settings.findUnique.mockImplementation(({ where }: any) => {
        if (where.setting_key === 'currency')
          return Promise.resolve({ setting_value: 'AED' });
        return Promise.resolve(null);
      });

      const pricing = await service.calculatePricing({
        package_id: 2,
        coupon_code: 'SAVE50',
      });

      expect(pricing.original_price).toBe(500);
      expect(pricing.offer_discount_amount).toBe(100);
      expect(pricing.coupon_discount_amount).toBe(50);
      expect(pricing.subtotal_after_discounts).toBe(350);
      expect(pricing.final_amount).toBe(350);
    });

    it('applies a cross-service discount only to the selected second service', async () => {
      prisma.packages.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(
          where.id === 1
            ? {
                id: 1,
                name_ar: 'الخدمة الأساسية',
                name_en: 'Primary service',
                price: 600,
                delivery_days: 3,
                is_active: true,
              }
            : {
                id: 2,
                name_ar: 'الخدمة الثانية',
                name_en: 'Second service',
                price: 400,
                delivery_days: 5,
                is_active: true,
              },
        ),
      );
      prisma.offers.findFirst.mockResolvedValue({
        id: 12,
        discount_percentage: 20,
      });
      prisma.settings.findUnique.mockResolvedValue({ setting_value: 'AED' });

      const pricing = await service.calculatePricing({
        package_id: 1,
        secondary_package_id: 2,
      });

      expect(prisma.offers.findFirst.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ trigger_package_id: 1 }),
      );
      expect(pricing.original_price).toBe(1000);
      expect(pricing.secondary_original_price).toBe(400);
      expect(pricing.secondary_discount_amount).toBe(80);
      expect(pricing.final_amount).toBe(920);
      expect(pricing.delivery_days).toBe(5);
    });
  });
});
