export interface CheckoutPreviewInput {
  packageId: number;
  offerId?: number;
  couponCode?: string;
  secondaryPackageId?: number;
}

export interface CheckoutPricing {
  packageId: number;
  packageName: string;
  deliveryDays: number;
  originalPrice: number;
  secondaryPackageId: number | null;
  secondaryPackageName: string | null;
  secondaryPackageNameAr?: string | null;
  secondaryOriginalPrice: number;
  secondaryDiscountAmount: number;
  offerId: number | null;
  offerDiscountPercentage: number;
  offerDiscountAmount: number;
  couponCode: string | null;
  couponDiscountAmount: number;
  subtotalAfterDiscounts: number;
  totalAmount: number;
  finalAmount: number;
  currency: string;
}
