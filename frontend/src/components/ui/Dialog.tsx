import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button, IconButton } from './Button'

/*
  Layer scale: sticky header z-30, popovers z-40, dialogs z-50, toasts z-60.
*/

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Focus trap, Escape to close, body scroll lock, focus restore. */
function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const el = ref.current
    const focusables = () => (el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : [])

    const frame = requestAnimationFrame(() => {
      const target = el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0]
      target?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const i = items.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        items[items.length - 1].focus()
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault()
        items[0].focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [ref])
}

const spring = { type: 'spring', stiffness: 420, damping: 36 } as const

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 bg-[#0d0d0d]/45 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
    />
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
}

export function Modal(props: ModalProps) {
  return createPortal(
    <AnimatePresence>{props.open && <ModalPanel {...props} />}</AnimatePresence>,
    document.body,
  )
}

function ModalPanel({ onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  useDialog(ref, onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <Backdrop onClick={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-lg"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={spring}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-fg">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-sm leading-relaxed text-fg-2">
            {description}
          </p>
        )}
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </motion.div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
}) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            {t.common.cancel}
          </Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  side?: 'right' | 'left'
  className?: string
}

/** Side panel: forms on the right, mobile navigation on the left. */
export function Sheet(props: SheetProps) {
  return createPortal(
    <AnimatePresence>{props.open && <SheetPanel {...props} />}</AnimatePresence>,
    document.body,
  )
}

function SheetPanel({ onClose, title, children, footer, side = 'right', className }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { t } = useI18n()
  useDialog(ref, onClose)
  const offscreen = side === 'right' ? '100%' : '-100%'
  return (
    <div className="fixed inset-0 z-50">
      <Backdrop onClick={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-y-0 flex w-full flex-col bg-surface shadow-lg',
          side === 'right'
            ? 'right-0 max-w-[520px] sm:border-l sm:border-line'
            : 'left-0 max-w-[300px] border-r border-line',
          className,
        )}
        initial={{ x: offscreen }}
        animate={{ x: 0 }}
        exit={{ x: offscreen }}
        transition={spring}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
          <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-fg">
            {title}
          </h2>
          <IconButton label={t.common.close} onClick={onClose} className="-mr-2">
            <X size={18} weight="bold" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-5 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  )
}
