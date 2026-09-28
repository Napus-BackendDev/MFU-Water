import { createClient } from '@supabase/supabase-js';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import nodemailer from 'nodemailer';
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { csvCell } from '../src/lib/csvCell.js';
import { submissionLimiter } from './submissionLimiter.js';
import { parseArsenicPpb, publicationStatusFor, publicSampleDto, validateSampleInput } from './waterWatchRules.js';

const PHOTO_BUCKET = 'water-watch-photos';
const ACCESS_COOKIE = 'kok_admin_access';
const REFRESH_COOKIE = 'kok_admin_refresh';
const CSRF_COOKIE = 'kok_admin_csrf';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const loginAttempts = new Map();
const contactRemovalAttempts = new Map();

function safeError(res, status, message) {
  res.set('Cache-Control', 'no-store');
  return res.status(status).json({ error: message });
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const item of raw.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return '';
}

function isSecureRequest(req) {
  return req.secure || process.env.NODE_ENV === 'production';
}

function setCookie(res, req, name, value, maxAge, httpOnly = true) {
  const flags = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/api',
    'SameSite=Strict',
    `Max-Age=${maxAge}`
  ];
  if (httpOnly) flags.push('HttpOnly');
  if (isSecureRequest(req)) flags.push('Secure');
  res.append('Set-Cookie', flags.join('; '));
}

function clearSessionCookies(res, req) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) setCookie(res, req, name, '', 0, true);
}

function csrfSignature(nonce, secret) {
  return createHmac('sha256', secret).update(nonce).digest('hex');
}

function createCsrfToken(secret) {
  const nonce = randomBytes(24).toString('base64url');
  return `${nonce}.${csrfSignature(nonce, secret)}`;
}

function validCsrfToken(token, secret) {
  const [nonce, signature, extra] = String(token || '').split('.');
  if (!nonce || !signature || extra || !/^[A-Za-z0-9_-]{32}$/.test(nonce)) return false;
  const expected = Buffer.from(csrfSignature(nonce, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function ensureSameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}

function getConfig({ publicOnly = false } = {}) {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const csrfSecret = String(process.env.ADMIN_CSRF_SECRET || '');
  if (!url || !serviceKey || (!publicOnly && (!anonKey || csrfSecret.length < 32))) {
    const error = new Error('ระบบบันทึกยังไม่ได้ตั้งค่า Supabase ฝั่งเซิร์ฟเวอร์');
    error.status = 503;
    throw error;
  }
  let parsed;
  try { parsed = new URL(url); } catch {
    const error = new Error('การตั้งค่า Supabase ไม่ถูกต้อง');
    error.status = 503;
    throw error;
  }
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  const allowCloud = process.env.NODE_ENV === 'production';
  if (!isLoopback && !allowCloud) {
    const error = new Error('โหมด development อนุญาตเฉพาะ Supabase บน loopback');
    error.status = 503;
    throw error;
  }
  if (!isLoopback && parsed.protocol !== 'https:') {
    const error = new Error('Supabase Cloud ต้องเชื่อมต่อผ่าน HTTPS');
    error.status = 503;
    throw error;
  }
  return { url, anonKey, serviceKey, csrfSecret };
}

function createClients(config) {
  const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
  return {
    auth: createClient(config.url, config.anonKey, options),
    service: createClient(config.url, config.serviceKey, options)
  };
}

function createPublicClients() {
  const config = getConfig({ publicOnly: true });
  return { service: createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  }) };
}

