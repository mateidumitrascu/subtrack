import { adminClient } from '../supabase.ts'
import type { Job } from './runJob.ts'

/**
 * Payment reminders. All the logic (which payments, when, no duplicates) is in
 * the SQL function generate_renewal_notifications(), next to the data.
 */
export const renewalReminders: Job = {
  name: 'renewal-reminders',
  async run() {
    const { data, error } = await adminClient.rpc('generate_renewal_notifications')
    if (error) throw new Error(error.message)
    return data as number
  },
}
