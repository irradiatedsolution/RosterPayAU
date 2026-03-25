/**
 * stores/index.ts
 * Zustand stores with AsyncStorage persistence.
 *
 * Three stores:
 *  1. usePersonStore  — profiles (persons) and their settings
 *  2. useRosterStore  — shift/day-off entries
 *  3. useSubStore     — subscription state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Person, RosterEntry, SubscriptionState, ProfileType, WagePeriod, AllowancePreset, ShiftPreset, Deduction } from '../types';
import { FREE_ROSTER_DAYS_LIMIT } from '../types';
import { rosterKey, countUsedRosterDays } from '../utils/rosterUtils';
import { toISO } from '../utils/rosterUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

function makeDefaultPerson(name = '', type: ProfileType = 'self'): Person {
  return {
    id: uid(),
    name,
    type,
    employer: '',
    position: '',
    employeeId: '',
    payFreq: 'fortnightly',
    residency: 'resident',
    wageType: 'hourly',
    employmentType: 'fulltime',
    contractHours: 38,
    leaveBalance: 0,
    wageHistory: [
      {
        id: uid(),
        from: '2024-07-01',
        to: null,
        rate: 0,
        casual: false,
      },
    ],
    allowancePresets: [
      { id: uid(), name: 'Afternoon Shift Allowance', defaultAmount: null, taxable: true,  color: '#F97316' },
      { id: uid(), name: 'Night Shift Allowance',     defaultAmount: null, taxable: true,  color: '#7C3AED' },
      { id: uid(), name: 'Meal Allowance',            defaultAmount: null, taxable: false, color: '#10B981' },
    ],
    shiftPresets: [
      { id: uid(), label: 'Early',    start: '06:00', end: '14:00', brk: 30, color: '#F59E0B' },
      { id: uid(), label: 'Day',      start: '08:00', end: '16:00', brk: 30, color: '#3B82F6' },
      { id: uid(), label: 'Arvo',     start: '14:00', end: '22:00', brk: 30, color: '#F97316' },
      { id: uid(), label: 'Night',    start: '22:00', end: '06:00', brk: 30, color: '#7C3AED' },
      { id: uid(), label: 'Long Day', start: '07:00', end: '19:00', brk: 60, color: '#10B981' },
    ],
    deductions: [],
    createdAt: todayISO(),
    payPeriodStartDate: '2025-03-17',
    emoji: '👤',
    emoji: '👤',
  };
}

// ─── 1. Person Store ──────────────────────────────────────────────────────────

interface PersonStore {
  persons: Person[];
  activePersonId: string | null;

  // Actions
  setActivePerson: (id: string) => void;
  addPerson: (name: string, type: ProfileType) => Person;
  removePerson: (id: string) => void;
  updatePerson: (id: string, fields: Partial<Person>) => void;

  // Wage history
  addWagePeriod: (personId: string) => void;
  updateWagePeriod: (personId: string, periodId: string, fields: Partial<WagePeriod>) => void;
  removeWagePeriod: (personId: string, periodId: string) => void;

  // Presets
  addShiftPreset: (personId: string) => void;
  updateShiftPreset: (personId: string, presetId: string, fields: Partial<ShiftPreset>) => void;
  removeShiftPreset: (personId: string, presetId: string) => void;

  addAllowancePreset: (personId: string) => void;
  updateAllowancePreset: (personId: string, presetId: string, fields: Partial<AllowancePreset>) => void;
  removeAllowancePreset: (personId: string, presetId: string) => void;

  // Deductions
  addDeduction: (personId: string) => void;
  updateDeduction: (personId: string, deductionId: string, fields: Partial<Deduction>) => void;
  removeDeduction: (personId: string, deductionId: string) => void;

  // Computed
  getActivePerson: () => Person | null;
}

export const usePersonStore = create<PersonStore>()(
  persist(
    (set, get) => {
      const firstPerson = makeDefaultPerson('My Profile', 'self');
      return {
        persons: [firstPerson],
        activePersonId: firstPerson.id,

        setActivePerson: (id) => set({ activePersonId: id }),

        addPerson: (name, type) => {
          const p = makeDefaultPerson(name, type);
          set(state => ({ persons: [...state.persons, p], activePersonId: p.id }));
          return p;
        },

        removePerson: (id) => {
          set(state => {
            const persons = state.persons.filter(p => p.id !== id);
            const activePersonId =
              state.activePersonId === id
                ? (persons[0]?.id ?? null)
                : state.activePersonId;
            return { persons, activePersonId };
          });
        },

        updatePerson: (id, fields) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === id ? { ...p, ...fields } : p,
            ),
          }));
        },

        // ── Wage history ──
        addWagePeriod: (personId) => {
          const newPeriod: WagePeriod = {
            id: uid(),
            from: todayISO(),
            to: null,
            rate: 0,
            casual: false,
          };
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, wageHistory: [...p.wageHistory, newPeriod] }
                : p,
            ),
          }));
        },

        updateWagePeriod: (personId, periodId, fields) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? {
                    ...p,
                    wageHistory: p.wageHistory.map(w =>
                      w.id === periodId ? { ...w, ...fields } : w,
                    ),
                  }
                : p,
            ),
          }));
        },

        removeWagePeriod: (personId, periodId) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, wageHistory: p.wageHistory.filter(w => w.id !== periodId) }
                : p,
            ),
          }));
        },

        // ── Shift presets ──
        addShiftPreset: (personId) => {
          const preset: ShiftPreset = {
            id: uid(), label: '', start: '09:00', end: '17:00', brk: 30, color: '#0EA5A0',
          };
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, shiftPresets: [...p.shiftPresets, preset] }
                : p,
            ),
          }));
        },

        updateShiftPreset: (personId, presetId, fields) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? {
                    ...p,
                    shiftPresets: p.shiftPresets.map(s =>
                      s.id === presetId ? { ...s, ...fields } : s,
                    ),
                  }
                : p,
            ),
          }));
        },

        removeShiftPreset: (personId, presetId) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, shiftPresets: p.shiftPresets.filter(s => s.id !== presetId) }
                : p,
            ),
          }));
        },

        // ── Allowance presets ──
        addAllowancePreset: (personId) => {
          const preset: AllowancePreset = {
            id: uid(), name: '', defaultAmount: null, taxable: true, color: '#0EA5A0',
          };
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, allowancePresets: [...p.allowancePresets, preset] }
                : p,
            ),
          }));
        },

        updateAllowancePreset: (personId, presetId, fields) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? {
                    ...p,
                    allowancePresets: p.allowancePresets.map(a =>
                      a.id === presetId ? { ...a, ...fields } : a,
                    ),
                  }
                : p,
            ),
          }));
        },

        removeAllowancePreset: (personId, presetId) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, allowancePresets: p.allowancePresets.filter(a => a.id !== presetId) }
                : p,
            ),
          }));
        },

        // ── Deductions ──
        addDeduction: (personId) => {
          const d: Deduction = { id: uid(), name: '', amount: 0 };
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, deductions: [...(p.deductions ?? []), d] }
                : p,
            ),
          }));
        },

        updateDeduction: (personId, deductionId, fields) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? {
                    ...p,
                    deductions: (p.deductions ?? []).map(d =>
                      d.id === deductionId ? { ...d, ...fields } : d,
                    ),
                  }
                : p,
            ),
          }));
        },

        removeDeduction: (personId, deductionId) => {
          set(state => ({
            persons: state.persons.map(p =>
              p.id === personId
                ? { ...p, deductions: (p.deductions ?? []).filter(d => d.id !== deductionId) }
                : p,
            ),
          }));
        },

        getActivePerson: () => {
          const { persons, activePersonId } = get();
          return persons.find(p => p.id === activePersonId) ?? persons[0] ?? null;
        },
      };
    },
    {
      name: 'rosterpay-persons',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── 2. Roster Store ──────────────────────────────────────────────────────────

interface RosterStore {
  // key: "personId|YYYY-MM-DD"
  entries: Record<string, RosterEntry>;

  setEntry:    (key: string, entry: RosterEntry) => void;
  removeEntry: (key: string) => void;
  getEntry:    (personId: string, date: string) => RosterEntry | null;

  // Free plan check
  getUsedDays: (personId: string) => number;
  canAddEntry: (personId: string, isPro: boolean) => boolean;
}

export const useRosterStore = create<RosterStore>()(
  persist(
    (set, get) => ({
      entries: {},

      setEntry: (key, entry) => {
        set(state => ({ entries: { ...state.entries, [key]: entry } }));
      },

      removeEntry: (key) => {
        set(state => {
          const entries = { ...state.entries };
          delete entries[key];
          return { entries };
        });
      },

      getEntry: (personId, date) => {
        const key = rosterKey(personId, date);
        return get().entries[key] ?? null;
      },

      getUsedDays: (personId) => {
        return countUsedRosterDays(personId, get().entries);
      },

      canAddEntry: (personId, isPro) => {
        if (isPro) return true;
        return get().getUsedDays(personId) < FREE_ROSTER_DAYS_LIMIT;
      },
    }),
    {
      name: 'rosterpay-roster',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── 3. Subscription Store ────────────────────────────────────────────────────

interface SubStore {
  subscription: SubscriptionState;
  isPro: boolean;

  setPlan:    (plan: SubscriptionState['plan'], expiresAt?: string) => void;
  restorePurchase: () => void;     // stub — implement with RevenueCat
}

export const useSubStore = create<SubStore>()(
  persist(
    (set) => ({
      subscription: { plan: 'free', purchasedAt: null, expiresAt: null },
      isPro: false,

      setPlan: (plan, expiresAt) => {
        set({
          subscription: {
            plan,
            purchasedAt: todayISO(),
            expiresAt: expiresAt ?? null,
          },
          isPro: plan !== 'free',
        });
      },

      restorePurchase: () => {
        // TODO: integrate RevenueCat
        // const purchaserInfo = await Purchases.restorePurchases();
        console.log('restorePurchase — connect RevenueCat here');
      },
    }),
    {
      name: 'rosterpay-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
