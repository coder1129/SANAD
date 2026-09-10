import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@/test/render';
import { NextIntlClientProvider } from 'next-intl';
import { translateCopy } from './copy';
import { createCopy } from './create-copy';
import { useCopy } from './use-copy';
import arabicMessages from '@/messages/interface-ar.json';

function TestComponent({ text, ar }: { text: string; ar?: string }) {
  const _copy = useCopy();
  return <div data-testid="copy-output">{_copy(text, ar)}</div>;
}

afterEach(() => {
  cleanup();
});

describe('i18n copy and next-intl context integration', () => {
  it('translates known keys to Arabic when locale is ar', () => {
    const result = translateCopy('Home', 'ar');
    expect(result).toBe('الرئيسية');
  });

  it('preserves English copy when locale is en', () => {
    const result = translateCopy('Home', 'en');
    expect(result).toBe('Home');
  });

  it('uses Arabic-Indic numerals for Arabic UI numbers', () => {
    expect(
      createCopy('ar').number(4, {
        minimumIntegerDigits: 2,
        useGrouping: false,
      }),
    ).toBe('٠٤');
    expect(createCopy('en').number(4, { minimumIntegerDigits: 2 })).toBe('04');
  });

  it('uses Arabic content even when the English field is null', () => {
    expect(translateCopy<string | null>(null, 'ar', 'وصف الخدمة')).toBe(
      'وصف الخدمة',
    );
  });

  it('translates dynamic labels while preserving their values', () => {
    expect(translateCopy('Enlarge Custom Service illustration', 'ar')).toBe(
      'تكبير صورة Custom Service',
    );
    expect(translateCopy('3 revisions', 'ar')).toBe('3 تعديلات');
  });

  it('uses explicit arabicValue override when provided', () => {
    const result = translateCopy('Custom Service', 'ar', 'خدمة مخصصة');
    expect(result).toBe('خدمة مخصصة');
  });

  it('falls back safely to English when key is missing and no explicit Arabic provided', () => {
    const result = translateCopy('Untranslated Key 12345', 'ar');
    expect(result).toBe('Untranslated Key 12345');
    expect(translateCopy('constructor', 'ar')).toBe('constructor');
  });

  it('renders correctly within NextIntlClientProvider in Arabic', () => {
    render(
      <NextIntlClientProvider locale="ar" messages={arabicMessages}>
        <TestComponent text="Home" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('copy-output')).toHaveTextContent('الرئيسية');
  });

  it('renders correctly within NextIntlClientProvider in English', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <TestComponent text="Home" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('copy-output')).toHaveTextContent('Home');
  });

  it('uses the default English test provider', () => {
    render(<TestComponent text="Home" />);
    expect(screen.getByTestId('copy-output')).toHaveTextContent('Home');
  });
});
