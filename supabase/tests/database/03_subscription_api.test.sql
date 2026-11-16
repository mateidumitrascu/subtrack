-- Subscription API: behaves like the store actions in frontend/src/store/store.ts.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, aud, role)
values ('dddddddd-0000-4000-8000-000000000004', 'api@test.local', 'authenticated', 'authenticated');

select set_config('request.jwt.claims', '{"sub": "dddddddd-0000-4000-8000-000000000004", "role": "authenticated"}', true);
set local role authenticated;

-- create_subscription (addSubscription) ------------------------------------------
select set_config('test.sub', (public.create_subscription(
  '{"name": " Netflix ", "serviceId": "netflix", "plan": "Standard", "price": 10.99, "currency": "EUR",
    "cycle": "monthly", "nextDate": "2026-12-01", "isTrial": false, "category": "video",
    "reminderDays": 3, "usage": "weekly", "paymentMethod": "  ", "notes": ""}',
  '2026-11-16') ->> 'id'), true);

select is(
  public.get_subscription(current_setting('test.sub')::uuid) - 'id',
  '{"name": "Netflix", "serviceId": "netflix", "plan": "Standard", "category": "video", "currency": "EUR",
    "schedule": [{"from": "2026-12-01", "start": "2026-12-01", "cycle": "monthly"}],
    "priceHistory": [{"date": "2026-11-16", "amount": 10.99}],
    "status": "active", "reminderDays": 3, "usage": "weekly", "createdAt": "2026-11-16"}'::jsonb,
  'create_subscription returns the frontend Subscription shape (trimmed, blanks omitted)'
);

select is(
  public.create_subscription(
    '{"name": "Duolingo", "price": 59.99, "currency": "EUR", "cycle": "yearly", "nextDate": "2026-11-20",
      "isTrial": true, "category": "education", "reminderDays": 1, "usage": "daily"}', '2026-11-16'
  ) - 'id' - 'schedule' - 'priceHistory' - 'createdAt' - 'name' - 'currency' - 'category' - 'usage' - 'reminderDays',
  '{"status": "trial", "trialEndsAt": "2026-11-20"}'::jsonb,
  'a trial ends on the first paid charge'
);

select throws_ok(
  $$ select public.create_subscription('{"name": "No price", "currency": "RON", "cycle": "monthly", "nextDate": "2026-12-01"}') $$,
  '22023', null,
  'required fields are validated'
);

-- update_subscription (updateSubscription) ---------------------------------------
-- Same date and cycle, new price -> one new price point, schedule untouched.
select is(
  public.update_subscription(current_setting('test.sub')::uuid,
    '{"name": "Netflix", "serviceId": "netflix", "plan": "Standard", "price": 11.99, "currency": "EUR",
      "cycle": "monthly", "nextDate": "2026-12-01", "category": "video", "reminderDays": 3, "usage": "weekly"}',
    '2026-11-20') -> 'priceHistory',
  '[{"date": "2026-11-16", "amount": 10.99}, {"date": "2026-11-20", "amount": 11.99}]'::jsonb,
  'a new price is recorded from today (provider change)'
);
select is(
  jsonb_array_length(public.get_subscription(current_setting('test.sub')::uuid) -> 'schedule'),
  1,
  'unchanged date and cycle keep the schedule'
);

-- New plan + price + cycle -> plan change, new segment.
select is(
  public.update_subscription(current_setting('test.sub')::uuid,
    '{"name": "Netflix", "serviceId": "netflix", "plan": "Premium", "price": 150, "currency": "EUR",
      "cycle": "yearly", "nextDate": "2027-01-15", "category": "video", "reminderDays": 7, "usage": "weekly"}',
    '2026-11-21') -> 'priceHistory' -> -1,
  '{"date": "2026-11-21", "amount": 150, "kind": "plan"}'::jsonb,
  'changing plan and price marks the price point as a plan change'
);
select is(
  public.get_subscription(current_setting('test.sub')::uuid) -> 'schedule',
  '[{"from": "2026-11-22", "start": "2027-01-15", "cycle": "yearly"}]'::jsonb,
  'a new cycle starts a segment from tomorrow, replacing the one that had not started yet'
);
select is(
  public.next_charge(current_setting('test.sub')::uuid, '2026-11-21'),
  '2027-01-15'::date,
  'the next charge follows the new segment'
);

-- Currency change converts the history with the profile rates (EUR 5.08).
select is(
  public.update_subscription(current_setting('test.sub')::uuid,
    '{"name": "Netflix", "serviceId": "netflix", "plan": "Premium", "price": 762, "currency": "RON",
      "cycle": "yearly", "nextDate": "2027-01-15", "category": "video", "reminderDays": 7, "usage": "weekly"}',
    '2026-11-21') -> 'priceHistory',
  '[{"date": "2026-11-16", "amount": 55.83}, {"date": "2026-11-20", "amount": 60.91},
    {"date": "2026-11-21", "amount": 762, "kind": "plan"}]'::jsonb,
  'changing the currency converts the price history'
);

