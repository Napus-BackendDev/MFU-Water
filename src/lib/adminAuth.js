import { checkAdminSession, loginAdmin as loginThroughApi, logoutAdminSession } from './supabase.js';

// The browser intentionally stores no role, access token, or session payload.
export function getAdminSession() {
  return null;
}

export function isAdminAuthenticated() {
  return false;
}

export async function verifyAdminSession() {
  return checkAdminSession();
}

export async function loginAdmin({ email, password }) {
  return loginThroughApi({ email, password });
}

export async function logoutAdmin() {
  await logoutAdminSession();
  return { success: true };
}
