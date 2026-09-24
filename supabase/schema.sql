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

-- 2. ตั้งค่า Row Level Security (RLS) เพื่ออนุญาตให้อาสาสมัครและเว็บแอปบันทึกและอ่านได้
ALTER TABLE public.kok_water_samples ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kok_water_samples' AND policyname = 'Allow public read samples'
    ) THEN
        CREATE POLICY "Allow public read samples" ON public.kok_water_samples FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kok_water_samples' AND policyname = 'Allow public insert samples'
    ) THEN
        CREATE POLICY "Allow public insert samples" ON public.kok_water_samples FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kok_water_samples' AND policyname = 'Allow public update samples'
    ) THEN
        CREATE POLICY "Allow public update samples" ON public.kok_water_samples FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kok_water_samples' AND policyname = 'Allow public delete samples'
    ) THEN
        CREATE POLICY "Allow public delete samples" ON public.kok_water_samples FOR DELETE USING (true);
    END IF;
END $$;

-- 3. สร้าง Storage Bucket สำหรับจัดเก็บรูปภาพภาคสนาม ('water-watch-photos')
INSERT INTO storage.buckets (id, name, public)
VALUES ('water-watch-photos', 'water-watch-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public read photos'
    ) THEN
        CREATE POLICY "Allow public read photos" ON storage.objects FOR SELECT USING (bucket_id = 'water-watch-photos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public upload photos'
    ) THEN
        CREATE POLICY "Allow public upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'water-watch-photos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public update photos'
    ) THEN
        CREATE POLICY "Allow public update photos" ON storage.objects FOR UPDATE USING (bucket_id = 'water-watch-photos');
    END IF;
END $$;
