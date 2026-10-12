import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { environment, saveTokens, writeJsonAtomic, root } from './canvas.mjs';
import { startLocalDashboard } from './bootstrap.mjs';

// Personal local testing only. Distributed/multi-user apps require Canvas OAuth.
export async function storePersonalToken(config, value, fetcher = fetch) {
  const token = value.trim();
  if (!token || token.length > 4096 || /\s/.test(token)) throw new Error('Invalid token input.');
  const r = await fetcher(config.base + '/api/v1/users/self/profile', {
    headers: { Authorization: `Bearer ${token}` }, redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Canvas did not accept the token (HTTP ${r.status}).`);
  const profile = await r.json();
  if (!profile.id) throw new Error('Canvas profile verification failed.');
  saveTokens(config, { kind: 'personal', access_token: token });
}

export function hiddenInput(input = stdin, output = stdout) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('A real local terminal is required. Do not enter tokens into an agent tool console.');
  }
  return new Promise((resolveInput, reject) => {
    let value = '', settled = false;
    const wasRaw = input.isRaw;
    const end = (error) => {
      if (settled) return;
      settled = true; input.off('data', onData); input.off('end', onEnd);
      input.setRawMode(!!wasRaw); input.pause(); output.write('\n');
      if (error) reject(error); else resolveInput(value);
      value = '';
    };
    const onEnd = () => end(new Error('Input closed.'));
    const onData = (chunk) => {
      // Strip bracketed-paste wrappers without echoing the clipboard contents.
      for (const char of chunk.toString('utf8').replace(/\x1b\[20[01]~/g, '')) {
        if (settled) break;
        if (char === '\x03' || char === '\x04') { end(new Error('Cancelled.')); break; }
        if (char === '\r' || char === '\n') { if (value.trim()) end(); continue; }
        if (char === '\x7f' || char === '\b') { value = value.slice(0, -1); continue; }
        if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) value += char;
        if (value.length > 4096) end(new Error('Input too long.'));
      }
    };
    input.setRawMode(true); input.resume(); input.on('data', onData); input.on('end', onEnd);
  });
}

async function main() {
  const receipt = resolve(root, '.local/token-input-status.json');
  const note = (status, details = {}) => writeJsonAtomic(receipt, { status, ...details, checkedAt: new Date().toISOString(), pid: process.pid });
  let verified = false;
  try {
    const config = environment();
    console.log('Canvas personal LOCAL TESTING setup\nToken is hidden and stored encrypted on this computer only.\nDo not paste it into chat. Multi-user apps must use OAuth.\n');
    console.log('Settings: ' + config.base + '/profile/settings');
    note('waiting'); stdout.write('Paste your token here, then press Enter (input hidden): ');
    let token = await hiddenInput();
    await storePersonalToken(config, token); token = '';
    verified = true; note('verified'); console.log('Token verified and stored locally.');
    if (process.argv.includes('--bootstrap')) await startLocalDashboard(note);
    else console.log('Your agent can now continue sync and deployment.');
  } catch {
    note('failed', { stage: verified ? 'bootstrap' : 'token' });
    console.error(verified ? 'Token stored locally, but sync/build/start failed. Review this terminal and let your agent retry; no token was logged.' : 'Setup cancelled or token verification failed. Existing credentials were preserved. Retry in a local terminal; no token was logged.'); process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
