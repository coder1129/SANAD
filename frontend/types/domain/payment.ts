export type CheckoutPaymentMethod = 'card' | 'apple_pay';

export interface CreatePaymentInput {
  orderId: number;
  paymentMethod: CheckoutPaymentMethod;
  returnUrl?: string;
}

export interface PaymentResult {
  paymentId: number;
  transactionId: string;
  paymentUrl: string | null;
  amount: number;
  chargedAmount: number | null;
  currency: string;
  status: string;
  bypassed: boolean;
  requiresPayment: boolean;
  reused: boolean;
}
