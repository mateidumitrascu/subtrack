import { addDays } from 'date-fns'
import { addCycle, toISO } from './dates.ts'
import type {
  CategoryId,
  Currency,
  Cycle,
  Settings,
  Status,
  Subscription,
  Usage,
} from './types.ts'

/*
  Demo data, generated relative to "today" so renewals and trials are always
  upcoming whenever the demo is opened. Names, prices and cards are fictional
  sample values.
*/

export interface SeedDef {
  id: string
  serviceId?: string
  name: string
  plan?: string
  category: CategoryId
  currency: Currency
  cycle: Cycle
  /** Days from today until the next charge (for trials: the end of the trial). */
  next: number
  /** How many billing cycles ago the subscription started. */
  since: number
  /** [billing cycles before the next charge, amount]. The first entry is the starting price. */
  prices: Array<[number, number]>
  status?: Status
  usage: Usage
  reminderDays?: number
  paymentMethod?: string
  notes?: string
  cancelledDaysAgo?: number
  pausedDaysAgo?: number
  /** Trials: how long ago the trial started. */
  createdDaysAgo?: number
}

/** Also turned into SQL by shared/scripts/to-sql.ts (the `seed_demo_data` function). */
export const DEMO_DEFS: SeedDef[] = [
  {
    id: 's-chatgpt',
    serviceId: 'chatgpt',
    name: 'ChatGPT',
    plan: 'Plus',
    category: 'software',
    currency: 'USD',
    cycle: 'monthly',
    next: 1,
    since: 15,
    prices: [[15, 20]],
    usage: 'daily',
    reminderDays: 1,
    paymentMethod: 'Revolut 0921',
  },
  {
    id: 's-netflix',
    serviceId: 'netflix',
    name: 'Netflix',
    plan: 'Standard',
    category: 'video',
    currency: 'EUR',
    cycle: 'monthly',
    next: 2,
    since: 26,
    prices: [
      [26, 9.99],
      [3, 10.99],
    ],
    usage: 'weekly',
    paymentMethod: 'Visa 4417',
    notes: 'Cont partajat cu Andrei.',
  },
  {
    id: 's-atlas',
    name: 'Atlas Fitness',
    plan: 'Full access',
    category: 'fitness',
    currency: 'RON',
    cycle: 'monthly',
    next: 4,
    since: 7,
    prices: [
      [7, 129],
      [0, 139],
    ],
    usage: 'weekly',
    paymentMethod: 'Revolut 0921',
  },
  {
    id: 's-spotify',
    serviceId: 'spotify',
    name: 'Spotify',
    plan: 'Premium Individual',
    category: 'music',
    currency: 'RON',
    cycle: 'monthly',
    next: 5,
    since: 40,
    prices: [
      [40, 19.99],
      [14, 23.99],
      [1, 25.99],
    ],
    usage: 'daily',
    paymentMethod: 'Revolut 0921',
  },
  {
    id: 's-dropbox',
    serviceId: 'dropbox',
    name: 'Dropbox',
    plan: 'Plus',
    category: 'cloud',
    currency: 'EUR',
    cycle: 'monthly',
    next: 8,
    since: 14,
    prices: [[14, 11.99]],
    usage: 'monthly',
    paymentMethod: 'Mastercard 8830',
  },
  {
    id: 's-youtube',
    serviceId: 'youtube',
    name: 'YouTube Premium',
    plan: 'Individual',
    category: 'video',
    currency: 'RON',
    cycle: 'monthly',
    next: 11,
    since: 18,
    prices: [
      [18, 26.99],
      [6, 29.99],
    ],
    usage: 'daily',
    paymentMethod: 'Visa 4417',
  },
  {
    id: 's-copilot',
    serviceId: 'githubcopilot',
    name: 'GitHub Copilot',
    plan: 'Pro',
    category: 'software',
    currency: 'USD',
    cycle: 'monthly',
    next: 13,
    since: 6,
    prices: [[6, 10]],
    usage: 'daily',
    paymentMethod: 'Revolut 0921',
  },
  {
    id: 's-applemusic',
    serviceId: 'applemusic',
    name: 'Apple Music',
    plan: 'Individual',
    category: 'music',
    currency: 'EUR',
    cycle: 'monthly',
    next: 17,
    since: 8,
    prices: [[8, 5.99]],
    usage: 'monthly',
    paymentMethod: 'Visa 4417',
  },
  {
    id: 's-icloud',
    serviceId: 'icloud',
    name: 'iCloud+',
    plan: '200 GB',
    category: 'cloud',
    currency: 'EUR',
    cycle: 'monthly',
    next: 20,
    since: 30,
    prices: [[30, 2.99]],
    usage: 'daily',
    paymentMethod: 'Visa 4417',
  },
  {
    id: 's-notion',
    serviceId: 'notion',
    name: 'Notion',
    plan: 'Plus',
    category: 'software',
    currency: 'USD',
    cycle: 'monthly',
    next: 24,
    since: 10,
    prices: [[10, 12]],
    usage: 'weekly',
    paymentMethod: 'Revolut 0921',
  },
  {
    id: 's-strava',
    serviceId: 'strava',
    name: 'Strava',
    plan: 'Premium',
    category: 'fitness',
    currency: 'EUR',
    cycle: 'yearly',
    next: 46,
    since: 2,
    prices: [[2, 59.99]],
    usage: 'rarely',
    paymentMethod: 'Mastercard 8830',
  },
  {
    id: 's-playstation',
    serviceId: 'playstation',
    name: 'PlayStation Plus',
    plan: 'Essential',
    category: 'gaming',
    currency: 'EUR',
    cycle: 'yearly',
    next: 143,
    since: 3,
    prices: [
      [3, 59.99],
      [1, 71.99],
    ],
    usage: 'weekly',
    reminderDays: 7,
    paymentMethod: 'Mastercard 8830',
  },
  {
    id: 's-duolingo',
    serviceId: 'duolingo',
    name: 'Duolingo',
    plan: 'Super',
    category: 'education',
    currency: 'EUR',
    cycle: 'yearly',
    next: 3,
    since: 0,
    prices: [[0, 59.99]],
    status: 'trial',
    usage: 'daily',
    paymentMethod: 'Visa 4417',
    createdDaysAgo: 11,
  },
  {
    id: 's-hbomax',
    serviceId: 'hbomax',
    name: 'HBO Max',
    plan: 'Standard',
    category: 'video',
    currency: 'RON',
    cycle: 'monthly',
    next: 9,
    since: 0,
    prices: [[0, 34.99]],
    status: 'trial',
    usage: 'weekly',
    paymentMethod: 'Revolut 0921',
    createdDaysAgo: 5,
  },
  {
    id: 's-audible',
    serviceId: 'audible',
    name: 'Audible',
    plan: 'Premium Plus',
    category: 'education',
    currency: 'EUR',
    cycle: 'monthly',
    next: 6,
    since: 10,
    prices: [[10, 9.95]],
    status: 'paused',
    pausedDaysAgo: 30,
    usage: 'rarely',
    paymentMethod: 'Visa 4417',
  },
  {
    id: 's-deezer',
    serviceId: 'deezer',
    name: 'Deezer',
    plan: 'Premium',
    category: 'music',
    currency: 'RON',
    cycle: 'monthly',
    next: 9,
    since: 17,
    prices: [
      [17, 22.99],
      [9, 24.99],
    ],
    status: 'cancelled',
    cancelledDaysAgo: 150,
    usage: 'monthly',
    paymentMethod: 'Revolut 0921',
  },
]

