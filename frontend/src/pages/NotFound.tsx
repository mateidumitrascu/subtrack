import { Compass } from '@phosphor-icons/react'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useI18n } from '../i18n'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4">
      <EmptyState
        icon={<Compass size={22} weight="bold" />}
        title="404"
        body={t.detail.notFound}
        actions={
          <ButtonLink to="/app" variant="primary">
            {t.common.openDemo}
          </ButtonLink>
        }
      />
    </div>
  )
}
