import { z } from 'zod';
import type { ApiQueryParams, PaginatedData } from '@/types/api';
import { ApiError } from '../errors';
import { createFileFormData } from '../form-data';
import { api, type ApiRequestOptions } from '../request';

type DecimalValue = number | string;

export interface AdminPackageImage {
  id: number;
  image_path: string;
  image_url?: string | null;
  url?: string | null;
  alt_text: string | null;
  is_primary: boolean | null;
  display_order: number | null;
}

export interface AdminPackage {
  id: number;
  name_en: string;
  description_en: string | null;
  price: DecimalValue;
  features_en: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
  delivery_days: number;
  max_revisions: number | null;
  updated_at: string | null;
  package_images: AdminPackageImage[];
  _count?: { orders: number };
}

export interface AdminOffer {
  id: number;
  package_id: number | null;
  name_en: string;
  description_en: string | null;
  discount_percentage: DecimalValue;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
  package: { id: number; name_en: string } | null;
}

export interface AdminCoupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: DecimalValue;
  min_order_amount: DecimalValue | null;
  max_discount_amount: DecimalValue | null;
  usage_limit: number | null;
  usage_per_user: number | null;
  times_used: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  original_amount: DecimalValue;
  discount_amount: DecimalValue | null;
  final_amount: DecimalValue;
  coupon_code: string | null;
  admin_notes?: string | null;
  notes?: string | null;
  created_at: string | null;
  package: { id: number; name_en: string } | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  payments: Array<{
    id: number;
    status: string;
    amount: DecimalValue;
    payment_method: string;
    transaction_id?: string;
    currency?: string;
  }>;
  order_status_history?: Array<{
    id: number;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string | null;
  }>;
  coupon_usage?: Array<{ coupon: AdminCoupon }>;
}

export interface AdminCustomer {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  account_locked: boolean | null;
  created_at: string | null;
  total_orders: number;
  completed_orders: number;
  total_spent: number;
  orders?: AdminOrder[];
}

export interface AdminPayment {
  id: number;
  transaction_id: string;
  payment_method: string;
  amount: DecimalValue;
  currency: string | null;
  status: string;
  payment_date: string | null;
  created_at: string | null;
  order: {
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    status: string;
  };
}

