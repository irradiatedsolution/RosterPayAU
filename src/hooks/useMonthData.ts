/**
 * hooks/useMonthData.ts
 * One hook that returns everything a screen needs for a given person + month.
 * Keeps screens clean — no calculations in components.
 */

import { useMemo } from 'react';
import { usePersonStore, useRosterStore, useSubStore } from '../store';
import { computeMonthlyStats }    from '../utils/rosterUtils';
import { calcLeaveInfo }          from '../utils/leaveCalc';
import { calcPayslip }            from '../utils/payCalc';
import { MONTH_NAMES, MONTH_SHORT, daysInMonth, firstDayOfMonth, toISO } from '../utils/rosterUtils';

export function useMonthData(year: number, month: number) {
  const person   = usePersonStore(s => s.getActivePerson());
  const entries  = useRosterStore(s => s.entries);
  const isPro    = useSubStore(s => s.isPro);
  const usedDays = useRosterStore(s => s.getUsedDays(person?.id ?? ''));

  const stats = useMemo(() => {
    if (!person) return null;
    return computeMonthlyStats(person, entries, year, month);
  }, [person, entries, year, month]);

  const leaveInfo = useMemo(() => {
    if (!person || !stats) return null;
    return calcLeaveInfo(person, stats.totalHours);
  }, [person, stats]);

  const payCalc = useMemo(() => {
    if (!person || !stats) return null;
    return calcPayslip(person, stats);
  }, [person, stats]);

  // Calendar grid helpers
  const numDays  = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  // Build array of { day: number|null, iso: string|null }
  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= numDays; d++) {
      cells.push({ day: d, iso: toISO(year, month, d) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
    return cells;
  }, [year, month, numDays, firstDay]);

  return {
    person,
    stats,
    leaveInfo,
    payCalc,
    isPro,
    usedDays,
    calendarCells,
    monthName:      MONTH_NAMES[month],
    monthNameShort: MONTH_SHORT[month],
    numDays,
  };
}
