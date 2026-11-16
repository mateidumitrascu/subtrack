import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Hourglass,
  PauseCircle,
  XCircle,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatPercent } from '@subtrack/shared/money'
import type { Status } from '@subtrack/shared/types'

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-2',
  good: 'bg-good-soft text-good-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad-text',
  accent: 'bg-accent-soft text-accent',
}

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Status with icon + label. Active subscriptions get no badge unless `showActive`. */
export function StatusBadge({ status, showActive }: { status: Status; showActive?: boolean }) {
  const { t } = useI18n()
  switch (status) {
    case 'trial':
      return (
        <Badge tone="warn" icon={<Hourglass size={13} weight="bold" aria-hidden />}>
          {t.status.trial}
        </Badge>
      )
    case 'paused':
      return (
        <Badge icon={<PauseCircle size={13} weight="bold" aria-hidden />}>{t.status.paused}</Badge>
      )
    case 'cancelled':
      return <Badge icon={<XCircle size={13} weight="bold" aria-hidden />}>{t.status.cancelled}</Badge>
    default:
      return showActive ? (
        <Badge tone="good" icon={<CheckCircle size={13} weight="bold" aria-hidden />}>
          {t.status.active}
        </Badge>
      ) : null
  }
}

/** Price change: up is bad, down is good. Always icon + signed value. */
export function DeltaBadge({ pct, className }: { pct: number; className?: string }) {
  const { lang } = useI18n()
  const up = pct > 0
  return (
    <Badge
      tone={up ? 'bad' : 'good'}
      className={className}
      icon={
        up ? (
          <ArrowUpRight size={13} weight="bold" aria-hidden />
        ) : (
          <ArrowDownRight size={13} weight="bold" aria-hidden />
        )
      }
    >
      {formatPercent(pct, lang, { sign: true })}
    </Badge>
  )
}
