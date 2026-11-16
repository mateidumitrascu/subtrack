-- =============================================================================
-- Subtrack: row level security and grants
--
-- Model: every user-owned row carries user_id; a signed-in user can only see
-- and change their own rows. The catalog is public and read-only.
-- Always call the API with the USER's JWT (supabase-js does this after sign-in).
-- The service_role key bypasses RLS and has no auth.uid(), so it is only for
-- trusted server jobs (cron, Edge Functions doing admin work).
-- =============================================================================

alter table public.profiles                  enable row level security;
alter table public.services                  enable row level security;
alter table public.service_offers            enable row level security;
alter table public.subscriptions             enable row level security;
alter table public.schedule_segments         enable row level security;
alter table public.price_points              enable row level security;
alter table public.pauses                    enable row level security;
alter table public.notification_reads        enable row level security;
alter table public.dismissed_recommendations enable row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- (select auth.uid()) is evaluated once per statement instead of once per row.
-- -----------------------------------------------------------------------------

-- profiles: read + update own row. Inserted by the auth trigger, deleted with the auth user.
create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- catalog: readable by everyone (the landing page and sign-up flow too).
create policy "services: public read"
  on public.services for select to anon, authenticated
  using (true);

create policy "service_offers: public read"
  on public.service_offers for select to anon, authenticated
  using (true);

-- user-owned tables: full CRUD on own rows.
create policy "subscriptions: owner has full access"
  on public.subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "schedule_segments: owner has full access"
  on public.schedule_segments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "price_points: owner has full access"
  on public.price_points for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "pauses: owner has full access"
  on public.pauses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notification_reads: owner has full access"
  on public.notification_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "dismissed_recommendations: owner has full access"
  on public.dismissed_recommendations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.services, public.service_offers to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (
  display_name, lang, base_currency, rate_eur, rate_usd, default_reminder_days,
  notify_email, notify_push, notify_digest, is_student, timezone
) on public.profiles to authenticated;

grant select, insert, update, delete on
  public.subscriptions,
  public.schedule_segments,
  public.price_points,
  public.pauses,
  public.notification_reads,
  public.dismissed_recommendations
to authenticated;

grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;

-- New functions in public are not auto-granted to the API roles. (PUBLIC keeps
-- EXECUTE by Postgres' global default, so every function migration also ends
-- with an explicit revoke + grant.)
alter default privileges in schema public revoke execute on functions from anon, authenticated;
