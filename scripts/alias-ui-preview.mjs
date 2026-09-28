// Local UI fixtures only: no SDK, credentials or database connection.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { publicSampleDto } from '../server/waterWatchRules.js';
const root = resolve(import.meta.dirname, '../dist');
const rows = [0,1].map(index => publicSampleDto({
  sample_code: `ALIAS-UI-TEST-${index}`, station_name: 'ข้อมูลจำลองตรวจชื่อและรูป',
  longitude: 99.8935 + index * 0.02, latitude: 20.048,
  collection_time: new Date().toISOString(), arsenic_ppb: 30,
  publication_status: 'auto_published', revision: 1, approved_revision: 1,
  private_photo_paths: index ? [] : ['fixture'],
}));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1:4182').pathname;
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') { res.statusCode=405; return res.end(); }
  if (pathname === '/api/samples') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({data:rows})); }
  if (pathname === '/api/auth/session') { res.setHeader('Content-Type','application/json'); return res.end('{"user":null,"readOnly":true}'); }
  if (pathname === '/api/samples/ALIAS-UI-TEST-0/photos/0') {
    res.setHeader('Content-Type','image/svg+xml');
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="100"><rect width="220" height="100" fill="#e0edf4"/><text x="15" y="55">UI TEST EVIDENCE ONLY</text></svg>');
  }
  if (pathname.startsWith('/api/')) { res.statusCode=404; return res.end(); }
  try {
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (!file.startsWith(root+sep)) { res.statusCode=403; return res.end(); }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json'})[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode=404; res.end(); }
});
server.listen(4182,'127.0.0.1',()=>console.log('Local alias UI fixtures: http://127.0.0.1:4182/#water-watch'));
setTimeout(()=>{ server.closeAllConnections(); server.close(); }, 10*60*1000).unref();
