import { CheckCircle, Info, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useI18n } from '../../i18n'
import { useUI } from '../../store/ui'

export function Toaster() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismissToast)
  const { t } = useI18n()

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[14px] border border-line bg-surface py-2.5 pr-2 pl-3.5 text-sm text-fg shadow-lg"
          >
            {toast.tone === 'good' ? (
              <CheckCircle size={18} weight="fill" className="shrink-0 text-good" aria-hidden />
            ) : (
              <Info size={18} weight="fill" className="shrink-0 text-fg-3" aria-hidden />
            )}
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run()
                  dismiss(toast.id)
                }}
                className="shrink-0 rounded-[8px] px-2 py-1 text-[13px] font-semibold text-accent hover:bg-accent-soft"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t.common.close}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-fg-3 hover:bg-surface-2 hover:text-fg"
            >
              <X size={14} weight="bold" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
