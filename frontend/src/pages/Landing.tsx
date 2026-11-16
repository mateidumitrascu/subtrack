import { ArrowRight, Bell } from '@phosphor-icons/react'
import { addDays } from 'date-fns'
import { motion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { ColumnChart } from '../components/charts/ColumnChart'
import { PriceChart } from '../components/charts/PriceChart'
import { LangToggle, Logo, ThemeToggle } from '../components/layout/Brand'
import { useNotificationText } from '../components/NotificationItem'
import { useRecommendationText } from '../components/RecommendationText'
import { ServiceLogo } from '../components/ServiceLogo'
import { DeltaBadge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { useDocumentTitle, useFormat, useToday } from '../hooks'
import { capitalize, formatDate } from '../i18n'
import { monthSeries, priceChanges } from '../lib/analytics'
import { fromISO } from '../lib/dates'
import { formatCompact } from '../lib/money'
import { buildNotifications, type AppNotification } from '../lib/notifications'
import {
  buildRecommendations,
  potentialSavings,
  type Recommendation,
} from '../lib/recommendations'
import { chargesBetween } from '../lib/schedule'
import type { Charge } from '../lib/types'
import { cn } from '../lib/cn'
import { createSeed } from '../lib/seed'
import { useStore } from '../store/store'

const ease = [0.16, 1, 0.3, 1] as const

/** Everything shown on the landing page is computed live from the demo data set. */
function useDemoData() {
  const today = useToday()
  const settings = useStore((s) => s.settings)
  return useMemo(() => {
    const { baseCurrency: base, rates } = settings
    const subs = createSeed(today)
    const notifications = buildNotifications(subs, today, base, rates)
    const recs = buildRecommendations(subs, today, settings)
    const changes = priceChanges(subs, base, rates)
    const spotify = subs.find((s) => s.serviceId === 'spotify')
    return {
      subs,
      upcoming: chargesBetween(subs, today, addDays(today, 14), base, rates),
      months: monthSeries(subs, today, base, rates, 12),
      notifications,
      recs,
      potential: potentialSavings(recs),
      spotify,
      spotifyChange: changes.find((c) => c.sub.id === spotify?.id),
    }
  }, [today, settings])
}

export function Landing() {
  const f = useFormat()
  const { t } = f
  const demo = useDemoData()
  const today = useToday()
  useDocumentTitle(t.common.tagline)

  const alert = demo.notifications.find((n) => n.kind === 'renewal' && n.due && n.due > n.at)
  const featured: AppNotification[] = [
    demo.notifications.find((n) => n.kind === 'renewal'),
    demo.notifications.find((n) => n.kind === 'trial'),
    demo.notifications.find((n) => n.kind === 'price'),
  ].filter((n): n is AppNotification => Boolean(n))

  return (
    <div className="min-h-[100dvh] overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          <Logo />
          <nav className="ml-8 hidden items-center gap-1 md:flex" aria-label={t.common.primaryNav}>
            <a href="#functii" className="rounded-[8px] px-3 py-2 text-sm text-fg-2 hover:text-fg">
              {t.landing.navFeatures}
            </a>
            <a href="#cum" className="rounded-[8px] px-3 py-2 text-sm text-fg-2 hover:text-fg">
              {t.landing.navHow}
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            <ButtonLink to="/app" variant="primary" size="sm" className="ml-1 sm:h-10 sm:px-4 sm:text-sm">
              {t.common.openDemo}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-20 lg:grid-cols-12 lg:gap-10 lg:pt-16 lg:pb-24">
          <motion.div
            className="lg:col-span-6"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.h1
              variants={fadeUp}
              className="max-w-[16ch] text-4xl leading-[1.05] font-semibold tracking-tighter text-fg sm:text-5xl xl:text-[58px]"
            >
              {t.landing.heroTitle}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-[46ch] text-lg leading-relaxed text-fg-2">
              {t.landing.heroBody}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/app" variant="primary" size="lg" className="group">
                {t.common.openDemo}
                <ArrowRight
                  size={18}
                  weight="bold"
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </ButtonLink>
              <a
                href="#functii"
                className="inline-flex h-12 items-center rounded-[10px] border border-line-strong bg-surface px-5 text-[15px] font-medium text-fg transition-colors hover:bg-surface-2"
              >
                {t.landing.seeFeatures}
              </a>
            </motion.div>
          </motion.div>

          <div className="relative pt-14 lg:col-span-6 lg:pl-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.15 }}
              className="relative"
            >
              <UpcomingPreview upcoming={demo.upcoming} />
            </motion.div>
            {alert && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.9 }}
                className="absolute top-0 right-3 left-3 sm:right-auto sm:left-0 sm:w-[340px] lg:-left-4"
              >
                <AlertToast n={alert} />
              </motion.div>
            )}
          </div>
        </section>

        {/* Features */}
        <section id="functii" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
            <h2 className="max-w-[20ch] text-3xl leading-tight font-semibold tracking-tight text-fg md:text-[44px]">
              {t.landing.featuresTitle}
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-6">
              <Reveal className="lg:col-span-4">
                <BentoCell title={t.landing.f1Title} body={t.landing.f1Body}>
                  <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-page/60">
                    {featured.map((n) => (
                      <NotificationPreviewRow key={n.id} n={n} />
                    ))}
                  </ul>
                </BentoCell>
              </Reveal>

              <Reveal className="lg:col-span-2" delay={0.06}>
                <BentoCell title={t.landing.f2Title} body={t.landing.f2Body} className="bg-accent-soft">
                  <div className="mt-6">
                    <ColumnChart
                      bare
                      height={176}
                      data={demo.months.map((b) => ({
                        key: b.start.toISOString(),
                        label: formatDate(b.start, 'LLLLL', f.lang),
                        title: capitalize(formatDate(b.start, 'LLLL yyyy', f.lang)),
                        paid: b.paid,
                        scheduled: b.scheduled,
                      }))}
                      format={(v) => f.baseMoney(v)}
                      formatTick={(v) => formatCompact(v, f.lang)}
                      labels={{ paid: t.stats.paid, scheduled: t.stats.scheduled, total: t.common.total }}
                      ariaLabel={t.stats.monthlyChart}
                    />
                  </div>
                </BentoCell>
              </Reveal>

              <Reveal className="lg:col-span-2" delay={0.06}>
                <BentoCell title={t.landing.f3Title} body={t.landing.f3Body}>
                  {demo.spotify && (
                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-fg">
                          <ServiceLogo serviceId="spotify" name="Spotify" size={24} />
                          Spotify
                        </span>
                        {demo.spotifyChange && <DeltaBadge pct={demo.spotifyChange.pct} />}
                      </div>
                      <PriceChart
                        points={demo.spotify.priceHistory.map((p) => ({
                          date: fromISO(p.date),
                          amount: p.amount,
                        }))}
                        end={today}
                        height={150}
                        format={(v) => f.money(v, 'RON')}
                        formatTick={(v) => formatCompact(v, f.lang)}
                        formatDate={(d) => f.long(d)}
                        formatAxisDate={(d) => formatDate(d, 'yyyy', f.lang)}
                        pctLabel={(r) => f.pct(r, { sign: true })}
                        planLabel={t.detail.planChange}
                        ariaLabel={t.prices.chartLabel('Spotify')}
                      />
                    </div>
                  )}
                </BentoCell>
              </Reveal>

              <Reveal className="lg:col-span-4" delay={0.12}>
                <BentoCell title={t.landing.f4Title} body={t.landing.f4Body} className="dot-grid">
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
                    <div>
                      <p className="text-5xl font-semibold tracking-tight text-fg md:text-6xl">
                        {f.baseMoney(demo.potential, { decimals: 0 })}
                      </p>
                      <p className="mt-2 max-w-[24ch] text-[13px] text-fg-3">{t.landing.savingsLabel}</p>
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                      {[...demo.recs]
                        .sort((a, b) => b.monthlySavings - a.monthlySavings)
                        .slice(0, 3)
                        .map((r) => (
                          <RecPreviewRow key={r.id} rec={r} />
                        ))}
                    </ul>
                  </div>
                </BentoCell>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="cum" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-[44px]">
              {t.landing.howTitle}
            </h2>
            <ol className="mt-12">
              {[
                [t.landing.step1, t.landing.step1Body],
                [t.landing.step2, t.landing.step2Body],
                [t.landing.step3, t.landing.step3Body],
              ].map(([title, body], i) => (
                <Reveal as="li" key={title} delay={i * 0.06}>
                  <div className="grid grid-cols-1 gap-3 border-t border-line py-8 md:grid-cols-12 md:gap-8">
                    <p className="text-2xl font-semibold tracking-tight text-fg md:col-span-4 md:text-4xl">
                      {title}
                    </p>
                    <p className="max-w-[52ch] text-lg leading-relaxed text-fg-2 md:col-span-8">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between md:py-24">
            <div>
              <h2 className="max-w-[22ch] text-3xl leading-tight font-semibold tracking-tight text-fg md:text-[44px]">
                {t.landing.ctaTitle}
              </h2>
              <p className="mt-4 max-w-[52ch] text-lg text-fg-2">{t.landing.ctaBody(demo.subs.length)}</p>
            </div>
            <ButtonLink to="/app" variant="primary" size="lg" className="group self-start md:self-auto">
              {t.common.openDemo}
              <ArrowRight
                size={18}
                weight="bold"
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-[13px] text-fg-3">{t.landing.footer}</p>
        </div>
      </footer>
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li'
}) {
  const Tag = as === 'li' ? motion.li : motion.div
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease, delay }}
    >
      {children}
    </Tag>
  )
}

