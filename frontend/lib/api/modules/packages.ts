import { z } from 'zod';

import type { PaginatedData, PaginationParams } from '@/types/api';
import type {
  CareerPackage,
  CompanionOffer,
  PackageImage,
  PackageOffer,
} from '@/types/domain';
import { getApiBaseUrl } from '@/lib/env/public-env';

import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const decimalSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());

const packageImagePayloadSchema = z.object({
  id: z.number().int().positive(),
  image_path: z.string().min(1),
  image_url: z.string().min(1).nullish(),
  alt_text: z.string().nullish(),
  is_primary: z.boolean().nullish(),
  display_order: z.number().int().nullish(),
});

const packageOfferPayloadSchema = z.object({
  id: z.number().int().positive(),
  name_en: z.string().min(1),
  name_ar: z.string().nullish(),
  description_en: z.string().nullish(),
  discount_percentage: decimalSchema.pipe(z.number().max(100)),
});
const companionOfferPayloadSchema = packageOfferPayloadSchema.extend({
  offer_type: z.enum(['cross_service_any', 'cross_service_specific']),
  package: z
    .object({
      id: z.number().int().positive(),
      name_en: z.string(),
      name_ar: z.string().nullish(),
    })
    .nullish(),
});

const packagePayloadSchema = z.object({
  id: z.number().int().positive(),
  name_en: z.string().min(1),
  name_ar: z.string().nullish(),
  description_ar: z.string().nullish(),
  features_ar: z.array(z.string()).nullish(),
  description_en: z.string().nullish(),
  price: decimalSchema,
  features_en: z.array(z.string().min(1)).nullish(),
  delivery_days: z.number().int().positive(),
  max_revisions: z.number().int().nonnegative().nullish(),
  sort_order: z.number().int().nullish(),
  buyer_count: z.number().int().nonnegative().nullish(),
  rating_average: decimalSchema.pipe(z.number().max(5)).nullish(),
  rating_count: z.number().int().nonnegative().nullish(),
  package_images: z.array(packageImagePayloadSchema).nullish(),
  offers: z.array(packageOfferPayloadSchema).nullish(),
  triggered_offers: z.array(companionOfferPayloadSchema).nullish(),
});

const packageListPayloadSchema = z.object({
  items: z.array(packagePayloadSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

type PackagePayload = z.infer<typeof packagePayloadSchema>;
type PackageImagePayload = z.infer<typeof packageImagePayloadSchema>;
type PackageOfferPayload = z.infer<typeof packageOfferPayloadSchema>;
type CompanionOfferPayload = z.infer<typeof companionOfferPayloadSchema>;

function toPackageImage(payload: PackageImagePayload): PackageImage {
  const imageUrl = payload.image_url ?? null;

  return {
    id: payload.id,
    path: payload.image_path,
    url: imageUrl === null ? null : resolveImageUrl(imageUrl),
    altText: payload.alt_text ?? null,
    isPrimary: payload.is_primary === true,
    displayOrder: payload.display_order ?? 0,
  };
}

function resolveImageUrl(value: string): string {
  if (/^https?:\/\//i.test(value) || value.startsWith('/images/')) {
    return value;
  }

  if (value.startsWith('/')) {
    return new URL(value, getApiBaseUrl()).toString();
  }

  return value;
}

function toPackageOffer(payload: PackageOfferPayload): PackageOffer {
  return {
    id: payload.id,
    name: payload.name_en,
    nameAr: payload.name_ar,
    description: payload.description_en ?? null,
    discountPercentage: payload.discount_percentage,
  };
}
function toCompanionOffer(payload: CompanionOfferPayload): CompanionOffer {
  return {
    ...toPackageOffer(payload),
    type: payload.offer_type,
    packageId: payload.package?.id ?? null,
  };
}

function toCareerPackage(payload: PackagePayload): CareerPackage {
  return {
    id: payload.id,
    name: payload.name_en,
    nameAr: payload.name_ar,
    descriptionAr: payload.description_ar,
    featuresAr: payload.features_ar ?? [],
    description: payload.description_en ?? null,
    price: payload.price,
    features: payload.features_en ?? [],
    deliveryDays: payload.delivery_days,
    maxRevisions: payload.max_revisions ?? 0,
    sortOrder: payload.sort_order ?? 0,
    images: (payload.package_images ?? []).map(toPackageImage),
    offers: (payload.offers ?? []).map(toPackageOffer),
    companionOffers: (payload.triggered_offers ?? []).map(toCompanionOffer),
    buyerCount: payload.buyer_count ?? 0,
    ratingAverage: payload.rating_average ?? null,
    ratingCount: payload.rating_count ?? 0,
  };
}

function parsePayload<T>(
  schema: z.ZodType<T>,
  payload: unknown,
  endpoint: string,
): T {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response shape from ${endpoint}`,
    });
  }

  return result.data;
}

type PublicRequestOptions = Pick<ApiRequestOptions, 'signal'>;

export const packagesApi = {
  async list(
    params: PaginationParams = {},
    options: PublicRequestOptions = {},
  ): Promise<PaginatedData<CareerPackage>> {
    const payload = await api.get<unknown>('/packages', {
      authMode: 'none',
      params: { limit: 100, ...params },
      signal: options.signal,
    });
    const parsed = parsePayload(
      packageListPayloadSchema,
      payload,
      'GET /packages',
    );

    return {
      items: parsed.items.map(toCareerPackage),
      meta: parsed.meta,
    };
  },

  async getById(
    id: number,
    options: PublicRequestOptions = {},
  ): Promise<CareerPackage> {
    const payload = await api.get<unknown>(`/packages/${id}`, {
      authMode: 'none',
      signal: options.signal,
    });

    return toCareerPackage(
      parsePayload(packagePayloadSchema, payload, `GET /packages/${id}`),
    );
  },
};
