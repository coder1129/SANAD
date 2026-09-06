import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { CheckoutPreviewDto, PricingBreakdown } from './dto';
import { Prisma } from '@prisma/client';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
  ) {}

  async calculatePricing(
    dto: CheckoutPreviewDto,
    userId?: number,
    client: PrismaClientLike = this.prisma,
    lockCoupon = false,
  ): Promise<PricingBreakdown> {
    // 1. Fetch Package from DB - Never trust client price
    const pkg = await client.packages.findUnique({
      where: { id: dto.package_id },
    });

    if (!pkg) {
      throw new NotFoundException({
        message: 'Package not found',
        code: 'PACKAGE_NOT_FOUND',
      });
    }

    if (!pkg.is_active) {
      throw new BadRequestException({
        message: 'This package is currently unavailable for purchase',
        code: 'PACKAGE_INACTIVE',
      });
    }

    const originalPrice = Number(pkg.price);
    let priceAfterOffer = originalPrice;
    let appliedOfferId: number | null = null;
    let offerDiscountPercentage = 0;
    let offerDiscountAmount = 0;

    // 2. Check & validate active offer
    const now = new Date();
    let offer = null;

    if (dto.offer_id) {
      offer = await client.offers.findFirst({
        where: {
          id: dto.offer_id,
          package_id: pkg.id,
          is_active: true,
          start_date: { lte: now },
          end_date: { gte: now },
        },
      });
    } else {
      // Find default active offer for this package if exists
      offer = await client.offers.findFirst({
        where: {
          package_id: pkg.id,
          is_active: true,
          start_date: { lte: now },
          end_date: { gte: now },
        },
        orderBy: { discount_percentage: 'desc' },
      });
    }

    if (offer) {
      appliedOfferId = offer.id;
      offerDiscountPercentage = Number(offer.discount_percentage);
      offerDiscountAmount =
        Math.round(((originalPrice * offerDiscountPercentage) / 100) * 100) /
        100;
      priceAfterOffer = Math.max(0, originalPrice - offerDiscountAmount);
    }

    // 3. Check & validate coupon if provided
    let couponDiscountAmount = 0;
    let validatedCouponCode: string | null = null;

    if (dto.coupon_code && dto.coupon_code.trim()) {
      const code = dto.coupon_code.trim().toUpperCase();
      const couponResult = await this.couponsService.validateCoupon(
        code,
        pkg.id,
        userId || 0,
        client,
        { lockForUpdate: lockCoupon, subtotal: priceAfterOffer },
      );

      if (couponResult.valid) {
        validatedCouponCode = code;
        couponDiscountAmount = couponResult.discountAmount;
      }
    }

    const subtotalAfterDiscounts = Math.max(
      0,
      Math.round((priceAfterOffer - couponDiscountAmount) * 100) / 100,
    );

    const totalAmount = subtotalAfterDiscounts;
    const finalAmount = totalAmount;

    // Currency
    const currencySetting = await client.settings.findUnique({
      where: { setting_key: 'currency' },
    });
    const currency = currencySetting?.setting_value || 'AED';

    return {
      package_id: pkg.id,
      package_name_ar: pkg.name_ar,
      package_name_en: pkg.name_en,
      delivery_days: pkg.delivery_days,
      original_price: originalPrice,
      offer_id: appliedOfferId,
      offer_discount_percentage: offerDiscountPercentage,
      offer_discount_amount: offerDiscountAmount,
      coupon_code: validatedCouponCode,
      coupon_discount_amount: couponDiscountAmount,
      subtotal_after_discounts: subtotalAfterDiscounts,
      total_amount: totalAmount,
      final_amount: finalAmount,
      currency,
    };
  }
}
