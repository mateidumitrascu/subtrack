import type { NextFunction, Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { userClient } from './supabase.ts'

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string
    db?: SupabaseClient
  }
}

/** Checks the `Authorization: Bearer <jwt>` header and attaches a per-user client. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return res.status(401).json({ error: 'missing bearer token' })

  const db = userClient(token)
  const { data, error } = await db.auth.getClaims(token)
  if (error || !data?.claims.sub) return res.status(401).json({ error: 'invalid token' })

  req.userId = data.claims.sub
  req.db = db
  next()
}
