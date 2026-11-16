/** Rounds a raw step to 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1
  const exp = Math.floor(Math.log10(raw))
  const f = raw / 10 ** exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * 10 ** exp
}

/** Ticks from 0 to a clean value at or above `max`. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  return niceRange(0, max, count)
}

/** Ticks covering [lo, hi] with clean steps. */
export function niceRange(lo: number, hi: number, count = 4): number[] {
  const step = niceStep((hi - lo) / count || 1)
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 1e6; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks.length > 1 ? ticks : [start, start + step]
}

/** Bar path with a 4px rounded data end and a square baseline. */
export function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0 || w <= 0) return ''
  const rr = Math.min(r, h, w / 2)
  return [
    `M${x},${y + h}`,
    `V${y + rr}`,
    `A${rr},${rr} 0 0 1 ${x + rr},${y}`,
    `H${x + w - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w},${y + rr}`,
    `V${y + h}`,
    'Z',
  ].join(' ')
}
