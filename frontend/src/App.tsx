import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { SubscriptionSheet } from './components/SubscriptionForm'
import { Toaster } from './components/ui/Toaster'
import { useIsDark } from './hooks'
import { Landing } from './pages/Landing'
import { NotFound } from './pages/NotFound'
import { useStore } from './store/store'

/** Keeps <html> in sync with the theme and language settings. */
function DocumentSync() {
  const dark = useIsDark()
  const lang = useStore((s) => s.settings.lang)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return null
}

function Root() {
  return (
    <MotionConfig reducedMotion="user">
      <DocumentSync />
      <ScrollRestoration />
      <Outlet />
      <SubscriptionSheet />
      <Toaster />
    </MotionConfig>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <Landing /> },
      {
        // The app is split from the landing page; each screen loads on demand.
        path: '/app',
        lazy: async () => ({ Component: (await import('./components/layout/AppShell')).AppShell }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('./pages/Dashboard')).Dashboard }) },
          {
            path: 'subscriptions',
            lazy: async () => ({ Component: (await import('./pages/Subscriptions')).Subscriptions }),
          },
          {
            path: 'subscriptions/:id',
            lazy: async () => ({
              Component: (await import('./pages/SubscriptionDetail')).SubscriptionDetail,
            }),
          },
          {
            path: 'calendar',
            lazy: async () => ({ Component: (await import('./pages/Calendar')).CalendarPage }),
          },
          {
            path: 'statistics',
            lazy: async () => ({ Component: (await import('./pages/Statistics')).Statistics }),
          },
          {
            path: 'prices',
            lazy: async () => ({ Component: (await import('./pages/PriceChanges')).PriceChanges }),
          },
          {
            path: 'savings',
            lazy: async () => ({ Component: (await import('./pages/Savings')).Savings }),
          },
          {
            path: 'notifications',
            lazy: async () => ({ Component: (await import('./pages/Notifications')).Notifications }),
          },
          {
            path: 'settings',
            lazy: async () => ({ Component: (await import('./pages/Settings')).SettingsPage }),
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
