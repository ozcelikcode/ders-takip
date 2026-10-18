import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const run = (command, args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run browser tests through npm run test:e2e');
for (const task of ['build', 'typecheck:e2e']) {
  const code = await run(process.execPath, [npm, 'run', task], {
    ...process.env,
    VITE_API_BASE_URL: '/api',
  });
  if (code !== 0) process.exit(code);
}
process.exitCode = await run(process.execPath, [
  fileURLToPath(
    new URL('../../node_modules/@playwright/test/cli.js', import.meta.url),
  ),
  'test',
  ...process.argv.slice(2),
]);
