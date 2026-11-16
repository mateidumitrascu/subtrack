import { ArrowLeft, MagnifyingGlass, PlusCircle } from '@phosphor-icons/react'
import { addMonths } from 'date-fns'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useToday } from '../hooks'
import { useI18n } from '../i18n'
import { CATALOG, getService, POPULAR_IDS, type CatalogService } from '../lib/catalog'
import { toISO } from '../lib/dates'
import { currentTerms, effectiveStatus } from '../lib/schedule'
import {
  CATEGORIES,
  CURRENCIES,
  CYCLES,
  REMINDER_OPTIONS,
  USAGES,
  type CategoryId,
  type Currency,
  type Cycle,
  type Subscription,
  type Usage,
} from '../lib/types'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'
import { ServiceLogo } from './ServiceLogo'
import { Button } from './ui/Button'
import { Sheet } from './ui/Dialog'
import { describedBy, Field, Input, Select, Textarea } from './ui/Field'
import { Segmented } from './ui/Segmented'
import { Switch } from './ui/Switch'

interface FormState {
  serviceId?: string
  name: string
  plan: string
  price: string
  currency: Currency
  cycle: Cycle
  nextDate: string
  isTrial: boolean
  category: CategoryId
  paymentMethod: string
  reminderDays: number
  usage: Usage
  notes: string
}

type Errors = Partial<Record<'name' | 'price' | 'nextDate', string>>

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const parsePrice = (raw: string) => Number(raw.trim().replace(/\s/g, '').replace(',', '.'))

const priceText = (n: number, lang: 'ro' | 'en') =>
  lang === 'ro' ? String(n).replace('.', ',') : String(n)

/** The add / edit drawer, mounted once at the app root. */
export function SubscriptionSheet() {
  const formOpen = useUI((s) => s.formOpen)
  const editingId = useUI((s) => s.editingId)
  const closeForm = useUI((s) => s.closeForm)
  const sub = useStore((s) => s.subscriptions.find((x) => x.id === editingId))
  const { t } = useI18n()
  const editing = Boolean(editingId && sub)

  return (
    <Sheet
      open={formOpen}
      onClose={closeForm}
      title={editing ? t.form.editTitle : t.form.addTitle}
    >
      <SubscriptionForm key={editingId ?? 'new'} sub={editing ? sub : undefined} onDone={closeForm} />
    </Sheet>
  )
}

