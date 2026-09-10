export const DASHBOARD_PERIODS = [
  'today',
  '7d',
  'month',
  'all',
  'custom',
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface DashboardDateRange {
  start: Date;
  end: Date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function localDate(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function dashboardDateRange(
  period: DashboardPeriod,
  customStart: string,
  customEnd: string,
  now = new Date(),
): DashboardDateRange | null {
  if (period === 'all') return null;

  if (period === 'custom') {
    const start = localDate(customStart);
    const end = localDate(customEnd, true);
    return start && end && start <= end ? { start, end } : null;
  }

  const end = endOfLocalDay(now);
  const start = startOfLocalDay(now);

  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === 'month') start.setDate(1);

  return { start, end };
}

export function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
