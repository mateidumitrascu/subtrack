export type Currency = 'RON' | 'EUR' | 'USD'
export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type Status = 'active' | 'trial' | 'paused' | 'cancelled'
export type CategoryId =
  | 'video'
  | 'music'
  | 'software'
  | 'cloud'
  | 'gaming'
  | 'education'
  | 'fitness'
  | 'other'
export type Usage = 'daily' | 'weekly' | 'monthly' | 'rarely'
export type Lang = 'ro' | 'en'
export type ThemePref = 'system' | 'light' | 'dark'

export const CURRENCIES: Currency[] = ['RON', 'EUR', 'USD']
export const CYCLES: Cycle[] = ['weekly', 'monthly', 'quarterly', 'yearly']
/** Fixed order: it is also the categorical color order used by charts. */
export const CATEGORIES: CategoryId[] = [
  'video',
  'music',
  'software',
  'cloud',
  'gaming',
  'education',
  'fitness',
  'other',
]
export const USAGES: Usage[] = ['daily', 'weekly', 'monthly', 'rarely']
export const REMINDER_OPTIONS = [1, 3, 7] as const

/** Calendar date in local time, formatted yyyy-MM-dd. */
export type ISODate = string

export interface PricePoint {
  /** The amount applies to charges on or after this date. */
  date: ISODate
  amount: number
  /** 'plan' marks a change the user made (new plan or billing cycle), not a provider price change. */
  kind?: 'plan'
}

/**
 * Billing schedule segment. A subscription usually has one; a new segment is
 * appended when the user changes the billing cycle or the next payment date,
 * so past charges keep their original schedule.
 */
export interface ScheduleSegment {
  /** Charges produced by earlier segments stop before this date. */
  from: ISODate
  /** First charge of this segment; later charges repeat every `cycle`. */
  start: ISODate
  cycle: Cycle
}

export interface PausePeriod {
  from: ISODate
  to?: ISODate
}

export interface Subscription {
  id: string
  /** Catalog id (logo, plan alternatives). Undefined for custom services. */
  serviceId?: string
  name: string
  plan?: string
  category: CategoryId
  currency: Currency
  schedule: ScheduleSegment[]
  /** Sorted ascending by date, never empty. */
  priceHistory: PricePoint[]
  status: Status
  /** For trials: the date of the first paid charge. */
  trialEndsAt?: ISODate
  /** No charges after this date. */
  cancelledAt?: ISODate
  pauses?: PausePeriod[]
  reminderDays: number
  usage: Usage
  paymentMethod?: string
  notes?: string
  createdAt: ISODate
}

/** Lei (RON) for one unit of the foreign currency. */
export interface Rates {
  EUR: number
  USD: number
}

export interface Settings {
  lang: Lang
  theme: ThemePref
  baseCurrency: Currency
  rates: Rates
  defaultReminderDays: number
  channels: { email: boolean; push: boolean; digest: boolean }
  isStudent: boolean
  userName: string
  userEmail: string
}

export interface Charge {
  sub: Subscription
  date: Date
  /** In the subscription's own currency. */
  amount: number
  /** Converted to the base currency. */
  base: number
}
