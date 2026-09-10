import { translateCopy } from './copy';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatStatus,
} from '@/lib/orders/presentation';

export function createCopy(locale: string) {
  return Object.assign(
    <T>(value: T, arabicValue?: T | null): T =>
      translateCopy(value, locale, arabicValue),
    {
      locale,
      money: (value: number | string, currency = 'AED') =>
        formatMoney(value, currency, locale),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),
      date: (value: string | null | undefined) => formatDate(value, locale),
      status: (value: string) => formatStatus(value, locale),
    },
  );
}
