import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { sendGeeFailure } from './geePublicErrors.js';

test('GEE failures keep supported status codes but expose only fixed no-store messages', async t => {
  const app = express();
  app.get('/:status', (req, res) => sendGeeFailure(res, Number(req.params.status)));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const status of [400, 404, 500, 502, 200, 301, 401, 999]) {
    const response = await fetch(`${origin}/${status}?detail=synthetic-private-detail`);
    assert.equal(response.status, [400, 404, 500, 502].includes(status) ? status : 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ['error']);
    assert.equal(typeof body.error, 'string');
    assert.doesNotMatch(body.error, /synthetic-private-detail|stack|https?:/);
  }
});

test('GEE provider catches and tile callbacks never serialize or log raw errors or tile URLs', () => {
  const source = readFileSync(new URL('./server.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ sendGeeFailure \}/);
  assert.doesNotMatch(source, /console\.error\(/);
  assert.doesNotMatch(source, /console\.log\([^\n]*cachedWaterTileUrl/);
  assert.doesNotMatch(source, /(?:err|normalErr|floodErr)\.message/);
  // Parser validation errors remain useful to users, but only at HTTP 400.
  for (const line of source.split('\n').filter(line => /error\.message/.test(line))) {
    assert.match(line, /res\.status\(400\)\.json\(\{ error: error\.message \}\)/);
  }
});
