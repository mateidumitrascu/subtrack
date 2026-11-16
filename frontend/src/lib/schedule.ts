import { addDays, addYears, subYears } from 'date-fns'
import { addCycle, fromISO, monthlyFactor } from './dates'
import { convert } from './money'
import type {
  Charge,
  Currency,
  Cycle,
  Rates,
  ScheduleSegment,
  Status,
  Subscription,
} from './types'

/** A trial whose end date has passed is billed like an active subscription. */
export function effectiveStatus(sub: Subscription, today: Date): Status {
  if (sub.status === 'trial' && sub.trialEndsAt && fromISO(sub.trialEndsAt) <= today) {
    return 'active'
  }
  return sub.status
}

/** Price that applies to a charge on `date` (in the subscription's currency). */
export function priceAt(sub: Subscription, date: Date): number {
  const points = sub.priceHistory
  let amount = points[0]?.amount ?? 0
  for (const p of points) {
    if (fromISO(p.date) <= date) amount = p.amount
    else break
  }
  return amount
}

/** Schedule segment in effect on `date`. */
export function segmentAt(sub: Subscription, date: Date): ScheduleSegment {
  let seg = sub.schedule[0]
  for (const s of sub.schedule) {
    if (fromISO(s.from) <= date) seg = s
  }
  return seg
}

function isSkipped(sub: Subscription, d: Date): boolean {
  if (sub.cancelledAt && d > fromISO(sub.cancelledAt)) return true
  for (const p of sub.pauses ?? []) {
    const from = fromISO(p.from)
    const to = p.to ? fromISO(p.to) : undefined
    if (d > from && (!to || d < to)) return true
  }
  return false
}

const MONTHS_PER_CHARGE: Record<Cycle, number | undefined> = {
  weekly: undefined,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

/** All charge dates between `from` and `to` (both inclusive), ascending. */
export function chargeDates(sub: Subscription, from: Date, to: Date): Date[] {
  const out: Date[] = []
  const segs = sub.schedule
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    const start = fromISO(seg.start)
    const until = i + 1 < segs.length ? fromISO(segs[i + 1].from) : undefined

    // Jump close to `from` instead of iterating from the first charge.
    let k = 0
    if (from > start) {
      const per = MONTHS_PER_CHARGE[seg.cycle]
      if (per) {
        const months =
          (from.getFullYear() - start.getFullYear()) * 12 + (from.getMonth() - start.getMonth())
        k = Math.max(0, Math.floor(months / per) - 1)
      } else {
        k = Math.max(0, Math.floor((from.getTime() - start.getTime()) / (7 * 86_400_000)) - 1)
      }
    }

    for (let guard = 0; guard < 5000; guard++, k++) {
      const d = addCycle(start, seg.cycle, k)
      if (d > to) break
      if (until && d >= until) break
      if (d >= from && !isSkipped(sub, d)) out.push(d)
    }
  }
  return out
}

export function nextCharge(sub: Subscription, today: Date): Date | undefined {
  return chargeDates(sub, today, addYears(today, 2))[0]
}

export function lastCharge(sub: Subscription, today: Date): Date | undefined {
  const past = chargeDates(sub, subYears(today, 10), addDays(today, -1))
  return past[past.length - 1]
}

export interface Terms {
  price: number
  cycle: Cycle
  next?: Date
}

/** Price and cycle of the upcoming charge (or of today, when nothing is scheduled). */
export function currentTerms(sub: Subscription, today: Date): Terms {
  const next = nextCharge(sub, today)
  const ref = next ?? today
  return { price: priceAt(sub, ref), cycle: segmentAt(sub, ref).cycle, next }
}

export function monthlyIn(
  amount: number,
  cycle: Cycle,
  currency: Currency,
  base: Currency,
  rates: Rates,
): number {
  return convert(amount * monthlyFactor(cycle), currency, base, rates)
}

/** Monthly run-rate in the base currency. Zero unless the subscription is billing now. */
export function monthlyCost(sub: Subscription, today: Date, base: Currency, rates: Rates): number {
  if (effectiveStatus(sub, today) !== 'active') return 0
  const t = currentTerms(sub, today)
  return monthlyIn(t.price, t.cycle, sub.currency, base, rates)
}

/** What a running trial will cost per month once it converts. */
export function afterTrialMonthly(
  sub: Subscription,
  today: Date,
  base: Currency,
  rates: Rates,
): number {
  if (effectiveStatus(sub, today) !== 'trial') return 0
  const t = currentTerms(sub, today)
  return monthlyIn(t.price, t.cycle, sub.currency, base, rates)
}

export function chargesBetween(
  subs: Subscription[],
  from: Date,
  to: Date,
  base: Currency,
  rates: Rates,
): Charge[] {
  const out: Charge[] = []
  for (const sub of subs) {
    for (const date of chargeDates(sub, from, to)) {
      const amount = priceAt(sub, date)
      out.push({ sub, date, amount, base: convert(amount, sub.currency, base, rates) })
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime() || b.base - a.base)
}
