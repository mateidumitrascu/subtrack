-- =============================================================================
-- Subtrack: billing functions
--
-- SQL ports of shared/src/schedule.ts, dates.ts and money.ts. They compute the
-- same charge dates and prices as the TypeScript code, so database jobs
-- (reminders, statistics queries) agree with what the app shows. If you change
-- the rules in one place, change them in the other.
--
-- Postgres month arithmetic clamps to the end of the month exactly like
-- date-fns: 2026-01-31 + 1 month = 2026-02-28.
-- =============================================================================

-- n-th charge date counted from p_date (n = 0 is p_date itself; n may be negative).
create function public.add_cycle(p_date date, p_cycle public.billing_cycle, p_n integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_cycle
    when 'weekly'    then p_date + 7 * p_n
    when 'monthly'   then (p_date + make_interval(months => p_n))::date
    when 'quarterly' then (p_date + make_interval(months => 3 * p_n))::date
    when 'yearly'    then (p_date + make_interval(years => p_n))::date
  end
$$;

-- Approximate number of whole cycles between two dates (used to skip ahead
-- instead of iterating from the first charge; same as chargeDates in schedule.ts).
create function private.cycle_index(p_start date, p_date date, p_cycle public.billing_cycle)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_cycle
    when 'weekly' then floor((p_date - p_start) / 7.0)::integer
    else floor(
      ((extract(year from p_date) - extract(year from p_start)) * 12
        + (extract(month from p_date) - extract(month from p_start)))
      / case p_cycle when 'monthly' then 1 when 'quarterly' then 3 else 12 end
    )::integer
  end
$$;

-- A trial whose end date has passed is billed like an active subscription.
create function public.effective_status(
  p_status public.subscription_status,
  p_trial_ends_at date,
  p_today date
)
returns public.subscription_status
language sql
immutable
set search_path = ''
as $$
  select case
    when p_status = 'trial' and p_trial_ends_at <= p_today then 'active'::public.subscription_status
    else p_status
  end
$$;

-- Converts through RON. Rates are lei per unit of EUR / USD (profiles.rate_eur / rate_usd).
create function public.convert_amount(
  p_amount numeric,
  p_from public.currency_code,
  p_to public.currency_code,
  p_rate_eur numeric,
  p_rate_usd numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = p_to then p_amount
    else p_amount
      * case p_from when 'RON' then 1 when 'EUR' then p_rate_eur else p_rate_usd end
      / case p_to   when 'RON' then 1 when 'EUR' then p_rate_eur else p_rate_usd end
  end
$$;

-- The caller's calendar day in their profile time zone. RPCs default to this
-- when the client does not pass p_today.
create function private.user_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = auth.uid()),
    'Europe/Bucharest'
  ))::date
$$;

-- Price that applies to a charge on p_date (in the subscription's currency).
create function public.price_at(p_subscription_id uuid, p_date date)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select pp.amount from public.price_points pp
      where pp.subscription_id = p_subscription_id and pp.effective_date <= p_date
      order by pp.effective_date desc limit 1),
    (select pp.amount from public.price_points pp
      where pp.subscription_id = p_subscription_id
      order by pp.effective_date limit 1)
  )
$$;

-- Billing cycle of the schedule segment in effect on p_date.
create function public.cycle_at(p_subscription_id uuid, p_date date)
returns public.billing_cycle
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.cycle from public.schedule_segments s
      where s.subscription_id = p_subscription_id and s.from_date <= p_date
      order by s.from_date desc limit 1),
    (select s.cycle from public.schedule_segments s
      where s.subscription_id = p_subscription_id
      order by s.from_date limit 1)
  )
$$;

