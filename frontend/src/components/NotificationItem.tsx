import { CalendarCheck, Hourglass, TrendDown, TrendUp } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useFormat, useToday } from '../hooks'
import { cn } from '../lib/cn'
import type { AppNotification } from '@subtrack/shared/notifications'
import { ServiceLogo } from './ServiceLogo'

export function useNotificationText(n: AppNotification) {
  const f = useFormat()
  const today = useToday()
  const { t } = f
  const name = n.sub.name
  const amount = n.amount !== undefined ? f.money(n.amount, n.sub.currency) : ''

  if (n.kind === 'renewal' && n.due) {
    const diff = Math.round((n.due.getTime() - today.getTime()) / 86_400_000)
    const title =
      diff > 0
        ? t.notif.renewalUpcoming(name, f.rel(n.due))
        : diff === 0
          ? t.notif.renewalToday(name)
          : t.notif.renewalPast(name, f.short(n.due))
    return { title, body: t.notif.renewalBody(amount) }
  }
  if (n.kind === 'trial' && n.due) {
    return { title: t.notif.trialTitle(name, f.rel(n.due)), body: t.notif.trialBody(amount) }
  }
  const from = f.money(n.from ?? 0, n.sub.currency)
  const to = f.money(n.to ?? 0, n.sub.currency)
  return {
    title: t.notif.priceTitle(name, f.short(n.due ?? n.at)),
    body: t.notif.priceBody(from, to, f.pct(n.pct ?? 0, { sign: true })),
  }
}

function KindIcon({ n }: { n: AppNotification }) {
  if (n.kind === 'trial') return <Hourglass size={14} weight="bold" className="text-warn-text" aria-hidden />
  if (n.kind === 'price') {
    return (n.pct ?? 0) > 0 ? (
      <TrendUp size={14} weight="bold" className="text-bad-text" aria-hidden />
    ) : (
      <TrendDown size={14} weight="bold" className="text-good-text" aria-hidden />
    )
  }
  return <CalendarCheck size={14} weight="bold" className="text-fg-3" aria-hidden />
}

export function NotificationItem({
  n,
  unread,
  onOpen,
}: {
  n: AppNotification
  unread: boolean
  onOpen?: () => void
}) {
  const { title, body } = useNotificationText(n)
  const f = useFormat()
  return (
    <Link
      to={`/app/subscriptions/${n.sub.id}`}
      onClick={onOpen}
      className={cn(
        'flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:-outline-offset-2',
        unread && 'bg-accent-soft/40',
      )}
    >
      <ServiceLogo serviceId={n.sub.serviceId} name={n.sub.name} size={34} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug text-fg', unread ? 'font-semibold' : 'font-medium')}>
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{body}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-3">
          <KindIcon n={n} />
          {f.rel(n.at)}
        </p>
      </div>
      {unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent">
          <span className="sr-only">{f.t.notif.unreadLabel}</span>
        </span>
      )}
    </Link>
  )
}
