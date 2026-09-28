import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const googleRequire = createRequire(require.resolve('googleapis-common'));
const uuid = googleRequire('uuid');

test('Google multipart dependency uses patched CommonJS UUID without network access', async () => {
  assert.equal(googleRequire('uuid/package.json').version, '11.1.1');
  assert.match(uuid.v4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const buffer = new Uint8Array(8);
  assert.throws(() => uuid.v5('fixture', uuid.v5.DNS, buffer, 4), RangeError);

  const { createAPIRequest } = require('googleapis-common');
  let requests = 0;
  const auth = { async request(options) {
    requests++;
    assert.equal(options.url, 'https://example.invalid/upload');
    assert.equal(options.params.uploadType, 'multipart');
    const boundary = options.headers['content-type'].match(/boundary=(.+)$/)[1];
    assert.ok(uuid.validate(boundary));
    let body = '';
    for await (const chunk of options.data) body += chunk.toString();
    assert.ok(body.includes(`--${boundary}\r\n`));
    assert.ok(body.endsWith(`--${boundary}--`));
    assert.ok(body.includes('test-evidence-only'));
    assert.ok(body.includes('"fixture":true'));
    return { data: { fixture: true }, status: 200 };
  } };
  const result = await createAPIRequest({
    options: { url: 'https://example.invalid/upload', method: 'POST' },
    context: { _options: {} }, requiredParams: [], pathParams: [],
    mediaUrl: 'https://example.invalid/upload',
    params: { auth, requestBody: { fixture: true }, media: { body: 'test-evidence-only', mimeType: 'text/plain' } }
  });
  assert.equal(requests, 1);
  assert.equal(result.data.fixture, true);
});
