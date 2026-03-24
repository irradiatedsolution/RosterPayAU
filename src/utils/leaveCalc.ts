/**
 * leaveCalc.ts
 * Annual leave calculations per the Fair Work Act 2009.
 */

import type { Person, LeaveInfo } from '../types';

// ─── Entitlement rules ────────────────────────────────────────────────────────

interface LeaveRule {
  weeksPerYear: number;
  baseHoursPerWeek: number | null;   // null = use contractHours
  label: string;
  description: string;
}

export const LEAVE_RULES: Record<string, LeaveRule> = {
  fulltime: {
    weeksPerYear: 4,
    baseHoursPerWeek: 38,
    label: 'Full-Time',
    description: '4 weeks (152h) per year, accrued progressively',
  },
  parttime: {
    weeksPerYear: 4,
    baseHoursPerWeek: null,   // pro-rata on contracted hours
    label: 'Part-Time (pro-rata)',
    description: '4 weeks per year, pro-rata on contracted hours',
  },
  shiftworker: {
    weeksPerYear: 5,
    baseHoursPerWeek: 38,
    label: 'Shift Worker (7-day roster)',
    description: '5 weeks (190h) per year — qualifies under s.87(3) FWA',
  },
  casual: {
    weeksPerYear: 0,
    baseHoursPerWeek: 0,
    label: 'Casual',
    description: 'No paid annual leave — 25% casual loading applies instead',
  },
};

// ─── Calculations ─────────────────────────────────────────────────────────────

/**
 * Calculate the annual leave accrual rate in hours per hour worked.
 *
 * Formula:
 *   Annual entitlement (hours) = weeks × hoursPerWeek
 *   Accrual per hour worked    = annualHours / (52 × hoursPerWeek)
 *
 * For full-time this simplifies to: (4 × 38) / (52 × 38) = 152/1976 ≈ 0.0769 h/h
 * For a 5-week shift worker:        (5 × 38) / (52 × 38) = 190/1976 ≈ 0.0962 h/h
 */
export function calcAccrualRate(person: Person): number {
  const rule = LEAVE_RULES[person.employmentType];
  if (!rule || rule.weeksPerYear === 0) return 0;

  const hpw =
    person.employmentType === 'parttime'
      ? person.contractHours
      : (rule.baseHoursPerWeek ?? 38);

  if (hpw <= 0) return 0;

  const annualHours = rule.weeksPerYear * hpw;
  return annualHours / (52 * hpw);
}

/**
 * Derive all leave info for a person based on hours worked this period.
 */
export function calcLeaveInfo(
  person: Person,
  hoursWorkedThisPeriod: number,
): LeaveInfo {
  const rule = LEAVE_RULES[person.employmentType] ?? LEAVE_RULES.fulltime;
  const accrualPerHour = calcAccrualRate(person);
  const monthlyAccrual = parseFloat(
    (accrualPerHour * hoursWorkedThisPeriod).toFixed(2),
  );

  const hpw =
    person.employmentType === 'parttime'
      ? person.contractHours
      : (rule.baseHoursPerWeek ?? 38);

  const annualEntitlementHours = rule.weeksPerYear * hpw;
  const totalBalance = (person.leaveBalance ?? 0) + monthlyAccrual;

  // Convert balance to days (based on standard week)
  const hoursPerDay = hpw / 5;
  const totalBalanceDays = hoursPerDay > 0 ? totalBalance / hoursPerDay : 0;

  return {
    accrualPerHour: parseFloat(accrualPerHour.toFixed(4)),
    monthlyAccrual,
    annualEntitlementHours,
    weekEntitlement: rule.weeksPerYear,
    totalBalance: parseFloat(totalBalance.toFixed(2)),
    totalBalanceDays: parseFloat(totalBalanceDays.toFixed(1)),
  };
}

// ─── Leave Loading ────────────────────────────────────────────────────────────

/**
 * Leave loading — 17.5% on ordinary time earnings while on leave.
 * Applies under most Modern Awards; check enterprise agreement.
 * This is informational only — shown on payslip but not deducted.
 */
export const LEAVE_LOADING_RATE = 0.175;

export function calcLeaveLoading(ordinaryTimePay: number): number {
  return ordinaryTimePay * LEAVE_LOADING_RATE;
}

// ─── Payout on termination ────────────────────────────────────────────────────

/**
 * Estimate unused annual leave payout on termination.
 * s.90 FWA: must be paid at the ordinary time rate on termination.
 */
export function calcTerminationLeavePayout(
  unusedLeaveHours: number,
  ordinaryHourlyRate: number,
): number {
  return unusedLeaveHours * ordinaryHourlyRate;
}
