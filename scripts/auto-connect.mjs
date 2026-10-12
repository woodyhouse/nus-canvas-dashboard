import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, environment, writeJsonAtomic } from './canvas.mjs';
import { launchNativeTerminal } from './native-terminal.mjs';
import { prepareTokenDialog } from './token-browser.mjs';
import { storePersonalToken } from './token-input.mjs';
import { startLocalDashboard } from './bootstrap.mjs';

// No agent snapshots, clipboard, browser storage export, tracing or token logs.
export async function generateAndStore(page, config, prepared, confirm, store = storePersonalToken) {
  if (prepared.status !== 'awaiting-confirmation') throw new Error('Form is not ready.');
  if (await page.url() !== config.base + '/profile/settings') throw new Error('Canvas origin changed.');
  if (!(await confirm(prepared))) return false;
  // One attempt only. Never retry generation after an uncertain result.
  if (await page.url() !== config.base + '/profile/settings') throw new Error('Canvas origin changed.');
  await page.getByRole('button', { name: 'Generate token', exact: true }).click();
  const tokenField = page.getByTestId('visible_token');
  await tokenField.waitFor({ state: 'visible', timeout: 30000 });
  if (await page.url() !== config.base + '/profile/settings') throw new Error('Canvas origin changed.');
  let value = (await tokenField.textContent())?.trim() || '';
  try { await store(config, value); }
  finally { value = ''; } // JS strings cannot be guaranteed physically zeroized.
  return true;
}

async function worker() {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('Use a real local terminal.');
  process.env.DEBUG = ''; process.env.PWDEBUG = '0';
  const note = (status, details = {}) => writeJsonAtomic(resolve(root, '.local/token-input-status.json'), { status, ...details, checkedAt: new Date().toISOString(), pid: process.pid });
  const input = createInterface({ input: stdin, output: stdout });
  let browser, phase = 'browser';
  try {
    const config = environment();
    if (existsSync(resolve(root, '.local/oauth.enc')) && !process.argv.includes('--replace')) {
      input.close();
      console.log('Reusing saved credentials. Use --replace only when you intend to create a new token.');
      phase = 'bootstrap'; await startLocalDashboard(note); return;
    }
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ locale: 'en-GB', timezoneId: 'Asia/Singapore' });
    const page = await context.newPage();
    note('waiting-login'); await page.goto(config.base + '/profile/settings');
    console.log('Personal local testing only. Multi-user applications must use approved OAuth.');
    console.log('Complete Canvas login/MFA in this browser. Login cookies are not exported or saved.');
    await page.waitForURL(url => url.origin === config.base && !/^\/login(?:\/|$)/.test(url.pathname), { timeout: 15 * 60 * 1000 });
    await page.goto(config.base + '/profile/settings');
    await page.getByRole('link', { name: 'New access token', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    const prepared = await prepareTokenDialog(page, { base: config.base });
    phase = 'token'; note('awaiting-confirmation', { purpose: prepared.purpose, expiresAt: prepared.expiresAt });
    const accepted = await generateAndStore(page, config, prepared, async details => {
      console.log(`\nCanvas: ${config.base}\nPurpose: ${details.purpose}\nExpires: ${details.expiresAt}`);
      console.log('This token may grant write access. This dashboard uses read-only API queries.');
      console.log('Generate a NEW token and save it encrypted on this computer? Type YES to confirm.');
      return (await input.question('Confirmation: ')).trim() === 'YES';
    });
    input.close();
    if (!accepted) { note('cancelled'); console.log('Cancelled. No token was generated.'); return; }
    note('verified'); console.log('Token verified and encrypted locally. No token was printed or copied.');
    await browser.close(); browser = undefined;
    phase = 'bootstrap'; await startLocalDashboard(note);
  } catch {
    note('failed', { stage: phase });
    console.error(phase === 'browser' ? 'Browser/login setup failed. Install Chromium with npm run canvas:browser:install; retry in your local terminal.' : phase === 'token' ? 'Token creation or verification did not complete. Do not automatically generate another token. Check Canvas settings for an unused token; existing saved credentials were preserved.' : 'Saved credentials retained. Sync/build/start failed; check .local/last-check.json and retry canvas:resume.');
    process.exitCode = 1;
  } finally {
    input.close(); if (browser) await browser.close().catch(() => {});
  }
}

async function main() {
  if (process.argv.includes('--worker')) return worker();
  execFileSync(process.execPath, [resolve(root, 'scripts/setup.mjs')], { cwd: root, stdio: 'ignore' });
  const args = ['--worker', ...(process.argv.includes('--replace') ? ['--replace'] : [])];
  writeJsonAtomic(resolve(root, '.local/token-input-status.json'), { status: 'launching', checkedAt: new Date().toISOString() });
  if (!launchNativeTerminal(fileURLToPath(import.meta.url), root, args)) {
    writeJsonAtomic(resolve(root, '.local/token-input-status.json'), { status: 'launch-failed', checkedAt: new Date().toISOString() });
    console.error('Open your own terminal and run node scripts/auto-connect.mjs --worker. Do not supply confirmation or secrets through an agent tool.');
    process.exitCode = 1;
  } else console.log('Standalone local setup launched. Login and confirmation happen in the user browser/terminal. Agent: read only .local/token-input-status.json.');
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
