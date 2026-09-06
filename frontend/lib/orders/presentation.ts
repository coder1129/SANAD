export function formatMoney(value: number | string, currency = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-AE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatStatus(value: string): string {
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
