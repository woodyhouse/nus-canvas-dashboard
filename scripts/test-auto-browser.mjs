// Real Playwright browser, entirely fictional routed Canvas page. No network
// credentials or student accounts. No screenshots/traces/DOM printed.
import { chromium } from 'playwright';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { prepareTokenDialog } from './token-browser.mjs';
import { generateAndStore } from './auto-connect.mjs';
import { storePersonalToken } from './token-input.mjs';
import { accessToken } from './canvas.mjs';

const folder = mkdtempSync(join(tmpdir(), 'canvas-auto-smoke-'));
const config = { base: 'https://canvas.invalid', key: randomBytes(32), storeDir: folder };
const dummy = 'demo_' + 'x'.repeat(60);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: `
    <a href="#" onclick="document.querySelector('form').hidden=false;return false">New access token</a>
    <form hidden onsubmit="event.preventDefault();document.querySelector('[data-testid=visible_token]').hidden=false;this.hidden=true">
      <label>Purpose<input aria-label="Purpose"></label>
      <label>Expiration date<input role="combobox" aria-label="Expiration date" onblur="if(/^\\d{4}-\\d{2}-\\d{2}$/.test(this.value))this.value=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(this.value+'T00:00:00Z'))"></label>
      <label>Expiration time<input role="combobox" aria-label="Expiration time"></label>
      <button>Generate token</button>
    </form><span hidden data-testid="visible_token">${dummy}</span>` }));
  await page.goto(config.base + '/profile/settings');
  const prepared = await prepareTokenDialog(page, { base: config.base, now: '2026-10-12T04:00:00Z' });
  assert.equal(await generateAndStore(page, config, prepared, async () => false), false);
  assert.equal(await page.getByTestId('visible_token').isVisible(), false);
  assert.equal(await generateAndStore(page, config, prepared, async () => true, (c, v) => storePersonalToken(c, v, async (url, options) => {
    assert.equal(url, config.base + '/api/v1/users/self/profile');
    assert.equal(options.headers.Authorization, 'Bearer ' + dummy);
    return new Response(JSON.stringify({ id: 1 }));
  })), true);
  assert.equal(readFileSync(join(folder, 'oauth.enc'), 'utf8').includes(dummy), false);
  assert.equal(await accessToken(config), dummy);
  console.log('Standalone browser smoke passed: form, cancellation, generation, read-only verification, encrypted local storage. Fictional data only.');
} finally { await browser.close(); rmSync(folder, { recursive: true, force: true }); }
