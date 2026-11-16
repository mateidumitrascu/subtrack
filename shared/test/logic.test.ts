import { addDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { monthSeries, priceChanges, totals } from '../src/analytics.ts'
import { fromISO, toISO } from '../src/dates.ts'
import { convert, formatMoney } from '../src/money.ts'
import { buildNotifications } from '../src/notifications.ts'
import { buildRecommendations, potentialSavings } from '../src/recommendations.ts'
import { chargeDates, currentTerms, effectiveStatus, monthlyCost, priceAt } from '../src/schedule.ts'
import { createSeed, DEFAULT_SETTINGS } from '../src/seed.ts'
import type { Subscription } from '../src/types.ts'

const TODAY = fromISO('2026-11-12')
const rates = DEFAULT_SETTINGS.rates

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: 'x',
    name: 'Test',
    category: 'other',
    currency: 'RON',
    schedule: [{ from: '2026-01-31', start: '2026-01-31', cycle: 'monthly' }],
    priceHistory: [{ date: '2026-01-31', amount: 10 }],
    status: 'active',
    reminderDays: 3,
    usage: 'weekly',
    createdAt: '2026-01-31',
    ...partial,
  }
}

describe('schedule', () => {
  it('repeats monthly charges from the anchor and clamps to month end', () => {
    const dates = chargeDates(sub({}), fromISO('2026-01-01'), fromISO('2026-04-30')).map(toISO)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('stops charging after cancellation and during pauses', () => {
    const cancelled = sub({ status: 'cancelled', cancelledAt: '2026-03-15' })
    expect(chargeDates(cancelled, fromISO('2026-01-01'), fromISO('2026-12-31')).map(toISO)).toEqual([
      '2026-01-31',
      '2026-02-28',
    ])

    const paused = sub({ status: 'paused', pauses: [{ from: '2026-03-01', to: '2026-05-15' }] })
    const dates = chargeDates(paused, fromISO('2026-01-01'), fromISO('2026-06-30')).map(toISO)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-05-31', '2026-06-30'])
  })

  it('uses the price in effect on each charge date', () => {
    const s = sub({
      priceHistory: [
        { date: '2026-01-31', amount: 10 },
        { date: '2026-03-31', amount: 12 },
      ],
    })
    expect(priceAt(s, fromISO('2026-02-28'))).toBe(10)
    expect(priceAt(s, fromISO('2026-03-31'))).toBe(12)
  })

  it('switches schedule segments without rewriting past charges', () => {
    const s = sub({
      schedule: [
        { from: '2026-01-31', start: '2026-01-31', cycle: 'monthly' },
        { from: '2026-06-01', start: '2026-06-30', cycle: 'yearly' },
      ],
    })
    const dates = chargeDates(s, fromISO('2026-01-01'), fromISO('2027-12-31')).map(toISO)
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2027-06-30',
    ])
    expect(currentTerms(s, TODAY).cycle).toBe('yearly')
  })

  it('treats an expired trial as active', () => {
    const trial = sub({ status: 'trial', trialEndsAt: '2026-11-10' })
    expect(effectiveStatus(trial, TODAY)).toBe('active')
    expect(effectiveStatus({ ...trial, trialEndsAt: '2026-11-20' }, TODAY)).toBe('trial')
  })
})

describe('money', () => {
  it('converts through RON', () => {
    expect(convert(10, 'EUR', 'RON', rates)).toBeCloseTo(50.8)
    expect(convert(50.8, 'RON', 'EUR', rates)).toBeCloseTo(10)
    expect(convert(10, 'USD', 'EUR', rates)).toBeCloseTo((10 * rates.USD) / rates.EUR)
  })

  it('formats per language', () => {
    expect(formatMoney(25.99, 'RON', 'ro')).toBe('25,99 lei')
    expect(formatMoney(10.99, 'EUR', 'ro')).toBe('10,99 €')
    expect(formatMoney(20, 'USD', 'en')).toBe('$20.00')
    expect(formatMoney(12, 'RON', 'ro', { sign: true, decimals: 0 })).toBe('+12 lei')
  })
})

describe('demo data', () => {
  const subs = createSeed(TODAY)
  const settings = DEFAULT_SETTINGS

  it('has upcoming renewals relative to today', () => {
    const chatgpt = subs.find((s) => s.id === 's-chatgpt')!
    expect(toISO(currentTerms(chatgpt, TODAY).next!)).toBe(toISO(addDays(TODAY, 1)))
  })

  it('computes totals that ignore trials, paused and cancelled subscriptions', () => {
    const tot = totals(subs, TODAY, 'RON', rates)
    expect(tot.active).toBe(12)
    expect(tot.trials).toBe(2)
    const manual = subs.reduce((s, x) => s + monthlyCost(x, TODAY, 'RON', rates), 0)
    expect(tot.monthly).toBeCloseTo(manual)
    expect(tot.monthly).toBeGreaterThan(400)
  })

  it('splits the current month into paid and scheduled', () => {
    const series = monthSeries(subs, TODAY, 'RON', rates, 12)
    expect(series).toHaveLength(12)
    const current = series[series.length - 1]
    expect(current.paid).toBeGreaterThan(0)
    expect(current.scheduled).toBeGreaterThan(0)
    expect(series.slice(0, -1).every((b) => b.scheduled === 0)).toBe(true)
  })

  it('lists provider price changes, newest first', () => {
    const changes = priceChanges(subs, 'RON', rates)
    expect(changes.length).toBeGreaterThanOrEqual(6)
    for (let i = 1; i < changes.length; i++) {
      expect(changes[i - 1].date.getTime()).toBeGreaterThanOrEqual(changes[i].date.getTime())
    }
  })

  it('produces every kind of recommendation', () => {
    const recs = buildRecommendations(subs, TODAY, settings)
    const kinds = new Set(recs.map((r) => r.kind))
    expect([...kinds].sort()).toEqual(
      ['annual', 'downgrade', 'duplicate', 'student', 'trial', 'unused'].sort(),
    )
    // Trials come first.
    expect(recs[0].kind).toBe('trial')
    // One subscription never counts twice in the total.
    const naive = recs.reduce((s, r) => s + r.monthlySavings, 0)
    expect(potentialSavings(recs)).toBeLessThan(naive)
  })

  it('keeps the more used service when two overlap', () => {
    const recs = buildRecommendations(subs, TODAY, settings)
    const music = recs.find((r) => r.kind === 'duplicate' && r.group === 'music')!
    expect(music.keep?.name).toBe('Spotify')
    expect(music.sub.name).toBe('Apple Music')
  })

  it('skips student plans when the user is not a student', () => {
    const recs = buildRecommendations(subs, TODAY, { ...settings, isStudent: false })
    expect(recs.some((r) => r.kind === 'student')).toBe(false)
  })

  it('raises alerts for tomorrow’s renewal, the ending trial and the upcoming price change', () => {
    const list = buildNotifications(subs, TODAY, 'RON', rates)
    expect(list.some((n) => n.kind === 'renewal' && n.sub.id === 's-chatgpt')).toBe(true)
    expect(list.some((n) => n.kind === 'trial' && n.sub.id === 's-duolingo')).toBe(true)
    expect(list.some((n) => n.kind === 'price' && n.sub.id === 's-atlas')).toBe(true)
    // HBO Max ends in 9 days with a 3-day reminder: not yet.
    expect(list.some((n) => n.sub.id === 's-hbomax')).toBe(false)
  })
})
