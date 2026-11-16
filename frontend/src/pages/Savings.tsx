import { Info, PiggyBank } from '@phosphor-icons/react'
import { AnimatePresence } from 'motion/react'
import { RecommendationCard } from '../components/RecommendationCard'
import { Card, PageHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { useDocumentTitle, useFormat, useRecommendations } from '../hooks'
import { useStore } from '../store/store'

export function Savings() {
  const f = useFormat()
  const { t } = f
  const { recs, potential, dismissedCount } = useRecommendations()
  const restore = useStore((s) => s.restoreRecommendations)
  useDocumentTitle(t.savings.title)

  return (
    <>
      <PageHeader title={t.savings.title} description={t.savings.subtitle} />

      <Card className="dot-grid relative mb-6 overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-fg-2">{t.savings.potential}</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-5xl font-semibold tracking-tight text-fg md:text-6xl">
                {f.baseMoney(potential, { decimals: 0 })}
              </span>
              <span className="text-lg text-fg-2">{t.savings.perMonth}</span>
            </p>
            <p className="mt-2 text-sm text-good-text">
              {t.savings.perYear(f.baseMoney(potential * 12, { decimals: 0 }))}
            </p>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-fg-3">{t.savings.disclaimer}</p>
        </div>
      </Card>

      {recs.length === 0 ? (
        <Card>
          <EmptyState icon={<PiggyBank size={22} weight="bold" />} title={t.savings.empty} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {recs.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {dismissedCount > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-fg-3">
          <Info size={16} weight="bold" aria-hidden />
          {t.savings.dismissed(dismissedCount)}.
          <button
            type="button"
            onClick={restore}
            className="font-medium text-accent hover:underline"
          >
            {t.savings.restore}
          </button>
        </p>
      )}
    </>
  )
}
