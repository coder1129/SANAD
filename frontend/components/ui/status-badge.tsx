import type { ComponentProps } from 'react';

import { Badge } from './badge';

export type StatusIntent = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps extends Omit<
  ComponentProps<typeof Badge>,
  'variant'
> {
  intent: StatusIntent;
}

export function StatusBadge({ intent, ...props }: StatusBadgeProps) {
  return <Badge variant={intent} {...props} />;
}
