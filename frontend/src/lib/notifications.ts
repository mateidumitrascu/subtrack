import { addDays } from 'date-fns'
import { priceChanges } from './analytics'
import { fromISO, toISO } from './dates'
import { chargeDates, effectiveStatus, priceAt } from './schedule'
import type { Currency, Rates, Subscription } from './types'

export type NotificationKind = 'renewal' | 'trial' | 'price'

export interface AppNotification {
  id: string
  kind: NotificationKind
  sub: Subscription
  /** When the alert was issued (due date minus the subscription's reminder lead time). */
  at: Date
  /** Payment date or trial end. */
  due?: Date
  /** Amount in the subscription's currency. */
  amount?: number
  from?: number
  to?: number
  pct?: number
}

/** Alerts older than this are shown as read even if never opened. */
const AUTO_READ_AFTER_DAYS = 3

/**
 * Alerts are derived from the data, not stored: reminders before automatic
 * payments, trial endings, and provider price changes from the last 30 days.
 * Only the read/unread state is persisted.
 */
export function buildNotifications(
  subs: Subscription[],
  today: Date,
  base: Currency,
  rates: Rates,
): AppNotification[] {
  const out: AppNotification[] = []

  for (const sub of subs) {
    const status = effectiveStatus(sub, today)

    if (status === 'active') {
      const window = chargeDates(sub, addDays(today, -10), addDays(today, sub.reminderDays))
      for (const due of window) {
        const at = addDays(due, -sub.reminderDays)
        if (at > today) continue
        out.push({
          id: `renewal:${sub.id}:${toISO(due)}`,
          kind: 'renewal',
          sub,
          at,
          due,
          amount: priceAt(sub, due),
        })
      }
    }

    if (status === 'trial' && sub.trialEndsAt) {
      const due = fromISO(sub.trialEndsAt)
      const at = addDays(due, -sub.reminderDays)
      if (at <= today) {
        out.push({
          id: `trial:${sub.id}:${sub.trialEndsAt}`,
          kind: 'trial',
          sub,
          at,
          due,
          amount: priceAt(sub, due),
        })
      }
    }
  }

  const since = addDays(today, -30)
  for (const c of priceChanges(subs, base, rates)) {
    // Upcoming price changes are announced a week before they apply.
    const at = c.date > today ? addDays(c.date, -7) : c.date
    if (at > today || c.date < since) continue
    out.push({
      id: `price:${c.sub.id}:${toISO(c.date)}`,
      kind: 'price',
      sub: c.sub,
      at,
      due: c.date,
      from: c.from,
      to: c.to,
      pct: c.pct,
    })
  }

  return out.sort(
    (a, b) =>
      b.at.getTime() - a.at.getTime() || (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0),
  )
}

export function isUnread(n: AppNotification, readIds: string[], today: Date): boolean {
  if (readIds.includes(n.id)) return false
  return n.at >= addDays(today, -AUTO_READ_AFTER_DAYS)
}
