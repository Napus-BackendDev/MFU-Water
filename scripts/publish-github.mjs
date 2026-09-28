// Run only through the workspace execution guard with explicit GitHub authorization.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const repository = 'Napus-BackendDev/MFU-Water';
const branch = 'mfu-water-update-20260929';
const git = 'C:/Program Files/Git/cmd/git.exe';
const gh = 'C:/Program Files/GitHub CLI/gh.exe';
const mode = process.argv[2];
if (!['check', 'commit', 'push'].includes(mode)) throw new Error('expected_check_commit_or_push');
const run = (exe, args) => execFileSync(exe, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const g = (...args) => run(git, args);
const hash = data => createHash('sha256').update(data).digest('hex');
const forbidden = /(?:^|\/)(?:\.codex[^/]*|\.agents|\.vercel|node_modules|dist|scratch)(?:\/|$)|(?:^|\/)\.env(?!\.example$)|service-account|\.approval\.json|\.log$/i;
const allowedNew = /^(?:src\/|api\/.*\.js$|server\/(?:.*\.(?:js|mjs)$|data\/.*\.geojson$)|supabase\/(?:migrations\/.*\.sql|schema\.sql)$|scripts\/.*\.(?:mjs|js|ps1)$|public\/(?:data\/boundaries\/|kok-river-source\.)|\.vercelignore$|PRODUCTION-READINESS\.md$)/;
const secrets = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/, /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sb_secret_[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/];
function safeFile(path) {
  if (forbidden.test(path)) throw new Error(`excluded_path:${path}`);
  const full = resolve(root, path);
  if (!full.startsWith(root + sep) || realpathSync(full) !== full) throw new Error(`path_escape:${path}`);
  let cursor = root;
  for (const part of path.split('/')) {
    cursor = resolve(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`symlink_denied:${path}`);
  }
  const content = readFileSync(full);
  if (content.length > 100 * 1024 * 1024) throw new Error(`github_file_too_large:${path}`);
  if (!content.subarray(0, 8192).includes(0) && secrets.some(pattern => pattern.test(content.toString('utf8')))) throw new Error(`secret_detected:${path}`);
  return { path, digest: hash(content), blob: g('hash-object', `--path=${path}`, '--', path), bytes: content.length };
}
const user = JSON.parse(run(gh, ['api', 'user']));
const repo = JSON.parse(run(gh, ['api', `repos/${repository}`]));
if (user.login.toLowerCase() !== 'napus-backenddev' || repo.owner.login.toLowerCase() !== 'napus-backenddev') throw new Error('github_identity_mismatch');
if (g('remote', 'get-url', 'origin') !== `https://github.com/${repository}.git`) throw new Error('remote_mismatch');
if (g('diff', '--cached', '--name-only')) throw new Error('existing_staged_changes_preserved');
const tracked = g('ls-files', '-z').split('\0').filter(Boolean);
const added = g('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(path => path && allowedNew.test(path) && !forbidden.test(path));
const files = [...new Set([...tracked, ...added])].map(safeFile);
console.log(JSON.stringify({ repository, branch, actor: user.login, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), secretScan: 'passed', mode }));
if (mode === 'check') process.exit(0);
if (mode === 'commit') {
  for (const file of files) if (hash(readFileSync(resolve(root, file.path))) !== file.digest) throw new Error(`CONCURRENT_MODIFICATION_DETECTED:${file.path}`);
  g('add', '--', ...files.map(file => file.path));
  const staged = g('diff', '--cached', '--name-only', '-z').split('\0').filter(Boolean);
  for (const path of staged) {
    const expected = files.find(file => file.path === path);
    if (!expected || g('rev-parse', `:${path}`) !== expected.blob) throw new Error(`staged_content_mismatch:${path}`);
  }
  if (!staged.length) throw new Error('nothing_to_commit');
  g('-c', `user.name=${user.login}`, '-c', `user.email=${user.id}+${user.login}@users.noreply.github.com`, 'commit', '-m', 'feat: update water watch maps, privacy and API readiness');
  console.log(JSON.stringify({ commit: g('rev-parse', 'HEAD'), changedFiles: staged.length }));
} else {
  const expected = process.argv[3];
  if (!/^[0-9a-f]{40}$/.test(expected || '') || g('rev-parse', 'HEAD') !== expected) throw new Error('exact_commit_required');
  if (g('diff', '--name-only') || added.length) throw new Error('source_changed_after_commit');
  // gh provides HTTPS credentials to Git directly; no token is read or logged here.
  g('-c', 'credential.helper=', '-c', `credential.helper=!"${gh}" auth git-credential`, 'push', 'origin', `${expected}:refs/heads/${branch}`);
  console.log(JSON.stringify({ pushed: true, commit: expected, branch }));
}
