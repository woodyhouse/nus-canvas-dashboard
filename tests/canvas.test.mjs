import test from 'node:test';
import assert from 'node:assert/strict';
import { getAll } from '../scripts/canvas.mjs';
import { assignmentEvent, wall } from '../scripts/sync.mjs';
test('UTC deadlines become Singapore wall time', () => { assert.deepEqual(wall('2026-10-17T15:59:59Z'), { date:'2026-10-17', time:'23:59' }); });
test('class aggregate submission flag never implies personal submission', () => {
  assert.equal(assignmentEvent('DEMO', { id:1, name:'a', due_at:'2026-10-17T15:59:59Z', has_submitted_submissions:true }).status,'upcoming');
  assert.equal(assignmentEvent('DEMO', { id:1, name:'a', due_at:'2026-10-17T15:59:59Z', submission:{submitted_at:'2026-10-01T01:00:00Z'} }).status,'history');
});
test('missing deadline is pending', () => { assert.equal(assignmentEvent('DEMO', {id:1,name:'a'}).date,null); });
test('pagination is GET-only and token never follows another origin', async () => {
  const calls = [];
  const fake = async (url, options) => { calls.push({url,options}); return new Response('[{"id":1}]', {headers:{link:'<https://evil.example/api/v1/courses>; rel="next"'}}); };
  await assert.rejects(getAll('https://canvas.example','test-token','/courses',fake), /off-origin/);
  assert.equal(calls.length,1); assert.equal(calls[0].options.method,undefined); assert.equal(calls[0].options.redirect,'error');
});
test('pagination collects all pages', async () => {
  let n=0;
  const fake = async () => new Response(JSON.stringify([{id:++n}]), {headers:n===1?{link:'<https://canvas.example/api/v1/courses?page=2>; rel="next"'}:{}});
  assert.equal((await getAll('https://canvas.example','test-token','/courses',fake)).length,2);
});
