/**
 * allowanceCatalog.ts
 * Master list of common Australian workplace allowances.
 * Used in the allowance picker UI.
 */

export type AllowanceCategory = 'Shift' | 'Expense' | 'Other' | 'Custom';

export interface AllowanceCatalogItem {
  id: string;
  name: string;
  category: AllowanceCategory;
  taxable: boolean;
  defaultColor: string;
  hint?: string;      // short ATO guidance note
}

const COLORS = {
  orange: '#F97316',
  purple: '#7C3AED',
  blue:   '#3B82F6',
  red:    '#EF4444',
  green:  '#10B981',
  teal:   '#0EA5A0',
  gold:   '#F59E0B',
  pink:   '#EC4899',
};

export const ALLOWANCE_CATALOG: AllowanceCatalogItem[] = [
  // ── Shift allowances (taxable) ────────────────────────────────────────────
  {
    id: 'arvo',
    name: 'Afternoon Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.orange,
    hint: 'Taxable — included in assessable income',
  },
  {
    id: 'night',
    name: 'Night Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.purple,
    hint: 'Taxable — included in assessable income',
  },
  {
    id: 'morning',
    name: 'Morning Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.gold,
    hint: 'Taxable — included in assessable income',
  },
  {
    id: 'weekend',
    name: 'Weekend Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.blue,
    hint: 'Taxable — included in assessable income',
  },
  {
    id: 'pubhol',
    name: 'Public Holiday Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.red,
    hint: 'Taxable — higher penalty rates apply',
  },
  {
    id: 'changeshift',
    name: 'Change of Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.pink,
    hint: 'Taxable — compensation for roster changes',
  },
  {
    id: 'overtime',
    name: 'Overtime Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.red,
    hint: 'Taxable — overtime penalty rates',
  },
  {
    id: 'oncall',
    name: 'On-Call Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.purple,
    hint: 'Taxable — standby/on-call payments',
  },
  {
    id: 'split',
    name: 'Split Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.orange,
    hint: 'Taxable — compensation for broken shifts',
  },
  {
    id: 'broken',
    name: 'Broken Shift Allowance',
    category: 'Shift',
    taxable: true,
    defaultColor: COLORS.orange,
    hint: 'Taxable — two or more separate periods of duty in one day',
  },

  // ── Expense reimbursements (generally non-taxable) ────────────────────────
  {
    id: 'meal',
    name: 'Meal Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.green,
    hint: 'Generally non-taxable if reasonable & for work purposes (ATO ID 2005/88)',
  },
  {
    id: 'travel',
    name: 'Travel / Transport Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.teal,
    hint: 'Non-taxable up to ATO reasonable amounts; excess is assessable',
  },
  {
    id: 'uniform',
    name: 'Uniform / Laundry Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.blue,
    hint: 'Non-taxable for compulsory uniforms — FBT exempt',
  },
  {
    id: 'tool',
    name: 'Tool Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.gold,
    hint: 'Non-taxable reimbursement for work-related tool costs',
  },
  {
    id: 'phone',
    name: 'Phone / Internet Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.blue,
    hint: 'Non-taxable for work use portion; excess may be assessable',
  },
  {
    id: 'accommodation',
    name: 'Accommodation Allowance',
    category: 'Expense',
    taxable: false,
    defaultColor: COLORS.teal,
    hint: 'Non-taxable up to ATO reasonable amounts when travelling for work',
  },

  // ── Other (usually taxable) ───────────────────────────────────────────────
  {
    id: 'firstaid',
    name: 'First Aid Allowance',
    category: 'Other',
    taxable: true,
    defaultColor: COLORS.red,
    hint: 'Taxable — allowance for holding first aid certification',
  },
  {
    id: 'leading',
    name: 'Leading Hand Allowance',
    category: 'Other',
    taxable: true,
    defaultColor: COLORS.blue,
    hint: 'Taxable — supervising other workers',
  },
  {
    id: 'qual',
    name: 'Qualification / Skills Allowance',
    category: 'Other',
    taxable: true,
    defaultColor: COLORS.purple,
    hint: 'Taxable — paid for holding required qualifications',
  },
  {
    id: 'remote',
    name: 'Remote Area Allowance',
    category: 'Other',
    taxable: true,
    defaultColor: COLORS.gold,
    hint: 'Taxable — some exemptions apply under s.51AF ITAA 1936',
  },
  {
    id: 'dirt',
    name: 'Dirt / Disability Allowance',
    category: 'Other',
    taxable: true,
    defaultColor: COLORS.gold,
    hint: 'Taxable — for unpleasant or hazardous working conditions',
  },

  // ── Custom ────────────────────────────────────────────────────────────────
  {
    id: 'custom',
    name: 'Custom Allowance',
    category: 'Custom',
    taxable: true,
    defaultColor: COLORS.teal,
    hint: 'Enter your own name and set taxable status accordingly',
  },
];

export const ALLOWANCE_CATEGORIES: AllowanceCategory[] = [
  'Shift', 'Expense', 'Other', 'Custom',
];
