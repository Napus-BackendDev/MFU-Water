-- ==============================================================================
-- KOK Water Watch (POC-1): Supabase Database Schema & Storage Setup
-- ลุ่มน้ำกก แม่น้ำกก ต.ท่าตอน - บ้านท่าดอย
-- ==============================================================================

-- 1. สร้างตารางจัดเก็บข้อมูลคุณภาพน้ำและตัวอย่างภาคสนาม (kok_water_samples)
CREATE TABLE IF NOT EXISTS public.kok_water_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_code TEXT UNIQUE NOT NULL,
    station_id TEXT,
    station_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    collection_time TIMESTAMPTZ,
    gps_accuracy_meters NUMERIC,
    entry_type TEXT DEFAULT 'realtime',
    collector JSONB,
    sample_nature JSONB,
    measurements JSONB,
    images JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'COMPLETED',
    sync_stage TEXT DEFAULT 'INDEXED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ดัชนีเพิ่มความเร็วในการ Query และทำแผนที่
CREATE INDEX IF NOT EXISTS idx_kok_water_samples_coords ON public.kok_water_samples (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_kok_water_samples_time ON public.kok_water_samples (collection_time DESC);
CREATE INDEX IF NOT EXISTS idx_kok_water_samples_station ON public.kok_water_samples (station_id);

-- 2. ปิดการเข้าถึงข้อมูลดิบโดย anon/authenticated; Express เท่านั้นที่ใช้ service_role
ALTER TABLE public.kok_water_samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read samples" ON public.kok_water_samples;
DROP POLICY IF EXISTS "Allow public insert samples" ON public.kok_water_samples;
DROP POLICY IF EXISTS "Allow public update samples" ON public.kok_water_samples;
DROP POLICY IF EXISTS "Allow public delete samples" ON public.kok_water_samples;
REVOKE ALL ON public.kok_water_samples FROM public, anon, authenticated;
GRANT ALL ON public.kok_water_samples TO service_role;

-- 3. สร้าง Storage Bucket สำหรับจัดเก็บรูปภาพภาคสนาม ('water-watch-photos')
INSERT INTO storage.buckets (id, name, public)
VALUES ('water-watch-photos', 'water-watch-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Allow public read photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update photos" ON storage.objects;
