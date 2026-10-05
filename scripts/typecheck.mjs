import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const examples = join(root, 'examples');
const install = process.argv.includes('--install');
const compiler = join(root, 'node_modules/typescript/bin/tsc');
const installEnv = { ...process.env };
// npm run exports this global setting as a project-scoped install option.
// Let each child install read the same setting from the npm config instead.
delete installEnv.npm_config_allow_scripts;
let failed = 0;
let checked = 0;

for (const entry of readdirSync(examples, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const directory = join(examples, entry.name);
  if (!existsSync(join(directory, 'package.json'))) continue;
  checked++;
  console.log(`Typechecking ${entry.name}`);
  if (!existsSync(join(directory, 'tsconfig.json'))) {
    console.error(`${entry.name}: missing tsconfig.json`);
    failed++;
    continue;
  }
  if (install) {
    const result = spawnSync('npm', ['install', '--no-package-lock', '--no-audit', '--no-fund'], {
      cwd: directory,
      env: installEnv,
      stdio: 'inherit',
      timeout: 180_000,
    });
    if (result.error || result.status !== 0) {
      console.error(`${entry.name}: dependency installation failed`, result.error?.message ?? '');
      failed++;
      continue;
    }
  }
  const result = spawnSync(process.execPath, [compiler, '--noEmit', '--project', join(directory, 'tsconfig.json')], {
    cwd: root,
    stdio: 'inherit',
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    console.error(`${entry.name}: typecheck failed`, result.error?.message ?? '');
    failed++;
  }
}

console.log(`Checked ${checked} examples; ${failed} failed.`);
process.exitCode = checked > 0 && failed === 0 ? 0 : 1;
