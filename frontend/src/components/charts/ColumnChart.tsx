import { useState } from 'react'
import { useElementWidth } from '../../hooks'
import { cn } from '../../lib/cn'
import { columnPath, niceTicks } from './scale'

export interface ColumnDatum {
  key: string
  /** Axis label (short). */
  label: string
  /** Tooltip / accessible label (long). */
  title: string
  paid: number
  scheduled: number
}

interface Props {
  data: ColumnDatum[]
  height?: number
  format: (v: number) => string
  formatTick: (v: number) => string
  labels: { paid: string; scheduled: string; total: string }
  ariaLabel: string
  /** Compact variant without y-axis labels (dashboard / landing). */
  bare?: boolean
}

const GAP = 2

/**
 * Single-series column chart. The current period can carry a "scheduled"
 * remainder stacked on top (lighter step of the same hue, 2px surface gap).
 * Each column is its own hover/focus target with a tooltip.
 */
export function ColumnChart({
  data,
  height = 260,
  format,
  formatTick,
  labels,
  ariaLabel,
  bare,
}: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(0, ...data.map((d) => d.paid + d.scheduled))
  const ticks = niceTicks(max, bare ? 2 : 4)
  const top = ticks[ticks.length - 1]
  const m = bare
    ? { top: 6, right: 0, bottom: 22, left: 0 }
    : { top: 12, right: 4, bottom: 28, left: 46 }
  const plotW = Math.max(0, width - m.left - m.right)
  const plotH = height - m.top - m.bottom
  const band = data.length ? plotW / data.length : 0
  const barW = Math.max(4, Math.min(24, band * 0.56))
  const y = (v: number) => m.top + plotH * (1 - v / top)
  const baseline = y(0)
  const labelEvery = band < 30 ? 2 : 1
  const activeDatum = active !== null ? data[active] : undefined

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
          {!bare &&
            ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={m.left}
                  x2={width - m.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--grid)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={m.left - 10}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="tabular fill-fg-3 text-[11px]"
                >
                  {formatTick(tick)}
                </text>
              </g>
            ))}
          <line
            x1={m.left}
            x2={width - m.right}
            y1={baseline}
            y2={baseline}
            stroke="var(--axis)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />

          {data.map((d, i) => {
            const cx = m.left + band * (i + 0.5)
            const x = cx - barW / 2
            const paidTop = y(d.paid)
            const totalTop = y(d.paid + d.scheduled)
            const hasScheduled = d.scheduled > 0
            const dim = active !== null && active !== i
            const paidH = baseline - paidTop
            const schedH = paidTop - GAP - totalTop
            return (
              <g
                key={d.key}
                style={{ opacity: dim ? 0.45 : 1 }}
                className="transition-opacity duration-150"
              >
                {paidH > 0 &&
                  (hasScheduled && schedH > 0 ? (
                    <rect x={x} y={paidTop} width={barW} height={paidH} fill="var(--chart-1)" />
                  ) : (
                    <path d={columnPath(x, paidTop, barW, paidH)} fill="var(--chart-1)" />
                  ))}
                {hasScheduled && schedH > 0 && (
                  <path
                    d={columnPath(x, totalTop, barW, paidH > 0 ? schedH : baseline - totalTop)}
                    fill="var(--chart-1-soft)"
                  />
                )}
                {i % labelEvery === (data.length - 1) % labelEvery && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className={cn(
                      'text-[11px]',
                      active === i ? 'fill-fg font-medium' : 'fill-fg-3',
                    )}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Hit targets: the whole column band, larger than the mark. */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.key}`}
              x={m.left + band * i}
              y={m.top}
              width={band}
              height={plotH + 4}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${d.title}: ${format(d.paid + d.scheduled)}`}
              className="cursor-default outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
            />
          ))}
        </svg>
      )}

      {activeDatum && active !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] shadow-md"
          style={{
            left: Math.min(
              Math.max(m.left + band * (active + 0.5), 90),
              Math.max(90, width - 90),
            ),
            top: Math.max(0, y(activeDatum.paid + activeDatum.scheduled) - 10),
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="mb-1 text-xs whitespace-nowrap text-fg-3">{activeDatum.title}</div>
          <TooltipRow color="var(--chart-1)" value={format(activeDatum.paid)} label={labels.paid} />
          {activeDatum.scheduled > 0 && (
            <>
              <TooltipRow
                color="var(--chart-1-soft)"
                value={format(activeDatum.scheduled)}
                label={labels.scheduled}
              />
              <div className="mt-1 border-t border-line pt-1 text-xs whitespace-nowrap text-fg-2">
                {labels.total}{' '}
                <span className="font-semibold text-fg tabular">
                  {format(activeDatum.paid + activeDatum.scheduled)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TooltipRow({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: color }} />
      <span className="font-semibold text-fg tabular">{value}</span>
      <span className="text-fg-3">{label}</span>
    </div>
  )
}

/** Legend for the paid / scheduled pair (rect keys mirror the bar marks). */
export function ColumnLegend({ paid, scheduled }: { paid: string; scheduled: string }) {
  return (
    <div className="flex items-center gap-4 text-[13px] text-fg-2">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-chart-1" />
        {paid}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-chart-1-soft" />
        {scheduled}
      </span>
    </div>
  )
}
