import { ArrowCounterClockwise, DownloadSimple, Trash } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, PageHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Dialog'
import { describedBy, Field, Input } from '../components/ui/Field'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { useDocumentTitle, useFormat } from '../hooks'
import { toISO, today } from '@subtrack/shared/dates'
import { CURRENCIES, REMINDER_OPTIONS, type Rates } from '@subtrack/shared/types'
import { useStore } from '../store/store'
import { useUI } from '../store/ui'

export function SettingsPage() {
  const { t, lang } = useFormat()
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const resetDemo = useStore((s) => s.resetDemo)
  const clearAll = useStore((s) => s.clearAll)
  const toast = useUI((s) => s.toast)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)
  useDocumentTitle(t.settings.title)

  const exportData = () => {
    const { subscriptions, settings: s } = useStore.getState()
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: s, subscriptions }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subtrack-${toISO(today())}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ message: t.settings.toastExported, tone: 'good' })
  }

  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.subtitle} />

      <div className="grid max-w-3xl gap-4">
        <Card aria-labelledby="set-profile">
          <CardHeader id="set-profile" title={t.settings.profile} />
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <TextSetting
              key={`name-${settings.userName}`}
              id="set-name"
              label={t.settings.name}
              value={settings.userName}
              onCommit={(v) => update({ userName: v })}
            />
            <TextSetting
              key={`email-${settings.userEmail}`}
              id="set-email"
              label={t.settings.email}
              type="email"
              value={settings.userEmail}
              onCommit={(v) => update({ userEmail: v })}
            />
          </div>
        </Card>

        <Card aria-labelledby="set-prefs">
          <CardHeader id="set-prefs" title={t.settings.prefs} />
          <div className="divide-y divide-line px-5 pb-1">
            <Row label={t.settings.language}>
              <Segmented
                label={t.settings.language}
                value={lang}
                onChange={(v) => update({ lang: v })}
                options={[
                  { value: 'ro', label: 'Română' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Row>
            <Row label={t.settings.theme}>
              <Segmented
                label={t.settings.theme}
                value={settings.theme}
                onChange={(v) => update({ theme: v })}
                options={[
                  { value: 'system', label: t.settings.themeSystem },
                  { value: 'light', label: t.settings.themeLight },
                  { value: 'dark', label: t.settings.themeDark },
                ]}
              />
            </Row>
            <Row label={t.settings.baseCurrency} hint={t.settings.baseCurrencyHint}>
              <Segmented
                label={t.settings.baseCurrency}
                value={settings.baseCurrency}
                onChange={(v) => update({ baseCurrency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </Row>
            <Row label={t.settings.rates} hint={t.settings.ratesHint}>
              <div className="flex gap-3">
                {(['EUR', 'USD'] as const).map((cur) => (
                  <RateSetting
                    key={`${cur}-${settings.rates[cur]}-${lang}`}
                    currency={cur}
                    rates={settings.rates}
                    onCommit={(rates) => update({ rates })}
                  />
                ))}
              </div>
            </Row>
            <Row label={t.settings.student} hint={t.settings.studentHint} labelId="set-student">
              <Switch
                checked={settings.isStudent}
                onChange={(v) => update({ isStudent: v })}
                labelledBy="set-student"
              />
            </Row>
          </div>
        </Card>

        <Card aria-labelledby="set-notif">
          <CardHeader id="set-notif" title={t.settings.notif} description={t.settings.channelsNote} />
          <div className="divide-y divide-line px-5 pb-1">
            <Row label={t.settings.defaultReminder}>
              <Segmented
                label={t.settings.defaultReminder}
                value={settings.defaultReminderDays}
                onChange={(v) => update({ defaultReminderDays: v })}
                options={REMINDER_OPTIONS.map((n) => ({ value: n, label: t.form.reminderOption(n) }))}
              />
            </Row>
            <Row label={t.settings.inApp} hint={t.settings.inAppHint} labelId="set-inapp">
              <Switch checked onChange={() => {}} disabled labelledBy="set-inapp" />
            </Row>
            <Row label={t.settings.emailChannel} hint={t.settings.emailHint} labelId="set-ch-email">
              <Switch
                checked={settings.channels.email}
                onChange={(v) => update({ channels: { ...settings.channels, email: v } })}
                labelledBy="set-ch-email"
              />
            </Row>
            <Row label={t.settings.push} hint={t.settings.pushHint} labelId="set-ch-push">
              <Switch
                checked={settings.channels.push}
                onChange={(v) => update({ channels: { ...settings.channels, push: v } })}
                labelledBy="set-ch-push"
              />
            </Row>
            <Row label={t.settings.digest} hint={t.settings.digestHint} labelId="set-ch-digest">
              <Switch
                checked={settings.channels.digest}
                onChange={(v) => update({ channels: { ...settings.channels, digest: v } })}
                labelledBy="set-ch-digest"
              />
            </Row>
          </div>
        </Card>

        <Card aria-labelledby="set-data">
          <CardHeader id="set-data" title={t.settings.data} description={t.settings.storage} />
          <div className="flex flex-wrap gap-2 p-5">
            <Button variant="secondary" onClick={exportData}>
              <DownloadSimple size={16} weight="bold" aria-hidden />
              {t.settings.export}
            </Button>
            <Button variant="secondary" onClick={() => setConfirm('reset')}>
              <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
              {t.settings.reset}
            </Button>
            <Button variant="ghostDanger" onClick={() => setConfirm('clear')}>
              <Trash size={16} weight="bold" aria-hidden />
              {t.settings.clear}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title={t.settings.resetTitle}
        description={t.settings.resetBody}
        confirmLabel={t.settings.reset}
        tone="primary"
        onConfirm={() => {
          resetDemo()
          toast({ message: t.settings.toastReset, tone: 'good' })
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        title={t.settings.clearTitle}
        description={t.settings.clearBody}
        confirmLabel={t.settings.clear}
        onConfirm={() => {
          clearAll()
          toast({ message: t.settings.toastCleared })
        }}
      />
    </>
  )
}

function Row({
  label,
  hint,
  labelId,
  children,
}: {
  label: string
  hint?: string
  labelId?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-fg">
          {label}
        </p>
        {hint && <p className="mt-0.5 text-[13px] leading-snug text-fg-3">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function TextSetting({
  id,
  label,
  value,
  type = 'text',
  onCommit,
}: {
  id: string
  label: string
  value: string
  type?: string
  onCommit: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft !== value && onCommit(draft.trim())}
      />
    </Field>
  )
}

function RateSetting({
  currency,
  rates,
  onCommit,
}: {
  currency: 'EUR' | 'USD'
  rates: Rates
  onCommit: (rates: Rates) => void
}) {
  const { t, lang } = useFormat()
  const [draft, setDraft] = useState(String(rates[currency]).replace('.', lang === 'ro' ? ',' : '.'))
  const [error, setError] = useState<string>()
  const id = `rate-${currency}`
  const commit = () => {
    const value = Number(draft.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError(t.settings.errRate)
      return
    }
    setError(undefined)
    if (value !== rates[currency]) onCommit({ ...rates, [currency]: value })
  }
  return (
    <Field id={id} label={`1 ${currency}`} error={error} className="w-32">
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          invalid={Boolean(error)}
          className="pr-9 tabular"
          {...describedBy(id, error)}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-fg-3">
          lei
        </span>
      </div>
    </Field>
  )
}
