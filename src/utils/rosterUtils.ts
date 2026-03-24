/**
 * rosterUtils.ts
 * Date helpers, shift hour calculations, and roster key management.
 */

import type { ShiftDay, DayOff, RosterEntry, Person, MonthlyStats } from '../types';
import { getEffectiveRateForDate } from './wageHistory';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert year/month(0-based)/day to ISO string "YYYY-MM-DD" */
export function toISO(year: number, month: number, day: number): string {
  return [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

/** Parse ISO string back to {year, month(0-based), day} */
export function fromISO(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Days in a given month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Day-of-week for the 1st of a month (0=Sun) */
export function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Today as ISO string */
export function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Format ISO date for display: "Mon 25 Nov 2024" */
export function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Month name */
export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
export const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];
export const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Shift hour calculations ──────────────────────────────────────────────────

/** Parse "HH:MM" to total minutes */
function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Gross hours from start to end (handles overnight) */
export function calcGrossHours(start: string, end: string): number {
  if (!start || !end) return 0;
  let diff = toMins(end) - toMins(start);
  if (diff <= 0) diff += 24 * 60;   // overnight
  return parseFloat((diff / 60).toFixed(2));
}

/** Net paid hours after subtracting unpaid break */
export function calcNetHours(start: string, end: string, brkMins: number): number {
  const gross = calcGrossHours(start, end);
  return parseFloat(Math.max(0, gross - brkMins / 60).toFixed(2));
}

// ─── Roster key ───────────────────────────────────────────────────────────────

/**
 * Roster storage key format: "personId|YYYY-MM-DD"
 * Using | as separator to avoid ambiguity with date dashes.
 */
export function rosterKey(personId: string, isoDate: string): string {
  return `${personId}|${isoDate}`;
}

export function parseRosterKey(key: string): { personId: string; date: string } {
  const idx = key.indexOf('|');
  return {
    personId: key.slice(0, idx),
    date:     key.slice(idx + 1),
  };
}

// ─── Monthly stats ────────────────────────────────────────────────────────────

/**
 * Compute monthly stats for a person from the full roster map.
 * Handles per-day wage history lookups.
 */
export function computeMonthlyStats(
  person: Person,
  roster: Record<string, RosterEntry>,
  year: number,
  month: number,
): MonthlyStats {
  const numDays = daysInMonth(year, month);
  let totalHours = 0;
  let workDays = 0;
  let offDays = 0;
  let basePay = 0;
  const allowanceSummary: MonthlyStats['allowanceSummary'] = {};

  for (let d = 1; d <= numDays; d++) {
    const iso = toISO(year, month, d);
    const key = rosterKey(person.id, iso);
    const entry = roster[key];

    if (!entry) continue;
    if (entry.off) { offDays++; continue; }

    const shift = entry as ShiftDay;
    workDays++;
    totalHours += shift.netHours;

    // Per-day wage (respects wage history)
    const rate = getEffectiveRateForDate(person.wageHistory, iso);
    basePay += rate * shift.netHours;

    // Allowances
    for (const a of shift.allowances) {
      if (!allowanceSummary[a.name]) {
        allowanceSummary[a.name] = { amount: 0, taxable: a.taxable, color: a.color };
      }
      allowanceSummary[a.name].amount += a.amount;
    }
  }

  const totalAllowances = Object.values(allowanceSummary).reduce(
    (s, a) => s + a.amount, 0,
  );

  return {
    totalHours:      parseFloat(totalHours.toFixed(2)),
    workDays,
    offDays,
    basePay:         parseFloat(basePay.toFixed(2)),
    totalAllowances: parseFloat(totalAllowances.toFixed(2)),
    allowanceSummary,
  };
}

// ─── Free plan usage counter ──────────────────────────────────────────────────

/**
 * Count how many non-off roster days a person has used (free plan tracker).
 */
export function countUsedRosterDays(
  personId: string,
  roster: Record<string, RosterEntry>,
): number {
  return Object.entries(roster).filter(([key, entry]) => {
    const { personId: pid } = parseRosterKey(key);
    return pid === personId && !entry.off;
  }).length;
}
