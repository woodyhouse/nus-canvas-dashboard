import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(resolve(root, 'data'), { recursive: true });
if (!existsSync(resolve(root, 'data/events.json'))) copyFileSync(resolve(root, 'data/events.example.json'), resolve(root, 'data/events.json'));
if (!process.argv.includes('--demo') && !existsSync(resolve(root, '.env.local'))) {
  writeFileSync(resolve(root, '.env.local'), `CANVAS_BASE_URL=https://canvas.nus.edu.sg\nCANVAS_CLIENT_ID=\nCANVAS_CLIENT_SECRET=\nCANVAS_REDIRECT_URI=http://127.0.0.1:8787/callback\nCANVAS_STORE_KEY=${randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
}
console.log('Setup ready. Demo data contains no real student records. See README for OAuth prerequisites.');
