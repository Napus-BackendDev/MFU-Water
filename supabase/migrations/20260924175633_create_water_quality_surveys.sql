create table public.water_quality_surveys (
  id uuid primary key,
  sample_code text not null,
  full_name text,
  phone_number text,
  arsenic_level_ppb smallint not null,
  latitude double precision not null,
  longitude double precision not null,
  gps_accuracy_meters integer,
  photo_1_path text,
  photo_2_path text,
  created_at timestamptz not null default now(),
  constraint water_quality_surveys_name_length
    check (full_name is null or char_length(full_name) <= 200),
  constraint water_quality_surveys_phone_length
    check (phone_number is null or char_length(phone_number) <= 40),
  constraint water_quality_surveys_arsenic_level
    check (arsenic_level_ppb in (0, 5, 10, 30, 50, 100, 200, 300, 500)),
  constraint water_quality_surveys_latitude
    check (latitude between -90 and 90),
  constraint water_quality_surveys_longitude
    check (longitude between -180 and 180),
  constraint water_quality_surveys_sample_code
    check (sample_code ~ '^KOK-[0-9]{8}-[0-9]{4}$'),
  constraint water_quality_surveys_sample_code_unique unique (sample_code),
  constraint water_quality_surveys_gps_accuracy
    check (gps_accuracy_meters is null or gps_accuracy_meters >= 0),
  constraint water_quality_surveys_photo_1_path
    check (photo_1_path is null or photo_1_path ~ ('^' || id::text || '/1\.(jpg|png|webp)$')),
  constraint water_quality_surveys_photo_2_path
    check (photo_2_path is null or photo_2_path ~ ('^' || id::text || '/2\.(jpg|png|webp)$'))
);

alter table public.water_quality_surveys enable row level security;

revoke all on table public.water_quality_surveys from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'survey-photos',
  'survey-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Restrict only this bucket, preserving other applications' Storage permissions.
create policy "Survey photos require server authorization"
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id <> 'survey-photos')
  with check (bucket_id <> 'survey-photos');
