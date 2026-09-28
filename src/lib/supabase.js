// Compatibility exports: browser operations use the same-origin Express API only.
import { fetchSamplesFromSupabase, downloadPublishedExport } from './publicSamples.js';
export { fetchSamplesFromSupabase, downloadPublishedExport };
let csrfToken = '';
let csrfExpiresAt = 0;
let csrfRequest = null;
export function getSupabaseCredentials() { return { url: '', anonKey: '' }; }
export function getSupabaseClient() { return null; }
export function isSupabaseConfigured() { return true; }
async function getCsrfToken() {
  if (csrfToken && Date.now() < csrfExpiresAt) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch('/api/security/csrf', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.csrfToken) throw new Error(payload?.error || 'เชื่อมต่อระบบความปลอดภัยไม่สำเร็จ');
        csrfToken = payload.csrfToken;
        csrfExpiresAt = Date.now() + 50 * 60 * 1000;
        return csrfToken;
      }).finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}
async function apiRequest(path, { method = 'GET', body, formData, idempotencyKey } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = await getCsrfToken();
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (!formData) headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(path, {
    method, headers, credentials: 'same-origin', cache: 'no-store',
    body: formData || (body === undefined ? undefined : JSON.stringify(body))
  });
  const payload = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok || !payload) {
    if ([403, 503].includes(response.status)) { csrfToken = ''; csrfExpiresAt = 0; }
    throw new Error(payload?.error || 'คำขอไม่สำเร็จ กรุณาลองใหม่');
  }
  return payload;
}
async function apiList(path) {
  const result = await apiRequest(path);
  if (!Array.isArray(result.data)) throw new Error('API ส่งรายการไม่ถูกต้อง');
  return result.data;
}
export async function uploadSampleImage() { throw new Error('รูปหลักฐานต้องส่งพร้อมผลตรวจผ่าน API ที่ปลอดภัย'); }
export async function saveSampleToSupabase(record, photos = [], idempotencyKey = crypto.randomUUID()) {
  const formData = new FormData();
  formData.set('sample', JSON.stringify(record));
  for (const photo of photos) formData.append('photos', photo, 'evidence.jpg');
  return { success: true, data: await apiRequest('/api/samples', { method: 'POST', formData, idempotencyKey }) };
}
export function fetchAdminSamples() { return apiList('/api/admin/samples'); }
export async function fetchAdminContact(code) { return (await apiRequest(`/api/admin/samples/${encodeURIComponent(code)}/contact`)).data; }
export function reviewAdminSample(code, { decision, revision, reason }) {
  return apiRequest(`/api/admin/samples/${encodeURIComponent(code)}/review`, { method: 'POST', body: { decision, revision, reason } });
}
export function fetchAdminAlerts() { return apiList('/api/admin/alerts'); }
export function fetchAdminMembers() { return apiList('/api/admin/members'); }
export function fetchContactRemovalRequests() { return apiList('/api/admin/contact-removal-requests'); }
export function requestContactRemoval({ sampleCode, reason }) { return apiRequest('/api/contact-removal-requests', { method: 'POST', body: { sample_code: sampleCode, reason } }); }
export function resolveContactRemovalRequest(id, reason) { return apiRequest(`/api/admin/contact-removal-requests/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: { reason } }); }
export function inviteAdmin(email) { return apiRequest('/api/admin/members/invite', { method: 'POST', body: { email } }); }
export function deactivateAdmin(id) { return apiRequest(`/api/admin/members/${encodeURIComponent(id)}/deactivate`, { method: 'POST', body: {} }); }
export async function deleteSampleFromSupabase() { throw new Error('การลบผลตรวจปิดไว้เพื่อรักษาหลักฐานและประวัติการตรวจ'); }
export async function loginAdmin({ email, password }) {
  const result = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
  if (!result.user) throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล');
  return { success: true, session: { user: result.user } };
}
export async function checkAdminSession() {
  try { const result = await apiRequest('/api/auth/session'); return result.user ? { user: result.user } : null; }
  catch { return null; }
}
export async function logoutAdminSession() {
  await apiRequest('/api/auth/logout', { method: 'POST', body: {} });
  csrfToken = ''; csrfExpiresAt = 0;
}
export function subscribeToNewSamples(onNewSample, intervalMs = 30_000) {
  let previousCodes = null;
  let stopped = false;
  let timer;
  const poll = async () => {
    try {
      const samples = await fetchSamplesFromSupabase();
      if (!stopped) {
        const nextCodes = new Set(samples.map(item => item.sample_code));
        if (previousCodes) for (const sample of samples) if (!previousCodes.has(sample.sample_code)) onNewSample?.({ eventType: 'INSERT', new: sample });
        previousCodes = nextCodes;
      }
    } catch { /* Retry without modifying current records. */ }
    if (!stopped) timer = setTimeout(poll, intervalMs);
  };
  poll();
  return () => { stopped = true; clearTimeout(timer); };
}
