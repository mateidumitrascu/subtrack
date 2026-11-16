import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'

/*
  Shape rule for the whole app: controls (buttons, inputs, logo tiles) use a
  10px radius, cards and dialogs 16px, badges and switches are fully rounded.
*/

type Variant = 'primary' | 'secondary' | 'ghost' | 'ghostDanger' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,color,border-color,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-ink-fg hover:bg-ink/85',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  ghostDanger: 'text-fg-2 hover:bg-bad-soft hover:text-bad-text',
  danger: 'bg-bad text-white hover:bg-bad/90',
  soft: 'bg-accent-soft text-accent hover:bg-accent-soft/60',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

type ButtonProps = ComponentProps<'button'> & { variant?: Variant; size?: Size }

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size }

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

type IconButtonProps = ComponentProps<'button'> & {
  label: string
  children: ReactNode
  variant?: Variant
}

export function IconButton({
  label,
  variant = 'ghost',
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], 'h-9 w-9 p-0', className)}
      {...props}
    >
      {children}
    </button>
  )
}
