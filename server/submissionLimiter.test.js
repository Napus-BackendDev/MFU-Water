import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { submissionLimiter } from './submissionLimiter.js';
function response() {
  const res = new EventEmitter();
  res.status = value => { res.statusCode = value; return res; };
  res.set = () => res;
  res.json = value => { res.body = value; return res; };
  return res;
}
test('submission quota and concurrency reject before upload; finish/close release exactly once', () => {
  let time = 0;
  const guard = submissionLimiter({ maxRequests: 1, maxConcurrent: 1, windowMs: 100, now: () => time });
  let uploads = 0;
  const first = response();
  guard({ ip: 'a' }, first, () => uploads++);
  const full = response();
  guard({ ip: 'b' }, full, () => uploads++);
  assert.equal(full.statusCode, 503);
  first.emit('finish'); first.emit('close');
  const quota = response();
  guard({ ip: 'a' }, quota, () => uploads++);
  assert.equal(quota.statusCode, 429);
  assert.equal(uploads, 1);
  time = 101;
  guard({ ip: 'a' }, response(), () => uploads++);
  assert.equal(uploads, 2);
});
