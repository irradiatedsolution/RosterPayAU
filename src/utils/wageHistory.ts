/**
 * wageHistory.ts
 * Given a person's wage history (multiple date ranges),
 * returns the correct hourly rate for any given date.
 */

import type { WagePeriod } from '../types';

/**
 * Find the applicable WagePeriod for a given ISO date string.
 * Periods are sorted descending by 'from' date so the most recent
 * matching period wins.
 *
 * Rules:
 *  - date >= period.from
 *  - date <= period.to  (or period.to is null = ongoing)
 */
export function getWagePeriodForDate(
  wageHistory: WagePeriod[],
  isoDate: string,
): WagePeriod | null {
  if (!wageHistory || wageHistory.length === 0) return null;

  // Sort descending by from-date so the most recent takes priority
  const sorted = [...wageHistory].sort((a, b) =>
    b.from.localeCompare(a.from),
  );

  for (const period of sorted) {
    const afterStart = isoDate >= period.from;
    const beforeEnd  = period.to === null || isoDate <= period.to;
    if (afterStart && beforeEnd) return period;
  }

  // Fallback: if no period matches (date before all history),
  // return the earliest period
  const earliest = [...wageHistory].sort((a, b) => a.from.localeCompare(b.from))[0];
  return earliest ?? null;
}

/**
 * Get the effective hourly rate (with casual loading applied if set)
 * for a given date.
 */
export function getEffectiveRateForDate(
  wageHistory: WagePeriod[],
  isoDate: string,
): number {
  const period = getWagePeriodForDate(wageHistory, isoDate);
  if (!period) return 0;
  const loading = period.casual ? 1.25 : 1;
  return period.rate * loading;
}

/**
 * Get the current (most recent ongoing) wage period.
 * "Ongoing" means to === null.
 */
export function getCurrentWagePeriod(wageHistory: WagePeriod[]): WagePeriod | null {
  const ongoing = wageHistory.filter(w => w.to === null);
  if (ongoing.length === 0) {
    // No open-ended period — return latest by from-date
    return [...wageHistory].sort((a, b) => b.from.localeCompare(a.from))[0] ?? null;
  }
  return [...ongoing].sort((a, b) => b.from.localeCompare(a.from))[0];
}

/**
 * Format a wage period for display.
 * e.g. "Jul 2024 – present" or "Jan 2024 – Jun 2024"
 */
export function formatWagePeriodLabel(period: WagePeriod): string {
  const from = formatDateShort(period.from);
  const to   = period.to ? formatDateShort(period.to) : 'present';
  return `${from} – ${to}`;
}

function formatDateShort(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${y}`;
}
