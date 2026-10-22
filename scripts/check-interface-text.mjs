import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Interface text lives in frontend/src/i18n; this guard finds text written straight into screens.
// `--list` prints a per-file count instead of failing.
const listOnly = process.argv.includes('--list');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', 'frontend/src'])
  .toString().split('\0')
  .filter((file) => /\.tsx?$/.test(file) && !file.startsWith('frontend/src/i18n/') && !/\.test\.tsx?$/.test(file));

const turkish = /[çğıöşüÇĞİÖŞÜ]/;
const letters = /\p{L}{2,}/u;
const textAttributes = new Set(['aria-label', 'title', 'placeholder', 'alt', 'aria-description', 'aria-roledescription']);
const schemaChecks = new Set(['min', 'max', 'length', 'regex', 'refine']);
const found = new Map();

for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    const entries = found.get(file) ?? [];
    entries.push(`${file}:${line + 1}: ${text.trim().slice(0, 60)}`);
    found.set(file, entries);
  };
  const literalText = (node) =>
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text
      : ts.isTemplateExpression(node) ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
        : null;
  const inspect = (node) => {
    if (ts.isJsxText(node) && letters.test(node.text)) report(node, node.text);
    else if (ts.isJsxAttribute(node) && textAttributes.has(node.name.getText(source)) && node.initializer) {
      const value = ts.isStringLiteral(node.initializer) ? node.initializer.text
        : ts.isJsxExpression(node.initializer) && node.initializer.expression ? literalText(node.initializer.expression) : null;
      if (value && letters.test(value)) report(node, value);
    } else if (ts.isCallExpression(node) && /^toast(\.\w+)?$/.test(node.expression.getText(source))) {
      const value = node.arguments[0] && literalText(node.arguments[0]);
      if (value && letters.test(value)) report(node, value);
    } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && schemaChecks.has(node.expression.name.text)) {
      // A schema check's literal message would bypass the catalog (shared schemas use validation codes).
      const value = node.arguments.slice(1).map(literalText).find((text) => text && letters.test(text));
      if (value) report(node, value);
    } else {
      const value = literalText(node);
      if (value && turkish.test(value)) report(node, value);
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);
}

const total = [...found.values()].reduce((sum, entries) => sum + entries.length, 0);
if (listOnly) {
  for (const [file, entries] of [...found].sort((a, b) => b[1].length - a[1].length)) console.log(String(entries.length).padStart(4), file);
  console.log(`${total} interface texts outside the catalog in ${found.size} files`);
} else if (total) {
  console.error([...found.values()].flat().join('\n'));
  console.error('Move interface text into frontend/src/i18n (tr.ts and en.ts) and read it with useText().');
  process.exitCode = 1;
} else {
  console.log('Interface text comes from the catalogs.');
}
