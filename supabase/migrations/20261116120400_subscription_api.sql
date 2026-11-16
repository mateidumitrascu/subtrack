-- =============================================================================
-- Subtrack: subscription API (RPC functions)
--
-- Wire format = the frontend types. Reads return the exact `Subscription`
-- shape from shared/src/types.ts (camelCase, nested schedule / priceHistory /
-- pauses, optional fields omitted). Writes take the `SubscriptionInput` shape
-- from frontend/src/store/store.ts. Each function replaces one store action:
--
--   addSubscription       -> create_subscription(p_input, p_today)
--   updateSubscription    -> update_subscription(p_id, p_input, p_today)
--   deleteSubscription    -> delete_subscription(p_id)          (returns a snapshot for undo)
--   restoreSubscription   -> restore_subscription(p_snapshot)   (undo for delete / cancel / pause / tips)
--   pauseSubscription     -> pause_subscription(p_id, p_today)
--   resumeSubscription    -> resume_subscription(p_id, p_today)
--   cancelSubscription    -> cancel_subscription(p_id, p_today)
--   applyRecommendation   -> cancel_subscription(...) or switch_plan(...)
--   clearAll              -> clear_my_data()
--   resetDemo             -> seed_demo_data(p_today)            (demo data migration)
--   (load)                -> get_subscriptions() / get_subscription(p_id)
--   (localStorage import) -> import_subscriptions(p_subscriptions)
--
-- p_today: pass the client's local date (toISO(today())) so "today" matches
-- what the user sees; when omitted, the profile time zone is used.
--
-- All functions run with the caller's rights (SECURITY INVOKER), so RLS
-- applies and users can only touch their own rows. Each call is one
-- transaction: multi-table changes are all-or-nothing.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reading
-- -----------------------------------------------------------------------------
create function private.subscription_json(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id',            s.id,
    'serviceId',     s.service_id,
    'name',          s.name,
    'plan',          s.plan,
    'category',      s.category,
    'currency',      s.currency,
    'schedule',      (select jsonb_agg(jsonb_build_object('from', g.from_date, 'start', g.start_date, 'cycle', g.cycle)
                                       order by g.from_date)
                        from public.schedule_segments g where g.subscription_id = s.id),
    'priceHistory',  (select jsonb_agg(jsonb_build_object('date', p.effective_date, 'amount', p.amount,
                                                          'kind', case when p.is_plan_change then 'plan' end)
                                       order by p.effective_date)
                        from public.price_points p where p.subscription_id = s.id),
    'status',        s.status,
    'trialEndsAt',   s.trial_ends_at,
    'cancelledAt',   s.cancelled_at,
    'pauses',        (select jsonb_agg(jsonb_build_object('from', x.from_date, 'to', x.to_date)
                                       order by x.from_date, x.id)
                        from public.pauses x where x.subscription_id = s.id),
    'reminderDays',  s.reminder_days,
    'usage',         s.usage,
    'paymentMethod', s.payment_method,
    'notes',         s.notes,
    'createdAt',     s.created_on
  ))
  from public.subscriptions s
  where s.id = p_id
$$;

-- All of the caller's subscriptions as a JSON array of `Subscription`.
create function public.get_subscriptions()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.subscription_json(s.id) order by s.created_at, s.id), '[]'::jsonb)
  from public.subscriptions s
  where s.user_id = (select auth.uid())
$$;

