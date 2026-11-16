import {
  Bell,
  CalendarBlank,
  ChartBar,
  GearSix,
  List,
  PiggyBank,
  Plus,
  SquaresFour,
  Stack,
  TrendUp,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useNotifications } from '../../hooks'
import { useI18n } from '../../i18n'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/store'
import { useUI } from '../../store/ui'
import { NotificationItem } from '../NotificationItem'
import { Button, IconButton } from '../ui/Button'
import { Sheet } from '../ui/Dialog'
import { LangToggle, Logo, ThemeToggle } from './Brand'

type NavKey =
  | 'overview'
  | 'subscriptions'
  | 'calendar'
  | 'statistics'
  | 'prices'
  | 'savings'
  | 'notifications'
  | 'settings'

const NAV: Array<{ to: string; key: NavKey; icon: Icon; end?: boolean }> = [
  { to: '/app', key: 'overview', icon: SquaresFour, end: true },
  { to: '/app/subscriptions', key: 'subscriptions', icon: Stack },
  { to: '/app/calendar', key: 'calendar', icon: CalendarBlank },
  { to: '/app/statistics', key: 'statistics', icon: ChartBar },
  { to: '/app/prices', key: 'prices', icon: TrendUp },
  { to: '/app/savings', key: 'savings', icon: PiggyBank },
  { to: '/app/notifications', key: 'notifications', icon: Bell },
  { to: '/app/settings', key: 'settings', icon: GearSix },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const { unreadCount } = useNotifications()
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map(({ to, key, icon: IconCmp, end }) => (
        <li key={key}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors',
                isActive
                  ? 'bg-surface font-medium text-fg shadow-sm ring-1 ring-line'
                  : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <IconCmp
                  size={18}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-accent' : 'text-fg-3 group-hover:text-fg-2'}
                  aria-hidden
                />
                <span className="flex-1">{t.nav[key]}</span>
                {key === 'notifications' && unreadCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-ink-fg tabular">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function UserCard() {
  const { t } = useI18n()
  const name = useStore((s) => s.settings.userName)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <Link
      to="/app/settings"
      className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
        {initials || '?'}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg">{name}</span>
        <span className="block text-xs text-fg-3">{t.common.demoUser}</span>
      </span>
    </Link>
  )
}

function NotificationsPopover() {
  const { t } = useI18n()
  const { list, unread, unreadCount } = useNotifications()
  const markRead = useStore((s) => s.markNotificationsRead)
  const location = useLocation()
  // Remember where the popover was opened; navigating anywhere else closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const toggle = () => setOpenOn(open ? null : location.pathname)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenOn(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = list.slice(0, 6)

  return (
    <div ref={ref} className="relative">
      <IconButton
        label={t.notif.open}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        className="relative"
      >
        <Bell size={18} weight="bold" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-ink-fg tabular">
            {unreadCount}
          </span>
        )}
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t.notif.title}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            style={{ transformOrigin: 'top right' }}
            className="fixed inset-x-3 top-[68px] z-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[400px]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-fg">{t.notif.title}</p>
                <p className="text-xs text-fg-3">
                  {unreadCount > 0 ? t.notif.unread(unreadCount) : t.notif.allRead}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markRead(list.filter(unread).map((n) => n.id))}
                >
                  {t.notif.markAll}
                </Button>
              )}
            </div>
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-3">{t.notif.empty}</p>
            ) : (
              <div className="max-h-[min(440px,60dvh)] divide-y divide-line overflow-y-auto">
                {visible.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    unread={unread(n)}
                    onOpen={() => markRead([n.id])}
                  />
                ))}
              </div>
            )}
            <div className="border-t border-line p-2">
              <Link
                to="/app/notifications"
                className="block rounded-[10px] px-3 py-2 text-center text-[13px] font-medium text-accent hover:bg-accent-soft"
              >
                {t.common.viewAll}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AppShell() {
  const { t } = useI18n()
  const openAdd = useUI((s) => s.openAdd)
  const navOpen = useUI((s) => s.navOpen)
  const setNavOpen = useUI((s) => s.setNavOpen)
  const location = useLocation()

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <a
        href="#main"
        className="fixed top-2 left-2 z-60 -translate-y-20 rounded-[10px] bg-ink px-3 py-2 text-sm font-medium text-ink-fg focus:translate-y-0"
      >
        {t.common.skip}
      </a>

      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line px-3 pt-4 pb-3 lg:flex">
        <div className="flex h-10 items-center px-2">
          <Logo />
        </div>
        <nav aria-label={t.common.primaryNav} className="mt-6 flex-1 overflow-y-auto">
          <NavItems />
        </nav>
        <UserCard />
      </aside>

      <Sheet
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title={<Logo />}
        side="left"
      >
        <nav aria-label={t.common.primaryNav} className="p-3">
          <NavItems onNavigate={() => setNavOpen(false)} />
        </nav>
        <div className="border-t border-line p-3">
          <UserCard />
        </div>
      </Sheet>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1 border-b border-line bg-page/85 px-3 backdrop-blur-md sm:px-4 md:px-8">
          <IconButton label={t.common.menu} onClick={() => setNavOpen(true)} className="lg:hidden">
            <List size={20} weight="bold" />
          </IconButton>
          <div className="ml-1 lg:hidden">
            <Logo to="/app" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            <NotificationsPopover />
            <Button variant="primary" onClick={openAdd} className="ml-1 px-3 sm:px-4" aria-label={t.common.add}>
              <Plus size={16} weight="bold" aria-hidden />
              <span className="hidden sm:inline">{t.common.add}</span>
            </Button>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1180px] px-4 py-6 outline-none sm:px-6 md:px-8 md:py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
