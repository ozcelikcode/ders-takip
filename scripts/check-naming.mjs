import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

// Language choice still requires review; this guard catches non-ASCII technical names.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .toString().split('\0').filter((file) => file && existsSync(file));
const violations = [];

for (const file of files) {
  if (!/^[A-Za-z0-9_./-]+$/.test(file)) violations.push(`${file}: use English ASCII path names`);
  if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function inspect(node) {
    if (ts.isIdentifier(node) && Array.from(node.text).some((character) => character.charCodeAt(0) > 127)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(`${file}:${line + 1}: use an English ASCII identifier (${node.text})`);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Technical names use ASCII paths and identifiers; English meaning is reviewed in code review.');
}
