const RETRY_KEY = 'mfu_chunk_recovery_at';
const RETRY_WINDOW_MS = 30000;

export function routeFromHash(hash) {
  return ({ '#sentinel-compare': 'analysis', '#admin': 'admin', '#login': 'admin', '#google-3d': 'google' })[hash.split('?')[0]] || 'water';
}

export function recoveryUrl(href, now = Date.now()) {
  const url = new URL(href);
  // Remove only the malformed retry suffixes produced by the previous error screen.
  url.hash = url.hash.replace(/(?:\?(?:r|reset)=\d+)+$/, '') || '#water-watch';
  url.searchParams.set('_app_reload', String(now));
  return url.href;
}

export function isChunkLoadError(error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(error?.message || String(error));
}

export function recoverStaleChunk(error, browser = window, now = Date.now()) {
  if (!isChunkLoadError(error)) return false;
  try {
    const previous = Number(browser.sessionStorage.getItem(RETRY_KEY));
    if (previous > 0 && now - previous < RETRY_WINDOW_MS) return false;
    browser.sessionStorage.setItem(RETRY_KEY, String(now));
  } catch {
    // Without storage, a marker in the URL still prevents a reload loop.
    const previous = Number(new URL(browser.location.href).searchParams.get('_app_reload'));
    if (previous > 0 && now - previous < RETRY_WINDOW_MS) return false;
  }
  browser.location.replace(recoveryUrl(browser.location.href, now));
  return true;
}
