import { z } from 'zod';
import type { PaginatedData } from '@/types/api';
import type {
  PackageReview,
  ReviewStatus,
  ReviewSummary,
} from '@/types/domain';
import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const reviewSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  package_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  status: z.enum(['pending', 'published', 'hidden']),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  customer_display_name: z.string().optional(),
  verified_customer: z.boolean().optional(),
  package: z.object({ id: z.number(), name_en: z.string() }).optional(),
  order: z
    .object({ id: z.number(), order_number: z.string(), status: z.string() })
    .optional(),
  user: z
    .object({
      id: z.number().optional(),
      name: z.string(),
      email: z.string().optional(),
    })
    .optional(),
});

function toReview(value: z.infer<typeof reviewSchema>): PackageReview {
  return {
    id: value.id,
    userId: value.user_id,
    packageId: value.package_id,
    orderId: value.order_id,
    rating: value.rating,
    comment: value.comment,
    status: value.status,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
    customerDisplayName: value.customer_display_name,
    verifiedCustomer: value.verified_customer,
    packageName: value.package?.name_en,
    orderNumber: value.order?.order_number,
    customerName: value.user?.name,
    customerEmail: value.user?.email,
  };
}

const metaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
const publicListSchema = z.object({
  items: z.array(reviewSchema),
  meta: metaSchema,
  summary: z.object({
    average_rating: z.number(),
    total_reviews: z.number(),
    distribution: z.record(z.string(), z.number()),
  }),
});
const nullableReviewSchema = reviewSchema.nullable();

function parseReview(payload: unknown, endpoint: string): PackageReview {
  const result = reviewSchema.safeParse(payload);
  if (!result.success)
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response from ${endpoint}`,
    });
  return toReview(result.data);
}

export const reviewKeys = {
  public: (packageId?: number) =>
    ['reviews', 'public', packageId ?? 'all'] as const,
  order: (orderId: number) => ['reviews', 'order', orderId] as const,
  admin: (filters: Record<string, unknown>) =>
    ['admin', 'reviews', filters] as const,
};

export const reviewsApi = {
  async listPublic(
    params: { page?: number; limit?: number; packageId?: number } = {},
    options: Pick<ApiRequestOptions, 'signal'> = {},
  ): Promise<PaginatedData<PackageReview> & { summary: ReviewSummary }> {
    const payload = await api.get<unknown>('/reviews/public', {
      authMode: 'none',
      signal: options.signal,
      params: {
        page: params.page,
        limit: params.limit,
        package_id: params.packageId,
      },
    });
    const result = publicListSchema.safeParse(payload);
    if (!result.success)
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected public reviews response',
      });
    return {
      items: result.data.items.map(toReview),
      meta: result.data.meta,
      summary: {
        averageRating: result.data.summary.average_rating,
        totalReviews: result.data.summary.total_reviews,
        distribution: Object.fromEntries(
          Object.entries(result.data.summary.distribution).map(
            ([key, value]) => [Number(key), value],
          ),
        ),
      },
    };
  },
  async getForOrder(
    orderId: number,
    options: Pick<ApiRequestOptions, 'signal'> = {},
  ): Promise<PackageReview | null> {
    const result = nullableReviewSchema.safeParse(
      await api.get<unknown>(`/reviews/order/${orderId}`, options),
    );
    if (!result.success)
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected order review response',
      });
    return result.data ? toReview(result.data) : null;
  },
  async create(input: {
    orderId: number;
    rating: number;
    comment: string;
  }): Promise<PackageReview> {
    return parseReview(
      await api.post<unknown>('/reviews', {
        order_id: input.orderId,
        rating: input.rating,
        comment: input.comment,
      }),
      'POST /reviews',
    );
  },
  async update(
    id: number,
    input: { rating: number; comment: string },
  ): Promise<PackageReview> {
    return parseReview(
      await api.patch<unknown>(`/reviews/${id}`, input),
      `PATCH /reviews/${id}`,
    );
  },
  async listAdmin(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: ReviewStatus;
    } = {},
    options: Pick<ApiRequestOptions, 'signal'> = {},
  ): Promise<PaginatedData<PackageReview>> {
    const schema = z.object({ items: z.array(reviewSchema), meta: metaSchema });
    const result = schema.safeParse(
      await api.get<unknown>('/admin/reviews', {
        params,
        signal: options.signal,
      }),
    );
    if (!result.success)
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected admin reviews response',
      });
    return { items: result.data.items.map(toReview), meta: result.data.meta };
  },
  async moderate(
    id: number,
    status: 'published' | 'hidden',
  ): Promise<PackageReview> {
    return parseReview(
      await api.patch<unknown>(`/admin/reviews/${id}/status`, { status }),
      `PATCH /admin/reviews/${id}/status`,
    );
  },
};
