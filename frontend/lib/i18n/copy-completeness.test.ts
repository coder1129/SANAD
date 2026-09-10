import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import arabicMessages from '@/messages/interface-ar.json';

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)
      ? [filePath]
      : [];
  });
}

describe('Arabic interface copy completeness', () => {
  it('translates every literal _copy call that has no explicit Arabic value', () => {
    const dictionary = arabicMessages as Record<string, string>;
    const roots = ['app', 'components'].map((directory) =>
      path.resolve(process.cwd(), directory),
    );
    const missing: string[] = [];

    for (const filePath of roots.flatMap(sourceFiles)) {
      const source = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );

      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === '_copy' &&
          node.arguments.length === 1 &&
          (ts.isStringLiteral(node.arguments[0]) ||
            ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
        ) {
          const key = node.arguments[0].text.replace(/\s+/g, ' ').trim();
          const isContactExample =
            /^[^\s@]+@[^\s@]+$/.test(key) || /^\+[\d X-]+$/.test(key);
          if (
            /[A-Za-z]/.test(key) &&
            !isContactExample &&
            dictionary[key] === undefined
          ) {
            missing.push(
              `${path.relative(process.cwd(), filePath).replaceAll('\\', '/')}: ${key}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(source);
    }

    expect(missing).toEqual([]);
  });
});