function build(def: SeedDef, today: Date): Subscription {
  const next = addDays(today, def.next)
  const back = (cycles: number) => addCycle(next, def.cycle, -cycles)
  const start = back(def.since)
  const status = def.status ?? 'active'
  const createdAt =
    def.createdDaysAgo !== undefined ? addDays(today, -def.createdDaysAgo) : start

  return {
    id: def.id,
    serviceId: def.serviceId,
    name: def.name,
    plan: def.plan,
    category: def.category,
    currency: def.currency,
    schedule: [{ from: toISO(start), start: toISO(start), cycle: def.cycle }],
    priceHistory: def.prices.map(([cycles, amount]) => ({ date: toISO(back(cycles)), amount })),
    status,
    trialEndsAt: status === 'trial' ? toISO(next) : undefined,
    cancelledAt:
      def.cancelledDaysAgo !== undefined ? toISO(addDays(today, -def.cancelledDaysAgo)) : undefined,
    pauses:
      def.pausedDaysAgo !== undefined
        ? [{ from: toISO(addDays(today, -def.pausedDaysAgo)) }]
        : undefined,
    reminderDays: def.reminderDays ?? 3,
    usage: def.usage,
    paymentMethod: def.paymentMethod,
    notes: def.notes,
    createdAt: toISO(createdAt),
  }
}

export function createSeed(today: Date): Subscription[] {
  return DEMO_DEFS.map((d) => build(d, today))
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'ro',
  theme: 'system',
  baseCurrency: 'RON',
  // Illustrative rates, editable in Settings.
  rates: { EUR: 5.08, USD: 4.4 },
  defaultReminderDays: 3,
  channels: { email: true, push: false, digest: true },
  isStudent: true,
  userName: 'Ioana Mureșan',
  userEmail: 'ioana.muresan@example.com',
}
