import {
  ArrowLeft,
  Pause,
  PencilSimple,
  Play,
  Prohibit,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import { addYears, subYears } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PriceChart } from '../components/charts/PriceChart'
import { categoryColor } from '../components/charts/Mini'
import { RecommendationCard } from '../components/RecommendationCard'
import { ServiceLogo } from '../components/ServiceLogo'
import { StatusBadge } from '../components/ui/Badge'
import { Button, ButtonLink, IconButton } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useDocumentTitle, useFormat, useRecommendations, useToday } from '../hooks'
import { formatDate } from '../i18n'
import { formatCompact } from '../lib/money'
import { fromISO } from '../lib/dates'
import { chargeDates, currentTerms, effectiveStatus, monthlyIn, priceAt } from '../lib/schedule'
import type { Subscription } from '../lib/types'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'

export function SubscriptionDetail() {
  const { id } = useParams()
  const sub = useStore((s) => s.subscriptions.find((x) => x.id === id))
  const f = useFormat()
  const { t } = f
  useDocumentTitle(sub?.name ?? t.nav.subscriptions)

  if (!sub) {
    return (
      <Card className="mt-2">
        <EmptyState
          icon={<WarningCircle size={22} weight="bold" />}
          title={t.detail.notFound}
          actions={
            <ButtonLink to="/app/subscriptions" variant="secondary">
              <ArrowLeft size={16} weight="bold" aria-hidden />
              {t.detail.back}
            </ButtonLink>
          }
        />
      </Card>
    )
  }
  return <Detail key={sub.id} sub={sub} />
}

