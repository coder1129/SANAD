import { z } from 'zod';

import type { Testimonial } from '@/types/domain';

import { ApiError } from '../errors';
import { api } from '../request';

const testimonialPayloadSchema = z.object({
  id: z.number().int().positive(),
  package_id: z.number().int().positive().nullish(),
  customer_name: z.string().min(1),
  customer_title: z.string().nullish(),
  customer_image: z.string().nullish(),
  testimonial_ar: z.string().min(1),
  testimonial_en: z.string().min(1),
  rating: z.number().int().min(1).max(5).nullish(),
  is_published: z.boolean().nullish(),
  display_order: z.number().int().nullish(),
  created_at: z.string().nullish(),
});

const testimonialsPayloadSchema = z.array(testimonialPayloadSchema);

function toTestimonial(
  payload: z.infer<typeof testimonialPayloadSchema>,
): Testimonial {
  return {
    id: payload.id,
    packageId: payload.package_id ?? null,
    customerName: payload.customer_name,
    customerTitle: payload.customer_title ?? null,
    customerImage: payload.customer_image ?? null,
    textAr: payload.testimonial_ar,
    textEn: payload.testimonial_en,
    rating: payload.rating ?? 5,
    isPublished: payload.is_published !== false,
    displayOrder: payload.display_order ?? 0,
    createdAt: payload.created_at ?? null,
  };
}

export const testimonialsApi = {
  async list(options: { packageId?: number } = {}): Promise<Testimonial[]> {
    const payload = await api.get<unknown>('/testimonials', {
      authMode: 'none',
      params:
        options.packageId === undefined
          ? {}
          : { package_id: options.packageId },
    });
    const result = testimonialsPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected response shape from GET /testimonials',
      });
    }

    return result.data.map(toTestimonial);
  },
};