export interface CmsPage {
  id: number;
  title_en: string;
  slug: string;
  content_en: string | null;
  meta_description_en: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export interface SiteMedia {
  id: number;
  media_key: string;
  media_path: string;
  media_type: string;
  alt_text_en: string | null;
  is_active: boolean | null;
  url: string;
  created_at: string | null;
}

export interface SiteSetting {
  id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string | null;
  description: string | null;
}

export interface ActivityLog {
  id: number;
  action: string;
  table_name: string | null;
  record_id: number | null;
  description: string | null;
  changes: unknown;
  created_at: string | null;
  admin: { id: number; name: string; email: string };
}

export interface DashboardData {
  overview: {
    customers: { total: number; new_today: number; new_this_month: number };
    orders: {
      total: number;
      today: number;
      pending: number;
      in_progress: number;
      completed: number;
    };
    revenue: {
      total: number;
      today: number;
      this_month: number;
      currency: string;
    };
  };
  recent_orders: AdminOrder[];
  top_packages: Array<{
    package_id: number;
    name_en: string;
    order_count: number;
    total_revenue: number;
  }>;
}

const objectSchema = z.object({}).passthrough();
const listSchema = z.object({
  items: z.array(objectSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

function object<T>(payload: unknown, endpoint: string): T {
  const result = objectSchema.safeParse(payload);
  if (!result.success)
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response from ${endpoint}`,
    });
  return result.data as T;
}

function array<T>(payload: unknown, endpoint: string): T[] {
  const result = z.array(objectSchema).safeParse(payload);
  if (!result.success)
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response from ${endpoint}`,
    });
  return result.data as T[];
}

function paginated<T>(payload: unknown, endpoint: string): PaginatedData<T> {
  const result = listSchema.safeParse(payload);
  if (!result.success)
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response from ${endpoint}`,
    });
  return result.data as unknown as PaginatedData<T>;
}

type Options = Pick<ApiRequestOptions, 'signal'>;
type Query = ApiQueryParams;

export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  list: (resource: string, params: Query = {}) =>
    ['admin', resource, 'list', params] as const,
  detail: (resource: string, id: number) =>
    ['admin', resource, 'detail', id] as const,
  settings: ['admin', 'settings'] as const,
};

export const adminApi = {
  dashboard: async (options: Options = {}) =>
    object<DashboardData>(
      await api.get<unknown>('/admin/dashboard', options),
      'GET /admin/dashboard',
    ),
  orders: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<AdminOrder>(
        await api.get<unknown>('/admin/orders', {
          params,
          signal: options.signal,
        }),
        'GET /admin/orders',
      ),
    get: async (id: number, options: Options = {}) =>
      object<AdminOrder>(
        await api.get<unknown>(`/admin/orders/${id}`, options),
        'GET /admin/orders/:id',
      ),
    updateStatus: async (id: number, status: string, note?: string) =>
      object<AdminOrder>(
        await api.patch<unknown>(`/admin/orders/${id}/status`, {
          status,
          note,
        }),
        'PATCH /admin/orders/:id/status',
      ),
    update: async (
      id: number,
      input: { admin_notes?: string; delivery_date?: string },
    ) =>
      object<AdminOrder>(
        await api.patch<unknown>(`/admin/orders/${id}`, input),
        'PATCH /admin/orders/:id',
      ),
  },
  packages: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<AdminPackage>(
        await api.get<unknown>('/admin/packages', {
          params,
          signal: options.signal,
        }),
        'GET /admin/packages',
      ),
    create: async (input: Record<string, unknown>) =>
      object<AdminPackage>(
        await api.post<unknown>('/admin/packages', input),
        'POST /admin/packages',
      ),
    update: async (id: number, input: Record<string, unknown>) =>
      object<AdminPackage>(
        await api.patch<unknown>(`/admin/packages/${id}`, input),
        'PATCH /admin/packages/:id',
      ),
    status: async (id: number, isActive: boolean) =>
      object<AdminPackage>(
        await api.patch<unknown>(`/admin/packages/${id}/status`, {
          is_active: isActive,
        }),
        'PATCH /admin/packages/:id/status',
      ),
    remove: async (id: number) =>
      object<AdminPackage>(
        await api.delete<unknown>(`/admin/packages/${id}`),
        'DELETE /admin/packages/:id',
      ),
    uploadImage: async (
      id: number,
      file: File,
      input: { altText: string; isPrimary: boolean },
    ) =>
      object<AdminPackageImage>(
        await api.post<unknown>(
          `/admin/packages/${id}/images`,
          createFileFormData(file, {
            alt_text: input.altText,
            is_primary: String(input.isPrimary),
          }),
        ),
        'POST /admin/packages/:id/images',
      ),
    updateImage: async (
      packageId: number,
      imageId: number,
      input: Record<string, unknown>,
    ) =>
      object<AdminPackageImage>(
        await api.patch<unknown>(
          `/admin/packages/${packageId}/images/${imageId}`,
          input,
        ),
        'PATCH package image',
      ),
    deleteImage: async (packageId: number, imageId: number) =>
      api.delete<unknown>(`/admin/packages/${packageId}/images/${imageId}`),
  },
  offers: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<AdminOffer>(
        await api.get<unknown>('/admin/offers', {
          params,
          signal: options.signal,
        }),
        'GET /admin/offers',
      ),
    create: async (input: Record<string, unknown>) =>
      object<AdminOffer>(
        await api.post<unknown>('/admin/offers', input),
        'POST /admin/offers',
      ),
    update: async (id: number, input: Record<string, unknown>) =>
      object<AdminOffer>(
        await api.patch<unknown>(`/admin/offers/${id}`, input),
        'PATCH /admin/offers/:id',
      ),
    remove: async (id: number) =>
      object<AdminOffer>(
        await api.delete<unknown>(`/admin/offers/${id}`),
        'DELETE /admin/offers/:id',
      ),
  },
  coupons: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<AdminCoupon>(
        await api.get<unknown>('/admin/coupons', {
          params,
          signal: options.signal,
        }),
        'GET /admin/coupons',
      ),
    create: async (input: Record<string, unknown>) =>
      object<AdminCoupon>(
        await api.post<unknown>('/admin/coupons', input),
        'POST /admin/coupons',
      ),
    update: async (id: number, input: Record<string, unknown>) =>
      object<AdminCoupon>(
        await api.patch<unknown>(`/admin/coupons/${id}`, input),
        'PATCH /admin/coupons/:id',
      ),
    remove: async (id: number) =>
      object<AdminCoupon>(
        await api.delete<unknown>(`/admin/coupons/${id}`),
        'DELETE /admin/coupons/:id',
      ),
  },
  customers: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<AdminCustomer>(
        await api.get<unknown>('/admin/customers', {
          params,
          signal: options.signal,
        }),
        'GET /admin/customers',
      ),
    get: async (id: number, options: Options = {}) =>
      object<AdminCustomer>(
        await api.get<unknown>(`/admin/customers/${id}`, options),
        'GET /admin/customers/:id',
      ),
    status: async (id: number, accountLocked: boolean, reason?: string) =>
      object<AdminCustomer>(
        await api.patch<unknown>(`/admin/customers/${id}/status`, {
          account_locked: accountLocked,
          reason,
        }),
        'PATCH /admin/customers/:id/status',
      ),
  },
  payments: async (params: Query = {}, options: Options = {}) =>
    paginated<AdminPayment>(
      await api.get<unknown>('/admin/payments', {
        params,
        signal: options.signal,
      }),
      'GET /admin/payments',
    ),
  pages: {
    list: async (params: Query = {}, options: Options = {}) =>
      paginated<CmsPage>(
        await api.get<unknown>('/admin/pages', {
          params,
          signal: options.signal,
        }),
        'GET /admin/pages',
      ),
    create: async (input: Record<string, unknown>) =>
      object<CmsPage>(
        await api.post<unknown>('/admin/pages', input),
        'POST /admin/pages',
      ),
    update: async (id: number, input: Record<string, unknown>) =>
      object<CmsPage>(
        await api.patch<unknown>(`/admin/pages/${id}`, input),
        'PATCH /admin/pages/:id',
      ),
  },
  media: {
    list: async (options: Options = {}) =>
      array<SiteMedia>(
        await api.get<unknown>('/admin/media', options),
        'GET /admin/media',
      ),
    upload: async (file: File, input: { mediaKey: string; altText: string }) =>
      object<SiteMedia>(
        await api.post<unknown>(
          '/admin/media',
          createFileFormData(file, {
            media_key: input.mediaKey,
            alt_text_en: input.altText,
            alt_text_ar: input.altText,
          }),
        ),
        'POST /admin/media',
      ),
    update: async (
      id: number,
      input: { alt_text_en?: string; is_active?: boolean },
    ) =>
      object<SiteMedia>(
        await api.patch<unknown>(`/admin/media/${id}`, input),
        'PATCH /admin/media/:id',
      ),
    remove: async (id: number) => api.delete<unknown>(`/admin/media/${id}`),
  },
  settings: {
    list: async (options: Options = {}) =>
      array<SiteSetting>(
        await api.get<unknown>('/admin/settings', options),
        'GET /admin/settings',
      ),
    update: async (settings: Record<string, string>) =>
      array<SiteSetting>(
        await api.patch<unknown>('/admin/settings', { settings }),
        'PATCH /admin/settings',
      ),
  },
  activityLogs: async (params: Query = {}, options: Options = {}) =>
    paginated<ActivityLog>(
      await api.get<unknown>('/admin/activity-logs', {
        params,
        signal: options.signal,
      }),
      'GET /admin/activity-logs',
    ),
};
