import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function environment() {
  const env = resolve(root, '.env.local');
  if (existsSync(env)) process.loadEnvFile(env);
  const base = new URL(process.env.CANVAS_BASE_URL || 'https://canvas.nus.edu.sg');
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/') throw new Error('Canvas URL must be an HTTPS origin without credentials or path.');
  const key = process.env.CANVAS_STORE_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Run npm run setup, then configure .env.local.');
  return { base: base.origin, key: Buffer.from(key, 'hex'), clientId: process.env.CANVAS_CLIENT_ID, clientSecret: process.env.CANVAS_CLIENT_SECRET, redirect: process.env.CANVAS_REDIRECT_URI || 'http://127.0.0.1:8787/callback' };
}
export function saveTokens(config, tokens) {
  mkdirSync(resolve(root, '.local'), { recursive: true, mode: 0o700 });
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify({ ...tokens, origin: config.base, expires_at: Date.now() + (tokens.expires_in || 3600) * 1000 })), cipher.final()]);
  writeFileSync(resolve(root, '.local/oauth.enc'), JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: payload.toString('hex') }), { mode: 0o600 });
}
export async function accessToken(config) {
  const saved = JSON.parse(readFileSync(resolve(root, '.local/oauth.enc'), 'utf8'));
  const decipher = createDecipheriv('aes-256-gcm', config.key, Buffer.from(saved.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(saved.tag, 'hex'));
  const tokens = JSON.parse(Buffer.concat([decipher.update(Buffer.from(saved.data, 'hex')), decipher.final()]).toString());
  if (tokens.origin !== config.base) throw new Error('Canvas origin changed; authorize again.');
  if (tokens.expires_at > Date.now() + 60000) return tokens.access_token;
  const r = await fetch(config.base + '/login/oauth2/token', { method: 'POST', redirect: 'error', body: new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: tokens.refresh_token, redirect_uri: config.redirect }) });
  if (!r.ok) throw new Error(`OAuth refresh failed (${r.status}); authorize again.`);
  const fresh = await r.json();
  saveTokens(config, { ...fresh, refresh_token: fresh.refresh_token || tokens.refresh_token });
  return fresh.access_token;
}
export async function getAll(base, token, path, fetcher = fetch) {
  let next = new URL(base + '/api/v1' + path); const rows = [];
  const visited = new Set();
  while (next) {
    if (next.origin !== base || !next.pathname.startsWith('/api/v1/')) throw new Error('Refusing off-origin Canvas pagination.');
    if (visited.has(next.href)) throw new Error('Canvas pagination loop.');
    visited.add(next.href);
    const r = await fetcher(next.href, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!r.ok) { const error = new Error(`Canvas GET ${next.pathname} failed (${r.status}).`); error.status = r.status; throw error; }
    const value = await r.json(); rows.push(...(Array.isArray(value) ? value : [value]));
    const link = r.headers.get('link') || '';
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? new URL(match[1], base) : null;
  }
  return rows;
}
export function writeJsonAtomic(path, value) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(path + '.tmp', path);
}
