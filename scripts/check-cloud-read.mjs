import { pathToFileURL } from 'node:url';

export async function checkCloudRead({ env = process.env, expectedHost, fetchImpl = fetch } = {}) {
  if (env.NODE_ENV !== 'production') throw new Error('production_mode_required');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('server_credentials_missing');
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
    || !/^([a-z0-9]+)\.supabase\.co$/.test(url.hostname) || url.hostname !== expectedHost
    || !['', '/'].includes(url.pathname)) throw new Error('approved_target_mismatch');

  const counts = {};
  for (const status of ['all', 'auto_published', 'approved', 'pending_review', 'rejected', 'withdrawn']) {
    const requestUrl = new URL('/rest/v1/kok_water_samples', url);
    requestUrl.searchParams.set('select', 'sample_code');
    if (status !== 'all') requestUrl.searchParams.set('publication_status', `eq.${status}`);
    const response = await fetchImpl(requestUrl, {
      method: 'HEAD', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'count=exact', Range: '0-0', Accept: 'application/json'
      }
    });
    if (!response.ok) {
      // Never print database messages, headers, URLs, records, or credentials.
      throw new Error(`read_failed_http_${response.status}`);
    }
    const total = response.headers.get('content-range')?.split('/')[1];
    if (!/^\d+$/.test(total || '')) throw new Error('exact_count_unavailable');
    counts[status] = Number(total);
  }
  return { environment: 'production', readOnly: true, connection: 'ok', counts,
    note: 'Approved count is workflow status only; the website also checks revision and publication rules.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--expected-host');
  try {
    const result = await checkCloudRead({ expectedHost: index >= 0 ? process.argv[index + 1] : undefined });
    console.log(JSON.stringify(result));
  } catch (error) {
    const safeCode = /^(production_mode_required|server_credentials_missing|approved_target_mismatch|exact_count_unavailable|read_failed_http_\d{3})$/.test(error.message)
      ? error.message : 'connection_failed';
    console.error(JSON.stringify({ environment: 'production', readOnly: true, error: safeCode }));
    process.exitCode = 1;
  }
}
