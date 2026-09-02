export interface CheckoutPreviewInput {
  packageId: number;
  offerId?: number;
  couponCode?: string;
}

export interface CheckoutPricing {
  packageId: number;
  packageName: string;
  deliveryDays: number;
  originalPrice: number;
  offerId: number | null;
  offerDiscountPercentage: number;
  offerDiscountAmount: number;
  couponCode: string | null;
  couponDiscountAmount: number;
  subtotalAfterDiscounts: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  finalAmount: number;
  currency: string;
}
