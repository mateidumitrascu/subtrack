import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  icon,
  title,
  body,
  actions,
  className,
  compact,
}: {
  icon: ReactNode
  title: ReactNode
  body?: ReactNode
  actions?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-16',
        className,
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2 text-fg-2">
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
      {body && <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-fg-2">{body}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
