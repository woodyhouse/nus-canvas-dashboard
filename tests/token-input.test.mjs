import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { storePersonalToken, hiddenInput } from '../scripts/token-input.mjs';
import { accessToken } from '../scripts/canvas.mjs';
import { bootstrapSteps } from '../scripts/bootstrap.mjs';
test('personal token is verified read-only, encrypted, and reused without OAuth key', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'canvas-token-test-'));
  try {
    const config = {base:'https://canvas.example',key:randomBytes(32),storeDir:dir};
    const value = 'dummy-local-test-credential';
    await storePersonalToken(config, value, async (url, options) => {
      assert.equal(url,'https://canvas.example/api/v1/users/self/profile');
      assert.equal(options.redirect,'error'); assert.equal(options.method,undefined);
      assert.equal(options.headers.Authorization,`Bearer ${value}`);
      return new Response('{"id":123}');
    });
    assert.ok(!readFileSync(join(dir,'oauth.enc'),'utf8').includes(value));
    assert.equal(await accessToken(config),value);
    await assert.rejects(accessToken({...config,base:'https://other.example'}),/origin changed/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('failed verification does not write credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(),'canvas-token-test-'));
  try {
    await assert.rejects(storePersonalToken({base:'https://canvas.example',key:randomBytes(32),storeDir:dir}, 'dummy-test-value',async()=>new Response('',{status:401})),/401/);
    assert.equal(existsSync(join(dir,'oauth.enc')),false);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('hidden input handles paste/backspace and never echoes a secret', async () => {
  const input = new EventEmitter(); input.isTTY=true; input.isRaw=false;
  input.setRawMode=x=>{input.isRaw=x;}; input.resume=()=>{}; input.pause=()=>{};
  let output=''; const pending=hiddenInput(input,{isTTY:true,write:x=>{output+=x;}});
  input.emit('data',Buffer.from('\x1b[200~dummy-test-valueX\x1b[201~\x7f\r'));
  assert.equal(await pending,'dummy-test-value'); assert.equal(output,'\n'); assert.equal(input.isRaw,false);
});
test('agent pipes cannot be used for secret entry',()=>{
  assert.throws(()=>hiddenInput({isTTY:false},{isTTY:false}),/real local terminal/);
});
test('bootstrap automatically syncs, builds, launches and verifies in order', async()=>{
  const calls=[];
  const url=await bootstrapSteps({status:s=>calls.push(s),sync:async()=>calls.push('GET sync'),build:()=>calls.push('build'),launch:async()=>{calls.push('launch');return 'http://127.0.0.1:12345';},check:async()=>calls.push('HTTP ready')});
  assert.equal(url,'http://127.0.0.1:12345');
  assert.deepEqual(calls,['syncing','GET sync','building','build','starting','launch','HTTP ready','ready']);
});
test('failed sync cannot advance to build or ready',async()=>{
  const calls=[];
  await assert.rejects(bootstrapSteps({status:s=>calls.push(s),sync:async()=>{throw new Error('failure');},build:()=>calls.push('build')}),/failure/);
  assert.deepEqual(calls,['syncing']);
});
