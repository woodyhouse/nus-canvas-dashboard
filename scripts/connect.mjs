import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { root, environment, writeJsonAtomic } from './canvas.mjs';
import { launchNativeTerminal } from './native-terminal.mjs';

// Launch a separate user-visible terminal. No secret is passed in argv or agent I/O.
execFileSync(process.execPath, [resolve(root, 'scripts/setup.mjs')], { cwd: root, stdio: 'ignore' });
const config = environment();
const script = resolve(root, 'scripts/token-input.mjs');
const receipt = resolve(root, '.local/token-input-status.json');
writeJsonAtomic(receipt, { status: 'launching', checkedAt: new Date().toISOString() });
const launched = launchNativeTerminal(script, root, ['--bootstrap']);
if (!launched) {
  writeJsonAtomic(receipt, { status: 'launch-failed', checkedAt: new Date().toISOString() });
  console.error('Could not open a native terminal. Ask the user to run npm run canvas:token in their own local terminal. Do not collect the token in chat.');
  process.exitCode = 1;
} else {
  console.log('Visible token-entry terminal launched. Agent: check .local/token-input-status.json for waiting/verified/failed; never read oauth.enc or the token.');
  console.log('Open the authenticated browser at ' + config.base + '/profile/settings');
}
