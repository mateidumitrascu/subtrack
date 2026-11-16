import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from 'date-fns'
import { CHARGES_PER_YEAR, fromISO } from './dates'
import { convert } from './money'
import {
  afterTrialMonthly,
  chargesBetween,
  effectiveStatus,
  monthlyCost,
  segmentAt,
} from './schedule'
import type { CategoryId, Currency, Cycle, Rates, Subscription } from './types'

export interface Totals {
  monthly: number
  yearly: number
  active: number
  trials: number
  /** Extra monthly cost once running trials convert. */
  afterTrials: number
}

export function totals(subs: Subscription[], today: Date, base: Currency, rates: Rates): Totals {
  let monthly = 0
  let afterTrials = 0
  let active = 0
  let trials = 0
  for (const sub of subs) {
    const status = effectiveStatus(sub, today)
    if (status === 'active') {
      active++
      monthly += monthlyCost(sub, today, base, rates)
    } else if (status === 'trial') {
      trials++
      afterTrials += afterTrialMonthly(sub, today, base, rates)
    }
  }
  return { monthly, yearly: monthly * 12, active, trials, afterTrials }
}

export interface Bucket {
  start: Date
  /** Charged on or before today. */
  paid: number
  /** Still to come in this period. */
  scheduled: number
}

function bucket(
  subs: Subscription[],
  from: Date,
  to: Date,
  today: Date,
  base: Currency,
  rates: Rates,
): Bucket {
  let paid = 0
  let scheduled = 0
  for (const c of chargesBetween(subs, from, to, base, rates)) {
    if (c.date <= today) paid += c.base
    else scheduled += c.base
  }
  return { start: from, paid, scheduled }
}

/** One bucket per calendar month, ending with the current month. */
export function monthSeries(
  subs: Subscription[],
  today: Date,
  base: Currency,
  rates: Rates,
  months = 12,
): Bucket[] {
  const first = startOfMonth(subMonths(today, months - 1))
  return Array.from({ length: months }, (_, i) => {
    const start = addMonths(first, i)
    return bucket(subs, start, endOfMonth(start), today, base, rates)
  })
}

/** One bucket per calendar year, ending with the current year. */
export function yearSeries(
  subs: Subscription[],
  today: Date,
  base: Currency,
  rates: Rates,
  years = 3,
): Bucket[] {
  const first = startOfYear(subYears(today, years - 1))
  return Array.from({ length: years }, (_, i) => {
    const start = addYears(first, i)
    return bucket(subs, start, endOfYear(start), today, base, rates)
  })
}

export interface CategorySlice {
  category: CategoryId
  monthly: number
  share: number
  count: number
}

/** Current monthly run-rate per category, largest first. */
export function categoryBreakdown(
  subs: Subscription[],
  today: Date,
  base: Currency,
  rates: Rates,
): CategorySlice[] {
  const map = new Map<CategoryId, { monthly: number; count: number }>()
  let total = 0
  for (const sub of subs) {
    const m = monthlyCost(sub, today, base, rates)
    if (m <= 0) continue
    total += m
    const cur = map.get(sub.category) ?? { monthly: 0, count: 0 }
    cur.monthly += m
    cur.count++
    map.set(sub.category, cur)
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      monthly: v.monthly,
      count: v.count,
      share: total > 0 ? v.monthly / total : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly)
}

export interface PriceChange {
  sub: Subscription
  date: Date
  from: number
  to: number
  /** Relative change, e.g. 0.1 for +10%. */
  pct: number
  cycle: Cycle
  /** Extra (or saved) cost over one year, in the base currency. */
  yearlyImpact: number
}

/** Provider price changes (plan switches made by the user are excluded), newest first. */
export function priceChanges(subs: Subscription[], base: Currency, rates: Rates): PriceChange[] {
  const out: PriceChange[] = []
  for (const sub of subs) {
    const pts = sub.priceHistory
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const cur = pts[i]
      if (cur.kind === 'plan' || cur.amount === prev.amount || prev.amount <= 0) continue
      const date = fromISO(cur.date)
      const cycle = segmentAt(sub, date).cycle
      const delta = cur.amount - prev.amount
      out.push({
        sub,
        date,
        from: prev.amount,
        to: cur.amount,
        pct: delta / prev.amount,
        cycle,
        yearlyImpact: convert(delta * CHARGES_PER_YEAR[cycle], sub.currency, base, rates),
      })
    }
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime())
}
