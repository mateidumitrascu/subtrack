import { differenceInCalendarDays, format } from 'date-fns'
import { enGB, ro as roLocale } from 'date-fns/locale'
import { useStore } from '../store/store'
import type { Lang } from '@subtrack/shared/types'
import { en } from './en'
import { ro, type Dict } from './ro'

const dicts: Record<Lang, Dict> = { ro, en }

export function useI18n() {
  const lang = useStore((s) => s.settings.lang)
  return { t: dicts[lang], lang }
}

export function formatDate(date: Date, pattern: string, lang: Lang): string {
  return format(date, pattern, { locale: lang === 'ro' ? roLocale : enGB })
}

/** "14 nov." / "14 Nov" */
export const shortDate = (date: Date, lang: Lang) => formatDate(date, 'd MMM', lang)

/** "14 noiembrie 2026" / "14 November 2026" */
export const longDate = (date: Date, lang: Lang) => formatDate(date, 'd MMMM yyyy', lang)

/** azi / mâine / în 3 zile / ieri / acum 4 zile */
export function relativeDay(date: Date, today: Date, t: Dict): string {
  const diff = differenceInCalendarDays(date, today)
  if (diff === 0) return t.time.today
  if (diff === 1) return t.time.tomorrow
  if (diff === -1) return t.time.yesterday
  return diff > 0 ? t.time.inDays(diff) : t.time.daysAgo(-diff)
}

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
