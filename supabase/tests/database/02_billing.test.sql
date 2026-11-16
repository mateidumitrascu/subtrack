-- Billing functions: same results as shared/src/schedule.ts (cases mirror shared/test/logic.test.ts).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, aud, role)
values ('cccccccc-0000-4000-8000-000000000003', 'billing@test.local', 'authenticated', 'authenticated');

-- Fixtures, written directly as postgres (RLS is not under test here).
select private.write_subscription('cccccccc-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', $$ {
  "name": "Monthly", "currency": "RON", "status": "active", "usage": "weekly", "createdAt": "2026-01-31",
  "schedule": [{"from": "2026-01-31", "start": "2026-01-31", "cycle": "monthly"}],
  "priceHistory": [{"date": "2026-01-31", "amount": 10}, {"date": "2026-03-31", "amount": 12}]
} $$);
select private.write_subscription('cccccccc-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', $$ {
  "name": "Cancelled", "currency": "RON", "status": "cancelled", "cancelledAt": "2026-03-15", "usage": "weekly",
  "schedule": [{"from": "2026-01-31", "start": "2026-01-31", "cycle": "monthly"}],
  "priceHistory": [{"date": "2026-01-31", "amount": 10}]
} $$);
select private.write_subscription('cccccccc-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', $$ {
  "name": "Paused", "currency": "RON", "status": "paused", "usage": "weekly",
  "schedule": [{"from": "2026-01-31", "start": "2026-01-31", "cycle": "monthly"}],
  "priceHistory": [{"date": "2026-01-31", "amount": 10}],
  "pauses": [{"from": "2026-03-01", "to": "2026-05-15"}]
} $$);
select private.write_subscription('cccccccc-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004', $$ {
  "name": "Switched", "currency": "EUR", "status": "active", "usage": "weekly",
  "schedule": [{"from": "2026-01-31", "start": "2026-01-31", "cycle": "monthly"},
               {"from": "2026-06-01", "start": "2026-06-30", "cycle": "yearly"}],
  "priceHistory": [{"date": "2026-01-31", "amount": 9.99}, {"date": "2026-04-30", "amount": 10.99},
                   {"date": "2026-06-30", "amount": 99, "kind": "plan"}]
} $$);

select is(
  array(select public.charge_dates('c0000000-0000-4000-8000-000000000001', '2026-01-01', '2026-04-30')),
  array['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']::date[],
  'monthly charges repeat from the anchor and clamp to the month end'
);
select is(
  array(select public.charge_dates('c0000000-0000-4000-8000-000000000002', '2026-01-01', '2026-12-31')),
  array['2026-01-31', '2026-02-28']::date[],
  'no charges after cancellation'
);
select is(
  array(select public.charge_dates('c0000000-0000-4000-8000-000000000003', '2026-01-01', '2026-06-30')),
  array['2026-01-31', '2026-02-28', '2026-05-31', '2026-06-30']::date[],
  'no charges inside a pause'
);
select is(public.price_at('c0000000-0000-4000-8000-000000000001', '2026-02-28'), 10.00, 'price before a change');
select is(public.price_at('c0000000-0000-4000-8000-000000000001', '2026-03-31'), 12.00, 'price from the change date on');
select is(
  array(select public.charge_dates('c0000000-0000-4000-8000-000000000004', '2026-01-01', '2027-12-31')),
  array['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2027-06-30']::date[],
  'a new schedule segment does not rewrite past charges'
);
select is(
  (select cycle from public.current_terms('c0000000-0000-4000-8000-000000000004', '2026-11-12')),
  'yearly'::public.billing_cycle,
  'current terms follow the latest segment'
);
select is(
  public.next_charge('c0000000-0000-4000-8000-000000000001', '2026-11-12'),
  '2026-11-30'::date,
  'next charge'
);
select is(
  public.effective_status('trial', '2026-11-10', '2026-11-12'),
  'active'::public.subscription_status,
  'an expired trial is billed as active'
);
select is(public.add_cycle('2025-11-30', 'quarterly', 1), '2026-02-28'::date, 'quarterly cycle clamps to month end');
select is(public.convert_amount(10, 'EUR', 'RON', 5.08, 4.40), 50.8, 'EUR -> RON');
select is(round(public.convert_amount(50.8, 'RON', 'EUR', 5.08, 4.40), 6), 10.000000, 'RON -> EUR');
select results_eq(
  $$ select change_date, old_amount, new_amount from public.price_changes
     where subscription_id = 'c0000000-0000-4000-8000-000000000004' $$,
  $$ values ('2026-04-30'::date, 9.99::numeric, 10.99::numeric) $$,
  'price_changes lists provider changes and skips plan switches'
);
select results_eq(
  $$ select charge_date, amount, amount_base from public.get_charges('2026-04-01', '2026-04-30')
     where subscription_id = 'c0000000-0000-4000-8000-000000000004' $$,
  $$ values ('2026-04-30'::date, 10.99::numeric, 10.99 * 5.08) $$,
  'get_charges converts to the profile base currency (RON by default)'
);

select * from finish();
rollback;
