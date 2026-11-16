import { addDays } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { fromISO, toISO, today as getToday } from '@subtrack/shared/dates'
import { convert } from '@subtrack/shared/money'
import type { Recommendation } from '@subtrack/shared/recommendations'
import { currentTerms, nextCharge } from '@subtrack/shared/schedule'
import { createSeed, DEFAULT_SETTINGS } from '@subtrack/shared/seed'
import type {
  CategoryId,
  Currency,
  Cycle,
  PricePoint,
  Settings,
  Subscription,
  Usage,
} from '@subtrack/shared/types'

/** Values coming from the add/edit form. */
export interface SubscriptionInput {
  serviceId?: string
  name: string
  plan?: string
  price: number
  currency: Currency
  cycle: Cycle
  /** Next payment date, or the end of the trial. */
  nextDate: string
  isTrial: boolean
  category: CategoryId
  paymentMethod?: string
  reminderDays: number
  usage: Usage
  notes?: string
}

interface State {
  subscriptions: Subscription[]
  settings: Settings
  readNotificationIds: string[]
  dismissedRecIds: string[]

  addSubscription: (input: SubscriptionInput) => string
  updateSubscription: (id: string, input: SubscriptionInput) => void
  deleteSubscription: (id: string) => Subscription | undefined
  /** Puts back a snapshot (undo for delete, cancel, pause and applied tips). */
  restoreSubscription: (sub: Subscription) => void
  pauseSubscription: (id: string) => void
  resumeSubscription: (id: string) => void
  cancelSubscription: (id: string) => void
  applyRecommendation: (rec: Recommendation) => void
  dismissRecommendation: (id: string) => void
  restoreRecommendations: () => void
  markNotificationsRead: (ids: string[]) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  clearAll: () => void
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const clean = (s?: string) => {
  const v = s?.trim()
  return v ? v : undefined
}

function withPrice(history: PricePoint[], point: PricePoint): PricePoint[] {
  const kept = history.filter((p) => p.date < point.date)
  return [...kept, point]
}

/** Starts a new schedule segment so that past charges keep their original dates. */
function reschedule(sub: Subscription, start: string, cycle: Cycle, today: Date): Subscription {
  const tomorrow = toISO(addDays(today, 1))
  const from = start < tomorrow ? start : tomorrow
  const kept = sub.schedule.filter((s) => s.from < from)
  return { ...sub, schedule: [...kept, { from, start, cycle }] }
}

function switchPlan(
  sub: Subscription,
  change: { plan?: string; price: number; cycle: Cycle },
  today: Date,
): Subscription {
  const terms = currentTerms(sub, today)
  const next = terms.next ?? today
  let updated: Subscription = {
    ...sub,
    plan: change.plan ?? sub.plan,
    priceHistory: withPrice(sub.priceHistory, {
      date: toISO(next),
      amount: change.price,
      kind: 'plan',
    }),
  }
  if (change.cycle !== terms.cycle) updated = reschedule(updated, toISO(next), change.cycle, today)
  return updated
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      subscriptions: createSeed(getToday()),
      settings: DEFAULT_SETTINGS,
      readNotificationIds: [],
      dismissedRecIds: [],

      addSubscription: (input) => {
        const today = getToday()
        const id = newId()
        const sub: Subscription = {
          id,
          serviceId: input.serviceId,
          name: input.name.trim(),
          plan: clean(input.plan),
          category: input.category,
          currency: input.currency,
          schedule: [{ from: input.nextDate, start: input.nextDate, cycle: input.cycle }],
          priceHistory: [{ date: toISO(today), amount: input.price }],
          status: input.isTrial ? 'trial' : 'active',
          trialEndsAt: input.isTrial ? input.nextDate : undefined,
          reminderDays: input.reminderDays,
          usage: input.usage,
          paymentMethod: clean(input.paymentMethod),
          notes: clean(input.notes),
          createdAt: toISO(today),
        }
        set((s) => ({ subscriptions: [...s.subscriptions, sub] }))
        return id
      },

      updateSubscription: (id, input) => {
        const today = getToday()
        const { rates } = get().settings
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== id) return sub
            let next: Subscription = {
              ...sub,
              serviceId: input.serviceId,
              name: input.name.trim(),
              plan: clean(input.plan),
              category: input.category,
              reminderDays: input.reminderDays,
              usage: input.usage,
              paymentMethod: clean(input.paymentMethod),
              notes: clean(input.notes),
            }

            // Currency change: keep the history comparable by converting it.
            if (input.currency !== sub.currency) {
              next.currency = input.currency
              next.priceHistory = sub.priceHistory.map((p) => ({
                ...p,
                amount:
                  Math.round(convert(p.amount, sub.currency, input.currency, rates) * 100) / 100,
              }))
            }

            const terms = currentTerms(next, today)
            const planChanged = clean(input.plan) !== sub.plan || input.cycle !== terms.cycle
            if (Math.abs(input.price - terms.price) > 0.001) {
              next.priceHistory = withPrice(next.priceHistory, {
                date: toISO(today),
                amount: input.price,
                ...(planChanged ? { kind: 'plan' as const } : {}),
              })
            }

            const currentNext = nextCharge(next, today)
            const dateChanged = !currentNext || toISO(currentNext) !== input.nextDate
            if (dateChanged || input.cycle !== terms.cycle) {
              next = reschedule(next, input.nextDate, input.cycle, today)
            }

            if (input.isTrial) {
              next.status = 'trial'
              next.trialEndsAt = input.nextDate
            } else if (next.status === 'trial') {
              next.status = 'active'
              next.trialEndsAt = undefined
            }
            return next
          }),
        }))
      },

      deleteSubscription: (id) => {
        const sub = get().subscriptions.find((s) => s.id === id)
        set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }))
        return sub
      },

      restoreSubscription: (sub) =>
        set((s) => ({
          subscriptions: s.subscriptions.some((x) => x.id === sub.id)
            ? s.subscriptions.map((x) => (x.id === sub.id ? sub : x))
            : [...s.subscriptions, sub],
        })),

      pauseSubscription: (id) => {
        const t = toISO(getToday())
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === id
              ? { ...sub, status: 'paused', pauses: [...(sub.pauses ?? []), { from: t }] }
              : sub,
          ),
        }))
      },

      resumeSubscription: (id) => {
        const t = toISO(getToday())
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== id) return sub
            const pauses = (sub.pauses ?? []).map((p) => (p.to ? p : { ...p, to: t }))
            const trialRunning = sub.trialEndsAt && fromISO(sub.trialEndsAt) > getToday()
            return { ...sub, pauses, status: trialRunning ? 'trial' : 'active' }
          }),
        }))
      },

      cancelSubscription: (id) => {
        const t = toISO(getToday())
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === id ? { ...sub, status: 'cancelled', cancelledAt: t } : sub,
          ),
        }))
      },

      applyRecommendation: (rec) => {
        if (rec.action.type === 'cancel') {
          get().cancelSubscription(rec.sub.id)
          return
        }
        const action = rec.action
        const today = getToday()
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === rec.sub.id ? switchPlan(sub, action, today) : sub,
          ),
        }))
      },

      dismissRecommendation: (id) =>
        set((s) => ({ dismissedRecIds: [...new Set([...s.dismissedRecIds, id])] })),

      restoreRecommendations: () => set({ dismissedRecIds: [] }),

      markNotificationsRead: (ids) =>
        set((s) => ({ readNotificationIds: [...new Set([...s.readNotificationIds, ...ids])] })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetDemo: () =>
        set((s) => ({
          subscriptions: createSeed(getToday()),
          readNotificationIds: [],
          dismissedRecIds: [],
          settings: { ...DEFAULT_SETTINGS, lang: s.settings.lang, theme: s.settings.theme },
        })),

      clearAll: () => set({ subscriptions: [], readNotificationIds: [], dismissedRecIds: [] }),
    }),
    {
      name: 'subtrack-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        subscriptions: s.subscriptions,
        settings: s.settings,
        readNotificationIds: s.readNotificationIds,
        dismissedRecIds: s.dismissedRecIds,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
    },
  ),
)
