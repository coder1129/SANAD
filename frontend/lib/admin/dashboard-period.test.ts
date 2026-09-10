import { describe, expect, it } from 'vitest';

import { dashboardDateRange } from './dashboard-period';

const now = new Date(2026, 8, 8, 14, 30, 0);

describe('dashboardDateRange', () => {
  it('uses local day boundaries for today', () => {
    const range = dashboardDateRange('today', '', '', now);

    expect(range?.start).toEqual(new Date(2026, 8, 8, 0, 0, 0));
    expect(range?.end).toEqual(new Date(2026, 8, 8, 23, 59, 59, 999));
  });

  it('includes today and the previous six days for the seven-day view', () => {
    const range = dashboardDateRange('7d', '', '', now);

    expect(range?.start).toEqual(new Date(2026, 8, 2, 0, 0, 0));
  });

  it('returns no range for all-time analytics', () => {
    expect(dashboardDateRange('all', '', '', now)).toBeNull();
  });

  it('starts the month view on the first local calendar day', () => {
    const range = dashboardDateRange('month', '', '', now);

    expect(range?.start).toEqual(new Date(2026, 8, 1, 0, 0, 0));
  });

  it('rejects an inverted custom range', () => {
    expect(
      dashboardDateRange('custom', '2026-09-10', '2026-09-01', now),
    ).toBeNull();
  });

  it('rejects an impossible custom date instead of rolling it forward', () => {
    expect(
      dashboardDateRange('custom', '2026-02-31', '2026-03-03', now),
    ).toBeNull();
  });
});
