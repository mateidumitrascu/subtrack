import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Cycle, ISODate } from './types.ts'

export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd')

/** Parses yyyy-MM-dd as local midnight. */
export const fromISO = (s: ISODate): Date => parseISO(s)

export const today = (): Date => startOfDay(new Date())

/** The n-th charge date counted from `start` (n = 0 is `start` itself). */
export function addCycle(start: Date, cycle: Cycle, n: number): Date {
  switch (cycle) {
    case 'weekly':
      return addWeeks(start, n)
    case 'monthly':
      return addMonths(start, n)
    case 'quarterly':
      return addMonths(start, 3 * n)
    case 'yearly':
      return addYears(start, n)
  }
}

export const CHARGES_PER_YEAR: Record<Cycle, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}

/** Factor that turns one charge into its monthly equivalent. */
export const monthlyFactor = (cycle: Cycle) => CHARGES_PER_YEAR[cycle] / 12

export const daysBetween = (from: Date, to: Date) => differenceInCalendarDays(to, from)
