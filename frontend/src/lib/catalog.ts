import {
  siAppletv,
  siApplemusic,
  siAudible,
  siCoursera,
  siDeezer,
  siDropbox,
  siDuolingo,
  siFigma,
  siGithubcopilot,
  siHbomax,
  siHeadspace,
  siIcloud,
  siNetflix,
  siNordvpn,
  siNotion,
  siPlaystation,
  siSpotify,
  siStrava,
  siYoutube,
  siYoutubemusic,
} from 'simple-icons'
import type { CategoryId, Currency, Cycle } from './types'

export interface PlanOffer {
  plan: string
  price: number
  currency: Currency
  cycle: Cycle
}

export interface CatalogService {
  id: string
  name: string
  category: CategoryId
  /** Simple Icons glyph (24x24 path). Services without one get a monogram. */
  icon?: { path: string; hex: string }
  /** Brand color used for the monogram fallback. */
  color?: string
  /** Services in the same group overlap (two music services, two cloud drives...). */
  overlap?: 'music' | 'video' | 'cloud'
  defaults: PlanOffer
  /** Yearly price for the same plan, when the provider offers one. */
  annual?: { price: number; currency: Currency }
  student?: PlanOffer
  /** A cheaper tier of the same service. */
  cheaper?: PlanOffer
}

/*
  Demo catalog. Prices are illustrative sample values for the prototype,
  not live provider prices. A real build would load this from the backend.
*/
export const CATALOG: CatalogService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'video',
    icon: siNetflix,
    overlap: 'video',
    defaults: { plan: 'Standard', price: 10.99, currency: 'EUR', cycle: 'monthly' },
    cheaper: { plan: 'Basic', price: 7.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'music',
    icon: siSpotify,
    overlap: 'music',
    defaults: { plan: 'Premium Individual', price: 25.99, currency: 'RON', cycle: 'monthly' },
    student: { plan: 'Premium Student', price: 12.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    category: 'video',
    icon: siYoutube,
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
    icon: siIcloud,
    overlap: 'cloud',
    defaults: { plan: '200 GB', price: 2.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    category: 'video',
    icon: siHbomax,
    overlap: 'video',
    defaults: { plan: 'Standard', price: 34.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'applemusic',
    name: 'Apple Music',
    category: 'music',
    icon: siApplemusic,
    overlap: 'music',
    defaults: { plan: 'Individual', price: 5.99, currency: 'EUR', cycle: 'monthly' },
    student: { plan: 'Student', price: 2.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'githubcopilot',
    name: 'GitHub Copilot',
    category: 'software',
    icon: siGithubcopilot,
    defaults: { plan: 'Pro', price: 10, currency: 'USD', cycle: 'monthly' },
    student: { plan: 'Student', price: 0, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'software',
    icon: siNotion,
    defaults: { plan: 'Plus', price: 12, currency: 'USD', cycle: 'monthly' },
    annual: { price: 120, currency: 'USD' },
    student: { plan: 'Plus Education', price: 0, currency: 'USD', cycle: 'monthly' },
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'cloud',
    icon: siDropbox,
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
    icon: siAppletv,
    overlap: 'video',
    defaults: { plan: 'Individual', price: 9.99, currency: 'EUR', cycle: 'monthly' },
  },
  {
    id: 'youtubemusic',
    name: 'YouTube Music',
    category: 'music',
    icon: siYoutubemusic,
    overlap: 'music',
    defaults: { plan: 'Individual', price: 23.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'deezer',
    name: 'Deezer',
    category: 'music',
    icon: siDeezer,
    overlap: 'music',
    defaults: { plan: 'Premium', price: 24.99, currency: 'RON', cycle: 'monthly' },
  },
  {
    id: 'playstation',
    name: 'PlayStation Plus',
    category: 'gaming',
    icon: siPlaystation,
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
    icon: siDuolingo,
    defaults: { plan: 'Super', price: 59.99, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'coursera',
    name: 'Coursera',
    category: 'education',
    icon: siCoursera,
    defaults: { plan: 'Plus', price: 59, currency: 'USD', cycle: 'monthly' },
    annual: { price: 399, currency: 'USD' },
  },
  {
    id: 'audible',
    name: 'Audible',
    category: 'education',
    icon: siAudible,
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
    icon: siFigma,
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
    icon: siNordvpn,
    defaults: { plan: 'Standard', price: 59.88, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'strava',
    name: 'Strava',
    category: 'fitness',
    icon: siStrava,
    defaults: { plan: 'Premium', price: 59.99, currency: 'EUR', cycle: 'yearly' },
  },
  {
    id: 'headspace',
    name: 'Headspace',
    category: 'fitness',
    icon: siHeadspace,
    defaults: { plan: 'Annual', price: 69.99, currency: 'EUR', cycle: 'yearly' },
  },
]

const byId = new Map(CATALOG.map((s) => [s.id, s]))

export const getService = (id?: string): CatalogService | undefined =>
  id ? byId.get(id) : undefined

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
