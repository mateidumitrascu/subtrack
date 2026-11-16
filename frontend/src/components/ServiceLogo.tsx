import { getService } from '../lib/catalog'
import { cn } from '../lib/cn'

function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const channel = (i: number) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

/** White or near-black, whichever contrasts more with the brand color. */
function glyphOn(bg: string): string {
  const l = luminance(bg)
  const onWhite = 1.05 / (l + 0.05)
  const onInk = (l + 0.05) / (luminance('#121211') + 0.05)
  return onWhite >= onInk ? '#ffffff' : '#121211'
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface Props {
  serviceId?: string
  name: string
  size?: number
  className?: string
}

/** Brand tile: Simple Icons glyph on the brand color, or a monogram. */
export function ServiceLogo({ serviceId, name, size = 36, className }: Props) {
  const service = getService(serviceId)
  const brand = service?.icon ? `#${service.icon.hex}` : service?.color
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.28) }

  if (!brand) {
    return (
      <span
        aria-hidden
        style={style}
        className={cn(
          'inline-grid shrink-0 place-items-center bg-surface-3 font-semibold text-fg-2',
          className,
        )}
      >
        <span style={{ fontSize: Math.round(size * 0.34) }}>{initials(name)}</span>
      </span>
    )
  }

  const glyph = glyphOn(brand)
  return (
    <span
      aria-hidden
      style={{ ...style, background: brand }}
      className={cn(
        'inline-grid shrink-0 place-items-center ring-1 ring-black/5 ring-inset dark:ring-white/12',
        className,
      )}
    >
      {service?.icon ? (
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill={glyph}>
          <path d={service.icon.path} />
        </svg>
      ) : (
        <span className="font-semibold" style={{ color: glyph, fontSize: Math.round(size * 0.34) }}>
          {initials(name)}
        </span>
      )}
    </span>
  )
}
