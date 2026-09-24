import test from 'node:test';
import assert from 'node:assert/strict';
import { readGeeApiResponse } from './geeApiResponse.js';

test('HTML 404 gives restart guidance instead of JSON parse error', async () => {
  const response = new Response('<!DOCTYPE html>', { status: 404, headers: { 'content-type': 'text/html' } });
  await assert.rejects(readGeeApiResponse(response, 'GEE'), /รีสตาร์ต npm run dev/);
});

test('HTML 200 is rejected before parsing JSON', async () => {
  const response = new Response('<!DOCTYPE html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(readGeeApiResponse(response, 'GEE'), /ไม่ใช่ JSON/);
});

test('JSON errors retain the backend message', async () => {
  const response = Response.json({ error: 'GEE ยังไม่พร้อม' }, { status: 503 });
  await assert.rejects(readGeeApiResponse(response, 'GEE'), /GEE ยังไม่พร้อม/);
});

test('valid JSON result is returned', async () => {
  const response = Response.json({ geeConnected: true });
  assert.deepEqual(await readGeeApiResponse(response, 'GEE'), { geeConnected: true });
});
