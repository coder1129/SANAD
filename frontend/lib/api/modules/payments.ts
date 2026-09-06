import { z } from 'zod';

import type { CreatePaymentInput, PaymentResult } from '@/types/domain';

import { ApiError } from '../errors';
import { api } from '../request';

const decimalSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());

const paymentPayloadSchema = z.object({
  payment_id: z.number().int().positive(),
  transaction_id: z.string().min(1),
  payment_url: z.string().url().nullable().optional(),
  amount: decimalSchema,
  charged_amount: decimalSchema.nullish(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.string().min(1),
  bypassed: z.boolean().optional(),
  requires_payment: z.boolean().optional(),
  reused: z.boolean().optional(),
});

export const paymentsApi = {
  async create(input: CreatePaymentInput): Promise<PaymentResult> {
    const payload = await api.post<unknown>(
      '/payments/create',
      {
        order_id: input.orderId,
        payment_method: input.paymentMethod,
        ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
      },
      { authMode: 'session' },
    );

    const result = paymentPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected response shape from POST /payments/create',
      });
    }

    return {
      paymentId: result.data.payment_id,
      transactionId: result.data.transaction_id,
      paymentUrl: result.data.payment_url ?? null,
      amount: result.data.amount,
      chargedAmount: result.data.charged_amount ?? null,
      currency: result.data.currency,
      status: result.data.status,
      bypassed: result.data.bypassed === true,
      requiresPayment: result.data.requires_payment !== false,
      reused: result.data.reused === true,
    };
  },
};
