import cron from 'node-cron'
import { renewalReminders } from './jobs/renewalReminders.ts'
import { runJob } from './jobs/runJob.ts'

/**
 * Runs the background jobs on a timer.
 *
 * Every hour, because users live in different time zones: a new day starts
 * for someone every hour. Running more often than needed is harmless, since
 * the jobs never create the same notification twice.
 */
export function startScheduler() {
  cron.schedule('0 * * * *', () => runJob(renewalReminders), {
    name: renewalReminders.name,
    noOverlap: true, // skip a tick if the previous run is still going
  })

  // Also run once at startup, so a restart does not wait up to an hour.
  void runJob(renewalReminders)

  console.log('[scheduler] started')
}
