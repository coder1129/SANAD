import { z } from 'zod';

import type { PaginatedData, PaginationParams } from '@/types/api';
import type { CreateOrderInput, CustomerOrder } from '@/types/domain';

import { ApiError } from '../errors';
import { api } from '../request';

const decimalSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());

const orderPayloadSchema = z.object({
  id: z.number().int().positive(),
  order_number: z.string().min(1),
  package_id: z.number().int().positive().nullish(),
  customer_name: z.string(),
  customer_email: z.string().email(),
  customer_phone: z.string().nullish(),
  status: z.string().min(1),
  original_amount: decimalSchema,
  discount_amount: decimalSchema,
  total_amount: decimalSchema,
  final_amount: decimalSchema,
  coupon_code: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  package: z
    .object({
      id: z.number().int().positive(),
      name_en: z.string(),
      name_ar: z.string().nullish(),
    })
    .passthrough()
    .nullish(),
  offer: z
    .object({ name_en: z.string(), name_ar: z.string().nullish() })
    .passthrough()
    .nullish(),
  offers: z
    .object({ name_en: z.string(), name_ar: z.string().nullish() })
    .passthrough()
    .nullish(),
  payments: z
    .array(
      z
        .object({
          id: z.number().int().positive(),
          transaction_id: z.string(),
          payment_method: z.string(),
          amount: decimalSchema,
          currency: z.string().nullish(),
          status: z.string(),
          payment_date: z.string().nullish(),
          created_at: z.string().nullish(),
        })
        .passthrough(),
    )
    .nullish(),
  order_status_history: z
    .array(
      z.object({
        id: z.number().int().positive(),
        from_status: z.string().nullish(),
        to_status: z.string(),
        note: z.string().nullish(),
        created_at: z.string().nullish(),
      }),
    )
    .nullish(),
});

const orderListPayloadSchema = z.object({
  items: z.array(orderPayloadSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

function toCustomerOrder(
  payload: z.infer<typeof orderPayloadSchema>,
): CustomerOrder {
  return {
    id: payload.id,
    orderNumber: payload.order_number,
    packageId: payload.package_id ?? null,
    packageName: payload.package?.name_en ?? null,
    packageNameAr: payload.package?.name_ar ?? null,
    customerName: payload.customer_name,
    customerEmail: payload.customer_email,
    customerPhone: payload.customer_phone ?? '',
    status: payload.status,
    originalAmount: payload.original_amount,
    discountAmount: payload.discount_amount,
    totalAmount: payload.total_amount,
    finalAmount: payload.final_amount,
    couponCode: payload.coupon_code ?? null,
    createdAt: payload.created_at ?? null,
    updatedAt: payload.updated_at ?? null,
    paymentStatus:
      payload.payments?.find(
        (payment) =>
          ['paid', 'success'].includes(payment.status) && payment.amount > 0,
      )?.status ?? 'pending',
    currency: payload.payments?.[0]?.currency ?? 'AED',
    offerName: payload.offer?.name_en ?? payload.offers?.name_en ?? null,
    offerNameAr: payload.offer?.name_ar ?? payload.offers?.name_ar ?? null,
    payments: (payload.payments ?? []).map((payment) => ({
      id: payment.id,
      transactionId: payment.transaction_id,
      paymentMethod: payment.payment_method,
      amount: payment.amount,
      currency: payment.currency ?? 'AED',
      status: payment.status,
      paymentDate: payment.payment_date ?? null,
      createdAt: payment.created_at ?? null,
    })),
    statusHistory: (payload.order_status_history ?? []).map((history) => ({
      id: history.id,
      fromStatus: history.from_status ?? null,
      toStatus: history.to_status,
      note: history.note ?? null,
      createdAt: history.created_at ?? null,
    })),
  };
}

function parseOrder(payload: unknown, endpoint: string): CustomerOrder {
  const result = orderPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response shape from ${endpoint}`,
    });
  }
  return toCustomerOrder(result.data);
}

export const ordersApi = {
  async create(input: CreateOrderInput): Promise<CustomerOrder> {
    const requirements = input.requirements
      ? {
          ...(input.requirements.targetJobTitle
            ? { target_job_title: input.requirements.targetJobTitle }
            : {}),
          ...(input.requirements.targetIndustry
            ? { target_industry: input.requirements.targetIndustry }
            : {}),
          ...(input.requirements.careerGoals
            ? { career_goals: input.requirements.careerGoals }
            : {}),
        }
      : undefined;

    const payload = await api.post<unknown>(
      '/orders',
      {
        package_id: input.packageId,
        ...(input.offerId === undefined ? {} : { offer_id: input.offerId }),
        ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
        ...(input.secondaryPackageId === undefined
          ? {}
          : { secondary_package_id: input.secondaryPackageId }),
        customer_phone: input.customerPhone,
        ...(input.notes ? { notes: input.notes } : {}),
        ...(requirements && Object.keys(requirements).length > 0
          ? { requirements }
          : {}),
      },
      { authMode: 'session' },
    );

    return parseOrder(payload, 'POST /orders');
  },

  async list(
    params: PaginationParams & { status?: string } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<PaginatedData<CustomerOrder>> {
    const result = orderListPayloadSchema.safeParse(
      await api.get<unknown>('/orders', { params, signal: options.signal }),
    );
    if (!result.success)
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected response shape from GET /orders',
      });
    return {
      items: result.data.items.map(toCustomerOrder),
      meta: result.data.meta,
    };
  },

  async getById(
    id: number,
    options: { signal?: AbortSignal } = {},
  ): Promise<CustomerOrder> {
    return parseOrder(
      await api.get<unknown>(`/orders/${id}`, { signal: options.signal }),
      `GET /orders/${id}`,
    );
  },

  async getByNumber(
    orderNumber: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<CustomerOrder> {
    return parseOrder(
      await api.get<unknown>(
        `/orders/number/${encodeURIComponent(orderNumber)}`,
        { signal: options.signal },
      ),
      `GET /orders/number/${orderNumber}`,
    );
  },
};

export const orderKeys = {
  lists: () => ['orders', 'list'] as const,
  list: (params: Record<string, unknown>) =>
    ['orders', 'list', params] as const,
  detail: (id: number) => ['orders', 'detail', id] as const,
  number: (orderNumber: string) => ['orders', 'number', orderNumber] as const,
};
