import type { ComponentProps } from 'react';

import { StatePanel } from './state-panel';

export type ErrorStateProps = Omit<
  ComponentProps<typeof StatePanel>,
  'role' | 'tone'
>;

export function ErrorState(props: ErrorStateProps) {
  return <StatePanel role="alert" tone="error" {...props} />;
}