function BentoCell({
  title,
  body,
  className,
  children,
}: {
  title: string
  body: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('h-full rounded-2xl border border-line bg-surface p-6 shadow-sm md:p-7', className)}>
      <h3 className="text-xl font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-fg-2">{body}</p>
      {children}
    </div>
  )
}

function UpcomingPreview({ upcoming }: { upcoming: Charge[] }) {
  const f = useFormat()
  const { t } = f
  const rows = upcoming.slice(0, 5)
  const total = upcoming.reduce((s, c) => s + c.base, 0)
  return (
    <div className="rounded-2xl border border-line bg-surface p-2 shadow-lg">
      <div className="flex items-baseline justify-between gap-4 px-4 pt-4 pb-3">
        <div>
          <p className="text-[15px] font-semibold text-fg">{t.landing.previewTitle}</p>
          <p className="text-[13px] text-fg-3">{t.landing.previewSub}</p>
        </div>
        <p className="text-right text-xl font-semibold tracking-tight text-fg">
          {f.baseMoney(total, { decimals: 0 })}
        </p>
      </div>
      <ul className="divide-y divide-line rounded-[12px] bg-page/60">
        {rows.map((c) => {
          const isTrialEnd = c.sub.trialEndsAt && fromISO(c.sub.trialEndsAt).getTime() === c.date.getTime()
          return (
            <li key={`${c.sub.id}-${c.date.getTime()}`} className="flex items-center gap-3 px-4 py-3">
              <ServiceLogo serviceId={c.sub.serviceId} name={c.sub.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{c.sub.name}</span>
                <span className={cn('block text-[13px]', isTrialEnd ? 'text-warn-text' : 'text-fg-3')}>
                  {isTrialEnd ? `${t.status.trial}, ${f.rel(c.date)}` : capitalize(f.rel(c.date))}
                </span>
              </span>
              <span className="text-sm font-medium text-fg tabular">{f.money(c.amount, c.sub.currency)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AlertToast({ n }: { n: AppNotification }) {
  const { title, body } = useNotificationText(n)
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-3.5 shadow-lg">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
        <Bell size={18} weight="fill" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-snug font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-[13px] text-fg-2">{body}</span>
      </span>
    </div>
  )
}

function NotificationPreviewRow({ n }: { n: AppNotification }) {
  const { title, body } = useNotificationText(n)
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <ServiceLogo serviceId={n.sub.serviceId} name={n.sub.name} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{title}</span>
        <span className="block truncate text-[13px] text-fg-3">{body}</span>
      </span>
    </li>
  )
}

function RecPreviewRow({ rec }: { rec: Recommendation }) {
  const f = useFormat()
  const { title } = useRecommendationText(rec)
  return (
    <li className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3 py-2.5">
      <ServiceLogo serviceId={rec.sub.serviceId} name={rec.sub.name} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm text-fg">{title}</span>
      <span className="shrink-0 text-sm font-medium text-good-text tabular">
        {f.baseMoney(rec.monthlySavings, { decimals: 0 })}
      </span>
    </li>
  )
}
