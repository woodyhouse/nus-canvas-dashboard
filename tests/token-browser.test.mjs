import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTokenDialog } from '../scripts/token-browser.mjs';

function fakePage({ loggedIn = true, open = false, badDate = false } = {}) {
  const calls = [];
  let url = 'https://canvas.nus.edu.sg/profile/settings';
  let expiry;
  const page = {
    url: async () => loggedIn ? url : 'https://www.nus.edu.sg/canvas/login/',
    goto: async target => { calls.push(['goto', target]); url = target; },
    getByRole(role, { name }) {
      return {
        isVisible: async () => name === 'Purpose' ? open : true,
        click: async () => { calls.push(['click', name]); open = true; },
        fill: async value => { calls.push(['fill', name, value]); if (name === 'Expiration date') expiry = value; },
        press: async key => calls.push(['press', name, key]),
        evaluate: async () => name === 'Expiration time' ? '00:00' : badDate ? 'invalid' : new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(expiry + 'T00:00:00Z')),
        isEnabled: async () => true,
      };
    },
  };
  return { page, calls };
}

test('prepares deterministic NUS form without generating or reading a token', async () => {
  const { page, calls } = fakePage();
  const result = await prepareTokenDialog(page, { now: '2026-10-12T04:00:00Z' });
  assert.equal(result.status, 'awaiting-confirmation');
  assert.equal(result.expiresAt, '2026-11-11T00:00:00+08:00');
  assert.deepEqual(calls.filter(c => c[0] === 'click'), [['click', 'New access token']]);
});
test('login redirects return a single actionable status', async () => {
  const { page, calls } = fakePage({ loggedIn: false });
  assert.equal((await prepareTokenDialog(page)).status, 'login-required');
  assert.deepEqual(calls.filter(c => c[0] !== 'goto'), []);
});
test('rerun uses open form and refuses an unverified expiry', async () => {
  const { page, calls } = fakePage({ open: true, badDate: true });
  await assert.rejects(prepareTokenDialog(page), /did not accept/);
  assert.deepEqual(calls.filter(c => c[0] === 'click'), []);
});
test('rejects non-HTTPS origins and excessive expiry', async () => {
  const { page } = fakePage();
  await assert.rejects(prepareTokenDialog(page, { base: 'http://example.com' }), /HTTPS/);
  await assert.rejects(prepareTokenDialog(page, { days: 90 }), /89/);
});
