import { createPrivateKey } from 'node:crypto';

// Credentials stay in server memory; parser/provider errors are never logged.
export function loadGeeCredential({ env, readLocal,
  validateKey = key => createPrivateKey(key).asymmetricKeyType === 'rsa' }) {
  let raw;
  if (env.VERCEL === '1') {
    if (env.NODE_ENV !== 'production' || !env.GEE_SERVICE_ACCOUNT_JSON) return null;
    raw = env.GEE_SERVICE_ACCOUNT_JSON;
  } else {
    try { raw = readLocal(); } catch { return null; }
    if (!raw) return null;
  }
  try {
    const value = JSON.parse(raw);
    if (!value || value.type !== 'service_account' ||
        typeof value.client_email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(value.client_email) ||
        typeof value.private_key !== 'string' || !value.private_key.trim() ||
        typeof value.project_id !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(value.project_id) ||
        !validateKey(value.private_key)) return null;
    // Do not forward arbitrary JSON fields such as endpoint overrides.
    return { type: 'service_account', client_email: value.client_email,
      private_key: value.private_key, project_id: value.project_id };
  } catch { return null; }
}

export function initializeGee(ee, credential, { timeoutMs = 15_000 } = {}) {
  if (!credential) return Promise.resolve({ ready: false, clientEmail: '' });
  return new Promise(resolve => {
    let settled = false;
    let authenticating = true;
    const finish = ready => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ready, clientEmail: ready ? credential.client_email : '' });
    };
    const timeout = setTimeout(() => finish(false), timeoutMs);
    try {
      ee.data.authenticateViaPrivateKey(credential, () => {
        if (settled || !authenticating) return;
        authenticating = false;
        try {
          ee.initialize(null, null, () => finish(true), () => finish(false), null, credential.project_id);
        } catch { finish(false); }
      }, () => { if (authenticating) { authenticating = false; finish(false); } });
    } catch { finish(false); }
  });
}
