import * as crypto from 'crypto';

export const PAYMENT_BYPASS_PROVIDER = 'bypass';
export const PAYMENT_BYPASS_TRANSACTION_PREFIX = 'bypass_';

export function createPaymentBypassTransactionId(): string {
  return `${PAYMENT_BYPASS_TRANSACTION_PREFIX}${Date.now()}_${crypto
    .randomBytes(8)
    .toString('hex')}`;
}

export function createPaymentBypassResponse(
  orderAmount: number,
  currency = 'AED',
) {
  return {
    provider: 'temporary_payment_bypass',
    bypassed: true,
    reason: 'company_payment_account_pending',
    orderAmount,
    chargedAmount: 0,
    currency,
  };
}
