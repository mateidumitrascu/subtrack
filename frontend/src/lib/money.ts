import type { Currency, Lang, Rates } from './types'

export function toRON(amount: number, currency: Currency, rates: Rates): number {
  return currency === 'RON' ? amount : amount * rates[currency]
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount
  const ron = toRON(amount, from, rates)
  return to === 'RON' ? ron : ron / rates[to]
}

const formatters = new Map<string, Intl.NumberFormat>()

function numberFormat(locale: string, decimals: number) {
  const key = `${locale}:${decimals}`
  let nf = formatters.get(key)
  if (!nf) {
    nf = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatters.set(key, nf)
  }
  return nf
}

export interface MoneyOptions {
  /** Fraction digits; defaults to 2. */
  decimals?: number
  /** Prefix positive values with "+". */
  sign?: boolean
}

/**
 * "25,99 lei", "10,99 €", "20,00 $" in Romanian;
 * "RON 25.99", "€10.99", "$20.00" in English.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  lang: Lang,
  opts: MoneyOptions = {},
): string {
  const decimals = opts.decimals ?? 2
  const value = Math.abs(amount)
  const rounded = Number(value.toFixed(decimals))
  const sign = amount < 0 && rounded !== 0 ? '-' : opts.sign && amount > 0 && rounded !== 0 ? '+' : ''
  if (lang === 'ro') {
    const n = numberFormat('ro-RO', decimals).format(value)
    const symbol = currency === 'RON' ? 'lei' : currency === 'EUR' ? '€' : '$'
    return `${sign}${n} ${symbol}`
  }
  const n = numberFormat('en-US', decimals).format(value)
  if (currency === 'RON') return `${sign}RON ${n}`
  return `${sign}${currency === 'EUR' ? '€' : '$'}${n}`
}

export function formatNumber(value: number, lang: Lang, decimals = 0): string {
  return numberFormat(lang === 'ro' ? 'ro-RO' : 'en-US', decimals).format(value)
}

export function formatPercent(ratio: number, lang: Lang, opts: { sign?: boolean } = {}): string {
  const pct = ratio * 100
  const decimals = Math.abs(pct) < 10 ? 1 : 0
  const n = numberFormat(lang === 'ro' ? 'ro-RO' : 'en-US', decimals).format(Math.abs(pct))
  const sign = pct < 0 ? '-' : opts.sign && pct > 0 ? '+' : ''
  return `${sign}${n}%`
}

/** Short axis labels: 0, 250, 1,5k. */
export function formatCompact(value: number, lang: Lang): string {
  if (Math.abs(value) < 10000) return formatNumber(value, lang)
  return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
