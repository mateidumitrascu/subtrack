import { ChartBar, Table } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ColumnChart, ColumnLegend, type ColumnDatum } from '../components/charts/ColumnChart'
import { categoryColor, RankedBars } from '../components/charts/Mini'
import { ServiceLogo } from '../components/ServiceLogo'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, PageHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Segmented } from '../components/ui/Segmented'
import { useDocumentTitle, useFormat, useToday } from '../hooks'
import { capitalize, formatDate } from '../i18n'
import { categoryBreakdown, monthSeries, totals, yearSeries } from '@subtrack/shared/analytics'
import { formatCompact, formatMoney } from '@subtrack/shared/money'
import { monthlyCost } from '@subtrack/shared/schedule'
import { useStore } from '../store/store'

type View = 'monthly' | 'yearly'

export function Statistics() {
  const f = useFormat()
  const { t, lang } = f
  const today = useToday()
  const subs = useStore((s) => s.subscriptions)
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  const [view, setView] = useState<View>('monthly')
  const [asTable, setAsTable] = useState(false)
  useDocumentTitle(t.stats.title)

  const d = useMemo(() => {
    const months = monthSeries(subs, today, base, rates, 12)
    const years = yearSeries(subs, today, base, rates, 3)
    const categories = categoryBreakdown(subs, today, base, rates)
    const tot = totals(subs, today, base, rates)
    const perSub = subs
      .map((s) => ({ s, monthly: monthlyCost(s, today, base, rates) }))
      .filter((x) => x.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly)
    return { months, years, categories, tot, perSub }
  }, [subs, today, base, rates])

  if (subs.length === 0) {
    return (
      <>
        <PageHeader title={t.stats.title} description={t.stats.subtitle} />
        <Card>
          <EmptyState icon={<ChartBar size={22} weight="bold" />} title={t.stats.empty} />
        </Card>
      </>
    )
  }

  const monthTotals = d.months.map((b) => b.paid + b.scheduled)
  const avg = monthTotals.reduce((a, b) => a + b, 0) / Math.max(1, monthTotals.length)
  const maxIndex = monthTotals.indexOf(Math.max(...monthTotals))
  const maxMonth = d.months[maxIndex]
  const thisYear = d.years[d.years.length - 1]
  const lastYear = d.years[d.years.length - 2]

  const chartData: ColumnDatum[] =
    view === 'monthly'
      ? d.months.map((b) => ({
          key: b.start.toISOString(),
          label: formatDate(b.start, 'LLL', lang).replace('.', ''),
          title: capitalize(formatDate(b.start, 'LLLL yyyy', lang)),
          paid: b.paid,
          scheduled: b.scheduled,
        }))
      : d.years.map((b) => ({
          key: b.start.toISOString(),
          label: formatDate(b.start, 'yyyy', lang),
          title: formatDate(b.start, 'yyyy', lang),
          paid: b.paid,
          scheduled: b.scheduled,
        }))
  const hasScheduled = chartData.some((x) => x.scheduled > 0)
  const unit = base === 'RON' && lang === 'ro' ? 'lei' : base
  const ratesLabel = [
    `1 EUR = ${formatMoney(rates.EUR, 'RON', lang)}`,
    `1 USD = ${formatMoney(rates.USD, 'RON', lang)}`,
  ].join(', ')

  return (
    <>
      <PageHeader
        title={t.stats.title}
        description={t.stats.subtitle}
        actions={
          <Segmented
            label={t.stats.viewLabel}
            value={view}
            onChange={setView}
            options={[
              { value: 'monthly', label: t.stats.viewMonthly },
              { value: 'yearly', label: t.stats.viewYearly },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t.stats.avgMonth} value={f.baseMoney(avg, { decimals: 0 })} hint={t.stats.avgMonthHint} />
        <Kpi
          label={t.stats.maxMonth}
          value={f.baseMoney(monthTotals[maxIndex] ?? 0, { decimals: 0 })}
          hint={maxMonth ? capitalize(formatDate(maxMonth.start, 'LLLL yyyy', lang)) : undefined}
        />
        <Kpi
          label={view === 'monthly' ? t.stats.thisYear : t.stats.lastYear}
          value={f.baseMoney(
            view === 'monthly'
              ? thisYear.paid + thisYear.scheduled
              : (lastYear?.paid ?? 0) + (lastYear?.scheduled ?? 0),
            { decimals: 0 },
          )}
          hint={
            view === 'monthly'
              ? t.stats.thisYearHint(f.baseMoney(thisYear.paid, { decimals: 0 }))
              : lastYear
                ? formatDate(lastYear.start, 'yyyy', lang)
                : undefined
          }
        />
        <Kpi
          label={t.stats.perDay}
          value={f.baseMoney((d.tot.monthly * 12) / 365)}
          hint={t.stats.perDayHint}
        />
      </div>

      <Card className="mt-4" aria-labelledby="stats-chart">
        <CardHeader
          id="stats-chart"
          title={view === 'monthly' ? t.stats.monthlyChart : t.stats.yearlyChart}
          description={unit}
          action={
            <div className="flex items-center gap-4">
              {hasScheduled && !asTable && (
                <div className="hidden sm:block">
                  <ColumnLegend paid={t.stats.paid} scheduled={t.stats.scheduled} />
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={() => setAsTable((v) => !v)}>
                {asTable ? (
                  <ChartBar size={15} weight="bold" aria-hidden />
                ) : (
                  <Table size={15} weight="bold" aria-hidden />
                )}
                {asTable ? t.common.showChart : t.common.showTable}
              </Button>
            </div>
          }
        />
        <div className="px-3 pt-4 pb-4 sm:px-5">
          {hasScheduled && !asTable && (
            <div className="mb-3 px-2 sm:hidden">
              <ColumnLegend paid={t.stats.paid} scheduled={t.stats.scheduled} />
            </div>
          )}
          {asTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-fg-3">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {t.stats.colPeriod}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      {t.stats.paid}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      {t.stats.scheduled}
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      {t.common.total}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {chartData.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className="py-2 pr-3 text-left font-normal text-fg">
                        {row.title}
                      </th>
                      <td className="px-3 py-2 text-right text-fg-2 tabular">{f.baseMoney(row.paid)}</td>
                      <td className="px-3 py-2 text-right text-fg-2 tabular">
                        {row.scheduled > 0 ? f.baseMoney(row.scheduled) : '-'}
                      </td>
                      <td className="py-2 pl-3 text-right font-medium text-fg tabular">
                        {f.baseMoney(row.paid + row.scheduled)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ColumnChart
              data={chartData}
              height={280}
              format={(v) => f.baseMoney(v)}
              formatTick={(v) => formatCompact(v, lang)}
              labels={{ paid: t.stats.paid, scheduled: t.stats.scheduled, total: t.common.total }}
              ariaLabel={view === 'monthly' ? t.stats.monthlyChart : t.stats.yearlyChart}
            />
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="self-start lg:col-span-2" aria-labelledby="stats-cat">
          <CardHeader id="stats-cat" title={t.stats.byCategory} description={t.stats.byCategoryHint} />
          <div className="px-5 pt-5 pb-5">
            <RankedBars
              rows={d.categories.map((c) => ({
                key: c.category,
                value: c.monthly,
                label: (
                  <>
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: categoryColor(c.category) }}
                    />
                    <span className="truncate">{t.category[c.category]}</span>
                  </>
                ),
                valueLabel: f.baseMoney(c.monthly),
                aside: f.pct(c.share),
              }))}
            />
          </div>
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="stats-subs">
          <CardHeader id="stats-subs" title={t.stats.bySub} />
          <div className="overflow-x-auto px-5 pt-3 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-3">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t.stats.colName}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t.stats.colMonthly}
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    {t.stats.colYearly}
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    {t.stats.colShare}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.perSub.map(({ s, monthly }) => (
                  <tr key={s.id}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <Link
                        to={`/app/subscriptions/${s.id}`}
                        className="flex items-center gap-2.5 text-fg hover:underline"
                      >
                        <ServiceLogo serviceId={s.serviceId} name={s.name} size={24} />
                        <span className="truncate">{s.name}</span>
                      </Link>
                    </th>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-fg tabular">
                      {f.baseMoney(monthly)}
                    </td>
                    <td className="hidden px-3 py-2 text-right whitespace-nowrap text-fg-2 tabular sm:table-cell">
                      {f.baseMoney(monthly * 12)}
                    </td>
                    <td className="py-2 pl-3 text-right text-fg-3 tabular">
                      {f.pct(d.tot.monthly > 0 ? monthly / d.tot.monthly : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <p className="mt-4 text-[13px] text-fg-3">{t.stats.ratesNote(ratesLabel)}</p>
    </>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-fg-2">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 truncate text-[13px] text-fg-3">{hint}</p>}
    </Card>
  )
}