function SubscriptionForm({ sub, onDone }: { sub?: Subscription; onDone: () => void }) {
  const { t, lang } = useI18n()
  const today = useToday()
  const settings = useStore((s) => s.settings)
  const add = useStore((s) => s.addSubscription)
  const update = useStore((s) => s.updateSubscription)
  const toast = useUI((s) => s.toast)
  const navigate = useNavigate()

  const initial = useMemo<FormState>(() => {
    if (sub) {
      const terms = currentTerms(sub, today)
      const trial = effectiveStatus(sub, today) === 'trial'
      return {
        serviceId: sub.serviceId,
        name: sub.name,
        plan: sub.plan ?? '',
        price: priceText(terms.price, lang),
        currency: sub.currency,
        cycle: terms.cycle,
        nextDate:
          trial && sub.trialEndsAt ? sub.trialEndsAt : toISO(terms.next ?? addMonths(today, 1)),
        isTrial: trial,
        category: sub.category,
        paymentMethod: sub.paymentMethod ?? '',
        reminderDays: sub.reminderDays,
        usage: sub.usage,
        notes: sub.notes ?? '',
      }
    }
    return {
      name: '',
      plan: '',
      price: '',
      currency: settings.baseCurrency,
      cycle: 'monthly',
      nextDate: toISO(addMonths(today, 1)),
      isTrial: false,
      category: 'other',
      paymentMethod: '',
      reminderDays: settings.defaultReminderDays,
      usage: 'weekly',
      notes: '',
    }
  }, [sub, today, lang, settings.baseCurrency, settings.defaultReminderDays])

  const [step, setStep] = useState<'pick' | 'details'>(sub ? 'details' : 'pick')
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [query, setQuery] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const stepChanged = useRef(false)

  // Move focus into the details step after a service is picked.
  useEffect(() => {
    if (!stepChanged.current) {
      stepChanged.current = true
      return
    }
    if (step === 'details') formRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [step])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (submitted) setErrors(validate(next))
  }

  const validate = (f: FormState): Errors => {
    const e: Errors = {}
    if (!f.name.trim()) e.name = t.form.errName
    const price = parsePrice(f.price)
    if (f.price.trim() === '' || !Number.isFinite(price) || price < 0) e.price = t.form.errPrice
    if (!f.nextDate) e.nextDate = t.form.errDate
    else if (f.nextDate < toISO(today)) e.nextDate = t.form.errDatePast
    return e
  }

  const pick = (service?: CatalogService, name?: string) => {
    if (service) {
      setForm({
        ...form,
        serviceId: service.id,
        name: service.name,
        plan: service.defaults.plan ?? '',
        price: priceText(service.defaults.price, lang),
        currency: service.defaults.currency,
        cycle: service.defaults.cycle,
        category: service.category,
      })
    } else {
      setForm({ ...form, serviceId: undefined, name: name ?? '', plan: '', price: '' })
    }
    setStep('details')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(form)
    setErrors(found)
    const firstInvalid = (['name', 'price', 'nextDate'] as const).find((k) => found[k])
    if (firstInvalid) {
      document.getElementById(`f-${firstInvalid}`)?.focus()
      return
    }
    const input = {
      serviceId: form.serviceId,
      name: form.name,
      plan: form.plan,
      price: Math.round(parsePrice(form.price) * 100) / 100,
      currency: form.currency,
      cycle: form.cycle,
      nextDate: form.nextDate,
      isTrial: form.isTrial,
      category: form.category,
      paymentMethod: form.paymentMethod,
      reminderDays: form.reminderDays,
      usage: form.usage,
      notes: form.notes,
    }
    if (sub) {
      update(sub.id, input)
      toast({ message: t.detail.toastSaved, tone: 'good' })
    } else {
      const id = add(input)
      toast({
        message: t.detail.toastAdded(input.name.trim()),
        tone: 'good',
        action: { label: t.common.view, run: () => navigate(`/app/subscriptions/${id}`) },
      })
    }
    onDone()
  }

  if (step === 'pick') {
    const q = normalize(query.trim())
    const results = q
      ? CATALOG.filter((s) => normalize(s.name).includes(q))
      : POPULAR_IDS.map((id) => getService(id)).filter((s): s is CatalogService => Boolean(s))
    return (
      <div className="p-5">
        <label htmlFor="service-search" className="sr-only">
          {t.form.searchService}
        </label>
        <div className="relative">
          <MagnifyingGlass
            size={16}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-3"
          />
          <Input
            id="service-search"
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.form.searchService}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        <h3 className="mt-6 mb-3 text-[13px] font-medium text-fg-2">
          {q ? t.form.results : t.form.popular}
        </h3>
        {results.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <ServiceLogo serviceId={s.id} name={s.name} size={30} />
                  <span className="min-w-0 truncate text-sm font-medium text-fg">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[10px] bg-surface-2 px-4 py-3 text-sm text-fg-2">
            {t.form.noServiceMatch}
          </p>
        )}

        <button
          type="button"
          onClick={() => pick(undefined, query.trim())}
          className="mt-4 flex w-full items-center gap-3 rounded-[10px] border border-dashed border-line-strong p-3 text-left transition-colors hover:bg-surface-2"
        >
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-surface-2 text-fg-2">
            <PlusCircle size={18} weight="bold" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-medium text-fg">{t.form.customService}</span>
            <span className="block text-[13px] text-fg-3">{t.form.customHint}</span>
          </span>
        </button>
      </div>
    )
  }

  const priceChanged = sub && parsePrice(form.price) !== parsePrice(initial.price)
  const dateLabel = form.isTrial ? t.form.trialEnd : t.form.nextDate

  return (
    <form
      ref={formRef}
      id="subscription-form"
      noValidate
      onSubmit={onSubmit}
      className="flex min-h-full flex-col"
    >
      <div className="flex flex-1 flex-col gap-5 p-5">
        {!sub && (
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-surface-2 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <ServiceLogo serviceId={form.serviceId} name={form.name || '?'} size={30} />
              <span className="truncate text-sm font-medium text-fg">
                {form.name || t.form.customService}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setStep('pick')}>
              <ArrowLeft size={14} weight="bold" aria-hidden />
              {t.form.changeService}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="f-name" label={t.form.name} error={errors.name}>
            <Input
              id="f-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              invalid={Boolean(errors.name)}
              autoComplete="off"
              data-autofocus={sub || !form.serviceId ? true : undefined}
              {...describedBy('f-name', errors.name)}
            />
          </Field>
          <Field id="f-plan" label={t.form.plan} optional={t.form.optional}>
            <Input
              id="f-plan"
              value={form.plan}
              onChange={(e) => set('plan', e.target.value)}
              placeholder={t.form.planPlaceholder}
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
          <Field
            id="f-price"
            label={t.form.price}
            error={errors.price}
            hint={priceChanged ? t.form.priceChangeHint : undefined}
          >
            <Input
              id="f-price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder={lang === 'ro' ? '25,99' : '25.99'}
              invalid={Boolean(errors.price)}
              autoComplete="off"
              className="tabular"
              data-autofocus={form.serviceId && !sub ? true : undefined}
              {...describedBy('f-price', errors.price, priceChanged ? 'hint' : undefined)}
            />
          </Field>
          <Field id="f-currency" label={t.form.currency}>
            <Select
              id="f-currency"
              value={form.currency}
              onChange={(e) => set('currency', e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="f-cycle-label" className="text-[13px] font-medium text-fg-2">
            {t.form.cycle}
          </span>
          <Segmented
            label={t.form.cycle}
            block
            value={form.cycle}
            onChange={(v) => set('cycle', v)}
            options={CYCLES.map((c) => ({ value: c, label: t.cycle[c] }))}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-[10px] border border-line p-3.5">
          <div>
            <p id="f-trial-label" className="text-sm font-medium text-fg">
              {t.form.isTrial}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-fg-3">{t.form.isTrialHint}</p>
          </div>
          <Switch
            checked={form.isTrial}
            onChange={(v) => set('isTrial', v)}
            labelledBy="f-trial-label"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="f-nextDate" label={dateLabel} error={errors.nextDate}>
            <Input
              id="f-nextDate"
              type="date"
              min={toISO(today)}
              value={form.nextDate}
              onChange={(e) => set('nextDate', e.target.value)}
              invalid={Boolean(errors.nextDate)}
              {...describedBy('f-nextDate', errors.nextDate)}
            />
          </Field>
          <Field id="f-category" label={t.form.category}>
            <Select
              id="f-category"
              value={form.category}
              onChange={(e) => set('category', e.target.value as CategoryId)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.category[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field id="f-payment" label={t.form.paymentMethod} optional={t.form.optional}>
          <Input
            id="f-payment"
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value)}
            placeholder={t.form.paymentPlaceholder}
            autoComplete="off"
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg-2">{t.form.reminder}</span>
          <Segmented
            label={t.form.reminder}
            block
            value={form.reminderDays}
            onChange={(v) => set('reminderDays', v)}
            options={REMINDER_OPTIONS.map((n) => ({ value: n, label: t.form.reminderOption(n) }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg-2">{t.form.usage}</span>
          <Segmented
            label={t.form.usage}
            block
            value={form.usage}
            onChange={(v) => set('usage', v)}
            options={USAGES.map((u) => ({ value: u, label: t.usage[u] }))}
          />
          <p className="text-[13px] text-fg-3">{t.form.usageHint}</p>
        </div>

        <Field id="f-notes" label={t.form.notes} optional={t.form.optional}>
          <Textarea
            id="f-notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
          />
        </Field>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-4">
        <Button variant="secondary" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button type="submit" variant="primary">
          {sub ? t.form.submitEdit : t.form.submitAdd}
        </Button>
      </div>
    </form>
  )
}
