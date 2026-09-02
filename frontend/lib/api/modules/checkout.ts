import { z } from 'zod';

import type { CheckoutPreviewInput, CheckoutPricing } from '@/types/domain';

import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const decimalSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());

const pricingPayloadSchema = z.object({
  package_id: z.number().int().positive(),
  package_name_en: z.string().min(1),
  delivery_days: z.number().int().positive(),
  original_price: decimalSchema,
  offer_id: z.number().int().positive().nullable(),
  offer_discount_percentage: decimalSchema.pipe(z.number().max(100)),
  offer_discount_amount: decimalSchema,
  coupon_code: z.string().nullable(),
  coupon_discount_amount: decimalSchema,
  subtotal_after_discounts: decimalSchema,
  vat_percentage: decimalSchema.pipe(z.number().max(100)),
  vat_amount: decimalSchema,
  total_amount: decimalSchema,
  final_amount: decimalSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
});

type PricingPayload = z.infer<typeof pricingPayloadSchema>;
type PreviewRequestOptions = Pick<ApiRequestOptions, 'signal'>;

function toCheckoutPricing(payload: PricingPayload): CheckoutPricing {
  return {
    packageId: payload.package_id,
    packageName: payload.package_name_en,
    deliveryDays: payload.delivery_days,
    originalPrice: payload.original_price,
    offerId: payload.offer_id,
    offerDiscountPercentage: payload.offer_discount_percentage,
    offerDiscountAmount: payload.offer_discount_amount,
    couponCode: payload.coupon_code,
    couponDiscountAmount: payload.coupon_discount_amount,
    subtotalAfterDiscounts: payload.subtotal_after_discounts,
    vatPercentage: payload.vat_percentage,
    vatAmount: payload.vat_amount,
    totalAmount: payload.total_amount,
    finalAmount: payload.final_amount,
    currency: payload.currency,
  };
}

export const checkoutApi = {
  async preview(
    input: CheckoutPreviewInput,
    options: PreviewRequestOptions = {},
  ): Promise<CheckoutPricing> {
    const payload = await api.post<unknown>(
      '/checkout/preview',
      {
        package_id: input.packageId,
        ...(input.offerId === undefined ? {} : { offer_id: input.offerId }),
        ...(input.couponCode === undefined
          ? {}
          : { coupon_code: input.couponCode }),
      },
      { authMode: 'none', signal: options.signal },
    );
    const result = pricingPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected response shape from POST /checkout/preview',
      });
    }

    return toCheckoutPricing(result.data);
  },
};
