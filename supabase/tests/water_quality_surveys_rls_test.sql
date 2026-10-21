begin;

select plan(18);

select ok((select not public from storage.buckets where id = 'survey-photos'), 'survey photo bucket stays private');
select ok((select relrowsecurity from pg_class where oid = 'public.water_quality_surveys'::regclass), 'survey table RLS is enabled');
select ok(not has_table_privilege('anon', 'public.water_quality_surveys', 'insert'), 'anon cannot insert survey rows directly');
select ok(not has_table_privilege('anon', 'public.water_quality_surveys', 'select'), 'anon cannot read survey rows directly');
select ok(not has_table_privilege('anon', 'public.water_quality_surveys', 'update'), 'anon cannot update survey rows');
select ok(not has_table_privilege('anon', 'public.water_quality_surveys', 'delete'), 'anon cannot delete survey rows');
select ok(not has_table_privilege('authenticated', 'public.water_quality_surveys', 'insert'), 'authenticated users cannot insert survey rows directly');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Survey photos require server authorization' and permissive = 'RESTRICTIVE' and cmd = 'ALL'), 'survey storage uses a restrictive policy');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Survey photos require server authorization' and 'anon' = any(roles)), 'survey storage restricts anonymous requests');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Survey photos require server authorization' and 'authenticated' = any(roles)), 'survey storage restricts authenticated requests');
select ok(has_table_privilege('service_role', 'public.water_quality_surveys', 'insert'), 'server role can insert survey rows');
select ok(has_table_privilege('service_role', 'public.water_quality_surveys', 'select'), 'server role can query survey rows');
select ok(has_function_privilege('service_role', 'public.reserve_water_quality_survey(text)', 'execute'), 'server role can reserve a rate-limited survey');
select ok(not has_function_privilege('anon', 'public.reserve_water_quality_survey(text)', 'execute'), 'anon cannot call the reservation function');

select ok(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'water_quality_surveys' and 'anon' = any (roles)),
  'survey table has no anonymous policy'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Survey photos require server authorization' and qual = '(bucket_id <> ''survey-photos''::text)' and with_check = '(bucket_id <> ''survey-photos''::text)'),
  'storage restriction is scoped to the survey bucket'
);

set local role anon;
select throws_ok($$select * from public.water_quality_surveys$$, '42501', null, 'anon cannot query private survey rows');
select throws_ok(
  $$insert into public.water_quality_surveys (id, sample_code, arsenic_level_ppb, latitude, longitude)
    values ('11111111-1111-4111-8111-111111111111', 'KOK-20260925-0001', 5, 20.0451, 99.8912)$$,
  '42501', null, 'anon cannot bypass CAPTCHA using direct table insert'
);

select * from finish();
rollback;