-- One `Subscription`, or null when it does not exist / is not the caller's.
create function public.get_subscription(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.subscription_json(p_id)
$$;

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------

-- Catalog id if it exists, otherwise null (custom service).
create function private.known_service(p_service_id text)
returns text
language sql
stable
set search_path = ''
as $$
  select s.id from public.services s where s.id = p_service_id
$$;

-- Locks and returns the caller's subscription, or fails with "not found".
create function private.lock_subscription(p_id uuid)
returns public.subscriptions
language plpgsql
set search_path = ''
as $$
declare
  sub public.subscriptions;
begin
  select * into sub from public.subscriptions where id = p_id for update;
  if not found then
    raise exception 'subscription % not found', p_id using errcode = 'P0002';
  end if;
  return sub;
end;
$$;

create function private.require_subscription_input(p_input jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_input) is distinct from 'object'
     or nullif(btrim(p_input ->> 'name'), '') is null
     or p_input ->> 'price' is null
     or p_input ->> 'currency' is null
     or p_input ->> 'cycle' is null
     or p_input ->> 'nextDate' is null then
    raise exception 'name, price, currency, cycle and nextDate are required'
      using errcode = '22023';
  end if;
end;
$$;

-- withPrice(): the amount applies from p_date; later points are replaced.
create function private.set_price(p_id uuid, p_date date, p_amount numeric, p_is_plan_change boolean)
returns void
language sql
set search_path = ''
as $$
  delete from public.price_points where subscription_id = p_id and effective_date >= p_date;
  insert into public.price_points (subscription_id, effective_date, amount, is_plan_change)
  values (p_id, p_date, p_amount, p_is_plan_change);
$$;

-- reschedule(): starts a new schedule segment so past charges keep their dates.
create function private.reschedule(p_id uuid, p_start date, p_cycle public.billing_cycle, p_today date)
returns void
language sql
set search_path = ''
as $$
  delete from public.schedule_segments
  where subscription_id = p_id and from_date >= least(p_start, p_today + 1);
  insert into public.schedule_segments (subscription_id, from_date, start_date, cycle)
  values (p_id, least(p_start, p_today + 1), p_start, p_cycle);
$$;

-- Inserts a subscription and its history from a `Subscription`-shaped JSON
-- object under the given id. Used by restore, import and the demo seed.
create function private.write_subscription(p_user uuid, p_id uuid, p_sub jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  insert into public.subscriptions (
    id, user_id, service_id, name, plan, category, currency, status,
    trial_ends_at, cancelled_at, reminder_days, usage, payment_method, notes, created_on
  ) values (
    p_id,
    p_user,
    private.known_service(p_sub ->> 'serviceId'),
    btrim(p_sub ->> 'name'),
    nullif(btrim(p_sub ->> 'plan'), ''),
    coalesce((p_sub ->> 'category')::public.service_category, 'other'),
    (p_sub ->> 'currency')::public.currency_code,
    coalesce((p_sub ->> 'status')::public.subscription_status, 'active'),
    (p_sub ->> 'trialEndsAt')::date,
    (p_sub ->> 'cancelledAt')::date,
    coalesce((p_sub ->> 'reminderDays')::smallint, 3),
    coalesce((p_sub ->> 'usage')::public.usage_frequency, 'weekly'),
    nullif(btrim(p_sub ->> 'paymentMethod'), ''),
    nullif(btrim(p_sub ->> 'notes'), ''),
    coalesce((p_sub ->> 'createdAt')::date, current_date)
  );

  insert into public.schedule_segments (subscription_id, from_date, start_date, cycle)
  select p_id, (g ->> 'from')::date, (g ->> 'start')::date, (g ->> 'cycle')::public.billing_cycle
  from jsonb_array_elements(coalesce(p_sub -> 'schedule', '[]'::jsonb)) g;

  insert into public.price_points (subscription_id, effective_date, amount, is_plan_change)
  select p_id, (p ->> 'date')::date, (p ->> 'amount')::numeric, coalesce(p ->> 'kind' = 'plan', false)
  from jsonb_array_elements(coalesce(p_sub -> 'priceHistory', '[]'::jsonb)) p;

  insert into public.pauses (subscription_id, from_date, to_date)
  select p_id, (x ->> 'from')::date, (x ->> 'to')::date
  from jsonb_array_elements(coalesce(p_sub -> 'pauses', '[]'::jsonb)) x;

  return p_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Writing (one function per store action)
-- -----------------------------------------------------------------------------

-- addSubscription
create function public.create_subscription(p_input jsonb, p_today date default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_today    date := coalesce(p_today, private.user_today());
  v_next     date;
  v_is_trial boolean;
  v_id       uuid;
begin
  perform private.require_subscription_input(p_input);
  v_next := (p_input ->> 'nextDate')::date;
  v_is_trial := coalesce((p_input ->> 'isTrial')::boolean, false);

  insert into public.subscriptions (
    service_id, name, plan, category, currency, status, trial_ends_at,
    reminder_days, usage, payment_method, notes, created_on
  ) values (
    private.known_service(p_input ->> 'serviceId'),
    btrim(p_input ->> 'name'),
    nullif(btrim(p_input ->> 'plan'), ''),
    coalesce((p_input ->> 'category')::public.service_category, 'other'),
    (p_input ->> 'currency')::public.currency_code,
    case when v_is_trial then 'trial' else 'active' end::public.subscription_status,
    case when v_is_trial then v_next end,
    coalesce(
      (p_input ->> 'reminderDays')::smallint,
      (select p.default_reminder_days from public.profiles p where p.id = (select auth.uid())),
      3
    ),
    coalesce((p_input ->> 'usage')::public.usage_frequency, 'weekly'),
    nullif(btrim(p_input ->> 'paymentMethod'), ''),
    nullif(btrim(p_input ->> 'notes'), ''),
    v_today
  )
  returning id into v_id;

  insert into public.schedule_segments (subscription_id, from_date, start_date, cycle)
  values (v_id, v_next, v_next, (p_input ->> 'cycle')::public.billing_cycle);

  insert into public.price_points (subscription_id, effective_date, amount)
  values (v_id, v_today, (p_input ->> 'price')::numeric);

  return private.subscription_json(v_id);
end;
$$;

-- updateSubscription
create function public.update_subscription(p_id uuid, p_input jsonb, p_today date default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_today    date := coalesce(p_today, private.user_today());
  v_old      public.subscriptions;
  v_currency public.currency_code;
  v_price    numeric;
  v_cycle    public.billing_cycle;
  v_next     date;
  v_plan     text;
  v_is_trial boolean;
  v_rate_eur numeric;
  v_rate_usd numeric;
  v_terms    record;
begin
  perform private.require_subscription_input(p_input);
  v_old      := private.lock_subscription(p_id);
  v_currency := (p_input ->> 'currency')::public.currency_code;
  v_price    := (p_input ->> 'price')::numeric;
  v_cycle    := (p_input ->> 'cycle')::public.billing_cycle;
  v_next     := (p_input ->> 'nextDate')::date;
  v_plan     := nullif(btrim(p_input ->> 'plan'), '');
  v_is_trial := coalesce((p_input ->> 'isTrial')::boolean, false);

  update public.subscriptions set
    service_id     = private.known_service(p_input ->> 'serviceId'),
    name           = btrim(p_input ->> 'name'),
    plan           = v_plan,
    category       = coalesce((p_input ->> 'category')::public.service_category, category),
    reminder_days  = coalesce((p_input ->> 'reminderDays')::smallint, reminder_days),
    usage          = coalesce((p_input ->> 'usage')::public.usage_frequency, usage),
    payment_method = nullif(btrim(p_input ->> 'paymentMethod'), ''),
    notes          = nullif(btrim(p_input ->> 'notes'), '')
  where id = p_id;

  -- Currency change: convert the history so it stays comparable.
  if v_currency <> v_old.currency then
    select p.rate_eur, p.rate_usd into v_rate_eur, v_rate_usd
    from public.profiles p where p.id = v_old.user_id;

    update public.subscriptions set currency = v_currency where id = p_id;
    update public.price_points
    set amount = round(public.convert_amount(amount, v_old.currency, v_currency, v_rate_eur, v_rate_usd), 2)
    where subscription_id = p_id;
  end if;

  select * into v_terms from public.current_terms(p_id, v_today);

  -- New price from today. Marked as a plan change when the plan or cycle changed too.
  if abs(v_price - v_terms.price) > 0.001 then
    perform private.set_price(
      p_id, v_today, v_price,
      v_plan is distinct from v_old.plan or v_cycle <> v_terms.cycle
    );
  end if;

  -- New next-payment date or billing cycle: start a new schedule segment.
  if v_terms.next_date is null or v_terms.next_date <> v_next or v_cycle <> v_terms.cycle then
    perform private.reschedule(p_id, v_next, v_cycle, v_today);
  end if;

  if v_is_trial then
    update public.subscriptions set status = 'trial', trial_ends_at = v_next where id = p_id;
  elsif v_old.status = 'trial' then
    update public.subscriptions set status = 'active', trial_ends_at = null where id = p_id;
  end if;

  return private.subscription_json(p_id);
end;
$$;

-- pauseSubscription
create function public.pause_subscription(p_id uuid, p_today date default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_sub public.subscriptions := private.lock_subscription(p_id);
begin
  if v_sub.status in ('paused', 'cancelled') then
    raise exception 'only active or trial subscriptions can be paused (status is %)', v_sub.status
      using errcode = '22023';
  end if;
  update public.subscriptions set status = 'paused' where id = p_id;
  insert into public.pauses (subscription_id, from_date)
  values (p_id, coalesce(p_today, private.user_today()));
  return private.subscription_json(p_id);
end;
$$;

-- resumeSubscription
create function public.resume_subscription(p_id uuid, p_today date default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, private.user_today());
  v_sub   public.subscriptions := private.lock_subscription(p_id);
begin
  if v_sub.status <> 'paused' then
    raise exception 'subscription is not paused (status is %)', v_sub.status using errcode = '22023';
  end if;
  update public.pauses set to_date = v_today where subscription_id = p_id and to_date is null;
  update public.subscriptions
  set status = case when trial_ends_at > v_today then 'trial' else 'active' end::public.subscription_status
  where id = p_id;
  return private.subscription_json(p_id);
end;
$$;

-- cancelSubscription (also applyRecommendation with action.type = 'cancel')
create function public.cancel_subscription(p_id uuid, p_today date default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  perform private.lock_subscription(p_id);
  update public.subscriptions
  set status = 'cancelled', cancelled_at = coalesce(p_today, private.user_today())
  where id = p_id;
  return private.subscription_json(p_id);
end;
$$;

-- applyRecommendation with action.type = 'switch': new plan / price / cycle
-- from the next charge on (student plan, yearly billing, cheaper tier).
create function public.switch_plan(
  p_id uuid,
  p_plan text,
  p_price numeric,
  p_cycle public.billing_cycle,
  p_today date default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, private.user_today());
  v_terms record;
  v_from  date;
begin
  perform private.lock_subscription(p_id);
  select * into v_terms from public.current_terms(p_id, v_today);
  v_from := coalesce(v_terms.next_date, v_today);

  update public.subscriptions set plan = coalesce(nullif(btrim(p_plan), ''), plan) where id = p_id;
  perform private.set_price(p_id, v_from, p_price, true);
  if p_cycle <> v_terms.cycle then
    perform private.reschedule(p_id, v_from, p_cycle, v_today);
  end if;
  return private.subscription_json(p_id);
end;
$$;

-- deleteSubscription. Returns the deleted subscription so the UI can undo
-- with restore_subscription().
create function public.delete_subscription(p_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  perform private.lock_subscription(p_id);
  v_snapshot := private.subscription_json(p_id);
  delete from public.subscriptions where id = p_id;
  return v_snapshot;
end;
$$;

-- restoreSubscription: puts back a snapshot (as returned by any function
-- here), replacing the current state of that subscription or re-creating it.
create function public.restore_subscription(p_snapshot jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p_snapshot ->> 'id')::uuid;
begin
  if v_id is null then
    raise exception 'snapshot must contain an id' using errcode = '22023';
  end if;
  delete from public.subscriptions where id = v_id;
  perform private.write_subscription((select auth.uid()), v_id, p_snapshot);
  return private.subscription_json(v_id);
end;
$$;

-- Imports `Subscription` objects (e.g. the JSON export from Settings or the
-- old localStorage data) under new ids. Returns the created subscriptions.
create function public.import_subscriptions(p_subscriptions jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_ids  uuid[] := '{}';
begin
  if jsonb_typeof(p_subscriptions) is distinct from 'array' then
    raise exception 'expected a JSON array of subscriptions' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_subscriptions) loop
    v_ids := v_ids || private.write_subscription((select auth.uid()), gen_random_uuid(), v_item);
  end loop;
  return coalesce(
    (select jsonb_agg(private.subscription_json(i) order by n) from unnest(v_ids) with ordinality as u(i, n)),
    '[]'::jsonb
  );
end;
$$;

-- clearAll: removes the caller's subscriptions and notification / tip state.
create function public.clear_my_data()
returns void
language sql
set search_path = ''
as $$
  delete from public.subscriptions where user_id = (select auth.uid());
  delete from public.notification_reads where user_id = (select auth.uid());
  delete from public.dismissed_recommendations where user_id = (select auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Catalog in the frontend's CatalogService shape (one row per service).
-- -----------------------------------------------------------------------------
create view public.catalog_services
with (security_invoker = true)
as
select s.id,
       s.name,
       s.category,
       s.color,
       s.overlap,
       s.popular_rank,
       (select jsonb_build_object('plan', o.plan, 'price', o.price, 'currency', o.currency, 'cycle', o.cycle)
          from public.service_offers o where o.service_id = s.id and o.kind = 'default') as defaults,
       (select jsonb_build_object('plan', o.plan, 'price', o.price, 'currency', o.currency, 'cycle', o.cycle)
          from public.service_offers o where o.service_id = s.id and o.kind = 'student') as student,
       (select jsonb_build_object('plan', o.plan, 'price', o.price, 'currency', o.currency, 'cycle', o.cycle)
          from public.service_offers o where o.service_id = s.id and o.kind = 'cheaper') as cheaper,
       (select jsonb_build_object('price', o.price, 'currency', o.currency)
          from public.service_offers o where o.service_id = s.id and o.kind = 'annual') as annual
from public.services s;

comment on view public.catalog_services is 'Catalog in the CatalogService shape of shared/src/catalog.ts (defaults / student / cheaper / annual as JSON).';

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.cycle_index(date, date, public.billing_cycle),
  private.user_today(),
  private.subscription_json(uuid),
  private.known_service(text),
  private.lock_subscription(uuid),
  private.require_subscription_input(jsonb),
  private.set_price(uuid, date, numeric, boolean),
  private.reschedule(uuid, date, public.billing_cycle, date),
  private.write_subscription(uuid, uuid, jsonb)
to authenticated, service_role;

grant select on public.catalog_services to anon, authenticated, service_role;
