import { CaretDown, WarningCircle } from '@phosphor-icons/react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  id: string
  label: ReactNode
  optional?: string
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

/** Label above, control, then hint or error below. */
export function Field({ id, label, optional, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
        {optional && <span className="font-normal text-fg-3"> ({optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[13px] text-bad-text">
          <WarningCircle size={15} weight="bold" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-snug text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** aria wiring for a control inside <Field>. */
export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const
}

const control =
  'w-full rounded-[10px] border bg-surface text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-3 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:opacity-60'

export function Input({
  invalid,
  className,
  ...props
}: ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        control,
        'h-10 px-3',
        invalid ? 'border-bad' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  invalid,
  className,
  ...props
}: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        control,
        'min-h-20 resize-y px-3 py-2.5 leading-relaxed',
        invalid ? 'border-bad' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          control,
          'h-10 cursor-pointer appearance-none pr-9 pl-3',
          invalid ? 'border-bad' : 'border-line-strong',
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        size={14}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-3"
      />
    </div>
  )
}
