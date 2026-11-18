import express from 'express'
import { config } from './config.ts'
import { requireUser } from './auth.ts'
import { adminClient } from './supabase.ts'
import { startScheduler } from './scheduler.ts'

const app = express()
app.use(express.json())

// Minimal CORS for the Vite dev server.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.frontendOrigin)
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// Liveness + database reachability (uses the catalog, which needs no user).
app.get('/api/health', async (_req, res) => {
  const { count, error } = await adminClient.from('services').select('*', { count: 'exact', head: true })
  if (error) return res.status(503).json({ ok: false, db: error.message })
  res.json({ ok: true, services: count })
})

// Smoke test for auth: who am I?
app.get('/api/me', requireUser, (req, res) => {
  res.json({ userId: req.userId })
})

app.listen(config.port, () => {
  console.log(`backend listening on http://localhost:${config.port}`)
  startScheduler()
})
