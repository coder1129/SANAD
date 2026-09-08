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

    const primaryPrice = Number(pkg.price);
    let secondaryPackage: typeof pkg | null = null;
    let secondaryOriginalPrice = 0;
    let secondaryDiscountAmount = 0;
    if (dto.secondary_package_id) {
      if (dto.secondary_package_id === pkg.id) {
        throw new BadRequestException({ message: 'Choose a different second service', code: 'SECONDARY_PACKAGE_INVALID' });
      }
      secondaryPackage = await client.packages.findUnique({ where: { id: dto.secondary_package_id } });
      if (!secondaryPackage?.is_active) {
        throw new BadRequestException({ message: 'This second service is unavailable', code: 'SECONDARY_PACKAGE_INACTIVE' });
      }
      secondaryOriginalPrice = Number(secondaryPackage.price);
    }
    const originalPrice = primaryPrice + secondaryOriginalPrice;
    let priceAfterOffer = originalPrice;
    let appliedOfferId: number | null = null;
    let offerDiscountPercentage = 0;
    let offerDiscountAmount = 0;

    // 2. Check & validate active offer
    const now = new Date();
    let offer = null;

    if (secondaryPackage) {
      offer = await client.offers.findFirst({
        where: {
          trigger_package_id: pkg.id,
          is_active: true,
          start_date: { lte: now },
          end_date: { gte: now },
          OR: [
            { offer_type: 'cross_service_any' },
            { offer_type: 'cross_service_specific', package_id: secondaryPackage.id },
          ],
        },
        orderBy: { discount_percentage: 'desc' },
      });
      if (!offer) {
        throw new BadRequestException({ message: 'No active offer applies to this second service', code: 'CROSS_SERVICE_OFFER_NOT_FOUND' });
      }
    } else if (dto.offer_id) {
      offer = await client.offers.findFirst({
        where: {
          id: dto.offer_id,
          package_id: pkg.id,
          offer_type: 'standard',
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
          offer_type: 'standard',
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
      const discountBase = secondaryPackage ? secondaryOriginalPrice : originalPrice;
      offerDiscountAmount = Math.round(((discountBase * offerDiscountPercentage) / 100) * 100) / 100;
      secondaryDiscountAmount = secondaryPackage ? offerDiscountAmount : 0;
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
      secondary_package_id: secondaryPackage?.id ?? null,
      secondary_package_name_ar: secondaryPackage?.name_ar ?? null,
      secondary_package_name_en: secondaryPackage?.name_en ?? null,
      secondary_original_price: secondaryOriginalPrice,
      secondary_discount_amount: secondaryDiscountAmount,
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
