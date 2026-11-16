import { useFormat, useToday } from '../hooks'
import type { Recommendation } from '@subtrack/shared/recommendations'
import { currentTerms } from '@subtrack/shared/schedule'

/** Localized title, body and action label for a recommendation. */
export function useRecommendationText(rec: Recommendation) {
  const f = useFormat()
  const today = useToday()
  const { t } = f
  const sub = rec.sub
  const terms = currentTerms(sub, today)
  const perCycle = (amount: number, cycle: keyof typeof t.per) =>
    `${f.money(amount, sub.currency)}/${t.per[cycle]}`

  let title = ''
  let body = ''
  switch (rec.kind) {
    case 'trial': {
      const end = rec.date ?? today
      title = t.savings.trialTitle(sub.name, f.rel(end))
      body = t.savings.trialBody(perCycle(terms.price, terms.cycle), f.short(end))
      break
    }
    case 'duplicate': {
      const keep = rec.keep?.name ?? ''
      title = t.savings.duplicateTitle(t.savings.group[rec.group ?? 'music'], keep, sub.name)
      body = t.savings.duplicateBody(keep, sub.name)
      break
    }
    case 'unused':
      title = t.savings.unusedTitle(sub.name)
      body = t.savings.unusedBody
      break
    case 'student':
      if (rec.action.type === 'switch') {
        const plan = rec.action.plan ?? ''
        title = t.savings.studentTitle(sub.name)
        body =
          rec.action.price === 0
            ? t.savings.studentFree(plan)
            : t.savings.studentBody(plan, perCycle(rec.action.price, rec.action.cycle))
      }
      break
    case 'annual':
      if (rec.action.type === 'switch') {
        title = t.savings.annualTitle(sub.name)
        body = t.savings.annualBody(
          f.money(rec.action.price, sub.currency),
          f.money(terms.price * 12, sub.currency),
        )
      }
      break
    case 'downgrade':
      if (rec.action.type === 'switch') {
        title = t.savings.downgradeTitle(sub.name, f.pct(rec.pct ?? 0))
        body = t.savings.downgradeBody(
          rec.action.plan ?? '',
          perCycle(rec.action.price, rec.action.cycle),
        )
      }
      break
  }

  const action =
    rec.action.type === 'cancel'
      ? t.savings.cancel
      : rec.kind === 'annual'
        ? t.savings.switchAnnual
        : t.savings.switchTo(rec.action.plan ?? '')

  return { title, body, action }
}

export function RecommendationText({
  rec,
  part,
}: {
  rec: Recommendation
  part: 'title' | 'body' | 'action'
}) {
  const text = useRecommendationText(rec)
  return <>{text[part]}</>
}
