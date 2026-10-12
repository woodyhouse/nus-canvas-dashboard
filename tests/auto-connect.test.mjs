import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAndStore } from '../scripts/auto-connect.mjs';
const config = { base: 'https://canvas.invalid' };
const prepared = { status: 'awaiting-confirmation', purpose: 'Test only' };
function fixture() {
  const calls = [];
  return { calls, page: {
    url: async () => config.base + '/profile/settings',
    getByRole: () => ({ click: async () => calls.push('generate') }),
    getByTestId: id => { assert.equal(id, 'visible_token'); return { waitFor: async () => {}, textContent: async () => { calls.push('read-local'); return 'demo-token'; } }; },
  } };
}
test('cancelled confirmation never generates or reads a credential', async () => {
  const { page, calls } = fixture();
  assert.equal(await generateAndStore(page, config, prepared, async () => false), false);
  assert.deepEqual(calls, []);
});
test('confirmed handoff stores locally and returns no secret', async () => {
  const { page, calls } = fixture();
  const result = await generateAndStore(page, config, prepared, async () => true, async (receivedConfig, value) => {
    assert.equal(receivedConfig, config); assert.equal(value, 'demo-token'); calls.push('store');
  });
  assert.equal(result, true);
  assert.deepEqual(calls, ['generate', 'read-local', 'store']);
});
test('changed origin after confirmation prevents generation', async () => {
  const { page, calls } = fixture();
  await assert.rejects(generateAndStore(page, config, prepared, async () => { page.url = async () => 'https://other.invalid'; return true; }), /origin changed/);
  assert.deepEqual(calls, []);
});
test('storage failure never retries generation', async () => {
  const { page, calls } = fixture();
  await assert.rejects(generateAndStore(page, config, prepared, async () => true, async () => { throw new Error('Failed'); }));
  assert.equal(calls.filter(c => c === 'generate').length, 1);
});
