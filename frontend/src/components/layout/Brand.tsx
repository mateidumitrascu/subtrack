import { Moon, Sun } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useIsDark } from '../../hooks'
import { useI18n } from '../../i18n'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/store'
import { IconButton } from '../ui/Button'

/** Wordmark with a simple geometric mark (ring = recurring cycle, dot = the due date). */
export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-[8px] text-[17px] font-semibold tracking-tight text-fg',
        className,
      )}
    >
      <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
          <circle cx="16" cy="16" r="7.5" fill="none" stroke="var(--ink-fg)" strokeWidth="3" />
          <circle cx="22.5" cy="9.5" r="3.5" fill="var(--chart-1)" stroke="var(--ink)" strokeWidth="2" />
        </svg>
      </span>
      Subtrack
    </Link>
  )
}

export function ThemeToggle() {
  const dark = useIsDark()
  const update = useStore((s) => s.updateSettings)
  const { t } = useI18n()
  return (
    <IconButton
      label={dark ? t.common.toLight : t.common.toDark}
      onClick={() => update({ theme: dark ? 'light' : 'dark' })}
    >
      {dark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </IconButton>
  )
}

export function LangToggle() {
  const { t, lang } = useI18n()
  const update = useStore((s) => s.updateSettings)
  return (
    <button
      type="button"
      onClick={() => update({ lang: lang === 'ro' ? 'en' : 'ro' })}
      aria-label={t.meta.switchLang}
      title={t.meta.switchLang}
      className="grid h-9 min-w-9 place-items-center rounded-[10px] px-2 text-[13px] font-semibold text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {t.meta.otherLang}
    </button>
  )
}