function getStoragePath(image) {
  if (typeof image === 'string' && !/^https?:\/\//i.test(image)) return image;
  if (!image || typeof image !== 'object') return null;
  if (typeof image.path === 'string') return image.path;
  const value = image.url || image.publicUrl || '';
  const match = String(value).match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/water-watch-photos\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function cleanText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function toPublicDto(row) {
  const privatePaths = Array.isArray(row.private_photo_paths)
    ? row.private_photo_paths
    : (Array.isArray(row.images) ? row.images.map(getStoragePath).filter(Boolean) : []);
  return publicSampleDto({ ...row, private_photo_paths: privatePaths });
}

function toAdminDto(row) {
  return {
    sample_code: row.sample_code,
    station_id: row.station_id,
    station_name: row.station_name,
    coordinates: [row.longitude, row.latitude],
    collection_time: row.collection_time,
    gps_accuracy_meters: row.gps_accuracy_meters,
    entry_type: row.entry_type,
    sample_nature: row.sample_nature,
    measurements: row.measurements,
    arsenic_ppb: row.arsenic_ppb ?? row.measurements?.arsenic?.value ?? null,
    publication_status: row.publication_status,
    revision: row.revision,
    approved_revision: row.approved_revision,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    review_reason: row.review_reason,
    images: (Array.isArray(row.private_photo_paths) ? row.private_photo_paths : (row.images || []).map(getStoragePath).filter(Boolean))
      .map((_, index) => ({ id: `${row.sample_code}-photo-${index + 1}`, title: `หลักฐานภาพ ${index + 1}`, url: `/api/admin/samples/${encodeURIComponent(row.sample_code)}/photos/${index}` }))
  };
}

function localLoginLimited(req) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const attempts = (loginAttempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000);
  if (attempts.length >= 8) {
    loginAttempts.set(key, attempts);
    return true;
  }
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return false;
}

function localRemovalRequestLimited(req) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const attempts = (contactRemovalAttempts.get(key) || []).filter(time => now - time < 60 * 60 * 1000);
  if (attempts.length >= 5) {
    contactRemovalAttempts.set(key, attempts);
    return true;
  }
  attempts.push(now);
  contactRemovalAttempts.set(key, attempts);
  return false;
}

async function sendQueuedEmail(service, transport, message) {
  const { data: activeMember, error: memberError } = await service
    .from('kok_admin_memberships')
    .select('user_id')
    .eq('user_id', message.admin_user_id)
    .eq('active', true)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!activeMember) {
    await service.rpc('finish_water_email', { p_id: message.id, p_sent: false, p_error: 'recipient_inactive', p_skip: true });
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: message.recipient_email,
    subject: message.subject,
    text: message.body_text
  });
  await service.rpc('finish_water_email', { p_id: message.id, p_sent: true, p_error: null, p_skip: false });
}

