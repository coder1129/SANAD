export interface CreatePaymentParams {
  orderId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface PaymentIntentResult {
  transactionId: string;
  paymentUrl: string;
  provider: string;
  amount: number;
  currency: string;
}

export interface WebhookEventPayload {
  transactionId: string;
  orderId: number;
  status: 'paid' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  rawPayload: Record<string, any>;
}

export interface PaymentProvider {
  createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntentResult>;
  verifyWebhook(
    payload: any,
    signature: string,
    rawBody: Buffer,
  ): Promise<WebhookEventPayload>;
}
