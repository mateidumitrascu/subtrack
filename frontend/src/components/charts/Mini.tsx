import type { ReactNode } from 'react'
import { useElementWidth } from '../../hooks'

/** 12-point trend: de-emphasis line, current period in the accent. */
export function Sparkline({
  values,
  height = 44,
  ariaLabel,
}: {
  values: number[]
  height?: number
  ariaLabel: string
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const max = Math.max(1, ...values)
  const min = Math.min(...values, max)
  const pad = 6
  const range = max - min || 1
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2)
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
  const lastI = values.length - 1
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && values.length > 1 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
          <path
            d={d}
            fill="none"
            stroke="var(--fg-3)"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={x(lastI)} cy={y(values[lastI])} r={6} fill="var(--surface)" />
          <circle cx={x(lastI)} cy={y(values[lastI])} r={4} fill="var(--chart-1)" />
        </svg>
      )}
    </div>
  )
}

export interface Part {
  key: string
  value: number
  color: string
  label: string
}

/** One whole split into parts: thin 8px bar, 2px surface gaps, no text on it. */
export function SegmentedBar({
  parts,
  ariaLabel,
  height = 8,
}: {
  parts: Part[]
  ariaLabel: string
  height?: number
}) {
  const visible = parts.filter((p) => p.value > 0)
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex w-full gap-[2px] overflow-hidden rounded-full"
      style={{ height }}
    >
      {visible.map((p) => (
        <div
          key={p.key}
          title={p.label}
          className="h-full min-w-[3px]"
          style={{ flexGrow: p.value, flexBasis: 0, background: p.color }}
        />
      ))}
    </div>
  )
}

/** Ranked horizontal bars (one hue). Values print at the bar tip column. */
export function RankedBars({
  rows,
}: {
  rows: Array<{ key: string; label: ReactNode; value: number; valueLabel: ReactNode; aside?: ReactNode }>
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-2 text-sm text-fg">{r.label}</div>
          <div className="text-right text-sm whitespace-nowrap">
            <span className="font-medium text-fg tabular">{r.valueLabel}</span>
            {r.aside && <span className="ml-2 text-fg-3 tabular">{r.aside}</span>}
          </div>
          <div className="col-span-2 h-2.5">
            <div
              className="h-full rounded-r-[4px] bg-chart-1"
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export const categoryColor = (category: string) => `var(--cat-${category})`
