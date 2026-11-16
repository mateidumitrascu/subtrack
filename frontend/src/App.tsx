import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { SubscriptionSheet } from './components/SubscriptionForm'
import { Toaster } from './components/ui/Toaster'
import { useIsDark } from './hooks'
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
      { path: '/', element: <Navigate to="/app" replace /> },
      {
        // Each screen loads on demand.
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
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
