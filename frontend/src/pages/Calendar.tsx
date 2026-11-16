import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ServiceLogo } from '../components/ServiceLogo'
import { Button, IconButton } from '../components/ui/Button'
import { Card, PageHeader } from '../components/ui/Card'
import { useDocumentTitle, useFormat, useToday } from '../hooks'
import { capitalize, formatDate } from '../i18n'
import { cn } from '../lib/cn'
import { toISO } from '@subtrack/shared/dates'
import { chargesBetween } from '@subtrack/shared/schedule'
import type { Charge } from '@subtrack/shared/types'
import { useStore } from '../store/store'

export function CalendarPage() {
  const f = useFormat()
  const { t, lang } = f
  const today = useToday()
  const subs = useStore((s) => s.subscriptions)
  const { baseCurrency: base, rates } = useStore((s) => s.settings)
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState<Date | null>(null)
  useDocumentTitle(t.calendar.title)

  const { days, byDay, monthCharges } = useMemo(() => {
    const start = startOfWeek(month, { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const charges = chargesBetween(subs, start, end, base, rates)
    const map = new Map<string, Charge[]>()
    for (const c of charges) {
      const key = toISO(c.date)
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return {
      days: eachDayOfInterval({ start, end }),
      byDay: map,
      monthCharges: charges.filter((c) => isSameMonth(c.date, month)),
    }
  }, [month, subs, base, rates])

  const monthTotal = monthCharges.reduce((s, c) => s + c.base, 0)
  const paidSoFar = monthCharges.filter((c) => c.date <= today).reduce((s, c) => s + c.base, 0)
  const list = selected ? (byDay.get(toISO(selected)) ?? []) : monthCharges
  const monthLabel = capitalize(formatDate(month, 'LLLL yyyy', lang))

  const go = (delta: number) => {
    setMonth((m) => addMonths(m, delta))
    setSelected(null)
  }

  return (
    <>
      <PageHeader
        title={t.calendar.title}
        description={t.calendar.subtitle}
        actions={
          <div className="flex items-center gap-1">
            <IconButton label={t.calendar.prev} variant="secondary" onClick={() => go(-1)}>
              <CaretLeft size={16} weight="bold" />
            </IconButton>
            <p className="min-w-36 text-center text-sm font-semibold text-fg" aria-live="polite">
              {monthLabel}
            </p>
            <IconButton label={t.calendar.next} variant="secondary" onClick={() => go(1)}>
              <CaretRight size={16} weight="bold" />
            </IconButton>
            <Button
              variant="ghost"
              className="ml-1"
              onClick={() => {
                setMonth(startOfMonth(today))
                setSelected(today)
              }}
            >
              {t.calendar.today}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="self-start overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {t.calendar.weekdays.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-fg-3">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-line">
            {days.map((day) => {
              const charges = byDay.get(toISO(day)) ?? []
              const inMonth = isSameMonth(day, month)
              const isToday = isSameDay(day, today)
              const isSelected = selected !== null && isSameDay(day, selected)
              const total = charges.reduce((s, c) => s + c.base, 0)
              const past = day < today
              const label = `${f.long(day)}: ${
                charges.length
                  ? `${t.calendar.count(charges.length)}, ${f.baseMoney(total)}`
                  : t.calendar.noPaymentsDay
              }`
              return (
                <button
                  key={day.getTime()}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={cn(
                    'relative flex min-h-16 flex-col gap-1 bg-surface p-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:z-10 sm:min-h-[104px] sm:p-2',
                    !inMonth && 'bg-surface-2/50',
                    isSelected && 'ring-2 ring-accent ring-inset',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-full text-xs font-medium tabular',
                      isToday
                        ? 'bg-ink text-ink-fg'
                        : inMonth
                          ? 'text-fg-2'
                          : 'text-fg-3 opacity-60',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {charges.length > 0 && (
                    <>
                      <span className={cn('flex flex-wrap gap-1', past && 'opacity-55')}>
                        {charges.slice(0, 3).map((c, i) => (
                          // The third logo only fits on wider cells.
                          <span key={c.sub.id} className={i === 2 ? 'hidden sm:flex' : 'flex'}>
                            <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={20} />
                          </span>
                        ))}
                        {charges.length > 3 && (
                          <span className="self-center text-[11px] font-medium text-fg-3">
                            +{charges.length - 3}
                          </span>
                        )}
                      </span>
                      <span className="mt-auto hidden text-[11px] font-medium text-fg-2 tabular sm:block">
                        {f.baseMoney(total, { decimals: 0 })}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="flex flex-col self-start">
          <div className="border-b border-line p-5">
            <p className="text-sm font-medium text-fg-2">{t.calendar.monthTotal}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-fg">
              {f.baseMoney(monthTotal)}
            </p>
            <p className="mt-1 text-[13px] text-fg-3">
              {t.calendar.paidSoFar(f.baseMoney(paidSoFar))}
            </p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-fg">
                {selected ? t.calendar.paymentsOn(f.short(selected)) : t.calendar.monthPayments}
              </h2>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  {t.calendar.showMonth}
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-fg-3">
                {selected ? t.calendar.noPaymentsDay : t.calendar.noPaymentsMonth}
              </p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {list.map((c) => {
                  const done = c.date <= today
                  return (
                    <li key={`${c.sub.id}-${c.date.getTime()}`}>
                      <Link
                        to={`/app/subscriptions/${c.sub.id}`}
                        className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                      >
                        <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">
                            {c.sub.name}
                          </span>
                          <span className="block text-[13px] text-fg-3">
                            {f.short(c.date)}, {done ? t.calendar.paid : t.calendar.scheduled}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'text-sm tabular',
                            done ? 'text-fg-3' : 'font-medium text-fg',
                          )}
                        >
                          {f.money(c.amount, c.sub.currency)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
