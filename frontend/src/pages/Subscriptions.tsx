import { MagnifyingGlass, Stack } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { categoryColor } from '../components/charts/Mini'
import { ServiceLogo } from '../components/ServiceLogo'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, PageHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Segmented } from '../components/ui/Segmented'
import { useDocumentTitle, useFormat, useToday } from '../hooks'
import { totals } from '@subtrack/shared/analytics'
import { fromISO } from '@subtrack/shared/dates'
import { currentTerms, effectiveStatus, monthlyIn } from '@subtrack/shared/schedule'
import { CATEGORIES, type CategoryId, type Status, type Subscription } from '@subtrack/shared/types'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'

type StatusFilter = 'all' | Status
type SortKey = 'next' | 'cost' | 'name'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function Subscriptions() {
  const f = useFormat()
  const { t } = f
  const today = useToday()
  const navigate = useNavigate()
  const subs = useStore((s) => s.subscriptions)
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  const resetDemo = useStore((s) => s.resetDemo)
  const openAdd = useUI((s) => s.openAdd)
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | CategoryId>('all')
  const [sort, setSort] = useState<SortKey>('next')
  useDocumentTitle(t.subs.title)

  const status = (params.get('status') as StatusFilter | null) ?? 'all'
  const setStatus = (v: StatusFilter) => {
    const next = new URLSearchParams(params)
    if (v === 'all') next.delete('status')
    else next.set('status', v)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    const q = normalize(query.trim())
    return subs
      .map((sub) => {
        const terms = currentTerms(sub, today)
        const st = effectiveStatus(sub, today)
        return {
          sub,
          terms,
          status: st,
          monthly:
            st === 'active' || st === 'trial'
              ? monthlyIn(terms.price, terms.cycle, sub.currency, base, rates)
              : 0,
          next: st === 'cancelled' || st === 'paused' ? undefined : terms.next,
        }
      })
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => category === 'all' || r.sub.category === category)
      .filter(
        (r) =>
          !q || normalize(r.sub.name).includes(q) || normalize(r.sub.plan ?? '').includes(q),
      )
      .sort((a, b) => {
        if (sort === 'name') return a.sub.name.localeCompare(b.sub.name)
        if (sort === 'cost') return b.monthly - a.monthly
        const at = a.next?.getTime() ?? Infinity
        const bt = b.next?.getTime() ?? Infinity
        return at - bt || a.sub.name.localeCompare(b.sub.name)
      })
  }, [subs, today, base, rates, status, category, query, sort])

  const tot = useMemo(() => totals(subs, today, base, rates), [subs, today, base, rates])

  if (subs.length === 0) {
    return (
      <>
        <PageHeader title={t.subs.title} />
        <Card>
          <EmptyState
            icon={<Stack size={22} weight="bold" />}
            title={t.subs.emptyTitle}
            body={t.subs.emptyBody}
            actions={
              <>
                <Button variant="primary" onClick={openAdd}>
                  {t.common.add}
                </Button>
                <Button variant="secondary" onClick={resetDemo}>
                  {t.subs.loadDemo}
                </Button>
              </>
            }
          />
        </Card>
      </>
    )
  }

  const filtersActive = status !== 'all' || category !== 'all' || query !== ''

  return (
    <>
      <PageHeader
        title={t.subs.title}
        description={t.subs.subtitle(tot.active, f.baseMoney(tot.monthly))}
      />

      {/* Filters: one row above the content they scope. */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <label htmlFor="subs-search" className="sr-only">
            {t.subs.searchLabel}
          </label>
          <MagnifyingGlass
            size={16}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-3"
          />
          <Input
            id="subs-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.subs.search}
            className="pl-9"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <Segmented
            label={t.subs.statusFilter}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: t.subs.filterAll },
              { value: 'active', label: t.subs.filterActive },
              { value: 'trial', label: t.subs.filterTrial },
              { value: 'paused', label: t.subs.filterPaused },
              { value: 'cancelled', label: t.subs.filterCancelled },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:flex">
          <Select
            aria-label={t.subs.categoryLabel}
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | CategoryId)}
            className="lg:w-48"
          >
            <option value="all">{t.subs.allCategories}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.category[c]}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t.subs.sortLabel}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="lg:w-48"
          >
            <option value="next">{t.subs.sortNext}</option>
            <option value="cost">{t.subs.sortCost}</option>
            <option value="name">{t.subs.sortName}</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<MagnifyingGlass size={22} weight="bold" />}
            title={t.subs.noResults}
            actions={
              filtersActive && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                    setStatus('all')
                  }}
                >
                  {t.subs.clearFilters}
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-fg-3">
                  <th scope="col" className="py-3 pr-3 pl-5 font-medium">
                    {t.subs.colService}
                  </th>
                  <th scope="col" className="px-3 font-medium">
                    {t.subs.colCategory}
                  </th>
                  <th scope="col" className="px-3 text-right font-medium">
                    {t.subs.colPrice}
                  </th>
                  <th scope="col" className="px-3 text-right font-medium">
                    {t.subs.colMonthly}
                  </th>
                  <th scope="col" className="py-3 pr-5 pl-3 font-medium">
                    {t.subs.colNext}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr
                    key={r.sub.id}
                    onClick={() => navigate(`/app/subscriptions/${r.sub.id}`)}
                    className="cursor-pointer transition-colors hover:bg-surface-2/70"
                  >
                    <td className="py-3 pr-3 pl-5">
                      <div className="flex items-center gap-3">
                        <ServiceLogo serviceId={r.sub.serviceId} name={r.sub.name} size={36} />
                        <div className="min-w-0">
                          <Link
                            to={`/app/subscriptions/${r.sub.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate text-sm font-medium text-fg hover:underline"
                          >
                            {r.sub.name}
                          </Link>
                          {r.sub.plan && (
                            <span className="block truncate text-[13px] text-fg-3">{r.sub.plan}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-sm text-fg-2">
                      <CategoryLabel category={r.sub.category} />
                    </td>
                    <td className="px-3 text-right text-sm whitespace-nowrap text-fg tabular">
                      {f.money(r.terms.price, r.sub.currency)}
                      <span className="text-fg-3">/{t.per[r.terms.cycle]}</span>
                    </td>
                    <td className="px-3 text-right text-sm whitespace-nowrap text-fg-2 tabular">
                      {r.status === 'active' ? f.baseMoney(r.monthly) : '-'}
                    </td>
                    <td className="py-3 pr-5 pl-3 text-sm">
                      <NextCell row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((r) => (
                <li key={r.sub.id}>
                  <Link
                    to={`/app/subscriptions/${r.sub.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2"
                  >
                    <ServiceLogo serviceId={r.sub.serviceId} name={r.sub.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{r.sub.name}</p>
                      <div className="mt-0.5 text-[13px]">
                        <NextCell row={r} compact />
                      </div>
                    </div>
                    <p className="text-right text-sm whitespace-nowrap text-fg tabular">
                      {f.money(r.terms.price, r.sub.currency)}
                      <span className="block text-xs text-fg-3">{t.cycle[r.terms.cycle]}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  )
}

function CategoryLabel({ category }: { category: CategoryId }) {
  const { t } = useFormat()
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-[3px]"
        style={{ background: categoryColor(category) }}
      />
      {t.category[category]}
    </span>
  )
}

interface Row {
  sub: Subscription
  status: Status
  next?: Date
}

function NextCell({ row, compact }: { row: Row; compact?: boolean }) {
  const f = useFormat()
  const { t } = f
  const { sub, status, next } = row

  if (status === 'cancelled') {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge status="cancelled" />
        {!compact && sub.cancelledAt && (
          <span className="text-[13px] text-fg-3">{f.short(fromISO(sub.cancelledAt))}</span>
        )}
      </span>
    )
  }
  if (status === 'paused') return <StatusBadge status="paused" />
  if (status === 'trial' && sub.trialEndsAt) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge status="trial" />
        <span className="text-[13px] text-fg-3">{f.rel(fromISO(sub.trialEndsAt))}</span>
      </span>
    )
  }
  if (!next) return <span className="text-fg-3">{t.subs.noNext}</span>
  return (
    <span className="whitespace-nowrap">
      <span className="text-fg">{f.short(next)}</span>
      <span className="text-fg-3"> · {f.rel(next)}</span>
    </span>
  )
}