let emailWorkerStarted = false;
function startEmailWorker(clients) {
  if (emailWorkerStarted || process.env.NODE_ENV !== 'production' || process.env.ENABLE_SMTP_DELIVERY !== 'true') return;
  const required = ['SMTP_HOST', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD'];
  if (required.some(key => !process.env[key])) return;
  emailWorkerStarted = true;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  const tick = async () => {
    const { data, error } = await clients.service.rpc('claim_water_email');
    if (error) return;
    for (const message of data || []) {
      try { await sendQueuedEmail(clients.service, transport, message); }
      catch (err) {
        await clients.service.rpc('finish_water_email', { p_id: message.id, p_sent: false, p_error: 'delivery_failed', p_skip: false }).catch(() => {});
      }
    }
  };
  const timer = setInterval(tick, 15_000);
  timer.unref?.();
}

export function createWaterWatchApi({ startWorker = process.env.NODE_ENV === 'production', publicReadOnly = false, getPublicClients = createPublicClients } = {}) {
  const router = express.Router();
  if (publicReadOnly) {
    router.use((req, res, next) => {
      res.set('Cache-Control', 'no-store');
      if (req.method === 'GET' && req.path === '/auth/session') return res.json({ user: null, readOnly: true });
      const publicPath = /^\/samples(?:\/export|\/[^/]+(?:\/photos\/\d+)?)?$/.test(req.path);
      if (!['GET', 'HEAD'].includes(req.method) || !publicPath) {
        return safeError(res, 405, 'โหมดอ่านอย่างเดียว ไม่รองรับการบันทึกหรือจัดการข้อมูล');
      }
      next();
    });
  }
  const upload = multer({ storage: multer.memoryStorage(), limits: { files: 2, fileSize: 10 * 1024 * 1024, fields: 2, parts: 4 } });

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    next();
  });

  router.get('/security/csrf', (req, res) => {
    try {
      const { csrfSecret } = getConfig();
      const token = createCsrfToken(csrfSecret);
      setCookie(res, req, CSRF_COOKIE, token, 60 * 60, false);
      res.json({ csrfToken: token });
    } catch (error) {
      safeError(res, error.status || 503, error.message);
    }
  });

  const requireCsrf = (req, res, next) => {
    try {
      const { csrfSecret } = getConfig();
      const cookieToken = readCookie(req, CSRF_COOKIE);
      const headerToken = req.get('x-csrf-token') || '';
      if (!ensureSameOrigin(req) || !cookieToken || cookieToken !== headerToken || !validCsrfToken(headerToken, csrfSecret)) {
        return safeError(res, 403, 'คำขอไม่ผ่านการตรวจสอบความปลอดภัย กรุณาโหลดหน้าใหม่');
      }
      next();
    } catch (error) {
      safeError(res, error.status || 503, error.message);
    }
  };

  const requireAdmin = async (req, res, next) => {
    try {
      const config = getConfig();
      const clients = createClients(config);
      let accessToken = readCookie(req, ACCESS_COOKIE);
      if (!accessToken && !readCookie(req, REFRESH_COOKIE)) return safeError(res, 401, 'กรุณาเข้าสู่ระบบผู้ดูแล');
      let { data, error } = accessToken ? await clients.auth.auth.getUser(accessToken) : { data: null, error: true };
      if (error && readCookie(req, REFRESH_COOKIE)) {
        const refreshed = await clients.auth.auth.refreshSession({ refresh_token: readCookie(req, REFRESH_COOKIE) });
        if (!refreshed.error && refreshed.data?.session) {
          accessToken = refreshed.data.session.access_token;
          setCookie(res, req, ACCESS_COOKIE, accessToken, Math.min(refreshed.data.session.expires_in || 3600, COOKIE_MAX_AGE), true);
          setCookie(res, req, REFRESH_COOKIE, refreshed.data.session.refresh_token, COOKIE_MAX_AGE, true);
          ({ data, error } = await clients.auth.auth.getUser(accessToken));
        }
      }
      if (error || !data?.user?.id) {
        clearSessionCookies(res, req);
        return safeError(res, 401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
      const { data: membership, error: membershipError } = await clients.service
        .from('kok_admin_memberships')
        .select('user_id, email, role, active')
        .eq('user_id', data.user.id)
        .eq('active', true)
        .maybeSingle();
      if (membershipError) return safeError(res, 503, 'ตรวจสอบสิทธิ์ผู้ดูแลไม่สำเร็จ');
      if (!membership) {
        clearSessionCookies(res, req);
        return safeError(res, 403, 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลที่ใช้งานอยู่');
      }
      req.admin = { user: data.user, membership, clients };
      next();
    } catch (error) {
      safeError(res, error.status || 503, error.message || 'ตรวจสอบสิทธิ์ไม่สำเร็จ');
    }
  };

  router.post('/auth/login', requireCsrf, async (req, res) => {
    if (localLoginLimited(req)) return safeError(res, 429, 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที');
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || password.length > 1024) return safeError(res, 400, 'กรุณากรอกอีเมลและรหัสผ่าน');
    try {
      const config = getConfig();
      const clients = createClients(config);
      const { data, error } = await clients.auth.auth.signInWithPassword({ email, password });
      if (error || !data?.session || !data.user) return safeError(res, 401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      const { data: membership, error: membershipError } = await clients.service
        .from('kok_admin_memberships').select('user_id, email, role, active')
        .eq('user_id', data.user.id).eq('active', true).maybeSingle();
      if (membershipError) return safeError(res, 503, 'ตรวจสอบสิทธิ์ผู้ดูแลไม่สำเร็จ');
      if (!membership) return safeError(res, 403, 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลที่ใช้งานอยู่');
      setCookie(res, req, ACCESS_COOKIE, data.session.access_token, Math.min(data.session.expires_in || 3600, COOKIE_MAX_AGE), true);
      setCookie(res, req, REFRESH_COOKIE, data.session.refresh_token, COOKIE_MAX_AGE, true);
      res.json({ user: { id: data.user.id, email: membership.email || data.user.email, role: membership.role } });
    } catch (error) {
      safeError(res, error.status || 503, error.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  });

  router.post('/auth/logout', requireCsrf, async (req, res) => {
    const accessToken = readCookie(req, ACCESS_COOKIE);
    const refreshToken = readCookie(req, REFRESH_COOKIE);
    if (accessToken && refreshToken) {
      try {
        const clients = createClients(getConfig());
        const { error: sessionError } = await clients.auth.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!sessionError) await clients.auth.auth.signOut({ scope: 'local' });
      } catch {
        // Clear browser cookies even if Supabase session revocation is unavailable.
      }
    }
    clearSessionCookies(res, req);
    res.json({ success: true });
  });

  router.get('/auth/session', requireAdmin, (req, res) => {
    res.json({ user: { id: req.admin.user.id, email: req.admin.membership.email, role: req.admin.membership.role } });
  });

  router.get('/samples', async (req, res) => {
    try {
      const clients = getPublicClients();
      const { data, error } = await clients.service.from('kok_water_samples')
        .select('sample_code, station_id, station_name, latitude, longitude, collection_time, gps_accuracy_meters, entry_type, sample_nature, measurements, arsenic_ppb, publication_status, revision, approved_revision, private_photo_paths, images')
        .in('publication_status', ['auto_published', 'approved'])
        .order('collection_time', { ascending: false });
      if (error) return safeError(res, 503, 'โหลดผลตรวจที่เผยแพร่ไม่สำเร็จ');
      res.json({ data: (data || []).map(toPublicDto).filter(Boolean) });
    } catch (error) {
      safeError(res, error.status || 503, error.message || 'บริการผลตรวจยังไม่พร้อม');
    }
  });

  router.get('/samples/export', async (req, res) => {
    try {
      const clients = getPublicClients();
      const { data, error } = await clients.service.from('kok_water_samples')
        .select('sample_code, station_id, station_name, latitude, longitude, collection_time, sample_nature, measurements, arsenic_ppb, publication_status, revision, approved_revision, private_photo_paths, images')
        .in('publication_status', ['auto_published', 'approved'])
        .order('collection_time', { ascending: false });
      if (error) return safeError(res, 503, 'ส่งออกผลตรวจที่เผยแพร่ไม่สำเร็จ');
      const rows = (data || []).map(toPublicDto).filter(Boolean).map(sample => [
        sample.sample_code, sample.station_name, sample.coordinates[1], sample.coordinates[0], sample.collection_time,
        sample.contributor_label, sample.sample_nature?.water_source, sample.measurements.arsenic.value, sample.images.length
      ]);
      const csv = ['รหัสตัวอย่าง,จุดตรวจ,ละติจูด,ลองจิจูด,วันเวลา,ผู้ส่งผล,แหล่งน้ำ,สารหนู_ppb,จำนวนรูป', ...rows.map(row => row.map(csvCell).join(','))].join('\r\n');
      res.type('text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="water-watch-published.csv"').send(`\uFEFF${csv}`);
    } catch (error) {
      safeError(res, error.status || 503, error.message || 'ส่งออกข้อมูลไม่สำเร็จ');
    }
  });

  router.get('/samples/:sampleCode', async (req, res) => {
    try {
      const clients = getPublicClients();
      const { data, error } = await clients.service.from('kok_water_samples')
        .select('sample_code, station_id, station_name, latitude, longitude, collection_time, gps_accuracy_meters, entry_type, sample_nature, measurements, arsenic_ppb, publication_status, revision, approved_revision, private_photo_paths, images')
        .eq('sample_code', req.params.sampleCode).in('publication_status', ['auto_published', 'approved']).maybeSingle();
      if (error) return safeError(res, 503, 'โหลดผลตรวจไม่สำเร็จ');
      const dto = data && toPublicDto(data);
      if (!dto) return safeError(res, 404, 'ไม่พบผลตรวจที่เผยแพร่');
      res.json({ data: dto });
    } catch (error) {
      safeError(res, error.status || 503, error.message || 'บริการผลตรวจยังไม่พร้อม');
    }
  });

  const servePhoto = (adminOnly) => async (req, res) => {
    try {
      const clients = adminOnly ? req.admin.clients : getPublicClients();
      const query = clients.service.from('kok_water_samples')
        .select('sample_code, arsenic_ppb, measurements, publication_status, revision, approved_revision, private_photo_paths, images')
        .eq('sample_code', req.params.sampleCode);
      const { data: row, error } = adminOnly ? await query.maybeSingle() : await query.in('publication_status', ['auto_published', 'approved']).maybeSingle();
      if (error) return safeError(res, 503, 'ตรวจสอบสถานะรูปไม่สำเร็จ');
      if (!row || (!adminOnly && !publicSampleDto(row))) {
        return safeError(res, 404, 'ไม่พบรูปหลักฐานที่เผยแพร่');
      }
      const index = Number(req.params.index);
      const paths = Array.isArray(row.private_photo_paths) ? row.private_photo_paths : (row.images || []).map(getStoragePath).filter(Boolean);
      if (!Number.isInteger(index) || index < 0 || index >= paths.length || !paths[index]) return safeError(res, 404, 'ไม่พบรูปหลักฐาน');
      const { data: blob, error: storageError } = await clients.service.storage.from(PHOTO_BUCKET).download(paths[index]);
      if (storageError || !blob) return safeError(res, 404, 'ไม่พบรูปหลักฐาน');
      res.type(blob.type || 'image/jpeg').set('X-Content-Type-Options', 'nosniff');
      res.send(Buffer.from(await blob.arrayBuffer()));
    } catch (error) {
      safeError(res, error.status || 503, 'เปิดรูปหลักฐานไม่สำเร็จ');
    }
  };
  router.get('/samples/:sampleCode/photos/:index', servePhoto(false));

  router.post('/samples', requireCsrf, submissionLimiter(), upload.array('photos', 2), async (req, res) => {
    const uploadedPaths = [];
    try {
      const config = getConfig();
      const clients = createClients(config);
      let record;
      try { record = JSON.parse(req.body?.sample || '{}'); } catch { return safeError(res, 400, 'รูปแบบข้อมูลตัวอย่างไม่ถูกต้อง'); }
      const validationError = validateSampleInput(record);
      if (validationError) return safeError(res, 400, validationError);
      const idempotencyKey = String(req.get('idempotency-key') || '');
      if (!/^[A-Za-z0-9-]{16,80}$/.test(idempotencyKey)) return safeError(res, 400, 'รหัสป้องกันการส่งซ้ำไม่ถูกต้อง');
      const ppb = parseArsenicPpb(record.measurements.arsenic.value);
      const status = publicationStatusFor(ppb);
      const photoPaths = [];
      for (const file of req.files || []) {
        const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 30_000_000 });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
          const error = new Error('รองรับเฉพาะภาพ JPEG, PNG หรือ WebP');
          error.status = 415;
          throw error;
        }
        const cleanImage = await image.rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        const path = `samples/${randomUUID()}.jpg`;
        const { error: uploadError } = await clients.service.storage.from(PHOTO_BUCKET).upload(path, cleanImage, { contentType: 'image/jpeg', upsert: false, cacheControl: '0' });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        photoPaths.push(path);
      }
      const samplePayload = {
        sample_code: `KOK-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`,
        station_id: 'COORDINATE-POINT', station_name: cleanText(record.station_name, 160),
        latitude: Number(record.coordinates[1]), longitude: Number(record.coordinates[0]),
        collection_time: new Date(record.collection_time).toISOString(),
        gps_accuracy_meters: Number.isFinite(Number(record.gps_accuracy_meters)) ? Number(record.gps_accuracy_meters) : null,
        entry_type: ['realtime', 'historical'].includes(record.entry_type) ? record.entry_type : 'realtime',
        sample_nature: {
          water_source: cleanText(record.sample_nature?.water_source, 300),
          water_appearance: cleanText(record.sample_nature?.water_appearance, 200)
        },
        measurements: { arsenic: { value: ppb, unit: 'ppb', status: ppb > 10 ? 'danger' : ppb >= 5 ? 'watch' : 'normal' } },
        arsenic_ppb: ppb,
        publication_status: status,
        revision: 1,
        private_photo_paths: photoPaths
      };
      const contact = {
        name: cleanText(record.collector?.name, 160),
        phone: cleanText(record.collector?.phone, 40)
      };
      const { data, error } = await clients.service.rpc('create_water_sample', {
        p_sample: samplePayload,
        p_contact: contact,
        p_idempotency_key: idempotencyKey,
        p_site_url: String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, ''),
        p_email_enabled: process.env.NODE_ENV === 'production' && process.env.ENABLE_SMTP_DELIVERY === 'true' && ['SMTP_HOST', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD'].every(key => Boolean(process.env[key]))
      });
      if (error) throw error;
      if (data?.duplicate && uploadedPaths.length) {
        await clients.service.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
        uploadedPaths.length = 0;
      }
      res.status(data?.duplicate ? 200 : 201).json({ success: true, status, sample_code: data?.sample_code || samplePayload.sample_code, revision: 1 });
    } catch (error) {
      if (uploadedPaths.length) {
        try {
          const config = getConfig();
          const clients = createClients(config);
          await clients.service.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
        } catch {}
      }
      safeError(res, error.status || 503, error.status ? error.message : 'บันทึกผลตรวจไม่สำเร็จ กรุณาลองใหม่');
    }
  });

  router.post('/contact-removal-requests', requireCsrf, async (req, res) => {
    if (localRemovalRequestLimited(req)) return safeError(res, 429, 'ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
    const sampleCode = cleanText(req.body?.sample_code, 80);
    const reason = cleanText(req.body?.reason, 500);
    if (!sampleCode || reason.length < 3) return safeError(res, 400, 'กรอกรหัสตัวอย่างและเหตุผลอย่างน้อย 3 ตัวอักษร');
    try {
      const clients = createClients(getConfig());
      const { error } = await clients.service.rpc('create_contact_removal_request', {
        p_sample_code: sampleCode,
        p_reason: reason
      });
      if (error) throw error;
      res.status(202).json({ success: true, message: 'รับคำขอแล้ว โดยไม่เปิดเผยว่ารหัสตัวอย่างมีอยู่หรือไม่' });
    } catch (error) {
      safeError(res, error.status || 503, error.status ? error.message : 'รับคำขอลบข้อมูลติดต่อไม่สำเร็จ กรุณาลองใหม่');
    }
  });

  router.get('/admin/samples', requireAdmin, async (req, res) => {
    const { data, error } = await req.admin.clients.service.from('kok_water_samples')
      .select('sample_code, station_id, station_name, latitude, longitude, collection_time, gps_accuracy_meters, entry_type, sample_nature, measurements, arsenic_ppb, publication_status, revision, approved_revision, reviewed_by, reviewed_at, review_reason, private_photo_paths, images')
      .order('collection_time', { ascending: false });
    if (error) return safeError(res, 503, 'โหลดคิวตรวจสอบไม่สำเร็จ');
    res.json({ data: (data || []).map(toAdminDto) });
  });

  router.get('/admin/samples/:sampleCode/contact', requireAdmin, async (req, res) => {
    const { data, error } = await req.admin.clients.service.rpc('read_sample_contact', {
      p_sample_code: req.params.sampleCode,
      p_admin_user_id: req.admin.user.id
    });
    if (error) return safeError(res, 503, 'เปิดข้อมูลติดต่อไม่สำเร็จ');
    if (!data) return safeError(res, 404, 'ไม่พบข้อมูลติดต่อ');
    res.json({ data: { name: data.name || '', phone: data.phone || '' } });
  });

  router.get('/admin/samples/:sampleCode/photos/:index', requireAdmin, servePhoto(true));

  router.post('/admin/samples/:sampleCode/review', requireCsrf, requireAdmin, async (req, res) => {
    const decision = req.body?.decision;
    const revision = Number(req.body?.revision);
    const reason = cleanText(req.body?.reason, 1000);
    if (!['approve', 'reject'].includes(decision) || !Number.isInteger(revision) || revision < 1 || reason.length < 3) return safeError(res, 400, 'ระบุผลพิจารณา revision และเหตุผลให้ครบ');
    const { data, error } = await req.admin.clients.service.rpc(decision === 'approve' ? 'approve_water_sample' : 'reject_water_sample', {
      p_sample_code: req.params.sampleCode,
      p_revision: revision,
      p_admin_user_id: req.admin.user.id,
      p_reason: reason
    });
    if (error) return safeError(res, error.code === '40001' ? 409 : 503, error.code === '40001' ? 'ผลตรวจถูกแก้ไขแล้ว กรุณาโหลดข้อมูลใหม่ก่อนพิจารณา' : 'บันทึกผลพิจารณาไม่สำเร็จ');
    res.json({ success: true, data });
  });

  router.get('/admin/alerts', requireAdmin, async (req, res) => {
    const { data, error } = await req.admin.clients.service.from('kok_admin_alerts')
      .select('id, sample_code, arsenic_ppb, publication_status, created_at, email_status')
      .order('created_at', { ascending: false }).limit(200);
    if (error) return safeError(res, 503, 'โหลดการแจ้งเตือนไม่สำเร็จ');
    res.json({ data: data || [] });
  });

  router.get('/admin/members', requireAdmin, async (req, res) => {
    const { data, error } = await req.admin.clients.service.from('kok_admin_memberships')
      .select('user_id, email, role, active, created_at').order('created_at', { ascending: true });
    if (error) return safeError(res, 503, 'โหลดรายชื่อผู้ดูแลไม่สำเร็จ');
    res.json({ data: data || [] });
  });

  router.post('/admin/members/invite', requireCsrf, requireAdmin, async (req, res) => {
    if (process.env.ENABLE_ADMIN_INVITES !== 'true') return safeError(res, 503, 'ปิดการเชิญผู้ดูแลใน environment นี้');
    const email = cleanText(req.body?.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return safeError(res, 400, 'อีเมลไม่ถูกต้อง');
    const { data: linkData, error: inviteError } = await req.admin.clients.service.auth.admin.generateLink({ type: 'invite', email });
    if (inviteError || !linkData?.properties?.action_link || !linkData.user?.id) return safeError(res, 503, 'สร้างคำเชิญไม่สำเร็จ');
    const { error: queueError } = await req.admin.clients.service.rpc('queue_admin_invitation', {
      p_user_id: linkData.user.id,
      p_email: email,
      p_actor_user_id: req.admin.user.id,
      p_action_link: linkData.properties.action_link
    });
    if (queueError) return safeError(res, queueError.code === '23505' ? 409 : 503, queueError.code === '23505' ? 'อีเมลนี้เป็นผู้ดูแลอยู่แล้ว' : 'บันทึกคำเชิญไม่สำเร็จ');
    res.status(202).json({ success: true, message: 'เพิ่มผู้ดูแลและเข้าคิวส่งคำเชิญแล้ว' });
  });

  router.get('/admin/contact-removal-requests', requireAdmin, async (req, res) => {
    const { data, error } = await req.admin.clients.service.from('kok_contact_removal_requests')
      .select('id, sample_code, reason, status, created_at')
      .eq('status', 'open').order('created_at', { ascending: true }).limit(200);
    if (error) return safeError(res, 503, 'โหลดคำขอลบข้อมูลติดต่อไม่สำเร็จ');
    res.json({ data: data || [] });
  });

  router.post('/admin/contact-removal-requests/:requestId/resolve', requireCsrf, requireAdmin, async (req, res) => {
    const requestId = String(req.params.requestId || '');
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return safeError(res, 400, 'รหัสคำขอไม่ถูกต้อง');
    const reason = cleanText(req.body?.reason, 500);
    if (reason.length < 3) return safeError(res, 400, 'ระบุเหตุผลการจัดการอย่างน้อย 3 ตัวอักษร');
    const { error } = await req.admin.clients.service.rpc('resolve_contact_removal_request', {
      p_request_id: requestId,
      p_admin_user_id: req.admin.user.id,
      p_resolution_reason: reason
    });
    if (error) return safeError(res, error.code === 'P0002' ? 404 : 503, error.code === 'P0002' ? 'ไม่พบคำขอที่ยังเปิดอยู่' : 'จัดการคำขอลบข้อมูลติดต่อไม่สำเร็จ');
    res.json({ success: true });
  });

  router.post('/admin/members/:userId/deactivate', requireCsrf, requireAdmin, async (req, res) => {
    if (req.params.userId === req.admin.user.id) return safeError(res, 400, 'ไม่สามารถถอนสิทธิ์บัญชีที่กำลังใช้งาน');
    const { error } = await req.admin.clients.service.rpc('deactivate_water_admin', {
      p_user_id: req.params.userId, p_actor_user_id: req.admin.user.id
    });
    if (error) return safeError(res, error.code === 'P0001' ? 409 : 503, error.code === 'P0001' ? 'ไม่สามารถถอนสิทธิ์ผู้ดูแลคนสุดท้าย' : 'ถอนสิทธิ์ผู้ดูแลไม่สำเร็จ');
    res.json({ success: true });
  });

  if (startWorker && !publicReadOnly) {
    try { startEmailWorker(createClients(getConfig())); } catch {}
  }
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    safeError(res, 500, 'คำขอไม่สำเร็จ กรุณาลองใหม่');
  });
  return router;
}
