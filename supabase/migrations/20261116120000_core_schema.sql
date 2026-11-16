-- =============================================================================
-- Subtrack: core schema
--
-- Mirrors the frontend data model (shared/src/types.ts):
--   Subscription.schedule[]      -> schedule_segments
--   Subscription.priceHistory[]  -> price_points
--   Subscription.pauses[]        -> pauses
--   Settings                     -> profiles (theme stays in the browser,
--                                   e-mail comes from auth.users)
--   readNotificationIds          -> notification_reads
--   dismissedRecIds              -> dismissed_recommendations
--   CATALOG                      -> services + service_offers
--
-- Charges, statistics, notifications and recommendations are DERIVED from
-- these tables (see shared/src and the billing functions migration); they are
-- not stored.
-- =============================================================================

-- Internal helpers live here. This schema is not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enum types (keep in sync with shared/src/types.ts)
-- -----------------------------------------------------------------------------
create type public.currency_code       as enum ('RON', 'EUR', 'USD');
create type public.billing_cycle       as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type public.subscription_status as enum ('active', 'trial', 'paused', 'cancelled');
create type public.service_category    as enum ('video', 'music', 'software', 'cloud', 'gaming', 'education', 'fitness', 'other');
create type public.usage_frequency     as enum ('daily', 'weekly', 'monthly', 'rarely');
create type public.overlap_group       as enum ('music', 'video', 'cloud');
create type public.offer_kind          as enum ('default', 'student', 'cheaper', 'annual');
create type public.app_language        as enum ('ro', 'en');

-- -----------------------------------------------------------------------------
-- Generic trigger functions
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- profiles: one row per auth user, created by a trigger on auth.users
-- =============================================================================
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text check (char_length(display_name) <= 100),
  lang                  public.app_language  not null default 'ro',
  base_currency         public.currency_code not null default 'RON',
  -- Lei (RON) for one unit of the foreign currency, editable by the user.
  rate_eur              numeric(12, 4) not null default 5.08 check (rate_eur > 0),
  rate_usd              numeric(12, 4) not null default 4.40 check (rate_usd > 0),
  default_reminder_days smallint not null default 3 check (default_reminder_days in (1, 3, 7)),
  notify_email          boolean not null default true,
  notify_push           boolean not null default false,
  notify_digest         boolean not null default true,
  is_student            boolean not null default false,
  -- Used to work out the user's "today" on the server (cron jobs, RPC defaults).
  timezone              text not null default 'Europe/Bucharest',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings. Mirrors Settings in shared/src/types.ts (theme is client-side, email is auth.users.email).';

