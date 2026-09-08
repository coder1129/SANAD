function isArabicLocale(locale?: string): boolean {
  if (locale) return locale.startsWith('ar');
  if (typeof document !== 'undefined') {
    return document.documentElement.lang?.startsWith('ar') || false;
  }
  return false;
}

const statusTranslations: Record<string, string> = {
  pending: 'قيد الانتظار',
  pending_payment: 'في انتظار الدفع',
  paid: 'مدفوع',
  awaiting_information: 'بانتظار البيانات',
  received: 'تم الاستلام',
  in_progress: 'قيد التنفيذ',
  under_review: 'قيد المراجعة',
  ready: 'جاهز للتسليم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  refunded: 'مسترد',
  active: 'نشط',
  inactive: 'غير نشط',
  published: 'منشور',
  draft: 'مسودة',
  hidden: 'مخفي',
  success: 'ناجح',
  failed: 'فاشل',
  locked: 'مقفل',
};

export function formatMoney(
  value: number | string,
  currency = 'AED',
  locale?: string,
): string {
  const isAr = isArabicLocale(locale);
  return new Intl.NumberFormat(isAr ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(
  value: string | null | undefined,
  locale?: string,
): string {
  if (!value) return '—';
  const isAr = isArabicLocale(locale);
  return new Intl.DateTimeFormat(isAr ? 'ar-AE' : 'en-AE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatStatus(value: string, locale?: string): string {
  const isAr = isArabicLocale(locale);
  const normalizedKey = value.toLowerCase().replace(/\s+/g, '_');
  if (isAr && statusTranslations[normalizedKey]) {
    return statusTranslations[normalizedKey];
  }
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusIntent(
  value: string,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (['paid', 'success', 'completed', 'published', 'active'].includes(value))
    return 'success';
  if (['failed', 'cancelled', 'refunded', 'hidden', 'locked'].includes(value))
    return 'error';
  if (['pending', 'pending_payment', 'awaiting_information'].includes(value))
    return 'warning';
  if (['in_progress', 'under_review', 'ready', 'received'].includes(value))
    return 'info';
  return 'neutral';
}

export function whatsappHref(
  phone: string | null | undefined,
  message: string,
): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
