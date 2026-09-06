'use client';

import * as React from 'react';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputProps) {
  const length = 6;
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Split value into 6 slots
  const digits = React.useMemo(() => {
    const chars = value.split('');
    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      result.push(chars[i] || '');
    }
    return result;
  }, [value, length]);

  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const updateValue = (newDigits: string[]) => {
    const combined = newDigits.join('').slice(0, length);
    onChange(combined);
    if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const char = e.target.value;
    const sanitized = char.replace(/\D/g, '');

    if (!sanitized) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      updateValue(nextDigits);
      return;
    }

    // Handle single digit
    const singleDigit = sanitized.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = singleDigit;
    updateValue(nextDigits);

    // Auto-advance focus
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear it
        e.preventDefault();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        updateValue(nextDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').trim();
    const sanitized = pasted.replace(/\D/g, '').slice(0, length);

    if (sanitized) {
      const nextDigits = sanitized.split('');
      while (nextDigits.length < length) {
        nextDigits.push('');
      }
      updateValue(nextDigits);

      const focusIndex = Math.min(sanitized.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div
      dir="ltr"
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label="Verification code input"
    >
      {digits.map((digit, index) => {
        const isFilled = Boolean(digit);
        return (
          <React.Fragment key={index}>
            <input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              aria-invalid={hasError || undefined}
              aria-label={`Digit ${index + 1} of ${length}`}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`h-14 w-10 rounded-md text-center font-mono text-xl font-semibold tracking-tight outline-none transition-[border-color,background-color,box-shadow] duration-200 sm:h-15 sm:w-12 sm:text-2xl
                ${
                  hasError
                    ? 'border border-error bg-error/5 text-error focus:ring-2 focus:ring-error/20'
                    : isFilled
                      ? 'border border-accent bg-surface text-primary shadow-xs focus:ring-2 focus:ring-accent/20'
                      : 'border border-border bg-surface text-primary hover:border-accent/70 focus:border-primary focus:bg-surface focus:shadow-xs focus:ring-2 focus:ring-primary/15'
                }
                ${disabled ? 'cursor-not-allowed bg-surface-muted opacity-50' : 'cursor-text'}
              `}
            />
            {/* Elegant midpoint indicator between digits 3 and 4 */}
            {index === 2 && (
              <span
                aria-hidden="true"
                className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-border"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
