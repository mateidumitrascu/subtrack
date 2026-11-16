import { addDays, subYears } from 'date-fns'
import { priceChanges } from './analytics'
import { getService } from './catalog'
import { fromISO } from './dates'
import { convert } from './money'
import { currentTerms, effectiveStatus, monthlyCost, monthlyIn } from './schedule'
import type { Currency, Cycle, Rates, Subscription, Usage } from './types'

export type RecKind = 'trial' | 'duplicate' | 'unused' | 'student' | 'annual' | 'downgrade'

export type RecAction =
  | { type: 'cancel' }
  | { type: 'switch'; plan?: string; price: number; cycle: Cycle }

export interface Recommendation {
  id: string
  kind: RecKind
  sub: Subscription
  /** Duplicates: the overlapping subscription we suggest keeping. */
  keep?: Subscription
  group?: 'music' | 'video' | 'cloud'
  /** Estimated saving per month, in the base currency. */
  monthlySavings: number
  action: RecAction
  /** Trials: the day the first payment happens. */
  date?: Date
  /** Downgrades: the recent price increase that triggered the tip. */
  pct?: number
}

interface RecSettings {
  baseCurrency: Currency
  rates: Rates
  isStudent: boolean
}

const USAGE_RANK: Record<Usage, number> = { daily: 0, weekly: 1, monthly: 2, rarely: 3 }
const MIN_SAVING = 0.5

export function buildRecommendations(
  subs: Subscription[],
  today: Date,
  settings: RecSettings,
): Recommendation[] {
  const { baseCurrency: base, rates } = settings
  const recs: Recommendation[] = []
  const cancelSuggested = new Set<string>()
  const active = subs.filter((s) => effectiveStatus(s, today) === 'active')

  // 1. Trials that convert into a paid plan within two weeks.
  for (const sub of subs) {
    if (effectiveStatus(sub, today) !== 'trial' || !sub.trialEndsAt) continue
    const end = fromISO(sub.trialEndsAt)
    if (end > addDays(today, 14)) continue
    const t = currentTerms(sub, today)
    recs.push({
      id: `trial:${sub.id}`,
      kind: 'trial',
      sub,
      monthlySavings: monthlyIn(t.price, t.cycle, sub.currency, base, rates),
      action: { type: 'cancel' },
      date: end,
    })
    cancelSuggested.add(sub.id)
  }

  // 2. Overlapping services (two music apps, two cloud drives...). Keep the one used most.
  const groups = new Map<'music' | 'video' | 'cloud', Subscription[]>()
  for (const sub of active) {
    const overlap = getService(sub.serviceId)?.overlap
    if (!overlap) continue
    groups.set(overlap, [...(groups.get(overlap) ?? []), sub])
  }
  for (const [group, members] of groups) {
    if (members.length < 2) continue
    const ranked = [...members].sort(
      (a, b) =>
        USAGE_RANK[a.usage] - USAGE_RANK[b.usage] ||
        monthlyCost(a, today, base, rates) - monthlyCost(b, today, base, rates),
    )
    const keep = ranked[0]
    for (const sub of ranked.slice(1)) {
      recs.push({
        id: `duplicate:${sub.id}:${keep.id}`,
        kind: 'duplicate',
        sub,
        keep,
        group,
        monthlySavings: monthlyCost(sub, today, base, rates),
        action: { type: 'cancel' },
      })
      cancelSuggested.add(sub.id)
    }
  }

  // 3. Rarely used.
  for (const sub of active) {
    if (sub.usage !== 'rarely' || cancelSuggested.has(sub.id)) continue
    recs.push({
      id: `unused:${sub.id}`,
      kind: 'unused',
      sub,
      monthlySavings: monthlyCost(sub, today, base, rates),
      action: { type: 'cancel' },
    })
    cancelSuggested.add(sub.id)
  }

  const recentIncrease = new Map<string, number>()
  const since = subYears(today, 1)
  for (const c of priceChanges(subs, base, rates)) {
    if (c.pct >= 0.05 && c.date >= since && c.date <= today && !recentIncrease.has(c.sub.id)) {
      recentIncrease.set(c.sub.id, c.pct)
    }
  }

  for (const sub of active) {
    const service = getService(sub.serviceId)
    if (!service) continue
    const t = currentTerms(sub, today)
    const current = monthlyIn(t.price, t.cycle, sub.currency, base, rates)

    // 4. Student plans.
    const student = service.student
    if (settings.isStudent && student && sub.plan !== student.plan) {
      const target = monthlyIn(student.price, student.cycle, student.currency, base, rates)
      if (current - target > MIN_SAVING) {
        recs.push({
          id: `student:${sub.id}`,
          kind: 'student',
          sub,
          monthlySavings: current - target,
          action: {
            type: 'switch',
            plan: student.plan,
            price: round2(convert(student.price, student.currency, sub.currency, rates)),
            cycle: student.cycle,
          },
        })
      }
    }

    // 5. Yearly billing for the same plan.
    if (service.annual && t.cycle === 'monthly') {
      const yearly = convert(service.annual.price, service.annual.currency, sub.currency, rates)
      const yearlyNow = t.price * 12
      if (yearlyNow - yearly > MIN_SAVING) {
        recs.push({
          id: `annual:${sub.id}`,
          kind: 'annual',
          sub,
          monthlySavings: convert((yearlyNow - yearly) / 12, sub.currency, base, rates),
          action: { type: 'switch', plan: sub.plan, price: round2(yearly), cycle: 'yearly' },
        })
      }
    }

    // 6. A cheaper tier after a recent price increase.
    const cheaper = service.cheaper
    const pct = recentIncrease.get(sub.id)
    if (cheaper && pct !== undefined && sub.plan !== cheaper.plan) {
      const target = monthlyIn(cheaper.price, cheaper.cycle, cheaper.currency, base, rates)
      if (current - target > MIN_SAVING) {
        recs.push({
          id: `downgrade:${sub.id}`,
          kind: 'downgrade',
          sub,
          pct,
          monthlySavings: current - target,
          action: {
            type: 'switch',
            plan: cheaper.plan,
            price: round2(convert(cheaper.price, cheaper.currency, sub.currency, rates)),
            cycle: cheaper.cycle,
          },
        })
      }
    }
  }

  // Time-sensitive trials first, then the biggest savings.
  return recs.sort((a, b) => {
    if (a.kind === 'trial' && b.kind === 'trial') return a.date!.getTime() - b.date!.getTime()
    if (a.kind === 'trial') return -1
    if (b.kind === 'trial') return 1
    return b.monthlySavings - a.monthlySavings
  })
}

/**
 * Upper bound of the monthly saving. Several tips can target the same
 * subscription (cancel it or switch it to yearly), so only the best one counts.
 */
export function potentialSavings(recs: Recommendation[]): number {
  const best = new Map<string, number>()
  for (const r of recs) best.set(r.sub.id, Math.max(best.get(r.sub.id) ?? 0, r.monthlySavings))
  let sum = 0
  for (const v of best.values()) sum += v
  return sum
}

const round2 = (n: number) => Math.round(n * 100) / 100
