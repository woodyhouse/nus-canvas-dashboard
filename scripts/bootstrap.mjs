import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { root } from './canvas.mjs';
import { sync } from './sync.mjs';
export async function bootstrapSteps(steps) {
  steps.status('syncing'); await steps.sync();
  steps.status('building'); await steps.build();
  steps.status('starting'); const url = await steps.launch();
  await steps.check(url); steps.status('ready', { url }); return url;
}
export async function startLocalDashboard(status) {
  let child, exited = false;
  const next = resolve(root, 'node_modules/next/dist/bin/next');
  try {
    const url = await bootstrapSteps({
      status,
      sync,
      build: () => execFileSync(process.execPath, [next, 'build'], { cwd: root, stdio: 'inherit' }),
      launch: async () => {
        // Use an available loopback port; never stop another project's server.
        const probe = createServer();
        await new Promise((ok, fail) => { probe.once('error', fail); probe.listen(0, '127.0.0.1', ok); });
        const port = probe.address().port;
        await new Promise((ok, fail) => probe.close(error => error ? fail(error) : ok()));
        child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: 'inherit' });
        child.once('exit', () => { exited = true; });
        child.once('error', () => { exited = true; });
        return `http://127.0.0.1:${port}`;
      },
      check: async url => {
        const until = Date.now() + 45000;
        while (Date.now() < until && !exited) {
          try { const r = await fetch(url, { signal: AbortSignal.timeout(2000) }); if (r.ok) return; } catch {}
          await new Promise(ok => setTimeout(ok, 500));
        }
        throw new Error('Local dashboard did not become ready.');
      },
    });
    child.once('exit', () => status('stopped', { url }));
    console.log(`Dashboard ready: ${url}\nKeep this terminal open while using the dashboard. The agent can now verify desktop/mobile views.`);
    return url;
  } catch { if (child && !exited) child.kill(); throw new Error('Local sync/build/start failed.'); }
}
