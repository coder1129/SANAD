'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  cloneElement,
  useId,
  type AriaAttributes,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils/cn';

type ControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-labelledby'?: string;
  'aria-required'?: AriaAttributes['aria-required'];
};

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactElement<ControlProps>;
  controlId?: string;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
  required?: boolean;
}

export function FormField({
  children,
  className,
  controlId,
  description,
  error,
  label,
  required = false,
  ...props
}: FormFieldProps) {
  const _copy = useCopy();

  const generatedId = useId();
  const resolvedId = children.props.id ?? controlId ?? generatedId;
  const labelId = `${resolvedId}-label`;
  const descriptionId = description ? `${resolvedId}-description` : undefined;
  const messageId = error ? `${resolvedId}-message` : undefined;
  const describedBy = [
    children.props['aria-describedby'],
    descriptionId,
    messageId,
  ]
    .filter(Boolean)
    .join(' ');

  const control = cloneElement(children, {
    id: resolvedId,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-labelledby': [children.props['aria-labelledby'], labelId]
      .filter(Boolean)
      .join(' '),
    'aria-required': required || children.props['aria-required'] || undefined,
  });

  return (
    <div className={cn('grid gap-2', className)} {...props}>
      <FieldLabel htmlFor={resolvedId} id={labelId} required={required}>
        {_copy(label)}
      </FieldLabel>
      {description ? (
        <FieldDescription id={descriptionId}>
          {_copy(description)}
        </FieldDescription>
      ) : null}
      {_copy(control)}
      {error ? (
        <FieldMessage id={messageId}>{_copy(error)}</FieldMessage>
      ) : null}
    </div>
  );
}

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FieldLabel({
  children,
  className,
  required = false,
  ...props
}: FieldLabelProps) {
  const _copy = useCopy();

  return (
    <label className={cn('type-label text-foreground', className)} {...props}>
      {_copy(children)}
      {required ? (
        <>
          <span aria-hidden="true" className="ms-1 text-error">
            {_copy('*')}
          </span>
          <span className="sr-only"> {_copy('(required)')}</span>
        </>
      ) : null}
    </label>
  );
}

export function FieldDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm leading-5 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function FieldMessage({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm font-medium leading-5 text-error', className)}
      role="alert"
      {...props}
    />
  );
}
