import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files','-z'], { encoding:'utf8' }).split('\0').filter(Boolean);
const unsafe = files.filter(p => /(^|\/)(\.local|\.openai|\.next|node_modules|course-cache)(\/|$)|(^|\/)\.env(?!\.example$)|data\/(events\.json|overrides\.local\.json)$|\.(pdf|dpapi|enc|tar\.gz)$/i.test(p));
const markers = [/\be\d{7}@u\.nus\.edu\b/i, /\bA\d{7}[A-Z]\b/, /\b\d{4,}~[A-Za-z0-9]{40,}/, /appgprj_[a-f0-9]+/, /hao\.w@/i, /Wu Hao/, /\bMA52(?:59|66|70)\b/, /\bDSA5206\b/, /Users[\\/]cookie/i, /gh[pousr]_[A-Za-z0-9]{30,}/];
for (const path of files) {
  if (path === 'scripts/privacy-check.mjs' || /\.(png|jpg|ico|woff2)$/.test(path)) continue;
  const text = readFileSync(path, 'utf8');
  if (markers.some(rx => rx.test(text))) unsafe.push(path);
}
if (unsafe.length) { console.error('Privacy check failed in files:', [...new Set(unsafe)].join(', ')); process.exitCode = 1; }
else console.log(`Privacy check passed for ${files.length} tracked files. Review screenshots visually before publication.`);
