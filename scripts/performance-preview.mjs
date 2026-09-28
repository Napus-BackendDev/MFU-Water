// Isolated production-build benchmark. Never imports server configuration or Supabase.
import { createServer } from 'node:http';
import { readFile, cp, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const capture = process.argv.includes('--capture');
const phase = process.argv.includes('--before') ? 'before' : 'after';
const output = resolve(root, 'performance-check.local', phase);
if (capture) {
  await mkdir(resolve(root, 'performance-check.local'), { recursive: true });
  const refresh = phase === 'after' && process.argv.includes('--refresh');
  await cp(resolve(root, 'dist'), output, { recursive: true, errorOnExist: !refresh, force: refresh });
  console.log(`Captured ${phase} build`);
} else {
  const port = phase === 'before' ? 4775 : 4776;
  const empty = { type: 'FeatureCollection', features: [] };
  const style = { version: 8, sources: { empty: { type: 'geojson', data: empty } }, layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#eef4ef' } },
    { id: 'boundary-country:outline', type: 'line', source: 'empty' }
  ] };
  const measurement = `<script>
    const started = performance.now();
    const report = document.createElement('output'); report.id='performance-report'; report.hidden=true;
    document.addEventListener('DOMContentLoaded',()=>document.body.append(report));
    new MutationObserver(()=>{
      if (!document.querySelector('[aria-label="เลือกพื้นที่แผนที่"]') || !document.querySelector('[data-area-label="north"]')) return;
      if (report.dataset.ready) return;
      report.dataset.ready='true';
      report.textContent=JSON.stringify({readyMs:Math.round(performance.now()-started),resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')&&e.name.endsWith('.js')).map(e=>({name:e.name.split('/').pop(),bytes:e.decodedBodySize})),externalProvider:'isolated local style'});
    }).observe(document.documentElement,{childList:true,subtree:true});
  </script>`;
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
        if (url.pathname === '/api/samples') return res.end('{"data":[]}');
        res.statusCode=401; return res.end('{"error":"Isolated benchmark"}');
      }
      if (url.pathname === '/__perf/style.json') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(style)); }
      const path = resolve(output, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      if (!path.startsWith(output + sep)) { res.statusCode=403; return res.end(); }
      let data = await readFile(path);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', ({ '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.geojson':'application/json', '.json':'application/json' })[extname(path)] || 'application/octet-stream');
      if (extname(path)==='.js') data = data.toString().replaceAll('https://vector.openstreetmap.org/styles/shortbread/colorful.json','/__perf/style.json');
      if (extname(path)==='.html') data=data.toString().replace(/<link[^>]+href="https:[^>]+>/g,'').replace('<head>', '<head>'+measurement);
      // External tiles/fonts are excluded consistently from both measurements.
      res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:");
      res.end(data);
    } catch { res.statusCode=404; res.end('Not found'); }
  }).listen(port, '127.0.0.1', () => console.log(`Isolated ${phase} benchmark http://127.0.0.1:${port}/#water-watch`));
}