-- pause / resume / cancel --------------------------------------------------------
select is(
  public.pause_subscription(current_setting('test.sub')::uuid, '2026-11-22') -> 'pauses',
  '[{"from": "2026-11-22"}]'::jsonb,
  'pausing opens a pause'
);
select throws_ok(
  format('select public.pause_subscription(%L, ''2026-11-23'')', current_setting('test.sub')),
  '22023', null,
  'a paused subscription cannot be paused again'
);
select is(
  public.next_charge(current_setting('test.sub')::uuid, '2026-11-22'),
  null::date,
  'a running pause stops all charges'
);
select results_eq(
  format($$ select s ->> 'status', s -> 'pauses' from public.resume_subscription(%L, '2026-11-25') s $$, current_setting('test.sub')),
  $$ values ('active'::text, '[{"from": "2026-11-22", "to": "2026-11-25"}]'::jsonb) $$,
  'resuming closes the pause'
);

-- delete / restore (undo) --------------------------------------------------------
select set_config('test.snapshot', public.delete_subscription(current_setting('test.sub')::uuid)::text, true);
select is(public.get_subscription(current_setting('test.sub')::uuid), null::jsonb, 'delete removes the subscription');
select is(
  public.restore_subscription(current_setting('test.snapshot')::jsonb),
  current_setting('test.snapshot')::jsonb,
  'restore_subscription puts back the exact snapshot'
);

select is(
  public.cancel_subscription(current_setting('test.sub')::uuid, '2026-11-26') ->> 'cancelledAt',
  '2026-11-26',
  'cancel sets the cancellation date'
);

-- switch_plan (applyRecommendation) ----------------------------------------------
select set_config('test.spotify', (public.create_subscription(
  '{"name": "Spotify", "serviceId": "spotify", "plan": "Premium Individual", "price": 25.99, "currency": "RON",
    "cycle": "monthly", "nextDate": "2026-12-05", "category": "music", "reminderDays": 3, "usage": "daily"}',
  '2026-11-16') ->> 'id'), true);
select results_eq(
  format($$ select s ->> 'plan', s -> 'priceHistory' -> -1 from public.switch_plan(%L, 'Premium Student', 12.99, 'monthly', '2026-11-16') s $$,
         current_setting('test.spotify')),
  $$ values ('Premium Student'::text, '{"date": "2026-12-05", "amount": 12.99, "kind": "plan"}'::jsonb) $$,
  'switch_plan applies the new plan from the next charge'
);

-- integrity -----------------------------------------------------------------------
set constraints all immediate;
select throws_ok(
  $$ insert into public.subscriptions (name, currency) values ('Bare row', 'RON') $$,
  '23514', null,
  'a subscription without schedule and price history is rejected'
);
set constraints all deferred;

select throws_ok(
  $$ select private.write_subscription(auth.uid(), gen_random_uuid(),
       '{"name": "Bad trial", "currency": "RON", "status": "trial",
         "schedule": [{"from": "2026-01-01", "start": "2026-01-01", "cycle": "monthly"}],
         "priceHistory": [{"date": "2026-01-01", "amount": 1}]}') $$,
  '23514', null,
  'a trial needs an end date'
);

-- import / demo / clear ----------------------------------------------------------
select is(
  jsonb_array_length(public.import_subscriptions(
    '[{"id": "s-local-1", "name": "Old A", "currency": "RON", "usage": "weekly",
       "schedule": [{"from": "2026-01-10", "start": "2026-01-10", "cycle": "monthly"}],
       "priceHistory": [{"date": "2026-01-10", "amount": 5}]},
      {"id": "s-local-2", "serviceId": "unknown-service", "name": "Old B", "currency": "USD", "usage": "rarely",
       "schedule": [{"from": "2026-02-01", "start": "2026-02-01", "cycle": "yearly"}],
       "priceHistory": [{"date": "2026-02-01", "amount": 50}]}]')),
  2,
  'import_subscriptions accepts old localStorage ids and unknown services'
);

select is(jsonb_array_length(public.seed_demo_data('2026-11-12')), 16, 'seed_demo_data replaces everything with the 16 demo subscriptions');
select is(
  (select count(*)::int from public.subscriptions where public.effective_status(status, trial_ends_at, '2026-11-12') = 'trial'),
  2,
  'the demo has two running trials'
);
select is(
  (select public.next_charge(id, '2026-11-12') from public.subscriptions where service_id = 'chatgpt'),
  '2026-11-13'::date,
  'demo renewals are relative to today (ChatGPT renews tomorrow)'
);

select public.clear_my_data();
select is((select count(*)::int from public.subscriptions), 0, 'clear_my_data removes everything');

reset role;
select * from finish();
rollback;
