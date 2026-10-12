import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { environment, saveTokens } from './canvas.mjs';
const config = environment();
if (!config.clientId || !config.clientSecret) throw new Error('An institution-approved OAuth Developer Key is required. Configure .env.local; do not paste credentials into chat.');
const redirect = new URL(config.redirect);
if (redirect.hostname !== '127.0.0.1' || redirect.protocol !== 'http:' || redirect.pathname !== '/callback') throw new Error('This local CLI supports only http://127.0.0.1:PORT/callback, registered exactly with the administrator.');
const state = randomBytes(32).toString('hex');
const authorize = new URL(config.base + '/login/oauth2/auth');
authorize.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', redirect_uri: config.redirect, state }).toString();
let done = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, config.redirect);
  if (req.headers.host !== redirect.host || req.method !== 'GET' || url.pathname !== '/callback') { res.writeHead(404).end(); return; }
  const input = Buffer.from(url.searchParams.get('state') || '');
  const expected = Buffer.from(state);
  if (done || input.length !== expected.length || !timingSafeEqual(input, expected)) { res.writeHead(403).end('Invalid or expired OAuth state.'); return; }
  done = true;
  try {
    if (!url.searchParams.get('code') || url.searchParams.has('error')) throw new Error('Authorization denied.');
    const r = await fetch(config.base + '/login/oauth2/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), body: new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirect, code: url.searchParams.get('code') }) });
    if (!r.ok) throw new Error(`Token exchange failed (${r.status}).`);
    const tokens = await r.json();
    if (!tokens.access_token) throw new Error('No access token returned.');
    saveTokens(config, tokens);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>Canvas connected</h1><p>You can close this page. Run npm run canvas:sync.</p>');
    console.log('Canvas authorization stored locally. Run npm run canvas:sync.');
  } catch { res.writeHead(400).end('Authorization failed. Check administrator configuration; no credentials were logged.'); console.error('OAuth failed; check configuration and try again.'); process.exitCode = 1; }
  finally { clearTimeout(expiry); server.close(); }
});
const expiry = setTimeout(() => { console.error('OAuth authorization timed out.'); server.close(); process.exitCode = 1; }, 10 * 60 * 1000);
server.listen(Number(redirect.port), '127.0.0.1', () => console.log(`Open this Canvas authorization link in your browser and approve access:\n${authorize.href}\nThe login and authorization must be completed by you. This link expires in 10 minutes.`));
