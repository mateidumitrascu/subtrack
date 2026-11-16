import { cn } from '../../lib/cn'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  labelledBy?: string
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, id, labelledBy, label, disabled }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-surface-3',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-expo',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}