-- All charge dates between p_from and p_to (both inclusive), ascending.
-- Skips dates after cancellation and inside pauses (from, to).
create function public.charge_dates(p_subscription_id uuid, p_from date, p_to date)
returns setof date
language sql
stable
set search_path = ''
as $$
  with segments as (
    select s.start_date,
           s.cycle,
           lead(s.from_date) over (order by s.from_date) as until
    from public.schedule_segments s
    where s.subscription_id = p_subscription_id
  ),
  candidates as (
    select public.add_cycle(seg.start_date, seg.cycle, k) as charge_date, seg.until
    from segments seg
    cross join lateral generate_series(
      greatest(0, private.cycle_index(seg.start_date, p_from, seg.cycle) - 1),
      least(private.cycle_index(seg.start_date, p_to, seg.cycle) + 1, 5000)
    ) as k
  )
  select c.charge_date
  from candidates c
  join public.subscriptions sub on sub.id = p_subscription_id
  where c.charge_date between p_from and p_to
    and (c.until is null or c.charge_date < c.until)
    and (sub.cancelled_at is null or c.charge_date <= sub.cancelled_at)
    and not exists (
      select 1 from public.pauses p
      where p.subscription_id = p_subscription_id
        and c.charge_date > p.from_date
        and (p.to_date is null or c.charge_date < p.to_date)
    )
  order by c.charge_date
$$;

-- Next charge on or after p_today (looks two years ahead), null if none.
create function public.next_charge(p_subscription_id uuid, p_today date)
returns date
language sql
stable
set search_path = ''
as $$
  select d
  from public.charge_dates(p_subscription_id, p_today, (p_today + interval '2 years')::date) as d
  order by d
  limit 1
$$;

-- Price and cycle of the upcoming charge (or of today, when nothing is scheduled).
create function public.current_terms(p_subscription_id uuid, p_today date)
returns table (price numeric, cycle public.billing_cycle, next_date date)
language sql
stable
set search_path = ''
as $$
  with n as (select public.next_charge(p_subscription_id, p_today) as nx)
  select public.price_at(p_subscription_id, coalesce(n.nx, p_today)),
         public.cycle_at(p_subscription_id, coalesce(n.nx, p_today)),
         n.nx
  from n
$$;

-- Every charge of the caller's subscriptions in a date range, with the amount
-- converted to their base currency. Building block for statistics, the
-- calendar and reminder jobs. (With the service_role key it covers all users.)
create function public.get_charges(p_from date, p_to date)
returns table (
  subscription_id uuid,
  user_id uuid,
  charge_date date,
  amount numeric,
  currency public.currency_code,
  amount_base numeric,
  base_currency public.currency_code
)
language sql
stable
set search_path = ''
as $$
  select s.id,
         s.user_id,
         c.charge_date,
         c.amount,
         s.currency,
         public.convert_amount(c.amount, s.currency, pr.base_currency, pr.rate_eur, pr.rate_usd),
         pr.base_currency
  from public.subscriptions s
  join public.profiles pr on pr.id = s.user_id
  cross join lateral (
    select d as charge_date, public.price_at(s.id, d) as amount
    from public.charge_dates(s.id, p_from, p_to) as d
  ) c
  order by c.charge_date, s.id
$$;

-- Provider price changes (plan switches made by the user are excluded).
-- Same rules as priceChanges() in shared/src/analytics.ts.
create view public.price_changes
with (security_invoker = true)
as
select x.subscription_id,
       x.user_id,
       x.effective_date as change_date,
       x.prev_amount    as old_amount,
       x.amount         as new_amount,
       (x.amount - x.prev_amount) / x.prev_amount as pct
from (
  select pp.*,
         lag(pp.amount) over (partition by pp.subscription_id order by pp.effective_date) as prev_amount
  from public.price_points pp
) x
where x.prev_amount is not null
  and not x.is_plan_change
  and x.amount <> x.prev_amount
  and x.prev_amount > 0;

comment on view public.price_changes is 'Provider price changes, derived from price_points. RLS of price_points applies (security_invoker).';

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.cycle_index(date, date, public.billing_cycle),
  private.user_today()
to authenticated, service_role;

grant select on public.price_changes to authenticated, service_role;
