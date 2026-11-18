import { Router } from 'express'
import { requireUser } from '../auth.ts'

/**
 * In-app notifications of the signed-in user.
 *
 * Every query runs with the user's own token (req.db), so row level security
 * already limits it to their rows: no `user_id` filter is needed, and a user
 * can never read or change someone else's notification.
 */
export const notificationsRouter = Router()
notificationsRouter.use(requireUser)

// Columns sent to the frontend, with the subscription's name and logo id.
const COLUMNS = 'id, kind, due_date, notify_on, data, read_at, created_at, subscription:subscriptions(id, name, service_id)'

// GET /api/notifications?unread=true  ->  { notifications, unreadCount }
notificationsRouter.get('/', async (req, res) => {
  let query = req.db!.from('notifications').select(COLUMNS).order('notify_on', { ascending: false }).order('id', { ascending: false }).limit(100)
  if (req.query.unread === 'true') query = query.is('read_at', null)

  const { data, error } = await query
  if (error) throw error

  const unread = await req.db!.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
  if (unread.error) throw unread.error

  res.json({ notifications: data.map(toApi), unreadCount: unread.count ?? 0 })
})

// PATCH /api/notifications/read-all  ->  { updated }
// (Declared before /:id/read so "read-all" is never taken for an id.)
notificationsRouter.patch('/read-all', async (req, res) => {
  const { data, error } = await req.db!
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .select('id')
  if (error) throw error

  res.json({ updated: data.length })
})

// PATCH /api/notifications/:id/read  ->  the updated notification
notificationsRouter.patch('/:id/read', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid notification id' })

  const { data, error } = await req.db!
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLUMNS)
    .maybeSingle()
  if (error) throw error
  // Missing, or someone else's (RLS hides it): both are simply "not found".
  if (!data) return res.status(404).json({ error: 'notification not found' })

  res.json(toApi(data))
})

/** Database row (snake_case) -> API shape (camelCase, like the frontend types). */
function toApi(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    dueDate: row.due_date,
    notifyOn: row.notify_on,
    data: row.data,
    read: row.read_at !== null,
    readAt: row.read_at,
    createdAt: row.created_at,
    subscription: row.subscription && {
      id: row.subscription.id,
      name: row.subscription.name,
      serviceId: row.subscription.service_id,
    },
  }
}
