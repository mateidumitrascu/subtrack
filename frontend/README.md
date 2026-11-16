# Subtrack: subscription tracker (demo frontend)

Demo frontend for the team project: an app for managing recurring subscriptions
(Netflix, Spotify, ...). Users add subscriptions with their cost and renewal date,
get alerts before automatic payments and before free trials end, see monthly and
yearly spending, track price changes and get tips for paying less.

"Subtrack" is the product name, used in the UI strings
(`src/i18n/*.ts`), `index.html` and the logo component.

## Run it

```bash
npm install        # run in the repo root: npm workspaces (frontend + shared)
npm run dev        # http://localhost:5173  (landing page)
                   # http://localhost:5173/app  (the app)
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Frontend unit tests (the billing / statistics / recommendation tests live in `shared/`) |
| `npm run lint` | oxlint |

No backend is needed. Everything is stored in the browser (`localStorage`).
**Settings > Reset demo data** brings back the sample account.

## What is in the demo

| Requirement | Where |
|---|---|
| Add subscriptions, costs, renewal dates | "Add subscription" drawer (service catalog with logos, or any custom service), detail page with edit / pause / cancel / delete (with undo) |
| Notifications before automatic payments | Bell in the header, Notifications page. Each subscription has its own reminder (1, 3 or 7 days before) |
| Notifications before free trials end | Trials are a status: the price is charged automatically at the trial end date, and an alert fires before it |
| Monthly and yearly spending | Overview, Statistics (monthly / yearly chart, by category, by subscription, table view), Calendar of payments |
| Price change monitoring | Editing a price records it in the price history. Prices page lists every change with its yearly impact; alerts for recent and upcoming changes |
| Cost-cutting recommendations | Savings page: trials about to convert, overlapping services (two music / video / cloud services), rarely used subscriptions, student plans, yearly billing, cheaper tier after a price increase. One click applies a tip (with undo) |

Also: Romanian and English (header toggle), light and dark theme (follows the
system by default), multi-currency (RON / EUR / USD with editable rates), responsive
layout down to phone width, JSON export.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Zustand (with
`persist`), Motion, date-fns, Phosphor icons, Simple Icons (service logos),
Geist font (self-hosted via Fontsource). Charts are hand-written SVG.

## Structure

The pure logic (no React) lives in the `@subtrack/shared` workspace package
(`../shared`), so the backend and the Supabase Edge Functions use the same code:

```
shared/src/
  types.ts            data model
  schedule.ts         charge dates, next renewal, monthly cost
  analytics.ts        totals, monthly/yearly series, categories, price changes
  recommendations.ts  savings rules
  notifications.ts    alerts derived from the data
  catalog.ts          known services (plans, student/yearly offers)
  seed.ts             demo data, generated relative to today
shared/test/          unit tests

frontend/src/
  lib/            frontend-only helpers (catalog.ts adds the Simple Icons logos, cn.ts)
  store/          Zustand stores (data + UI state)
  i18n/           ro.ts / en.ts dictionaries (same shape, type-checked)
  components/     UI primitives, charts, app shell, the subscription form
  pages/          one file per screen (lazy-loaded), plus the landing page
```

### Data model in short

- A subscription has a **schedule** (one or more segments of `{ from, start, cycle }`)
  and a **price history** (`{ date, amount }`). Every past and future charge is
  computed from these two, so statistics, the calendar and alerts always agree.
  Changing the billing cycle or the next payment date adds a segment, so past
  charges are never rewritten.
- Notifications and recommendations are **derived** from the subscriptions, not
  stored. Only "read" and "dismissed" ids are persisted.

### Connecting a backend

The store actions in `src/store/store.ts` are the only place that writes data.
Each one has a matching Supabase RPC that takes and returns the same types;
see the table in `../supabase/README.md`. Copy `.env.example` to `.env` for the
project URL and publishable key. The `@subtrack/shared` functions stay as they are.

## Notes

- Prices in the catalog, the demo subscriptions and the exchange rates are sample
  values, not live provider prices.
- In this demo, notifications are shown in the app only. The email / push toggles
  in Settings are UI only.
