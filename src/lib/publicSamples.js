// Public reads use Express only. Never import the privileged/legacy SDK path here.
export async function publicRequest(path, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(path, { signal, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    const error = new Error('หน้านี้ยังไม่ได้เชื่อม Express API: ได้หน้า HTML แทนข้อมูลผลตรวจ กรุณาเปิดผ่านเซิร์ฟเวอร์ API ไม่ใช่ตัว preview เก่า');
    error.code = 'API_NOT_JSON';
    throw error;
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('API ส่ง JSON ไม่สมบูรณ์ กรุณาลองใหม่'); }
  if (!response.ok) throw new Error(result?.error || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
  return result;
}

export async function fetchSamplesFromSupabase(options) {
  const result = await publicRequest('/api/samples', options);
  if (!Array.isArray(result?.data)) throw new Error('API ส่งรายการผลตรวจไม่ถูกต้อง');
  return result.data.filter(sample => {
    const value = sample.measurements?.arsenic?.value ?? sample.arsenic_ppb;
    const ppb = value === null || value === '' || value === undefined ? NaN : Number(value);
    if (!Number.isFinite(ppb) || ppb < 0) return false;
    if (sample.publication_status === 'auto_published') return ppb <= 50;
    // Express checks approved_revision before building the public DTO.
    return sample.publication_status === 'approved' && (!Object.hasOwn(sample, 'approved_revision') || sample.approved_revision === sample.revision);
  });
}

export async function checkPublicAdminSession(options) {
  try { return await publicRequest('/api/auth/session', options); } catch { return null; }
}

export async function downloadPublishedExport() {
  const response = await fetch('/api/samples/export', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('ส่งออกข้อมูลไม่สำเร็จ');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = 'water-watch-published.csv';
  try { document.body.appendChild(link); link.click(); return link.download; }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
