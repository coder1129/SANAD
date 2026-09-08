import { useCopy } from '@/lib/i18n/use-copy';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface StatePanelProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  title: ReactNode;
  tone?: 'neutral' | 'error';
}

export function StatePanel({
  action,
  className,
  description,
  headingLevel = 2,
  icon,
  title,
  tone = 'neutral',
  ...props
}: StatePanelProps) {
  const _copy = useCopy();

  const Heading = headingLevel === 2 ? 'h2' : headingLevel === 3 ? 'h3' : 'h4';

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center rounded-lg border border-border bg-surface px-5 py-10 text-center sm:px-8',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            'mb-4 flex size-11 items-center justify-center rounded-md bg-surface-muted text-primary [&_svg]:size-5',
            tone === 'error' && 'bg-error/10 text-error',
          )}
        >
          {_copy(icon)}
        </div>
      ) : null}
      <Heading className="type-h4">{_copy(title)}</Heading>
      <div className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
        {_copy(description)}
      </div>
      {action ? <div className="mt-5">{_copy(action)}</div> : null}
    </div>
  );
}
