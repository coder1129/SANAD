/**
 * Duration strings accepted by jsonwebtoken's `expiresIn`, expressed as a
 * template literal type so the value keeps its shape instead of being widened
 * to `string` and cast away with `as any` at each call site.
 */
export type DurationUnit = 's' | 'm' | 'h' | 'd';
export type DurationString = `${number}${DurationUnit}`;

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

const UNIT_MS: Record<DurationUnit, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function isDurationString(value: string): value is DurationString {
  return DURATION_PATTERN.test(value.trim());
}

/** Narrows a config string to DurationString, falling back when malformed. */
export function toDuration(
  value: string | undefined,
  fallback: DurationString,
): DurationString {
  const candidate = (value ?? '').trim();
  return isDurationString(candidate) ? candidate : fallback;
}

export function durationToMs(value: DurationString): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  return Number(match[1]) * UNIT_MS[match[2] as DurationUnit];
}
