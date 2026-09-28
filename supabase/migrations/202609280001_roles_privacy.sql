-- Supabase Cloud migration source for KOK Water Watch moderation and privacy gateway.
-- Review target/project and take a backup before applying; never run automatically.

create extension if not exists pgcrypto;

create table if not exists public.kok_sample_contacts (
  sample_code text primary key references public.kok_water_samples(sample_code) on delete cascade,
  name text not null default '',
  phone text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.kok_admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role = 'admin'),
  active boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kok_admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  sample_code text,
  revision integer,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.kok_admin_alerts (
  id bigint generated always as identity primary key,
  sample_code text not null references public.kok_water_samples(sample_code) on delete cascade,
  arsenic_ppb numeric not null,
  publication_status text not null,
  created_at timestamptz not null default now(),
  email_status text not null default 'queued' check (email_status in ('queued','sent','failed','not_configured'))
);

create table if not exists public.kok_email_outbox (
  id bigint generated always as identity primary key,
  kind text not null default 'review_alert' check (kind in ('review_alert','admin_invite')),
  admin_user_id uuid not null references auth.users(id),
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  sample_code text,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.kok_water_idempotency (
  key text primary key,
  sample_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.kok_contact_removal_requests (
  id uuid primary key default gen_random_uuid(),
  sample_code text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id),
  handled_at timestamptz,
  resolution_reason text
);

alter table public.kok_email_outbox add column if not exists sample_code text;

alter table public.kok_water_samples
  add column if not exists arsenic_ppb numeric,
  add column if not exists publication_status text,
  add column if not exists revision integer not null default 1,
  add column if not exists approved_revision integer,
  add column if not exists private_photo_paths text[] not null default '{}',
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_reason text;

create or replace function public.try_water_ppb(value text)
returns numeric language plpgsql immutable set search_path = pg_catalog as $$
begin
  if value is null or btrim(value) = '' then return null; end if;
  return value::numeric;
exception when invalid_text_representation or numeric_value_out_of_range then
  return null;
end $$;

-- Preserve old contacts in a private relation, then remove them from the sample row.
insert into public.kok_sample_contacts(sample_code, name, phone)
select sample_code,
       coalesce(nullif(btrim(collector->>'name'), ''), nullif(btrim(collector->>'full_name'), ''), ''),
       coalesce(nullif(btrim(collector->>'phone'), ''), '')
from public.kok_water_samples
where collector is not null and jsonb_typeof(collector) = 'object'
on conflict (sample_code) do nothing;

-- Keep recoverable legacy image JSON on the restricted sample table; extract only Storage object paths.
update public.kok_water_samples s
set private_photo_paths = coalesce((
      select array_agg(path order by ordinality)
      from jsonb_array_elements(coalesce(s.images, '[]'::jsonb)) with ordinality as img(value, ordinality)
      cross join lateral (
        select coalesce(
          nullif(img.value->>'path', ''),
          substring(coalesce(img.value->>'url', '') from '/storage/v1/object/(?:public|sign|authenticated)/water-watch-photos/([^?]+)')
        ) as path
      ) extracted
      where extracted.path is not null and extracted.path !~ '^data:'
    ), '{}'),
    arsenic_ppb = coalesce(public.try_water_ppb(s.measurements->'arsenic'->>'value'), public.try_water_ppb(s.measurements->>'arsenic_ppb')),
    collector = null
where true;

update public.kok_water_samples
set publication_status = case
  when arsenic_ppb is null or arsenic_ppb < 0 then 'pending_review'
  when arsenic_ppb > 50 then 'pending_review'
  else 'auto_published'
end,
approved_revision = case when arsenic_ppb between 0 and 50 then revision else null end,
reviewed_by = null,
reviewed_at = null,
review_reason = null
where publication_status is null;

alter table public.kok_water_samples drop constraint if exists kok_water_samples_publication_status_check;
alter table public.kok_water_samples add constraint kok_water_samples_publication_status_check
  check (publication_status in ('auto_published','pending_review','approved','rejected','withdrawn'));
alter table public.kok_water_samples alter column publication_status set default 'pending_review';
alter table public.kok_water_samples alter column publication_status set not null;
create index if not exists idx_kok_water_samples_publication on public.kok_water_samples(publication_status, collection_time desc);
create index if not exists idx_kok_admin_alerts_created on public.kok_admin_alerts(created_at desc);
create index if not exists idx_kok_email_outbox_ready on public.kok_email_outbox(status, available_at) where status in ('queued','failed');
create index if not exists idx_kok_contact_removal_open on public.kok_contact_removal_requests(created_at) where status = 'open';

alter table public.kok_water_samples enable row level security;
alter table public.kok_sample_contacts enable row level security;
alter table public.kok_admin_memberships enable row level security;
alter table public.kok_admin_audit_log enable row level security;
alter table public.kok_admin_alerts enable row level security;
alter table public.kok_email_outbox enable row level security;
alter table public.kok_water_idempotency enable row level security;
alter table public.kok_contact_removal_requests enable row level security;

drop policy if exists "Allow public read samples" on public.kok_water_samples;
drop policy if exists "Allow public insert samples" on public.kok_water_samples;
drop policy if exists "Allow public update samples" on public.kok_water_samples;
drop policy if exists "Allow public delete samples" on public.kok_water_samples;
revoke all on public.kok_water_samples, public.kok_sample_contacts, public.kok_admin_memberships,
  public.kok_admin_audit_log, public.kok_admin_alerts, public.kok_email_outbox, public.kok_water_idempotency,
  public.kok_contact_removal_requests
  from public, anon, authenticated;
grant all on public.kok_water_samples, public.kok_sample_contacts, public.kok_admin_memberships,
  public.kok_admin_audit_log, public.kok_admin_alerts, public.kok_email_outbox, public.kok_water_idempotency,
  public.kok_contact_removal_requests
  to service_role;
revoke all on sequence public.kok_admin_audit_log_id_seq, public.kok_admin_alerts_id_seq,
  public.kok_email_outbox_id_seq from public, anon, authenticated;
grant usage, select on sequence public.kok_admin_audit_log_id_seq, public.kok_admin_alerts_id_seq,
  public.kok_email_outbox_id_seq to service_role;

-- Drop all existing policies that made the photo bucket public or writable by visitors.
drop policy if exists "Allow public read photos" on storage.objects;
drop policy if exists "Allow public upload photos" on storage.objects;
drop policy if exists "Allow public update photos" on storage.objects;
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%water-watch-photos%' or coalesce(with_check, '') ilike '%water-watch-photos%')
  loop
    execute format('drop policy %I on storage.objects', policy_row.policyname);
  end loop;
end $$;
insert into storage.buckets(id, name, public)
values ('water-watch-photos', 'water-watch-photos', false)
on conflict (id) do update set public = false;

create or replace function public.set_water_sample_publication_state()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare parsed_ppb numeric;
begin
  begin
    parsed_ppb := nullif(new.measurements->'arsenic'->>'value', '')::numeric;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'invalid_arsenic_ppb' using errcode = '22023';
  end;
  if parsed_ppb is null or parsed_ppb < 0 or parsed_ppb > 100000 then
    raise exception 'invalid_arsenic_ppb' using errcode = '22023';
  end if;
  new.arsenic_ppb := parsed_ppb;
  if tg_op = 'INSERT' then
    new.revision := greatest(coalesce(new.revision, 1), 1);
    new.publication_status := case when parsed_ppb > 50 then 'pending_review' else 'auto_published' end;
    new.approved_revision := case when parsed_ppb <= 50 then new.revision else null end;
    return new;
  end if;
  if row(new.station_id, new.station_name, new.latitude, new.longitude, new.collection_time,
         new.sample_nature, new.measurements, new.private_photo_paths, new.images)
     is distinct from
     row(old.station_id, old.station_name, old.latitude, old.longitude, old.collection_time,
         old.sample_nature, old.measurements, old.private_photo_paths, old.images) then
    new.revision := old.revision + 1;
    if old.publication_status in ('auto_published','approved') then
      new.publication_status := 'pending_review';
    else
      new.publication_status := case when parsed_ppb > 50 then 'pending_review' else old.publication_status end;
    end if;
    new.approved_revision := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_reason := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_water_sample_publication_state on public.kok_water_samples;
create trigger trg_water_sample_publication_state before insert or update on public.kok_water_samples
for each row execute function public.set_water_sample_publication_state();

create or replace function public.create_water_sample(p_sample jsonb, p_contact jsonb, p_idempotency_key text, p_site_url text, p_email_enabled boolean)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare inserted_code text; ppb numeric; status_value text;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 16 or length(p_idempotency_key) > 80 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  select sample_code into inserted_code from public.kok_water_idempotency where key = p_idempotency_key;
  if inserted_code is not null then return jsonb_build_object('sample_code', inserted_code, 'duplicate', true); end if;
  ppb := nullif(p_sample->>'arsenic_ppb', '')::numeric;
  if ppb is null or ppb < 0 or ppb > 100000 then raise exception 'invalid_arsenic_ppb' using errcode = '22023'; end if;
  status_value := case when ppb > 50 then 'pending_review' else 'auto_published' end;
  inserted_code := p_sample->>'sample_code';
  insert into public.kok_water_samples(sample_code, station_id, station_name, latitude, longitude, collection_time,
    gps_accuracy_meters, entry_type, sample_nature, measurements, arsenic_ppb, publication_status, revision,
    approved_revision, private_photo_paths, images, status, sync_stage)
  values (inserted_code, p_sample->>'station_id', p_sample->>'station_name', (p_sample->>'latitude')::double precision,
    (p_sample->>'longitude')::double precision, (p_sample->>'collection_time')::timestamptz,
    nullif(p_sample->>'gps_accuracy_meters','')::numeric, p_sample->>'entry_type', coalesce(p_sample->'sample_nature','{}'),
    p_sample->'measurements', ppb, status_value, 1, case when status_value = 'auto_published' then 1 else null end,
    coalesce(array(select jsonb_array_elements_text(p_sample->'private_photo_paths')), '{}'), '[]'::jsonb, 'COMPLETED', 'INDEXED');
  if coalesce(nullif(btrim(p_contact->>'name'), ''), nullif(btrim(p_contact->>'phone'), '')) is not null then
    insert into public.kok_sample_contacts(sample_code, name, phone)
    values (inserted_code, left(btrim(coalesce(p_contact->>'name','')),160), left(btrim(coalesce(p_contact->>'phone','')),40));
  end if;
  insert into public.kok_water_idempotency(key, sample_code) values (p_idempotency_key, inserted_code);
  if status_value = 'pending_review' then
    insert into public.kok_admin_alerts(sample_code, arsenic_ppb, publication_status)
    values (inserted_code, ppb, status_value);
    if coalesce(p_email_enabled, false) then
      insert into public.kok_email_outbox(kind, admin_user_id, recipient_email, subject, body_text, sample_code)
      select 'review_alert', m.user_id, m.email, 'ผลตรวจน้ำรอการยืนยัน',
        format('ผลตรวจ %s มีค่า %s ppb และรอการตรวจสอบ: %s/admin#admin', inserted_code, ppb, coalesce(nullif(p_site_url, ''), '')),
        inserted_code
      from public.kok_admin_memberships m where m.active = true;
      if not found then
        update public.kok_admin_alerts set email_status = 'not_configured' where sample_code = inserted_code;
      end if;
    else
      update public.kok_admin_alerts set email_status = 'not_configured' where sample_code = inserted_code;
    end if;
  end if;
  return jsonb_build_object('sample_code', inserted_code, 'duplicate', false, 'publication_status', status_value);
exception when unique_violation then
  select sample_code into inserted_code from public.kok_water_idempotency where key = p_idempotency_key;
  if inserted_code is not null then return jsonb_build_object('sample_code', inserted_code, 'duplicate', true); end if;
  raise;
end $$;

create or replace function public.review_water_sample(p_sample_code text, p_revision integer, p_admin_user_id uuid, p_reason text, p_decision text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare sample_row public.kok_water_samples%rowtype; next_status text;
begin
  if not exists (select 1 from public.kok_admin_memberships where user_id = p_admin_user_id and active) then
    raise exception 'admin_inactive' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject') or length(btrim(coalesce(p_reason,''))) < 3 then
    raise exception 'invalid_review' using errcode = '22023';
  end if;
  select * into sample_row from public.kok_water_samples where sample_code = p_sample_code for update;
  if not found or sample_row.revision <> p_revision or sample_row.publication_status <> 'pending_review' then
    raise exception 'stale_revision' using errcode = '40001';
  end if;
  next_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  update public.kok_water_samples set publication_status = next_status,
    approved_revision = case when next_status = 'approved' then revision else null end,
    reviewed_by = p_admin_user_id, reviewed_at = now(), review_reason = left(btrim(p_reason),1000)
    where sample_code = p_sample_code;
  insert into public.kok_admin_audit_log(admin_user_id, action, sample_code, revision, reason)
    values (p_admin_user_id, p_decision, p_sample_code, p_revision, left(btrim(p_reason),1000));
  update public.kok_admin_alerts set publication_status = next_status where sample_code = p_sample_code;
  return jsonb_build_object('sample_code', p_sample_code, 'publication_status', next_status, 'revision', p_revision);
end $$;

create or replace function public.approve_water_sample(p_sample_code text, p_revision integer, p_admin_user_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$
  select public.review_water_sample(p_sample_code, p_revision, p_admin_user_id, p_reason, 'approve');
$$;
create or replace function public.reject_water_sample(p_sample_code text, p_revision integer, p_admin_user_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$
  select public.review_water_sample(p_sample_code, p_revision, p_admin_user_id, p_reason, 'reject');
$$;

create or replace function public.read_sample_contact(p_sample_code text, p_admin_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare contact_row public.kok_sample_contacts%rowtype;
begin
  if not exists (select 1 from public.kok_admin_memberships where user_id = p_admin_user_id and active) then
    raise exception 'admin_inactive' using errcode = '42501';
  end if;
  insert into public.kok_admin_audit_log(admin_user_id, action, sample_code, reason)
    values (p_admin_user_id, 'read_contact', p_sample_code, 'admin_detail_view');
  select * into contact_row from public.kok_sample_contacts where sample_code = p_sample_code;
  if not found then return null; end if;
  return jsonb_build_object('name', contact_row.name, 'phone', contact_row.phone);
end $$;

create or replace function public.deactivate_water_admin(p_user_id uuid, p_actor_user_id uuid)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare active_count integer;
begin
  lock table public.kok_admin_memberships in exclusive mode;
  if not exists (select 1 from public.kok_admin_memberships where user_id = p_actor_user_id and active) then
    raise exception 'admin_inactive' using errcode = '42501';
  end if;
  select count(*) into active_count from public.kok_admin_memberships where active;
  if active_count <= 1 and exists(select 1 from public.kok_admin_memberships where user_id = p_user_id and active) then
    raise exception 'cannot_deactivate_last_admin' using errcode = 'P0001';
  end if;
  update public.kok_admin_memberships set active = false, updated_at = now() where user_id = p_user_id;
  insert into public.kok_admin_audit_log(admin_user_id, action, reason) values (p_actor_user_id, 'deactivate_admin', p_user_id::text);
end $$;

create or replace function public.bootstrap_first_water_admin(p_user_id uuid, p_email text)
returns void language plpgsql security invoker set search_path = public, auth, pg_temp as $$
begin
  lock table public.kok_admin_memberships in exclusive mode;
  if exists (select 1 from public.kok_admin_memberships where active) then
    raise exception 'active_admin_already_exists' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = lower(p_email)) then
    raise exception 'auth_user_not_found' using errcode = '22023';
  end if;
  insert into public.kok_admin_memberships(user_id, email, role, active)
    values (p_user_id, lower(p_email), 'admin', true);
  insert into public.kok_admin_audit_log(admin_user_id, action, reason)
    values (p_user_id, 'bootstrap_first_admin', 'operator bootstrap');
end $$;

create or replace function public.queue_admin_invitation(p_user_id uuid, p_email text, p_actor_user_id uuid, p_action_link text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.kok_admin_memberships where user_id = p_actor_user_id and active) then
    raise exception 'admin_inactive' using errcode = '42501';
  end if;
  if exists (select 1 from public.kok_admin_memberships where user_id = p_user_id or lower(email) = lower(p_email)) then
    raise exception 'admin_already_registered' using errcode = '23505';
  end if;
  insert into public.kok_admin_memberships(user_id, email, role, active, invited_by)
    values (p_user_id, lower(p_email), 'admin', true, p_actor_user_id);
  insert into public.kok_admin_audit_log(admin_user_id, action, reason)
    values (p_actor_user_id, 'invite_admin', lower(p_email));
  insert into public.kok_email_outbox(kind, admin_user_id, recipient_email, subject, body_text)
    values ('admin_invite', p_user_id, lower(p_email), 'คำเชิญผู้ดูแลระบบ KOK Water Watch',
      format('คุณได้รับเชิญเป็นผู้ดูแลระบบ เปิดลิงก์นี้เพื่อตั้งรหัสผ่าน: %s', p_action_link));
end $$;

create or replace function public.create_contact_removal_request(p_sample_code text, p_reason text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if nullif(btrim(p_sample_code), '') is null or length(btrim(p_reason)) < 3 then
    raise exception 'invalid_contact_removal_request' using errcode = '22023';
  end if;
  insert into public.kok_contact_removal_requests(sample_code, reason)
    values (left(btrim(p_sample_code), 80), left(btrim(p_reason), 500));
end $$;

create or replace function public.resolve_contact_removal_request(p_request_id uuid, p_admin_user_id uuid, p_resolution_reason text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare request_row public.kok_contact_removal_requests%rowtype;
begin
  if not exists (select 1 from public.kok_admin_memberships where user_id = p_admin_user_id and active) then
    raise exception 'admin_inactive' using errcode = '42501';
  end if;
  select * into request_row from public.kok_contact_removal_requests where id = p_request_id and status = 'open' for update;
  if not found then raise exception 'contact_removal_request_not_found' using errcode = 'P0002'; end if;
  delete from public.kok_sample_contacts where sample_code = request_row.sample_code;
  update public.kok_contact_removal_requests
    set status = 'resolved', handled_by = p_admin_user_id, handled_at = now(),
        resolution_reason = left(btrim(p_resolution_reason), 500)
    where id = p_request_id;
  insert into public.kok_admin_audit_log(admin_user_id, action, sample_code, reason)
    values (p_admin_user_id, 'resolve_contact_removal', request_row.sample_code, left(btrim(p_resolution_reason), 500));
end $$;

create or replace function public.claim_water_email()
returns setof public.kok_email_outbox language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  return query with picked as (
    select id from public.kok_email_outbox where status in ('queued','failed') and attempts < 6 and available_at <= now()
    order by created_at for update skip locked limit 20
  )
  update public.kok_email_outbox o set status='sending', attempts=o.attempts+1
  from picked where o.id=picked.id returning o.*;
end $$;

create or replace function public.finish_water_email(p_id bigint, p_sent boolean, p_error text, p_skip boolean)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare next_status text;
begin
  next_status := case when p_skip then 'skipped' when p_sent then 'sent' when (select attempts from public.kok_email_outbox where id=p_id) >= 6 then 'failed' else 'failed' end;
  update public.kok_email_outbox set status=next_status, sent_at=case when p_sent then now() else null end,
    last_error=case when p_error is null then null else left(p_error,80) end,
    available_at=case when p_sent or p_skip then available_at else now() + make_interval(mins => least(60, power(2, greatest(attempts-1,0))::integer)) end
    where id=p_id;
  update public.kok_admin_alerts a set email_status=case when p_sent then 'sent' when p_skip then 'not_configured' when next_status='failed' then 'failed' else 'queued' end
  from public.kok_email_outbox o where o.id=p_id and o.kind='review_alert' and a.sample_code=o.sample_code;
end $$;

do $$
declare function_name text;
begin
  foreach function_name in array array['create_water_sample(jsonb,jsonb,text,text,boolean)','approve_water_sample(text,integer,uuid,text)','reject_water_sample(text,integer,uuid,text)','review_water_sample(text,integer,uuid,text,text)','read_sample_contact(text,uuid)','deactivate_water_admin(uuid,uuid)','bootstrap_first_water_admin(uuid,text)','queue_admin_invitation(uuid,text,uuid,text)','create_contact_removal_request(text,text)','resolve_contact_removal_request(uuid,uuid,text)','claim_water_email()','finish_water_email(bigint,boolean,text,boolean)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', function_name);
    execute format('grant execute on function public.%s to service_role', function_name);
  end loop;
end $$;
