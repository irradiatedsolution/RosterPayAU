/**
 * payCalc.ts
 * Master payslip calculation — takes monthly stats + person config
 * and returns a fully computed PayCalculation object.
 */

import type { Person, MonthlyStats, PayCalculation } from '../types';
import { calcPAYG, calcSuperannuation } from './taxCalc';
import { calcLeaveLoading } from './leaveCalc';

/**
 * Calculate everything needed for a payslip for one pay period.
 *
 * Note on allowances:
 *  - ALL allowances are included in grossPay
 *  - Only TAXABLE allowances are included in taxableIncome
 *  - Non-taxable expense reimbursements (meal, travel receipts) reduce tax base
 */
export function calcPayslip(
  person: Person,
  stats: MonthlyStats,
): PayCalculation {
  const { basePay, totalAllowances, allowanceSummary } = stats;

  // Taxable allowances only
  const taxableAllowances = Object.values(allowanceSummary)
    .filter(a => a.taxable)
    .reduce((s, a) => s + a.amount, 0);

  const grossPay      = basePay + totalAllowances;
  const taxableIncome = basePay + taxableAllowances;

  // PAYG withholding
  const payg = calcPAYG({
    taxableIncomeThisPeriod: taxableIncome,
    payFrequency: person.payFreq,
    residency: person.residency,
  });

  // Other deductions (post-tax unless salary sacrifice — simplified here)
  const totalDeductions = (person.deductions ?? []).reduce(
    (s, d) => s + (d.amount ?? 0), 0,
  );

  const netPay       = grossPay - payg.periodTax - payg.periodMedicare - totalDeductions;
  const superAmount  = calcSuperannuation(basePay);
  const leaveLoading = calcLeaveLoading(basePay);

  return {
    basePay,
    totalAllowances,
    grossPay:          parseFloat(grossPay.toFixed(2)),
    taxableIncome:     parseFloat(taxableIncome.toFixed(2)),
    annualisedIncome:  parseFloat(payg.annualisedIncome.toFixed(2)),
    annualTax:         parseFloat(payg.annualTax.toFixed(2)),
    annualMedicare:    parseFloat(payg.annualMedicare.toFixed(2)),
    periodTax:         parseFloat(payg.periodTax.toFixed(2)),
    periodMedicare:    parseFloat(payg.periodMedicare.toFixed(2)),
    totalDeductions:   parseFloat(totalDeductions.toFixed(2)),
    netPay:            parseFloat(netPay.toFixed(2)),
    superannuation:    parseFloat(superAmount.toFixed(2)),
    effectiveRate:     parseFloat(payg.effectiveRate.toFixed(2)),
    leaveLoading:      parseFloat(leaveLoading.toFixed(2)),
  };
}

/**
 * Format a dollar amount in Australian style: "A$1,234.56"
 */
export function fmtAUD(amount: number): string {
  return 'A$' + Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate plain-text payslip for email body.
 */
export function generatePayslipText(
  person: Person,
  stats: MonthlyStats,
  calc: PayCalculation,
  monthName: string,
  year: number,
  leaveAccrued: number,
): string {
  const line = '─'.repeat(44);
  const eq   = '='.repeat(44);
  const pad  = (s: string, w = 28) => s.padEnd(w);

  const row = (label: string, value: string) =>
    `${pad(label)}${value}\n`;

  let out = '';
  out += `PAYSLIP — ${monthName} ${year}\n${eq}\n`;
  out += row('Employer:', person.employer || 'N/A');
  out += row('Employee:', person.name || 'N/A');
  out += row('Position:', person.position || 'N/A');
  out += row('Employee ID:', person.employeeId || 'N/A');
  out += row('Pay Frequency:', person.payFreq);
  out += row('Tax Residency:', person.residency);
  out += '\n';

  out += `EARNINGS\n${line}\n`;
  out += row(`Base Pay (${stats.totalHours}h):`, fmtAUD(calc.basePay));

  for (const [name, v] of Object.entries(stats.allowanceSummary)) {
    if (v.amount > 0) {
      out += row(`${name}:`, fmtAUD(v.amount));
    }
  }

  out += `${line}\n`;
  out += row('GROSS PAY:', fmtAUD(calc.grossPay));
  out += '\n';

  out += `TAX WITHHOLDING (ATO FY2024-25)\n${line}\n`;
  out += row('Income Tax Withheld:', `-${fmtAUD(calc.periodTax)}`);
  out += row('Medicare Levy (2%):', `-${fmtAUD(calc.periodMedicare)}`);

  for (const d of person.deductions ?? []) {
    if (d.amount > 0) {
      out += row(`${d.name}:`, `-${fmtAUD(d.amount)}`);
    }
  }

  out += `${eq}\n`;
  out += row('NET PAY:', fmtAUD(calc.netPay));
  out += `${eq}\n\n`;

  out += `ADDITIONAL INFORMATION\n${line}\n`;
  out += row('Superannuation (11.5% SG):', fmtAUD(calc.superannuation));
  out += row('Leave Accrued this period:', `${leaveAccrued}h`);
  out += row('Est. Annual Income:', fmtAUD(calc.annualisedIncome));
  out += row('Effective Tax Rate:', `${calc.effectiveRate.toFixed(1)}%`);
  out += '\n';
  out += '* Tax calculated using ATO FY2024-25 resident rates + LITO.\n';
  out += '* Superannuation is an employer obligation — not deducted from net pay.\n';
  out += '* This payslip is indicative only. Consult ATO or a registered tax agent.\n';

  return out;
}
