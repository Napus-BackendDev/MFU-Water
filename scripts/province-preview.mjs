// Local frontend verification only; never imports backend configuration or SDKs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '../dist');
const offline = process.argv.includes('--offline-style');
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1:4777').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/__province/style.json' && offline) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ version: 8, sources: {
        countries: { type: 'geojson', data: '/data/boundaries/se-asia-countries.geojson' }
      }, layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#bddbea' } },
        { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#e7f0e1' } },
        { id: 'boundary-country:outline', type: 'line', source: 'countries', paint: { 'line-color': '#64748b' } }
      ] }));
    }
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      if (pathname === '/api/samples') return res.end('{"data":[]}');
      res.statusCode = 401; return res.end('{"error":"Local frontend verification"}');
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (!file.startsWith(root + sep)) { res.statusCode = 403; return res.end(); }
    res.setHeader('Content-Type', { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.geojson':'application/json', '.json':'application/json' }[extname(file)] || 'application/octet-stream');
    let data = await readFile(file);
    if (offline && extname(file) === '.js') data = data.toString().replaceAll('/data/boundaries/shortbread-colorful.style.json', '/__province/style.json');
    res.end(data);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(4777, '127.0.0.1', () => console.log('Province preview: http://127.0.0.1:4777 (mock public API, no database)'));
