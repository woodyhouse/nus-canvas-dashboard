import { resolve } from 'node:path';
import { startLocalDashboard } from './bootstrap.mjs';
import { root, writeJsonAtomic } from './canvas.mjs';
const receipt=resolve(root,'.local/token-input-status.json');
const status=(state,details={})=>writeJsonAtomic(receipt,{status:state,...details,checkedAt:new Date().toISOString(),pid:process.pid});
try { await startLocalDashboard(status); }
catch { status('failed',{stage:'bootstrap'}); console.error('Local setup could not resume. Check sync/configuration without printing credentials.'); process.exitCode=1; }
