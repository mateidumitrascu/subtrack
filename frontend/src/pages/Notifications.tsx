import { BellSlash, GearSix } from '@phosphor-icons/react'
import { useState } from 'react'
import { NotificationItem } from '../components/NotificationItem'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, PageHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Segmented } from '../components/ui/Segmented'
import { useDocumentTitle, useFormat, useNotifications } from '../hooks'
import { useStore } from '../store/store'

export function Notifications() {
  const { t } = useFormat()
  const { list, unread, unreadCount } = useNotifications()
  const markRead = useStore((s) => s.markNotificationsRead)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  useDocumentTitle(t.notif.title)

  const visible = filter === 'unread' ? list.filter(unread) : list

  return (
    <>
      <PageHeader
        title={t.notif.title}
        description={t.notif.subtitle}
        actions={
          <>
            <ButtonLink to="/app/settings" variant="ghost">
              <GearSix size={16} weight="bold" aria-hidden />
              {t.notif.settings}
            </ButtonLink>
            <Button
              variant="secondary"
              disabled={unreadCount === 0}
              onClick={() => markRead(list.filter(unread).map((n) => n.id))}
            >
              {t.notif.markAll}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented
          label={t.notif.title}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t.notif.filterAll },
            { value: 'unread', label: `${t.notif.filterUnread} (${unreadCount})` },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            compact
            icon={<BellSlash size={22} weight="bold" />}
            title={filter === 'unread' ? t.notif.allRead : t.notif.empty}
          />
        ) : (
          <div className="divide-y divide-line">
            {visible.map((n) => (
              <NotificationItem key={n.id} n={n} unread={unread(n)} onOpen={() => markRead([n.id])} />
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
