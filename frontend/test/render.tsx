import {
  render as rtlRender,
  type RenderOptions,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
export * from '@testing-library/react';

export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={{}} timeZone="Asia/Dubai">
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}
