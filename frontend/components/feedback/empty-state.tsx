import type { ComponentProps } from 'react';

import { StatePanel } from './state-panel';

export type EmptyStateProps = Omit<
  ComponentProps<typeof StatePanel>,
  'role' | 'tone'
>;

export function EmptyState(props: EmptyStateProps) {
  return <StatePanel role="status" tone="neutral" {...props} />;
}
