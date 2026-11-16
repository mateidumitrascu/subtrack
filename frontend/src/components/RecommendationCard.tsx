import {
  ArrowDown,
  CalendarCheck,
  Clock,
  Copy,
  Hourglass,
  PiggyBank,
  Student,
  type Icon,
} from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useFormat } from '../hooks'
import type { RecKind, Recommendation } from '../lib/recommendations'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'
import { useRecommendationText } from './RecommendationText'
import { ServiceLogo } from './ServiceLogo'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

const KIND_ICON: Record<RecKind, Icon> = {
  trial: Hourglass,
  duplicate: Copy,
  unused: Clock,
  student: Student,
  annual: CalendarCheck,
  downgrade: ArrowDown,
}

export function RecommendationCard({ rec, compact }: { rec: Recommendation; compact?: boolean }) {
  const f = useFormat()
  const { t } = f
  const text = useRecommendationText(rec)
  const apply = useStore((s) => s.applyRecommendation)
  const dismiss = useStore((s) => s.dismissRecommendation)
  const restore = useStore((s) => s.restoreSubscription)
  const toast = useUI((s) => s.toast)
  const KindIcon = KIND_ICON[rec.kind]

  const onApply = () => {
    const before = structuredClone(rec.sub)
    apply(rec)
    toast({
      message: t.savings.applied(rec.sub.name),
      tone: 'good',
      action: { label: t.common.undo, run: () => restore(before) },
    })
  }

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <ServiceLogo serviceId={rec.sub.serviceId} name={rec.sub.name} size={compact ? 36 : 40} />
          <span className="absolute -right-1.5 -bottom-1.5 grid h-5 w-5 place-items-center rounded-full bg-surface text-fg-2 shadow-sm ring-1 ring-line">
            <KindIcon size={11} weight="bold" aria-hidden />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-snug font-semibold text-fg">{text.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-fg-2">{text.body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Badge tone="good" icon={<PiggyBank size={13} weight="bold" aria-hidden />}>
          {t.savings.saves(f.baseMoney(rec.monthlySavings))}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => dismiss(rec.id)}>
            {t.savings.dismiss}
          </Button>
          <Button size="sm" variant="primary" onClick={onApply}>
            {text.action}
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
