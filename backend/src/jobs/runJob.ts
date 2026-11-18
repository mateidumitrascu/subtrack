import { adminClient } from '../supabase.ts'

/** A background job. `run` returns how many notifications it created. */
export interface Job {
  name: string
  run: () => Promise<number>
}

const MAX_ATTEMPTS = 3
const FIRST_RETRY_DELAY_MS = 5_000 // then 10 s, 20 s...

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs a job, retrying it if it fails, and records the run in `job_runs`.
 *
 * Retrying is safe because every job is idempotent: a notification that
 * already exists is skipped by the database (unique dedup_key), so an attempt
 * that half-succeeded before failing does not cause duplicates.
 */
export async function runJob(job: Job): Promise<void> {
  const logId = await startLog(job.name)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const created = await job.run()
      console.log(`[job] ${job.name}: created ${created} (attempt ${attempt})`)
      await finishLog(logId, { status: 'succeeded', attempts: attempt, created_count: created })
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[job] ${job.name}: attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`)

      if (attempt === MAX_ATTEMPTS) {
        await finishLog(logId, { status: 'failed', attempts: attempt, error: message })
        return
      }
      await sleep(FIRST_RETRY_DELAY_MS * 2 ** (attempt - 1))
    }
  }
}

// Logging must never stop a job from running, so these only print on failure.

async function startLog(jobName: string): Promise<number | null> {
  const { data, error } = await adminClient.from('job_runs').insert({ job_name: jobName }).select('id').single()
  if (error) console.error(`[job] ${jobName}: could not write job_runs: ${error.message}`)
  return data?.id ?? null
}

async function finishLog(
  logId: number | null,
  result: { status: 'succeeded' | 'failed'; attempts: number; created_count?: number; error?: string },
) {
  if (logId === null) return
  const { error } = await adminClient
    .from('job_runs')
    .update({ ...result, finished_at: new Date().toISOString() })
    .eq('id', logId)
  if (error) console.error(`[job] could not update job_runs ${logId}: ${error.message}`)
}