create function private.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function private.validate_profile_timezone();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- New auth user -> profile row. Reads optional sign-up metadata:
--   supabase.auth.signUp({ email, password, options: { data: { display_name, lang } } })
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, lang)
  values (
    new.id,
    coalesce(
      nullif(btrim(meta ->> 'display_name'), ''),
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(btrim(meta ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    case when meta ->> 'lang' in ('ro', 'en') then (meta ->> 'lang')::public.app_language else 'ro' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- =============================================================================
-- Service catalog (reference data, read-only for users)
-- =============================================================================
create table public.services (
  id           text primary key check (id ~ '^[a-z0-9-]+$'),
  name         text not null check (char_length(name) between 1 and 100),
  category     public.service_category not null,
  -- Monogram color; the frontend maps ids to Simple Icons glyphs itself.
  color        text check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- Services in the same group overlap (two music apps, two cloud drives...).
  overlap      public.overlap_group,
  -- Position in the "popular" list of the add-subscription picker (null = not listed).
  popular_rank smallint unique check (popular_rank > 0),
  created_at   timestamptz not null default now()
);

comment on table public.services is 'Known services. Mirrors CatalogService in shared/src/catalog.ts.';

create table public.service_offers (
  service_id text not null references public.services (id) on delete cascade,
  kind       public.offer_kind not null,
  -- null for 'annual': the yearly price of the default plan.
  plan       text check (char_length(plan) <= 100),
  price      numeric(12, 2) not null check (price >= 0),
  currency   public.currency_code not null,
  cycle      public.billing_cycle not null,
  primary key (service_id, kind),
  constraint service_offers_plan_required check (kind = 'annual' or plan is not null),
  constraint service_offers_annual_is_yearly check (kind <> 'annual' or cycle = 'yearly')
);

comment on table public.service_offers is 'Plans of a catalog service: default (pre-filled in the form), student, cheaper tier, and yearly price of the default plan.';

-- =============================================================================
-- Subscriptions and their history
-- =============================================================================
create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Catalog link (logo, plan alternatives). Null for custom services.
  service_id     text references public.services (id) on delete set null,
  name           text not null check (char_length(btrim(name)) between 1 and 100),
  plan           text check (char_length(plan) <= 100),
  category       public.service_category not null default 'other',
  currency       public.currency_code not null,
  status         public.subscription_status not null default 'active',
  -- Trials: the date of the first paid charge.
  trial_ends_at  date,
  -- No charges after this date.
  cancelled_at   date,
  reminder_days  smallint not null default 3 check (reminder_days in (1, 3, 7)),
  usage          public.usage_frequency not null default 'weekly',
  payment_method text check (char_length(payment_method) <= 100),
  notes          text check (char_length(notes) <= 2000),
  -- The user's calendar day when the subscription was added (Subscription.createdAt).
  created_on     date not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Target of the composite foreign keys below (keeps child rows on the same user).
  unique (id, user_id),
  constraint subscriptions_trial_has_end check (status <> 'trial' or trial_ends_at is not null),
  constraint subscriptions_cancelled_has_date check (status <> 'cancelled' or cancelled_at is not null)
);

comment on table public.subscriptions is 'One row per tracked subscription. Charges are computed from schedule_segments + price_points + pauses.';

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_service_id_idx on public.subscriptions (service_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- Billing schedule. A new segment is appended when the cycle or the next
-- payment date changes, so past charges keep their original dates.
create table public.schedule_segments (
  subscription_id uuid not null,
  user_id         uuid not null,
  -- Charges produced by earlier segments stop before this date.
  from_date       date not null,
  -- First charge of this segment; later charges repeat every `cycle`.
  start_date      date not null,
  cycle           public.billing_cycle not null,
  primary key (subscription_id, from_date),
  foreign key (subscription_id, user_id) references public.subscriptions (id, user_id) on delete cascade,
  constraint schedule_segments_start_after_from check (start_date >= from_date)
);

create index schedule_segments_user_id_idx on public.schedule_segments (user_id);

-- Price history. The amount applies to charges on or after effective_date.
create table public.price_points (
  subscription_id uuid not null,
  user_id         uuid not null,
  effective_date  date not null,
  amount          numeric(12, 2) not null check (amount >= 0),
  -- true = a change the user made (new plan / billing cycle), not a provider price change.
  is_plan_change  boolean not null default false,
  primary key (subscription_id, effective_date),
  foreign key (subscription_id, user_id) references public.subscriptions (id, user_id) on delete cascade
);

create index price_points_user_id_idx on public.price_points (user_id);

create table public.pauses (
  id              bigint generated always as identity primary key,
  subscription_id uuid not null,
  user_id         uuid not null,
  from_date       date not null,
  -- null while the pause is still running.
  to_date         date,
  foreign key (subscription_id, user_id) references public.subscriptions (id, user_id) on delete cascade,
  constraint pauses_valid_range check (to_date is null or to_date >= from_date)
);

create index pauses_subscription_id_idx on public.pauses (subscription_id);
create index pauses_user_id_idx on public.pauses (user_id);
-- At most one running pause per subscription.
create unique index pauses_one_open_per_subscription on public.pauses (subscription_id) where to_date is null;

-- Child rows always belong to the subscription's owner: user_id is copied from
-- the parent, so clients never send it. Runs with the caller's rights, so a
-- subscription the caller cannot see yields null and the insert fails.
create function private.inherit_subscription_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := (select s.user_id from public.subscriptions s where s.id = new.subscription_id);
  if new.user_id is null then
    raise exception 'subscription % not found', new.subscription_id using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger schedule_segments_inherit_user
  before insert or update of subscription_id on public.schedule_segments
  for each row execute function private.inherit_subscription_user();

create trigger price_points_inherit_user
  before insert or update of subscription_id on public.price_points
  for each row execute function private.inherit_subscription_user();

create trigger pauses_inherit_user
  before insert or update of subscription_id on public.pauses
  for each row execute function private.inherit_subscription_user();

-- Invariant from the frontend model: a subscription always has at least one
-- schedule segment and one price point. Checked at COMMIT (deferred), so the
-- parent and its first children can be inserted in any order within a transaction.
create function private.check_subscription_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sub_id uuid := case when tg_table_name = 'subscriptions' then new.id else old.subscription_id end;
begin
  if not exists (select 1 from public.subscriptions where id = sub_id) then
    return null; -- the subscription itself was deleted
  end if;
  if not exists (select 1 from public.schedule_segments where subscription_id = sub_id) then
    raise exception 'subscription % must have at least one schedule segment', sub_id using errcode = '23514';
  end if;
  if not exists (select 1 from public.price_points where subscription_id = sub_id) then
    raise exception 'subscription % must have at least one price point', sub_id using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger subscriptions_must_be_complete
  after insert on public.subscriptions
  deferrable initially deferred
  for each row execute function private.check_subscription_complete();

create constraint trigger schedule_segments_keep_one
  after delete or update of subscription_id on public.schedule_segments
  deferrable initially deferred
  for each row execute function private.check_subscription_complete();

create constraint trigger price_points_keep_one
  after delete or update of subscription_id on public.price_points
  deferrable initially deferred
  for each row execute function private.check_subscription_complete();

-- =============================================================================
-- Notification / recommendation state
-- Notifications and recommendations are derived (shared/src/notifications.ts,
-- recommendations.ts); only their ids are stored, e.g.
--   'renewal:<subscription id>:2026-11-17', 'duplicate:<sub id>:<kept sub id>'.
-- =============================================================================
create table public.notification_reads (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  notification_id text not null check (char_length(notification_id) <= 200),
  read_at         timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create table public.dismissed_recommendations (
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recommendation_id text not null check (char_length(recommendation_id) <= 200),
  dismissed_at      timestamptz not null default now(),
  primary key (user_id, recommendation_id)
);
