import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

for (const root of ['src', 'scripts', 'tests']) {
  for (const file of readdirSync(root, { recursive: true })) {
    if (!/\.m?js$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', `${root}/${file}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(1);
  }
}

const browser = spawnSync(process.execPath, ['--check', 'public/static/js/site.js'], { stdio: 'inherit' });
if (browser.status !== 0) process.exit(1);
console.log('JavaScript syntax OK');
