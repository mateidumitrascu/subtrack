-- =============================================================================
-- Subtrack: stored notifications and the background job log
--
-- Until now notifications were only computed in the browser
-- (shared/src/notifications.ts). From here on, background jobs CREATE them as
-- rows, so they can be read on any device, emailed, and marked read/unread.
--
-- Exactly once: every notification has a dedup_key that names the event it is
-- about, e.g. 'renewal:<subscription id>:2026-12-05'. (user_id, dedup_key) is
-- unique and jobs insert with ON CONFLICT DO NOTHING, so running a job twice,
-- or two jobs at the same time, can never create a second copy.
-- The key format is the same as the frontend's notification ids.
-- =============================================================================

create type public.notification_kind as enum ('renewal', 'trial', 'price', 'budget');

create table public.notifications (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- Null for notifications that are not about one subscription (budget).
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  kind            public.notification_kind not null,
  -- Identifies the event. Unique per user: this is what prevents duplicates.
  dedup_key       text not null check (char_length(dedup_key) <= 200),
  -- The date the notification is about (payment date, trial end...).
  due_date        date,
  -- The day the user should hear about it (due_date minus the reminder days).
  notify_on       date not null,
  -- Details frozen at creation time, e.g. {"amount": 25.99, "currency": "RON"}.
  data            jsonb not null default '{}',
  -- Null = unread.
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, dedup_key)
);

comment on table public.notifications is 'Notifications created by background jobs. One row per event, guaranteed by unique (user_id, dedup_key).';

-- The list endpoint reads a user's newest notifications first.
create index notifications_user_id_notify_on_idx on public.notifications (user_id, notify_on desc);
create index notifications_subscription_id_idx on public.notifications (subscription_id);

-- One row per execution of a background job: when it ran, how it ended, and
-- how many notifications it created. Only the backend (service_role) uses it.
create table public.job_runs (
  id            bigint generated always as identity primary key,
  job_name      text not null,
  status        text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  attempts      smallint not null default 0,
  created_count integer,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index job_runs_job_name_started_at_idx on public.job_runs (job_name, started_at desc);

-- -----------------------------------------------------------------------------
-- Security
-- Users can read their own notifications and change ONLY read_at.
-- Only jobs (service_role) create notifications. job_runs is backend-only:
-- RLS is on with no policies, so the API roles see nothing.
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.job_runs      enable row level security;

create policy "notifications: owner can read"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: owner can mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Supabase grants everything on new tables to the API roles by default.
revoke all on public.notifications, public.job_runs from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications, public.job_runs to service_role;

-- -----------------------------------------------------------------------------
-- Job: payment reminders
--
-- For every active subscription, creates a 'renewal' notification for each
-- charge in the next reminder_days days (1, 3 or 7, the user's choice), so
-- the notification appears reminder_days before the payment.
-- "Today" is worked out per user from their profile time zone.
--
-- Safe to run as often as we like: existing notifications are skipped.
-- Charges that are already due today are still covered, so if the job was
-- down for a while it catches up on the next run.
-- Returns how many NEW notifications were created.
-- p_now exists so tests can pretend it is another day.
-- -----------------------------------------------------------------------------
create function public.generate_renewal_notifications(p_now timestamptz default now())
returns integer
language plpgsql
set search_path = ''
as $$
declare
  created integer;
begin
  insert into public.notifications (user_id, subscription_id, kind, dedup_key, due_date, notify_on, data)
  select s.user_id,
         s.id,
         'renewal',
         format('renewal:%s:%s', s.id, charge.due_date),
         charge.due_date,
         charge.due_date - s.reminder_days,
         jsonb_build_object('amount', public.price_at(s.id, charge.due_date), 'currency', s.currency)
  from public.subscriptions s
  join public.profiles p on p.id = s.user_id
  cross join lateral (select (p_now at time zone p.timezone)::date as today) local
  cross join lateral public.charge_dates(s.id, local.today, local.today + s.reminder_days) as charge(due_date)
  where public.effective_status(s.status, s.trial_ends_at, local.today) = 'active'
  on conflict (user_id, dedup_key) do nothing;

  get diagnostics created = row_count;
  return created;
end;
$$;

comment on function public.generate_renewal_notifications(timestamptz) is 'Background job: creates payment reminders. Idempotent. service_role only.';

revoke execute on function public.generate_renewal_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.generate_renewal_notifications(timestamptz) to service_role;
