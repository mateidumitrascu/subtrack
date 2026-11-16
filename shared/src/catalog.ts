import type { CategoryId, Currency, Cycle } from './types.ts'

export interface PlanOffer {
  plan: string
  price: number
  currency: Currency
  cycle: Cycle
}

export type OverlapGroup = 'music' | 'video' | 'cloud'

export interface CatalogService {
  id: string
  name: string
  category: CategoryId
  /** Brand color for the monogram fallback. The frontend adds Simple Icons glyphs by service id. */
  color?: string
  /** Services in the same group overlap (two music services, two cloud drives...). */
  overlap?: OverlapGroup
  defaults: PlanOffer
  /** Yearly price for the same plan, when the provider offers one. */
  annual?: { price: number; currency: Currency }
  student?: PlanOffer
  /** A cheaper tier of the same service. */
  cheaper?: PlanOffer
}

/*
  Demo catalog. Prices are illustrative sample values for the prototype,
  not live provider prices. The same data is seeded into the `services` and
  `service_offers` tables (supabase/seed.sql). Once the frontend reads the
  catalog from Supabase, the database is the source of truth and this array
  is only a fallback for tests and offline demos.
*/
export const CATALOG: CatalogService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'video',
    overlap: 'video',
    defaults: { plan: 'Standard', price: 10.99, currency: 'EUR', cycle: 'monthly' },
    cheaper: { plan: 'Basic', price: 7.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'music',
    overlap: 'music',
    defaults: { plan: 'Premium Individual', price: 25.99, currency: 'RON', cycle: 'monthly' },
    student: { plan: 'Premium Student', price: 12.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    category: 'video',
    defaults: { plan: 'Individual', price: 29.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    category: 'software',
    color: '#10a37f',
    defaults: { plan: 'Plus', price: 20, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'icloud',
    name: 'iCloud+',
    category: 'cloud',
    overlap: 'cloud',
    defaults: { plan: '200 GB', price: 2.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    category: 'video',
    overlap: 'video',
    defaults: { plan: 'Standard', price: 34.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'applemusic',
    name: 'Apple Music',
    category: 'music',
    overlap: 'music',
    defaults: { plan: 'Individual', price: 5.99, currency: 'EUR', cycle: 'monthly' },
    student: { plan: 'Student', price: 2.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'githubcopilot',
    name: 'GitHub Copilot',
    category: 'software',
    defaults: { plan: 'Pro', price: 10, currency: 'USD', cycle: 'monthly' },
    student: { plan: 'Student', price: 0, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'software',
    defaults: { plan: 'Plus', price: 12, currency: 'USD', cycle: 'monthly' },
    annual: { price: 120, currency: 'USD' },
    student: { plan: 'Plus Education', price: 0, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'cloud',
    overlap: 'cloud',
    defaults: { plan: 'Plus', price: 11.99, currency: 'EUR', cycle: 'monthly' },
    annual: { price: 119.88, currency: 'EUR' },
  },
  {
    id: 'googleone',
    name: 'Google One',
    category: 'cloud',
    color: '#4285f4',
    overlap: 'cloud',
    defaults: { plan: '100 GB', price: 9.99, currency: 'RON', cycle: 'monthly' },
    annual: { price: 99.99, currency: 'RON' },
  },
  {
    id: 'disneyplus',
    name: 'Disney+',
    category: 'video',
    color: '#113ccf',
    overlap: 'video',
    defaults: { plan: 'Standard', price: 8.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'primevideo',
    name: 'Prime Video',
    category: 'video',
    color: '#1a98ff',
    overlap: 'video',
    defaults: { plan: 'Standard', price: 5.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'appletv',
    name: 'Apple TV+',
    category: 'video',
    overlap: 'video',
    defaults: { plan: 'Individual', price: 9.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'youtubemusic',
    name: 'YouTube Music',
    category: 'music',
    overlap: 'music',
    defaults: { plan: 'Individual', price: 23.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'deezer',
    name: 'Deezer',
    category: 'music',
    overlap: 'music',
    defaults: { plan: 'Premium', price: 24.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'playstation',
    name: 'PlayStation Plus',
    category: 'gaming',
    defaults: { plan: 'Essential', price: 71.99, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'xbox',
    name: 'Xbox Game Pass',
    category: 'gaming',
    color: '#107c10',
    defaults: { plan: 'Core', price: 6.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'duolingo',
    name: 'Duolingo',
    category: 'education',
    defaults: { plan: 'Super', price: 59.99, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'coursera',
    name: 'Coursera',
    category: 'education',
    defaults: { plan: 'Plus', price: 59, currency: 'USD', cycle: 'monthly' },
    annual: { price: 399, currency: 'USD' },
  },
  {
    id: 'audible',
    name: 'Audible',
    category: 'education',
    defaults: { plan: 'Premium Plus', price: 9.95, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'software',
    color: '#00a3ad',
    defaults: { plan: 'Pro', price: 11.99, currency: 'EUR', cycle: 'monthly' },
    annual: { price: 110, currency: 'EUR' },
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'software',
    defaults: { plan: 'Professional', price: 16, currency: 'USD', cycle: 'monthly' },
    student: { plan: 'Education', price: 0, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    category: 'software',
    color: '#d83b01',
    defaults: { plan: 'Personal', price: 349.99, currency: 'RON', cycle: 'yearly' },
  },
  {
    id: 'nordvpn',
    name: 'NordVPN',
    category: 'software',
    defaults: { plan: 'Standard', price: 59.88, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'strava',
    name: 'Strava',
    category: 'fitness',
    defaults: { plan: 'Premium', price: 59.99, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'headspace',
    name: 'Headspace',
    category: 'fitness',
    defaults: { plan: 'Annual', price: 69.99, currency: 'EUR', cycle: 'yearly' },
  },
]

export type ServiceLookup = (id?: string) => CatalogService | undefined

/** Builds an id lookup over a list of services, e.g. the catalog loaded from the database. */
export function catalogLookup(services: CatalogService[]): ServiceLookup {
  const byId = new Map(services.map((s) => [s.id, s]))
  return (id) => (id ? byId.get(id) : undefined)
}

/** Lookup over the built-in catalog. */
export const getService: ServiceLookup = catalogLookup(CATALOG)

/** Shown first in the "add subscription" picker. */
export const POPULAR_IDS = [
  'netflix',
  'spotify',
  'youtube',
  'chatgpt',
  'icloud',
  'hbomax',
  'disneyplus',
  'githubcopilot',
]
