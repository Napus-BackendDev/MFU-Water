import { createClient } from '@supabase/supabase-js';

// ดึงการตั้งค่าจาก Environment Variables หรือ LocalStorage (สำหรับตั้งค่าผ่าน UI)
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getSupabaseCredentials() {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('kok_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('kok_supabase_anon_key') : null;

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envAnonKey || '').trim();

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

// สร้าง Supabase Client แบบ Dynamic Singleton
let supabaseClientInstance = null;
let lastUsedConfig = '';

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseCredentials();
  const configKey = `${url}:${anonKey}`;

  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  if (!supabaseClientInstance || lastUsedConfig !== configKey) {
    try {
      supabaseClientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      lastUsedConfig = configKey;
    } catch (err) {
      console.error('Supabase client initialization error:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

/**
 * อัปโหลดรูปภาพไปยัง Supabase Storage Bucket 'water-watch-photos'
 * หากยังไม่ได้เชื่อมต่อ Supabase จะคืนค่าเป็น Base64 Data URL สำหรับ Local mode
 */
export async function uploadSampleImage(file, sampleCode, index = 0) {
  const client = getSupabaseClient();
  
  // โหมดสำรอง: แปลงเป็น Base64
  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  if (!client) {
    const base64Url = await toBase64(file);
    return {
      id: `img-local-${Date.now()}-${index}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      url: base64Url,
      size_kb: Math.round(file.size / 1024),
      storage_type: 'local_base64'
    };
  }

  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `samples/${sampleCode}/photo_${index + 1}_${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await client.storage
      .from('water-watch-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.warn('Storage upload error, falling back to base64:', uploadError);
      const base64Url = await toBase64(file);
      return {
        id: `img-fallback-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: base64Url,
        size_kb: Math.round(file.size / 1024),
        storage_type: 'fallback_base64'
      };
    }

    // ดึง Public URL ของภาพ
    const { data: publicUrlData } = client.storage
      .from('water-watch-photos')
      .getPublicUrl(filePath);

    return {
      id: `img-sp-${Date.now()}-${index}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      url: publicUrlData.publicUrl,
      path: filePath,
      size_kb: Math.round(file.size / 1024),
      storage_type: 'supabase_storage'
    };
  } catch (err) {
    console.error('Exception uploading image to Supabase:', err);
    const base64Url = await toBase64(file);
    return {
      id: `img-err-${Date.now()}-${index}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      url: base64Url,
      size_kb: Math.round(file.size / 1024),
      storage_type: 'fallback_base64'
    };
  }
}

/**
 * บันทึกข้อมูลการเก็บตัวอย่างลงใน Supabase Table 'kok_water_samples'
 */
export async function saveSampleToSupabase(record) {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, reason: 'not_configured' };
  }

  try {
    const payload = {
      sample_code: record.sample_code,
      station_id: record.station_id,
      station_name: record.station_name,
      latitude: record.coordinates?.[1] || null,
      longitude: record.coordinates?.[0] || null,
      collection_time: record.collection_time,
      gps_accuracy_meters: record.gps_accuracy_meters,
      entry_type: record.entry_type,
      collector: record.collector,
      sample_nature: record.sample_nature,
      measurements: record.measurements,
      images: record.images,
      status: record.status || 'COMPLETED',
      sync_stage: 'INDEXED'
    };

    const { data, error } = await client
      .from('kok_water_samples')
      .insert([payload])
      .select();

    if (error) {
      console.error('Failed to insert sample into Supabase:', error);
      return { success: false, error };
    }

    return { success: true, data: data?.[0] };
  } catch (err) {
    console.error('Exception inserting sample to Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * ดึงรายการตัวอย่างคุณภาพน้ำทั้งหมดจาก Supabase
 */
export async function fetchSamplesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('kok_water_samples')
      .select('*')
      .order('collection_time', { ascending: false });

    if (error) {
      console.error('Error fetching samples from Supabase:', error);
      return null;
    }

    return (data || []).map(row => ({
      record_id: row.id || row.sample_code,
      sample_code: row.sample_code,
      schema_version: '1.0',
      station_id: row.station_id,
      station_name: row.station_name,
      coordinates: [row.longitude, row.latitude],
      collection_time: row.collection_time,
      gps_accuracy_meters: row.gps_accuracy_meters,
      entry_type: row.entry_type,
      collector: row.collector,
      sample_nature: row.sample_nature,
      measurements: row.measurements,
      images: row.images || [],
      status: row.status,
      sync_stage: row.sync_stage
    }));
  } catch (err) {
    console.error('Exception in fetchSamplesFromSupabase:', err);
    return null;
  }
}

/**
 * ลบรายการตัวอย่างคุณภาพน้ำออกจาก Supabase
 */
export async function deleteSampleFromSupabase(sampleCode) {
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'not_configured' };

  try {
    const { error } = await client
      .from('kok_water_samples')
      .delete()
      .eq('sample_code', sampleCode);

    if (error) {
      console.error('Failed to delete sample from Supabase:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('Exception deleting sample from Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * รับการแจ้งเตือน Realtime เมื่อมีตัวอย่างใหม่เข้ามา
 */
export function subscribeToNewSamples(onNewSample) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('kok_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kok_water_samples' },
        (payload) => {
          if (onNewSample) onNewSample(payload);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription not available:', err);
    return () => {};
  }
}

