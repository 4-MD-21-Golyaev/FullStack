/**
 * One-off: wraps every `:hover` CSS rule in `@media (hover: hover)` so hover
 * styles don't get stuck after touch-tap on mobile.
 *
 * Run: node scripts/wrap-hover-in-hover-media.mjs
 *
 * Idempotent: skips rules already inside `@media (hover: hover)`.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

function transformCss(source) {
  const lines = source.split('\n');
  const out = [];
  let i = 0;
  const hoverMediaStack = []; // booleans per nested @media — true if it's a hover-only media

  function isInsideHoverMedia() {
    return hoverMediaStack.some(Boolean);
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // @media open on its own line ending with `{`
    if (/^@media\b/.test(trimmed) && /\{\s*$/.test(trimmed)) {
      const isHover = /\(\s*hover\s*:\s*hover\s*\)/.test(trimmed);
      hoverMediaStack.push(isHover);
      out.push(line);
      i++;
      continue;
    }

    // closing brace at top-level of current line — pops a media block if there is one
    if (trimmed === '}' && hoverMediaStack.length > 0) {
      hoverMediaStack.pop();
      out.push(line);
      i++;
      continue;
    }

    // rule with :hover that is not inside hover-only media
    if (
      !isInsideHoverMedia() &&
      /:hover\b/.test(line) &&
      /\{\s*$/.test(line) &&
      !/^@/.test(trimmed)
    ) {
      const selectorLine = line;
      const body = [];
      let depth = 1;
      let j = i + 1;
      while (j < lines.length && depth > 0) {
        const ln = lines[j];
        for (const ch of ln) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        body.push(ln);
        j++;
      }
      out.push('@media (hover: hover) {');
      out.push('  ' + selectorLine);
      for (const b of body) {
        out.push('  ' + b);
      }
      out.push('}');
      i = j;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

const files = walk(ROOT);
let touched = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (!/:hover\b/.test(src)) continue;
  const next = transformCss(src);
  if (next !== src) {
    writeFileSync(f, next);
    touched++;
    console.log(`  ${f.replace(ROOT, 'src')}`);
  }
}
console.log(`\nWrapped :hover rules in ${touched} files.`);
