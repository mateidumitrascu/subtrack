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
import {
  CATALOG as SERVICES,
  type CatalogService as BaseService,
} from '@subtrack/shared/catalog'

export { POPULAR_IDS, type PlanOffer } from '@subtrack/shared/catalog'

/*
  The catalog data (plans, prices, overlap groups) lives in @subtrack/shared and
  in the `services` table. Brand glyphs are a display concern, so they are
  attached here by service id.
*/
const ICONS: Record<string, { path: string; hex: string }> = {
  netflix: siNetflix,
  spotify: siSpotify,
  youtube: siYoutube,
  icloud: siIcloud,
  hbomax: siHbomax,
  applemusic: siApplemusic,
  githubcopilot: siGithubcopilot,
  notion: siNotion,
  dropbox: siDropbox,
  appletv: siAppletv,
  youtubemusic: siYoutubemusic,
  deezer: siDeezer,
  playstation: siPlaystation,
  duolingo: siDuolingo,
  coursera: siCoursera,
  audible: siAudible,
  figma: siFigma,
  nordvpn: siNordvpn,
  strava: siStrava,
  headspace: siHeadspace,
}

export interface CatalogService extends BaseService {
  /** Simple Icons glyph (24x24 path). Services without one get a monogram. */
  icon?: { path: string; hex: string }
}

export const CATALOG: CatalogService[] = SERVICES.map((s) => ({ ...s, icon: ICONS[s.id] }))

const byId = new Map(CATALOG.map((s) => [s.id, s]))

export const getService = (id?: string): CatalogService | undefined =>
  id ? byId.get(id) : undefined
