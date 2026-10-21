alter table public.water_quality_surveys
  add column if not exists public_consent_at timestamptz;

revoke all on table public.water_quality_surveys from anon, authenticated;
revoke insert (id, full_name, phone_number, sample_code, arsenic_level_ppb, latitude, longitude,
  gps_accuracy_meters, photo_1_path, photo_2_path) on table public.water_quality_surveys from anon;
revoke select (id, sample_code, arsenic_level_ppb, latitude, longitude, gps_accuracy_meters, created_at)
  on table public.water_quality_surveys from anon;
drop policy if exists "Anonymous visitors can submit water surveys" on public.water_quality_surveys;
drop policy if exists "Anonymous visitors can read public water survey waypoints" on public.water_quality_surveys;
grant select, insert on table public.water_quality_surveys to service_role;

drop policy if exists "Anonymous visitors can upload water survey photos" on storage.objects;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('survey-photos', 'survey-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.water_quality_survey_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[A-Za-z0-9_-]{43}$'),
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count > 0)
);

create table if not exists public.water_quality_survey_daily_sequences (
  sequence_date date primary key,
  last_value integer not null check (last_value > 0)
);

alter table public.water_quality_survey_rate_limits enable row level security;
alter table public.water_quality_survey_daily_sequences enable row level security;
revoke all on table public.water_quality_survey_rate_limits from public, anon, authenticated, service_role;
revoke all on table public.water_quality_survey_daily_sequences from public, anon, authenticated, service_role;

create or replace function public.reserve_water_quality_survey(p_ip_hash text)
returns table (allowed boolean, retry_after_seconds integer, survey_id uuid, sample_code text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window timestamptz := pg_catalog.date_trunc('hour', pg_catalog.clock_timestamp());
  v_count integer;
  v_sequence integer;
  v_day date := (pg_catalog.timezone('Asia/Bangkok', pg_catalog.clock_timestamp()))::date;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'invalid request identity' using errcode = '22023';
  end if;

  insert into public.water_quality_survey_rate_limits as limits (ip_hash, window_started_at, submission_count)
  values (p_ip_hash, v_window, 1)
  on conflict (ip_hash) do update set
    submission_count = case when limits.window_started_at < excluded.window_started_at then 1 else limits.submission_count + 1 end,
    window_started_at = greatest(limits.window_started_at, excluded.window_started_at)
  returning submission_count into v_count;

  if v_count > 5 then
    return query select false, greatest(1, (3600 - extract(epoch from (v_now - v_window)))::integer), null::uuid, null::text;
    return;
  end if;

  insert into public.water_quality_survey_daily_sequences as sequences (sequence_date, last_value)
  values (v_day, 1)
  on conflict (sequence_date) do update set last_value = sequences.last_value + 1
  returning last_value into v_sequence;

  if v_sequence > 9999 then
    return query select false, 86400, null::uuid, null::text;
    return;
  end if;

  return query select true, 0, pg_catalog.gen_random_uuid(),
    'KOK-' || pg_catalog.to_char(v_day, 'YYYYMMDD') || '-' || pg_catalog.lpad(v_sequence::text, 4, '0');
end;
$function$;

revoke all on function public.reserve_water_quality_survey(text) from public, anon, authenticated;
grant execute on function public.reserve_water_quality_survey(text) to service_role;
