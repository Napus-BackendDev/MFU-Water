import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Git excludes local previews and approval/UI artifacts, not application source', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const excluded = [
    '.codex-preview-local-20260929-gee-errors/index.html',
    '.codex/synthetic-review.json',
    'synthetic.approval.json',
    'synthetic.approval.json.used',
    'api-real-pins-20260929.png',
    'province-boundaries-check.png',
  ];
  const included = ['api/index.js', 'server/geePublicErrors.js', '.env.example', 'public/legend.png'];
  const output = execFileSync('git', ['check-ignore', '--no-index', '--', ...excluded, ...included], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  }).trim().split(/\r?\n/);
  assert.deepEqual(new Set(output), new Set(excluded));
  // Ignore rules cannot remove files that are already tracked.
  const tracked = execFileSync('git', ['ls-files', '--', '.codex*', '*.approval.json*', '*-20260929.png', 'province-*.png'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(tracked.trim(), '', 'internal artifacts must not already be in the index');
});
