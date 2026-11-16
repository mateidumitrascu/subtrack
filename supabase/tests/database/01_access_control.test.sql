-- Row level security: users only see and change their own rows; the catalog is public.
-- Runs in a transaction that is rolled back, so it is safe on the dev project.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ana@test.local', '{"display_name": "Ana", "lang": "en"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bogdan@test.local', '{}', 'authenticated', 'authenticated');

-- Profiles are created by the auth trigger --------------------------------------
select results_eq(
  $$ select display_name, lang::text from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  $$ values ('Ana'::text, 'en'::text) $$,
  'profile is created from the sign-up metadata'
);
select is(
  (select display_name from public.profiles where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  'bogdan',
  'display name falls back to the e-mail prefix'
);

-- Ana creates a subscription ---------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$ select set_config('test.ana_sub', (public.create_subscription(
       '{"name": "Netflix", "serviceId": "netflix", "price": 10.99, "currency": "EUR", "cycle": "monthly",
         "nextDate": "2026-12-01", "category": "video", "reminderDays": 3, "usage": "weekly"}',
       '2026-11-16') ->> 'id'), true) $$,
  'Ana can create a subscription'
);
select is((select count(*)::int from public.subscriptions), 1, 'Ana sees her subscription');

-- Bogdan cannot see or touch it -----------------------------------------------
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select is((select count(*)::int from public.subscriptions), 0, 'Bogdan cannot see Ana''s subscriptions');
select is((select count(*)::int from public.price_points), 0, '... nor her price history');
select is(public.get_subscriptions(), '[]'::jsonb, 'get_subscriptions() only returns the caller''s rows');
select throws_ok(
  format($$ insert into public.price_points (subscription_id, effective_date, amount) values (%L, '2026-12-01', 1) $$,
         current_setting('test.ana_sub')),
  '23503', null,
  'Bogdan cannot add history to Ana''s subscription'
);
select results_eq(
  format($$ with u as (update public.subscriptions set name = 'hacked' where id = %L returning 1) select count(*)::int from u $$,
         current_setting('test.ana_sub')),
  $$ values (0) $$,
  'Bogdan cannot update Ana''s subscription'
);
select throws_ok(
  format($$ select public.cancel_subscription(%L) $$, current_setting('test.ana_sub')),
  'P0002', null,
  'RPCs report another user''s subscription as not found'
);
select results_eq(
  $$ with u as (update public.profiles set display_name = 'hacked' where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'Bogdan cannot update Ana''s profile'
);
select throws_ok(
  $$ update public.profiles set created_at = now() where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  '42501', null,
  'users cannot change protected profile columns'
);

-- Anonymous visitors -----------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;

select throws_ok('select count(*) from public.subscriptions', '42501', null, 'anon has no access to subscriptions');
select throws_ok('select public.get_subscriptions()', '42501', null, 'anon cannot call the subscription API');
select ok((select count(*) from public.catalog_services) >= 20, 'anon can read the catalog');

reset role;
select * from finish();
rollback;
