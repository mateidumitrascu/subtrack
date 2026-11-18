-- Notifications: payment reminders are created at the right time, exactly once,
-- and users can only read (and mark read) their own.
-- Runs in a transaction that is rolled back, so it is safe on the dev project.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ana@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bogdan@test.local', 'authenticated', 'authenticated');

-- Ana pays Spotify on 2026-12-05 and wants to be told 3 days before.
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select set_config('test.spotify', (public.create_subscription(
  '{"name": "Spotify", "price": 25.99, "currency": "RON", "cycle": "monthly",
    "nextDate": "2026-12-05", "category": "music", "reminderDays": 3, "usage": "daily"}',
  '2026-11-16') ->> 'id'), true);
reset role;

-- Only counts Ana's rows, so other data in the database does not matter.
create function pg_temp.ana_reminders() returns int language sql as $$
  select count(*)::int from public.notifications where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
$$;

-- Timing ---------------------------------------------------------------------------
select public.generate_renewal_notifications('2026-11-30 10:00+00');
select is(pg_temp.ana_reminders(), 0, 'nothing is created 5 days before the payment');

select public.generate_renewal_notifications('2026-12-02 10:00+00');
select is(pg_temp.ana_reminders(), 1, 'the reminder is created 3 days before the payment');

select results_eq(
  $$ select dedup_key, due_date, notify_on, data from public.notifications
     where user_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  format($$ values ('renewal:%s:2026-12-05'::text, '2026-12-05'::date, '2026-12-02'::date,
                    '{"amount": 25.99, "currency": "RON"}'::jsonb) $$, current_setting('test.spotify')),
  'the reminder is about the right payment'
);

-- Exactly once ----------------------------------------------------------------------
select is(public.generate_renewal_notifications('2026-12-02 10:00+00'), 0, 'running the job again creates nothing');

select public.generate_renewal_notifications('2026-12-04 10:00+00');
select is(pg_temp.ana_reminders(), 1, 'a later run does not repeat the same payment');

-- Paused subscriptions get no reminders ---------------------------------------------
update public.subscriptions set status = 'paused' where id = current_setting('test.spotify')::uuid;
select public.generate_renewal_notifications('2027-01-03 10:00+00');
select is(pg_temp.ana_reminders(), 1, 'no reminder while the subscription is paused');

-- Security -------------------------------------------------------------------------
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.notifications), 0, 'Bogdan cannot see Ana''s notifications');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select count(*)::int from public.notifications), 1, 'Ana sees her notification');

update public.notifications set read_at = now();
select isnt((select read_at from public.notifications), null, 'Ana can mark it read');

select throws_ok(
  $$ update public.notifications set data = '{}' $$,
  '42501', null,
  'Ana cannot change anything else'
);

select throws_ok(
  $$ select public.generate_renewal_notifications() $$,
  '42501', null,
  'users cannot run the job'
);

select * from finish();
rollback;
