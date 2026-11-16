import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Option<T> {
  value: T
  label: ReactNode
}

interface Props<T> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  label: string
  /** Stretch options to fill the width (forms). */
  block?: boolean
  size?: 'sm' | 'md'
  className?: string
  id?: string
}

/** Single-choice radio group rendered as a segmented control. Arrow keys move the selection. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  block,
  size = 'md',
  className,
  id,
}: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const index = options.findIndex((o) => o.value === value)

  const onKeyDown = (e: KeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = (Math.max(index, 0) + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'gap-1 rounded-[10px] bg-surface-2 p-1',
        block ? 'grid auto-cols-fr grid-flow-col' : 'inline-flex',
        className,
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (index === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[7px] px-3 font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
              size === 'sm' ? 'h-7 text-[13px]' : 'h-8 text-[13px]',
              selected
                ? 'bg-surface text-fg shadow-sm ring-1 ring-line dark:bg-surface-3'
                : 'text-fg-2 hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
