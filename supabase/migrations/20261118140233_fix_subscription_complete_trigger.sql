-- =============================================================================
-- Fix: creating a subscription failed at COMMIT with
--   record "old" has no field "subscription_id"
--
-- The CASE expression in check_subscription_complete() referenced
-- old.subscription_id even when the trigger fired on `subscriptions`, which has
-- no such column. PL/pgSQL resolves every field in an expression, so the CASE
-- failed whichever branch was taken. Separate IF branches are only evaluated
-- when they run, so each one only touches columns that exist.
--
-- The pgTAP tests did not catch it because the deferred trigger only fires at
-- COMMIT, and the tests roll back.
-- =============================================================================

create or replace function private.check_subscription_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sub_id uuid;
begin
  if tg_table_name = 'subscriptions' then
    sub_id := new.id;
  else
    sub_id := old.subscription_id;
  end if;

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
