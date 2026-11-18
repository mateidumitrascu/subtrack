# Subtrack backend

Node + TypeScript + Express. Node runs the `.ts` files directly, so there is no build step.

## Run it locally

```bash
npx supabase start            # local database (needs Docker Desktop running)
cp backend/.env.example backend/.env   # then fill in the values from `npx supabase status`
npm run dev:backend           # http://localhost:3000, restarts on save
```

## API

Every `/api/notifications` request needs the user's Supabase access token:
`Authorization: Bearer <session.access_token>`.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/health` | `{ ok, services }` (no token needed) |
| GET | `/api/notifications` | `{ notifications, unreadCount }`, newest first (max 100). `?unread=true` for unread only |
| PATCH | `/api/notifications/{id}/read` | the updated notification, or 404 |
| PATCH | `/api/notifications/read-all` | `{ updated }` |

A notification:

```json
{
  "id": 4,
  "kind": "renewal",
  "dueDate": "2026-11-20",
  "notifyOn": "2026-11-17",
  "data": { "amount": 49.99, "currency": "RON" },
  "read": false,
  "readAt": null,
  "createdAt": "2026-11-18T14:05:30.182Z",
  "subscription": { "id": "ce33828a-…", "name": "Netflix", "serviceId": "netflix" }
}
```

## Background jobs

`src/scheduler.ts` runs the jobs every hour and once at startup.
`src/jobs/runJob.ts` retries a failed job up to 3 times and logs every run in the `job_runs` table.

| Job | What it does |
|---|---|
| `renewal-reminders` | Creates a `renewal` notification `reminder_days` (1, 3 or 7) before each payment of an active subscription |

Jobs never create the same notification twice: each one has a `dedup_key`
(e.g. `renewal:<subscription id>:2026-11-20`) that is unique per user in the
database. Running a job again, or twice at the same time, is always safe.
