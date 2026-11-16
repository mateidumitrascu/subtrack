import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '../../hooks'
import { niceRange } from './scale'

export interface PricePointDatum {
  date: Date
  amount: number
  /** Marks a plan change made by the user (not a provider price change). */
  plan?: boolean
}

interface Props {
  points: PricePointDatum[]
  /** Right edge of the time axis (usually today). */
  end: Date
  height?: number
  format: (v: number) => string
  formatTick: (v: number) => string
  formatDate: (d: Date) => string
  formatAxisDate: (d: Date) => string
  pctLabel: (ratio: number) => string
  planLabel: string
  ariaLabel: string
}

/**
 * Step line of a subscription's price over time: 2px line, 10% area wash,
 * dots at every change, crosshair snapping to the nearest change.
 * Arrow keys move the crosshair when the chart has focus.
 */
export function PriceChart({
  points,
  end,
  height = 220,
  format,
  formatTick,
  formatDate,
  formatAxisDate,
  pctLabel,
  planLabel,
  ariaLabel,
}: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) return null

  const first = points[0]
  const last = points[points.length - 1]
  // A scheduled (future) change gets a short visible stretch after it.
  const endDate = end > last.date ? end : new Date(last.date.getTime() + 21 * 86_400_000)
  const t0 = first.date.getTime()
  const t1 = Math.max(endDate.getTime(), t0 + 86_400_000)

  const amounts = points.map((p) => p.amount)
  const minA = Math.min(...amounts)
  const maxA = Math.max(...amounts)
  const span = maxA - minA || Math.max(maxA * 0.3, 1)
  const ticks = niceRange(Math.max(0, minA - span * 0.9), maxA + span * 0.6, 3)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]

  const m = { top: 16, right: 16, bottom: 28, left: 52 }
  const plotW = Math.max(0, width - m.left - m.right)
  const plotH = height - m.top - m.bottom
  const x = (d: Date) => m.left + ((d.getTime() - t0) / (t1 - t0)) * plotW
  const y = (v: number) => m.top + plotH * (1 - (v - lo) / (hi - lo || 1))
  const bottom = m.top + plotH

  let line = `M${x(first.date)},${y(first.amount)}`
  for (let i = 1; i < points.length; i++) {
    line += ` H${x(points[i].date)} V${y(points[i].amount)}`
  }
  line += ` H${x(endDate)}`
  const area = `${line} V${bottom} H${x(first.date)} Z`

  // Snap targets: every change, plus "now" at the right edge.
  const targets = [...points, { date: endDate, amount: last.amount }]
  const activeTarget = active !== null ? targets[active] : undefined

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left + m.left
    let best = 0
    let bestDist = Infinity
    targets.forEach((tg, i) => {
      const dist = Math.abs(x(tg.date) - px)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setActive(best)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setActive((a) => {
      const cur = a ?? (e.key === 'ArrowRight' ? -1 : targets.length)
      const next = cur + (e.key === 'ArrowRight' ? 1 : -1)
      return Math.min(targets.length - 1, Math.max(0, next))
    })
  }

  // X axis: first date, change dates and the end date, skipping labels that would collide.
  const MIN_GAP = 78
  const axisDates: Date[] = [first.date]
  for (const d of points.slice(1).map((p) => p.date)) {
    if (x(d) - x(axisDates[axisDates.length - 1]) >= MIN_GAP && x(endDate) - x(d) >= MIN_GAP) {
      axisDates.push(d)
    }
  }
  if (x(endDate) - x(axisDates[axisDates.length - 1]) >= MIN_GAP) axisDates.push(endDate)

  const activeIndexInPoints = active !== null && active < points.length ? active : null
  const prev =
    activeIndexInPoints !== null && activeIndexInPoints > 0
      ? points[activeIndexInPoints - 1]
      : undefined

  return (
    <div
      ref={ref}
      className="relative w-full rounded-[10px] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden className="block">
          {ticks.map((tick) => (
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
          {axisDates.map((d, i) => (
            <text
              key={d.getTime()}
              x={x(d)}
              y={height - 8}
              textAnchor={i === 0 ? 'start' : i === axisDates.length - 1 ? 'end' : 'middle'}
              className="fill-fg-3 text-[11px]"
            >
              {formatAxisDate(d)}
            </text>
          ))}

          <path d={area} fill="var(--chart-1)" opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activeTarget && (
            <line
              x1={x(activeTarget.date)}
              x2={x(activeTarget.date)}
              y1={m.top}
              y2={bottom}
              stroke="var(--axis)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          )}

          {targets.map((p, i) => {
            const isActive = active === i
            return (
              <g key={i}>
                <circle cx={x(p.date)} cy={y(p.amount)} r={isActive ? 7 : 6} fill="var(--surface)" />
                <circle
                  cx={x(p.date)}
                  cy={y(p.amount)}
                  r={isActive ? 5 : 4}
                  fill="var(--chart-1)"
                />
              </g>
            )
          })}

          {/* Direct label on the current value. */}
          <text
            x={x(endDate) - 2}
            y={y(last.amount) - 14}
            textAnchor="end"
            className="tabular fill-fg text-[12px] font-semibold"
          >
            {format(last.amount)}
          </text>

          <rect
            x={m.left}
            y={m.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {activeTarget && active !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] shadow-md"
          style={{
            left: Math.min(Math.max(x(activeTarget.date), 80), Math.max(80, width - 80)),
            top: Math.max(0, y(activeTarget.amount) - 14),
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="mb-0.5 text-xs whitespace-nowrap text-fg-3">
            {formatDate(activeTarget.date)}
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-chart-1" />
            <span className="font-semibold text-fg tabular">{format(activeTarget.amount)}</span>
            {prev && activeIndexInPoints !== null && (
              <span className="text-fg-3">
                {points[activeIndexInPoints].plan
                  ? planLabel
                  : pctLabel((activeTarget.amount - prev.amount) / prev.amount)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
