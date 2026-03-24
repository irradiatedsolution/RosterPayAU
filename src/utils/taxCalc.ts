/**
 * taxCalc.ts
 * ATO FY2024-25 tax calculations for Australian residents.
 * All figures from ato.gov.au — updated for FY2024-25.
 */

// ─── Income Tax (Resident) ────────────────────────────────────────────────────

/**
 * Calculate annual income tax for a resident individual.
 * ATO FY2024-25 tax rates.
 */
export function calcAnnualTax(annualIncome: number): number {
  if (annualIncome <= 18_200) return 0;
  if (annualIncome <= 45_000) return (annualIncome - 18_200) * 0.19;
  if (annualIncome <= 120_000) return 5_092 + (annualIncome - 45_000) * 0.325;
  if (annualIncome <= 180_000) return 29_467 + (annualIncome - 120_000) * 0.37;
  return 51_667 + (annualIncome - 180_000) * 0.45;
}

/**
 * Foreign resident tax rates FY2024-25.
 */
export function calcForeignResidentTax(annualIncome: number): number {
  if (annualIncome <= 135_000) return annualIncome * 0.325;
  if (annualIncome <= 190_000) return 43_875 + (annualIncome - 135_000) * 0.37;
  return 64_225 + (annualIncome - 190_000) * 0.45;
}

/**
 * Working Holiday Maker (WHM) tax rates FY2024-25.
 */
export function calcWHMTax(annualIncome: number): number {
  if (annualIncome <= 45_000) return annualIncome * 0.15;
  if (annualIncome <= 120_000) return 6_750 + (annualIncome - 45_000) * 0.325;
  if (annualIncome <= 180_000) return 31_125 + (annualIncome - 120_000) * 0.37;
  return 53_325 + (annualIncome - 180_000) * 0.45;
}

// ─── Offsets ──────────────────────────────────────────────────────────────────

/**
 * Low Income Tax Offset (LITO) — FY2024-25.
 * Max $700, phases out between $37,500–$66,667.
 */
export function calcLITO(annualIncome: number): number {
  if (annualIncome <= 37_500) return 700;
  if (annualIncome <= 45_000) return 700 - (annualIncome - 37_500) * 0.05;
  if (annualIncome <= 66_667) return 325 - (annualIncome - 45_000) * 0.015;
  return 0;
}

/**
 * Low Income Superannuation Tax Offset (LISTO) — informational only.
 * ATO rebates this directly to super fund.
 */
export function calcLISTO(annualIncome: number, superContribution: number): number {
  if (annualIncome > 37_000) return 0;
  return Math.min(superContribution * 0.15, 500);
}

// ─── Medicare Levy ────────────────────────────────────────────────────────────

/**
 * Medicare Levy — 2% with low-income shade-in threshold.
 * FY2024-25 thresholds.
 */
export function calcMedicareLevy(annualIncome: number): number {
  const threshold = 26_000;   // No levy below this
  const shadeIn   = 33_000;   // Full 2% applies above this
  if (annualIncome <= threshold) return 0;
  if (annualIncome <= shadeIn) {
    // Shade-in: 10 cents per dollar above threshold
    return Math.min(annualIncome * 0.02, (annualIncome - threshold) * 0.10);
  }
  return annualIncome * 0.02;
}

// ─── Superannuation ───────────────────────────────────────────────────────────

/** Super Guarantee rate FY2024-25 = 11.5% */
export const SUPER_RATE = 0.115;

export function calcSuperannuation(grossBasePay: number): number {
  return grossBasePay * SUPER_RATE;
}

// ─── PAYG Withholding ─────────────────────────────────────────────────────────

export type TaxResidency = 'resident' | 'foreign' | 'whm';
export type PayFrequency = 'weekly' | 'fortnightly' | '4-weekly' | 'monthly';

const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  '4-weekly': 13,
  monthly: 12,
};

export interface PAYGInput {
  taxableIncomeThisPeriod: number;  // basePay + taxable allowances
  payFrequency: PayFrequency;
  residency: TaxResidency;
}

export interface PAYGResult {
  annualisedIncome: number;
  annualTax: number;
  annualMedicare: number;
  annualLITO: number;
  periodTax: number;
  periodMedicare: number;
  effectiveRate: number;
}

/**
 * Calculate PAYG withholding for a pay period.
 * Annualises the period income, applies ATO rates + LITO, then de-annualises.
 */
export function calcPAYG(input: PAYGInput): PAYGResult {
  const { taxableIncomeThisPeriod, payFrequency, residency } = input;
  const periods = PERIODS_PER_YEAR[payFrequency];
  const annualisedIncome = taxableIncomeThisPeriod * periods;

  let annualTax = 0;
  let annualLITO = 0;

  if (residency === 'resident') {
    annualTax = calcAnnualTax(annualisedIncome);
    annualLITO = calcLITO(annualisedIncome);
    annualTax = Math.max(0, annualTax - annualLITO);
  } else if (residency === 'foreign') {
    annualTax = calcForeignResidentTax(annualisedIncome);
  } else {
    // WHM
    annualTax = calcWHMTax(annualisedIncome);
  }

  // Medicare levy only applies to residents
  const annualMedicare = residency === 'resident'
    ? calcMedicareLevy(annualisedIncome)
    : 0;

  const periodTax      = annualTax / periods;
  const periodMedicare = annualMedicare / periods;
  const effectiveRate  = annualisedIncome > 0
    ? ((annualTax + annualMedicare) / annualisedIncome) * 100
    : 0;

  return {
    annualisedIncome,
    annualTax,
    annualMedicare,
    annualLITO,
    periodTax,
    periodMedicare,
    effectiveRate,
  };
}
