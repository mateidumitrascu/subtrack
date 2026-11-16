import { Info, TrendUp } from '@phosphor-icons/react'
import { subYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { PriceChart } from '../components/charts/PriceChart'
import { ServiceLogo } from '../components/ServiceLogo'
import { Badge, DeltaBadge } from '../components/ui/Badge'
import { Card, CardHeader, PageHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Select } from '../components/ui/Field'
import { useDocumentTitle, useFormat, useToday } from '../hooks'
import { formatDate } from '../i18n'
import { priceChanges } from '../lib/analytics'
import { cn } from '../lib/cn'
import { fromISO } from '../lib/dates'
import { formatCompact } from '../lib/money'
import { useStore } from '../store/store'

export function PriceChanges() {
  const f = useFormat()
  const { t, lang } = f
  const today = useToday()
  const subs = useStore((s) => s.subscriptions)
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  useDocumentTitle(t.prices.title)

  const changes = useMemo(() => priceChanges(subs, base, rates), [subs, base, rates])
  const tracked = useMemo(
    () =>
      [...subs]
        .filter((s) => s.priceHistory.length > 1)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [subs],
  )
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => changes[0]?.sub.id ?? tracked[0]?.id,
  )
  const selected = subs.find((s) => s.id === selectedId) ?? tracked[0]

  const yearAgo = subYears(today, 1)
  const recentIncreases = changes.filter((c) => c.pct > 0 && c.date >= yearAgo)
  const impact = recentIncreases.reduce((s, c) => s + c.yearlyImpact, 0)
  const avgPct = recentIncreases.length
    ? recentIncreases.reduce((s, c) => s + c.pct, 0) / recentIncreases.length
    : 0

  return (
    <>
      <PageHeader title={t.prices.title} description={t.prices.subtitle} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-fg-2">{t.prices.increases}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{recentIncreases.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-fg-2">{t.prices.impact}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">
            {f.baseMoney(impact, { sign: true, decimals: 0 })}
          </p>
          <p className="mt-1 text-[13px] text-fg-3">{t.prices.impactHint}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-fg-2">{t.prices.avg}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">
            {f.pct(avgPct, { sign: avgPct > 0 })}
          </p>
        </Card>
      </div>

      {changes.length === 0 ? (
        <Card className="mt-4">
          <EmptyState icon={<TrendUp size={22} weight="bold" />} title={t.prices.none} body={t.prices.howTo} />
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="self-start lg:col-span-3" aria-labelledby="prices-chart">
            <CardHeader
              id="prices-chart"
              title={t.prices.history}
              action={
                <Select
                  aria-label={t.prices.select}
                  value={selected?.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-48"
                >
                  {tracked.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              }
            />
            {selected && (
              <div className="px-3 pt-4 pb-4 sm:px-5">
                <div className="mb-4 flex items-center gap-3 px-2 sm:px-0">
                  <ServiceLogo serviceId={selected.serviceId} name={selected.name} size={32} />
                  <div>
                    <p className="text-sm font-medium text-fg">{selected.name}</p>
                    <p className="text-[13px] text-fg-3">{selected.plan}</p>
                  </div>
                </div>
                <PriceChart
                  points={selected.priceHistory.map((p) => ({
                    date: fromISO(p.date),
                    amount: p.amount,
                    plan: p.kind === 'plan',
                  }))}
                  end={today}
                  height={240}
                  format={(v) => f.money(v, selected.currency)}
                  formatTick={(v) => formatCompact(v, lang)}
                  formatDate={(d) => f.long(d)}
                  formatAxisDate={(d) => formatDate(d, 'MMM yyyy', lang)}
                  pctLabel={(r) => f.pct(r, { sign: true })}
                  planLabel={t.detail.planChange}
                  ariaLabel={t.prices.chartLabel(selected.name)}
                />
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2" aria-labelledby="prices-all">
            <CardHeader id="prices-all" title={t.prices.all} />
            <ul className="px-3 pt-2 pb-3">
              {changes.map((c) => {
                const upcoming = c.date > today
                const isSelected = c.sub.id === selected?.id
                return (
                  <li key={`${c.sub.id}-${c.date.getTime()}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.sub.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2',
                        isSelected && 'bg-surface-2',
                      )}
                    >
                      <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-fg">{c.sub.name}</span>
                          {upcoming && <Badge tone="accent">{t.prices.upcoming}</Badge>}
                        </span>
                        <span className="block text-[13px] text-fg-3 tabular">
                          {f.money(c.from, c.sub.currency)} → {f.money(c.to, c.sub.currency)}
                        </span>
                        <span className="block text-xs text-fg-3">
                          {upcoming ? t.prices.effective(f.short(c.date)) : f.long(c.date)}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <DeltaBadge pct={c.pct} />
                        <span className="text-xs whitespace-nowrap text-fg-3 tabular">
                          {t.prices.perYear(f.baseMoney(c.yearlyImpact, { sign: true, decimals: 0 }))}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-fg-3">
        <Info size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
        {t.prices.howTo}
      </p>
    </>
  )
}
