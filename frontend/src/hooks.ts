import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useI18n, longDate, relativeDay, shortDate } from './i18n'
import { today as getToday } from './lib/dates'
import { formatMoney, formatPercent, type MoneyOptions } from './lib/money'
import { buildNotifications, isUnread, type AppNotification } from './lib/notifications'
import { buildRecommendations, potentialSavings } from './lib/recommendations'
import type { Currency } from './lib/types'
import { useStore } from './store/store'

/* ---------- today (refreshes when the tab regains focus on a new day) ---------- */

let current = getToday()
const listeners = new Set<() => void>()

function refreshToday() {
  const next = getToday()
  if (next.getTime() !== current.getTime()) {
    current = next
    listeners.forEach((l) => l())
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', refreshToday)
  document.addEventListener('visibilitychange', refreshToday)
}

export function useToday(): Date {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

/* ---------- formatting bound to the current language and base currency ---------- */

export function useFormat() {
  const { t, lang } = useI18n()
  const base = useStore((s) => s.settings.baseCurrency)
  const today = useToday()
  return useMemo(
    () => ({
      t,
      lang,
      base,
      money: (amount: number, currency: Currency, opts?: MoneyOptions) =>
        formatMoney(amount, currency, lang, opts),
      baseMoney: (amount: number, opts?: MoneyOptions) => formatMoney(amount, base, lang, opts),
      short: (d: Date) => shortDate(d, lang),
      long: (d: Date) => longDate(d, lang),
      rel: (d: Date) => relativeDay(d, today, t),
      pct: (ratio: number, opts?: { sign?: boolean }) => formatPercent(ratio, lang, opts),
    }),
    [t, lang, base, today],
  )
}

export function useDocumentTitle(page: string) {
  const { t } = useI18n()
  useEffect(() => {
    document.title = t.meta.title(page)
  }, [page, t])
}

/* ---------- derived data ---------- */

export function useRecommendations() {
  const subs = useStore((s) => s.subscriptions)
  const settings = useStore((s) => s.settings)
  const dismissedIds = useStore((s) => s.dismissedRecIds)
  const today = useToday()
  return useMemo(() => {
    const all = buildRecommendations(subs, today, settings)
    const active = all.filter((r) => !dismissedIds.includes(r.id))
    return {
      recs: active,
      dismissedCount: all.length - active.length,
      potential: potentialSavings(active),
    }
  }, [subs, settings, dismissedIds, today])
}

export function useNotifications() {
  const subs = useStore((s) => s.subscriptions)
  const base = useStore((s) => s.settings.baseCurrency)
  const rates = useStore((s) => s.settings.rates)
  const readIds = useStore((s) => s.readNotificationIds)
  const today = useToday()
  return useMemo(() => {
    const list = buildNotifications(subs, today, base, rates)
    const unread = (n: AppNotification) => isUnread(n, readIds, today)
    return { list, unread, unreadCount: list.filter(unread).length }
  }, [subs, base, rates, readIds, today])
}

/* ---------- layout ---------- */

/** Width of an element, kept in sync with ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Resolved theme (system preference applied). */
export function useIsDark(): boolean {
  const pref = useStore((s) => s.settings.theme)
  const systemDark = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  return pref === 'dark' || (pref === 'system' && systemDark)
}
