import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { ToBoolean } from './transforms';

class Filter {
  @ToBoolean()
  flag?: unknown;
}

const parse = (value: unknown) => plainToInstance(Filter, { flag: value }).flag;

describe('ToBoolean', () => {
  it('accepts the query-string spellings of true', () => {
    expect(parse('true')).toBe(true);
    expect(parse('1')).toBe(true);
    expect(parse(true)).toBe(true);
  });

  it('accepts the query-string spellings of false', () => {
    expect(parse('false')).toBe(false);
    expect(parse('0')).toBe(false);
    expect(parse(false)).toBe(false);
  });

  // Anything else is passed through unchanged so class-validator rejects it
  // instead of silently coercing a typo into a filter that matches everything.
  it('passes through unrecognised values for the validator to reject', () => {
    expect(parse('yes')).toBe('yes');
    expect(parse('TRUE')).toBe('TRUE');
    expect(parse(2)).toBe(2);
    expect(parse(undefined)).toBeUndefined();
  });
});
