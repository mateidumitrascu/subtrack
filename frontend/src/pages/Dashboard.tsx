import { CalendarBlank, CaretRight, Hourglass, PiggyBank, Stack } from '@phosphor-icons/react'
import { addDays } from 'date-fns'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { categoryColor, SegmentedBar, Sparkline } from '../components/charts/Mini'
import { RecommendationText } from '../components/RecommendationText'
import { ServiceLogo } from '../components/ServiceLogo'
import { DeltaBadge } from '../components/ui/Badge'
import { Card, CardHeader, PageHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useDocumentTitle, useFormat, useRecommendations, useToday } from '../hooks'
import { capitalize, formatDate } from '../i18n'
import { categoryBreakdown, monthSeries, priceChanges, totals } from '@subtrack/shared/analytics'
import { cn } from '../lib/cn'
import { fromISO } from '@subtrack/shared/dates'
import {
  afterTrialMonthly,
  chargesBetween,
  effectiveStatus,
  nextCharge,
  priceAt,
  segmentAt,
} from '@subtrack/shared/schedule'
import { CATEGORIES, type Charge, type Subscription } from '@subtrack/shared/types'
import { useStore } from '../store/store'

export function Dashboard() {
  const f = useFormat()
  const { t, lang } = f
  const today = useToday()
  const subs = useStore((s) => s.subscriptions)
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  const { recs, potential } = useRecommendations()
  useDocumentTitle(t.dashboard.title)

  const data = useMemo(() => {
    const tot = totals(subs, today, base, rates)
    const upcoming = chargesBetween(subs, today, addDays(today, 14), base, rates)
    const series = monthSeries(subs, today, base, rates, 12)
    // Fixed category order keeps neighbouring colors on validated pairs (and color follows the entity).
    const categories = categoryBreakdown(subs, today, base, rates).sort(
      (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
    )
    const changes = priceChanges(subs, base, rates).filter(
      (c) => c.date >= addDays(today, -365),
    )
    const trials = subs
      .filter((s) => effectiveStatus(s, today) === 'trial' && s.trialEndsAt)
      .sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!))
    const next = subs
      .map((s) => ({ s, d: effectiveStatus(s, today) !== 'cancelled' ? nextCharge(s, today) : undefined }))
      .filter((x): x is { s: Subscription; d: Date } => Boolean(x.d))
      .sort((a, b) => a.d.getTime() - b.d.getTime())[0]
    return { tot, upcoming, series, categories, changes, trials, next }
  }, [subs, today, base, rates])

  const { tot, upcoming, series, categories, changes, trials, next } = data

  if (subs.length === 0) {
    return (
      <>
        <PageHeader title={t.dashboard.title} />
        <Card>
          <EmptyStateForNoData />
        </Card>
      </>
    )
  }

  const upcomingTotal = upcoming.reduce((sum, c) => sum + c.base, 0)

  return (
    <>
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.todayIs(formatDate(today, 'EEEE, d MMMM yyyy', lang))}
      />

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:col-span-7">
          <div>
            <p className="text-sm font-medium text-fg-2">{t.dashboard.monthlySpend}</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-fg md:text-[56px] md:leading-none">
              {f.baseMoney(tot.monthly, { decimals: 0 })}
            </p>
            <p className="mt-3 text-sm text-fg-2">
              {t.dashboard.yearly(f.baseMoney(tot.yearly, { decimals: 0 }))}
              <span className="text-fg-3"> · </span>
              {t.dashboard.activeCount(tot.active)}
            </p>
            {tot.afterTrials > 0 && (
              <p className="mt-1 text-[13px] text-warn-text">
                {t.dashboard.afterTrials(f.baseMoney(tot.afterTrials, { decimals: 0 }))}
              </p>
            )}
          </div>
          <div>
            <Sparkline
              height={72}
              values={series.map((b) => b.paid + b.scheduled)}
              ariaLabel={`${t.dashboard.trend}: ${series
                .map((b) => f.baseMoney(b.paid + b.scheduled, { decimals: 0 }))
                .join(', ')}`}
            />
            <div className="mt-1 flex justify-between text-xs text-fg-3">
              <span>{t.dashboard.trend}</span>
              <Link to="/app/statistics" className="font-medium text-accent hover:underline">
                {t.nav.statistics}
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:col-span-5">
          <StatTile
            to={next ? `/app/subscriptions/${next.s.id}` : '/app/calendar'}
            icon={
              next ? (
                <ServiceLogo serviceId={next.s.serviceId} name={next.s.name} size={40} />
              ) : (
                <CalendarBlank size={20} weight="bold" aria-hidden />
              )
            }
            label={t.dashboard.nextPayment}
            value={next ? f.money(priceAt(next.s, next.d), next.s.currency) : t.dashboard.noNextPayment}
            hint={next ? `${next.s.name}, ${f.rel(next.d)}` : undefined}
          />
          <StatTile
            to="/app/savings"
            icon={<PiggyBank size={20} weight="bold" aria-hidden />}
            label={t.dashboard.savings}
            value={t.dashboard.upTo(f.baseMoney(potential, { decimals: 0 }))}
            hint={`${t.dashboard.savingsHint(recs.length)}`}
          />
          <StatTile
            to="/app/subscriptions?status=trial"
            icon={<Hourglass size={20} weight="bold" aria-hidden />}
            label={t.dashboard.trials}
            value={String(trials.length)}
            hint={t.dashboard.trialsHint(trials.length)}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Upcoming payments */}
        <Card className="lg:col-span-7" aria-labelledby="dash-upcoming">
          <CardHeader
            id="dash-upcoming"
            title={t.dashboard.upcoming}
            description={upcoming.length > 0 ? `${t.common.total}: ${f.baseMoney(upcomingTotal)}` : undefined}
            action={
              <Link to="/app/calendar" className="text-[13px] font-medium text-accent hover:underline">
                {t.nav.calendar}
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="px-5 pt-4 pb-6 text-sm text-fg-3">{t.dashboard.upcomingEmpty}</p>
          ) : (
            <>
              <ul className="px-3 pt-3 pb-2">
                {upcoming.slice(0, UPCOMING_LIMIT).map((c) => {
                  const trialEnd =
                    c.sub.trialEndsAt && fromISO(c.sub.trialEndsAt).getTime() === c.date.getTime()
                  return (
                    <li key={`${c.sub.id}-${c.date.getTime()}`}>
                      <Link
                        to={`/app/subscriptions/${c.sub.id}`}
                        className="grid grid-cols-[72px_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                      >
                        <span className="text-[13px] leading-tight">
                          <span className="block font-medium text-fg">{capitalize(f.rel(c.date))}</span>
                          <span className="block text-fg-3">{f.short(c.date)}</span>
                        </span>
                        <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={34} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-fg">{c.sub.name}</span>
                          <span
                            className={cn(
                              'block truncate text-[13px]',
                              trialEnd ? 'text-warn-text' : 'text-fg-3',
                            )}
                          >
                            {trialEnd
                              ? t.status.trial
                              : [c.sub.plan, t.cycle[cycleOf(c)]].filter(Boolean).join(', ')}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-medium text-fg tabular">
                            {f.money(c.amount, c.sub.currency)}
                          </span>
                          {c.sub.currency !== base && (
                            <span className="block text-xs text-fg-3 tabular">{f.baseMoney(c.base)}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {upcoming.length > UPCOMING_LIMIT && (
                <Link
                  to="/app/calendar"
                  className="mx-5 mb-4 block rounded-[10px] bg-surface-2 px-3 py-2 text-center text-[13px] font-medium text-fg-2 hover:text-fg"
                >
                  {t.dashboard.morePayments(upcoming.length - UPCOMING_LIMIT)}
                </Link>
              )}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Category split */}
          <Card aria-labelledby="dash-cats">
            <CardHeader
              id="dash-cats"
              title={t.dashboard.byCategory}
              description={t.dashboard.byCategoryHint}
            />
            <div className="px-5 pt-4 pb-5">
              <SegmentedBar
                ariaLabel={categories
                  .map((c) => `${t.category[c.category]} ${f.pct(c.share)}`)
                  .join(', ')}
                parts={categories.map((c) => ({
                  key: c.category,
                  value: c.monthly,
                  color: categoryColor(c.category),
                  label: `${t.category[c.category]}: ${f.baseMoney(c.monthly)}`,
                }))}
              />
              <ul className="mt-4 grid grid-cols-1 gap-2">
                {categories.map((c) => (
                  <li key={c.category} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: categoryColor(c.category) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-fg-2">{t.category[c.category]}</span>
                    <span className="text-fg-3 tabular">{f.pct(c.share)}</span>
                    <span className="w-24 text-right font-medium text-fg tabular">
                      {f.baseMoney(c.monthly)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Trials */}
          <Card aria-labelledby="dash-trials">
            <CardHeader id="dash-trials" title={t.dashboard.trials} />
            {trials.length === 0 ? (
              <p className="px-5 pt-3 pb-5 text-sm text-fg-3">{t.dashboard.noTrials}</p>
            ) : (
              <ul className="px-3 pt-2 pb-3">
                {trials.map((s) => {
                  const end = fromISO(s.trialEndsAt!)
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/app/subscriptions/${s.id}`}
                        className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                      >
                        <ServiceLogo serviceId={s.serviceId} name={s.name} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{s.name}</span>
                          <span className="block text-[13px] text-warn-text">
                            {t.dashboard.trialEnds(f.rel(end))}
                          </span>
                        </span>
                        <span className="text-right text-[13px] text-fg-2 tabular">
                          {t.dashboard.thenPay(
                            f.baseMoney(afterTrialMonthly(s, today, base, rates)),
                          )}
                          <span className="block text-xs text-fg-3">{t.common.perMonth}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Price changes */}
        <Card aria-labelledby="dash-prices">
          <CardHeader
            id="dash-prices"
            title={t.dashboard.priceChanges}
            action={
              <Link to="/app/prices" className="text-[13px] font-medium text-accent hover:underline">
                {t.common.viewAll}
              </Link>
            }
          />
          {changes.length === 0 ? (
            <p className="px-5 pt-3 pb-5 text-sm text-fg-3">{t.dashboard.noPriceChanges}</p>
          ) : (
            <ul className="px-3 pt-2 pb-3">
              {changes.slice(0, 4).map((c) => (
                <li key={`${c.sub.id}-${c.date.getTime()}`}>
                  <Link
                    to={`/app/subscriptions/${c.sub.id}`}
                    className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                  >
                    <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{c.sub.name}</span>
                      <span className="block text-[13px] text-fg-3 tabular">
                        {f.money(c.from, c.sub.currency)} → {f.money(c.to, c.sub.currency)}
                        <span> · {c.date > today ? t.prices.effective(f.short(c.date)) : f.short(c.date)}</span>
                      </span>
                    </span>
                    <DeltaBadge pct={c.pct} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recommendations */}
        <Card aria-labelledby="dash-recs">
          <CardHeader
            id="dash-recs"
            title={t.dashboard.recs}
            action={
              <Link to="/app/savings" className="text-[13px] font-medium text-accent hover:underline">
                {t.common.viewAll}
              </Link>
            }
          />
          {recs.length === 0 ? (
            <p className="px-5 pt-3 pb-5 text-sm text-fg-3">{t.dashboard.noRecs}</p>
          ) : (
            <ul className="px-3 pt-2 pb-3">
              {[...recs]
                .sort((a, b) => b.monthlySavings - a.monthlySavings)
                .slice(0, 4)
                .map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/app/savings"
                      className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <ServiceLogo serviceId={r.sub.serviceId} name={r.sub.name} size={34} />
                      <span className="min-w-0 flex-1 text-sm font-medium text-fg">
                        <RecommendationText rec={r} part="title" />
                      </span>
                      <span className="shrink-0 text-right text-sm font-medium text-good-text tabular">
                        {f.baseMoney(r.monthlySavings, { decimals: 0 })}
                        <span className="block text-xs font-normal text-fg-3">{t.common.perMonth}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function StatTile({
  to,
  icon,
  label,
  value,
  hint,
}: {
  to: string
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-[border-color,transform] duration-200 hover:border-line-strong active:scale-[0.99] sm:px-5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-fg-2">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-fg-3">{label}</span>
        <span className="block truncate text-lg font-semibold tracking-tight text-fg">{value}</span>
        {hint && <span className="block truncate text-[13px] text-fg-3">{hint}</span>}
      </span>
      <CaretRight
        size={16}
        weight="bold"
        aria-hidden
        className="shrink-0 text-fg-3 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  )
}

function EmptyStateForNoData() {
  const f = useFormat()
  const resetDemo = useStore((s) => s.resetDemo)
  return (
    <EmptyState
      icon={<Stack size={22} weight="bold" />}
      title={f.t.subs.emptyTitle}
      body={f.t.subs.emptyBody}
      actions={
        <Button variant="primary" onClick={resetDemo}>
          {f.t.subs.loadDemo}
        </Button>
      }
    />
  )
}

const UPCOMING_LIMIT = 6

const cycleOf = (c: Charge) => segmentAt(c.sub, c.date).cycle
