import { createClient } from '@supabase/supabase-js';

const url = String(process.env.SUPABASE_URL || '').trim();
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const userId = String(process.env.SEED_ADMIN_USER_ID || '').trim();
const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();

if (!url || !serviceKey || !userId || !email) throw new Error('Required server environment is missing');
const parsed = new URL(url);
const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
const cloudBootstrapApproved = process.env.NODE_ENV === 'production' && process.env.ALLOW_CLOUD_ADMIN_BOOTSTRAP === 'I_APPROVE_FIRST_ADMIN_BOOTSTRAP';
if (!isLoopback && !cloudBootstrapApproved) throw new Error('Cloud bootstrap requires production mode and explicit ALLOW_CLOUD_ADMIN_BOOTSTRAP approval');
if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('SEED_ADMIN_USER_ID or SEED_ADMIN_EMAIL is invalid');

const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: authUser, error: authError } = await service.auth.admin.getUserById(userId);
if (authError || authUser?.user?.email?.toLowerCase() !== email) throw new Error('The specified user must already exist in Supabase Auth with the same email');

const { error } = await service.rpc('bootstrap_first_water_admin', { p_user_id: userId, p_email: email });
if (error) throw new Error('Unable to bootstrap the first local administrator membership');
process.stdout.write(`Created first administrator membership in ${isLoopback ? 'loopback' : 'approved production'} Supabase.\n`);
