#!/usr/bin/env node
// Stage only the public, static runtime for GitHub Pages (including project URLs).
import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, '_site');
const entries = ['index.html', 'styles.css', 'assets', 'src', 'examples', 'stratum-intelligence.html', 'LICENSE'];
for (const entry of entries) await access(path.join(root, entry));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of entries) await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
await writeFile(path.join(out, '.nojekyll'), '');
console.log('GitHub Pages artifact staged in _site/');