function Detail({ sub }: { sub: Subscription }) {
  const f = useFormat()
  const { t, lang } = f
  const today = useToday()
  const navigate = useNavigate()
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  const store = useStore.getState()
  const openEdit = useUI((s) => s.openEdit)
  const toast = useUI((s) => s.toast)
  const { recs } = useRecommendations()
  const [confirm, setConfirm] = useState<'delete' | 'cancel' | null>(null)

  const status = effectiveStatus(sub, today)
  const terms = currentTerms(sub, today)
  const monthly = monthlyIn(terms.price, terms.cycle, sub.currency, base, rates)
  const myRecs = recs.filter((r) => r.sub.id === sub.id)

  const { upcoming, past, totalPaid, since } = useMemo(() => {
    const yesterday = new Date(today.getTime() - 86_400_000)
    const pastDates = chargeDates(sub, subYears(today, 10), yesterday)
    const futureDates =
      status === 'cancelled' || status === 'paused' ? [] : chargeDates(sub, today, addYears(today, 2))
    return {
      upcoming: futureDates.slice(0, 3).map((d) => ({ date: d, amount: priceAt(sub, d) })),
      past: pastDates
        .slice(-6)
        .reverse()
        .map((d) => ({ date: d, amount: priceAt(sub, d) })),
      totalPaid: pastDates.reduce((sum, d) => sum + priceAt(sub, d), 0),
      since: fromISO(sub.createdAt),
    }
  }, [sub, today, status])

  const pricePoints = sub.priceHistory.map((p) => ({
    date: fromISO(p.date),
    amount: p.amount,
    plan: p.kind === 'plan',
  }))

  const snapshot = () => structuredClone(sub)
  const undoable = (message: string, before: Subscription) =>
    toast({
      message,
      action: { label: t.common.undo, run: () => store.restoreSubscription(before) },
    })

  const noNext = status === 'cancelled' || status === 'paused' || !terms.next
  const facts: Array<{ label: string; value: ReactNode }> = [
    {
      label: t.detail.price,
      value: (
        <>
          {f.money(terms.price, sub.currency)}
          <span className="text-fg-3">/{t.per[terms.cycle]}</span>
        </>
      ),
    },
    { label: t.detail.billing, value: t.cycle[terms.cycle] },
    {
      label: status === 'trial' ? t.detail.trialEnds : t.detail.nextPayment,
      value:
        noNext || !terms.next ? (
          <span className="text-fg-3">{t.subs.noNext}</span>
        ) : (
          <>
            {f.short(terms.next)}
            <span className="text-fg-3"> · {f.rel(terms.next)}</span>
          </>
        ),
    },
    { label: t.detail.monthlyEq, value: f.baseMoney(monthly) },
    { label: t.detail.yearlyEq, value: f.baseMoney(monthly * 12) },
    { label: t.detail.since, value: f.long(since) },
    {
      label: t.detail.paymentMethod,
      value: sub.paymentMethod ?? <span className="text-fg-3">{t.detail.notSet}</span>,
    },
    { label: t.detail.reminder, value: t.detail.reminderValue(sub.reminderDays) },
    { label: t.detail.usage, value: t.usage[sub.usage] },
    {
      label: t.detail.category,
      value: (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: categoryColor(sub.category) }}
          />
          {t.category[sub.category]}
        </span>
      ),
    },
  ]

  return (
    <>
      <Link
        to="/app/subscriptions"
        className="mb-5 inline-flex items-center gap-1.5 rounded-[8px] text-sm text-fg-2 hover:text-fg"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        {t.detail.back}
      </Link>

      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ServiceLogo serviceId={sub.serviceId} name={sub.name} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-fg md:text-[28px]">
                {sub.name}
              </h1>
              <StatusBadge status={status} showActive />
            </div>
            <p className="mt-0.5 text-sm text-fg-2">
              {[sub.plan, f.money(terms.price, sub.currency) + '/' + t.per[terms.cycle]]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label={t.detail.actions}>
          <Button variant="secondary" onClick={() => openEdit(sub.id)}>
            <PencilSimple size={16} weight="bold" aria-hidden />
            {t.common.edit}
          </Button>
          {status === 'paused' ? (
            <Button
              variant="secondary"
              onClick={() => {
                const before = snapshot()
                store.resumeSubscription(sub.id)
                undoable(t.detail.toastResumed(sub.name), before)
              }}
            >
              <Play size={16} weight="bold" aria-hidden />
              {t.common.resume}
            </Button>
          ) : status === 'active' ? (
            <Button
              variant="secondary"
              onClick={() => {
                const before = snapshot()
                store.pauseSubscription(sub.id)
                undoable(t.detail.toastPaused(sub.name), before)
              }}
            >
              <Pause size={16} weight="bold" aria-hidden />
              {t.common.pause}
            </Button>
          ) : null}
          {status !== 'cancelled' && (
            <Button variant="secondary" onClick={() => setConfirm('cancel')}>
              <Prohibit size={16} weight="bold" aria-hidden />
              {t.common.cancelSub}
            </Button>
          )}
          <IconButton
            label={t.common.delete}
            variant="ghostDanger"
            onClick={() => setConfirm('delete')}
          >
            <Trash size={18} weight="bold" />
          </IconButton>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {facts.map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[13px] text-fg-3">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-fg tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card aria-labelledby="detail-prices">
            <CardHeader id="detail-prices" title={t.detail.priceHistory} />
            <div className="px-3 pt-4 pb-4 sm:px-5">
              {pricePoints.length > 1 ? (
                <PriceChart
                  points={pricePoints}
                  end={today}
                  format={(v) => f.money(v, sub.currency)}
                  formatTick={(v) => formatCompact(v, lang)}
                  formatDate={(d) => f.long(d)}
                  formatAxisDate={(d) => formatDate(d, 'MMM yyyy', lang)}
                  pctLabel={(r) => f.pct(r, { sign: true })}
                  planLabel={t.detail.planChange}
                  ariaLabel={t.prices.chartLabel(sub.name)}
                />
              ) : (
                <p className="px-2 pb-2 text-sm text-fg-3">{t.detail.priceHistoryEmpty}</p>
              )}
            </div>
          </Card>

          <Card aria-labelledby="detail-payments">
            <CardHeader
              id="detail-payments"
              title={t.detail.payments}
              description={t.detail.totalPaid(f.money(totalPaid, sub.currency))}
            />
            <div className="grid grid-cols-1 gap-6 px-5 pt-4 pb-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[13px] font-medium text-fg-2">{t.detail.upcoming}</h3>
                <PaymentList
                items={upcoming}
                empty={t.detail.noUpcoming}
                format={(a) => f.money(a, sub.currency)}
                dateLabel={(d) => `${f.short(d)} · ${f.rel(d)}`}
                />
              </div>
              <div>
                <h3 className="mb-2 text-[13px] font-medium text-fg-2">{t.detail.past}</h3>
                <PaymentList
                  items={past}
                  empty={t.detail.noPast}
                  format={(a) => f.money(a, sub.currency)}
                  dateLabel={(d) => f.long(d)}
                  muted
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {myRecs.length > 0 && (
            <section aria-labelledby="detail-tips" className="flex flex-col gap-3">
              <h2 id="detail-tips" className="px-1 text-[15px] font-semibold text-fg">
                {t.detail.tips}
              </h2>
              {myRecs.map((r) => (
                <RecommendationCard key={r.id} rec={r} compact />
              ))}
            </section>
          )}
          <Card aria-labelledby="detail-notes">
            <CardHeader id="detail-notes" title={t.detail.notes} />
            <p className="px-5 pt-2 pb-5 text-sm leading-relaxed whitespace-pre-line text-fg-2">
              {sub.notes || <span className="text-fg-3">{t.detail.notSet}</span>}
            </p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        title={t.detail.confirmCancel(sub.name)}
        description={t.detail.confirmCancelBody}
        confirmLabel={t.common.cancelSub}
        onConfirm={() => {
          const before = snapshot()
          store.cancelSubscription(sub.id)
          undoable(t.detail.toastCancelled(sub.name), before)
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title={t.detail.confirmDelete(sub.name)}
        description={t.detail.confirmDeleteBody}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          navigate('/app/subscriptions')
          const removed = store.deleteSubscription(sub.id)
          if (removed) undoable(t.detail.toastDeleted(sub.name), removed)
        }}
      />
    </>
  )
}

function PaymentList({
  items,
  empty,
  format,
  dateLabel,
  muted,
}: {
  items: Array<{ date: Date; amount: number }>
  empty: string
  format: (amount: number) => string
  dateLabel: (d: Date) => string
  muted?: boolean
}) {
  if (items.length === 0) return <p className="text-sm text-fg-3">{empty}</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((p) => (
        <li key={p.date.getTime()} className="flex items-baseline justify-between gap-3 text-sm">
          <span className={muted ? 'text-fg-2' : 'text-fg'}>{dateLabel(p.date)}</span>
          <span className={muted ? 'text-fg-2 tabular' : 'font-medium text-fg tabular'}>
            {format(p.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}
