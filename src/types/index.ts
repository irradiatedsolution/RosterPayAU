export type ProfileType = "self" | "spouse" | "family" | "employee" | "other";
export type EmploymentType = "fulltime" | "parttime" | "shiftworker" | "casual";
export type PayFrequency = "weekly" | "fortnightly" | "4-weekly" | "monthly";
export type TaxResidency = "resident" | "foreign" | "whm";
export const FREE_ROSTER_DAYS_LIMIT = 14;
export interface WagePeriod { id: string; from: string; to: string | null; rate: number; casual: boolean; }
export interface AllowancePreset { id: string; name: string; defaultAmount: number | null; taxable: boolean; color: string; }
export interface ShiftPreset { id: string; label: string; start: string; end: string; brk: number; color: string; }
export interface Deduction { id: string; name: string; amount: number; }
export interface Person { id: string; name: string; type: ProfileType; employer: string; position: string; employeeId: string; payFreq: PayFrequency; residency: TaxResidency; wageType: "hourly"|"salary"; employmentType: EmploymentType; contractHours: number; leaveBalance: number; wageHistory: WagePeriod[]; allowancePresets: AllowancePreset[]; shiftPresets: ShiftPreset[]; deductions: Deduction[]; createdAt: string; }
export interface ShiftAllowance { id: string; presetId: string | null; name: string; amount: number; taxable: boolean; color: string; }
export interface ShiftDay { personId: string; date: string; off: false; shiftPresetId: string | null; label: string; start: string; end: string; brk: number; grossHours: number; netHours: number; allowances: ShiftAllowance[]; }
export interface DayOff { personId: string; date: string; off: true; }
export type RosterEntry = ShiftDay | DayOff;
export interface MonthlyStats { totalHours: number; workDays: number; offDays: number; basePay: number; totalAllowances: number; allowanceSummary: Record<string, { amount: number; taxable: boolean; color: string }>; }
export interface LeaveInfo { accrualPerHour: number; monthlyAccrual: number; annualEntitlementHours: number; weekEntitlement: number; totalBalance: number; totalBalanceDays: number; }
export interface PayCalculation { basePay: number; totalAllowances: number; grossPay: number; taxableIncome: number; annualisedIncome: number; annualTax: number; annualMedicare: number; periodTax: number; periodMedicare: number; totalDeductions: number; netPay: number; superannuation: number; effectiveRate: number; leaveLoading: number; }
export type PlanType = "free" | "monthly" | "lifetime";
export interface SubscriptionState { plan: PlanType; purchasedAt: string | null; expiresAt: string | null; }
