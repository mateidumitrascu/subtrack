import { createClient } from '@supabase/supabase-js'
import { config } from './config.ts'

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/**
 * Client acting AS the signed-in user: row level security applies and the
 * RPCs see auth.uid(). Create one per request from the Bearer token.
 */
export function userClient(accessToken: string) {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    ...noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Admin client: BYPASSES row level security and has no auth.uid().
 * Only for trusted background jobs (scheduler, email sender). Never use it to
 * answer a user request directly.
 */
export const adminClient = createClient(config.supabaseUrl, config.supabaseSecretKey, noSession)
