import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const here = fileURLToPath(new URL('.', import.meta.url));
const env = { ...process.env };
delete env.NODE_OPTIONS;
const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', here], { cwd: root, env, encoding: 'utf8' }))[0];
copyFileSync(here + packed.filename, here + 'perf-observer-js.tgz');
execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: here, env, stdio: 'inherit' });
if (process.argv.includes('--install-only')) process.exit(0);
execFileSync('npm', ['test'], { cwd: here, env, stdio: 'inherit' });
execFileSync(process.execPath, ['verify.mjs'], { cwd: here, env, stdio: 'inherit' });
