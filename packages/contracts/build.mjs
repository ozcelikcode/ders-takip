import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiler = require.resolve('typescript/bin/tsc');
execFileSync(process.execPath, [compiler], { stdio: 'inherit' });
execFileSync(process.execPath, [compiler, '--module', 'ES2020', '--outDir', 'dist/esm'], { stdio: 'inherit' });
writeFileSync('dist/esm/package.json', '{"type":"module"}\n');
