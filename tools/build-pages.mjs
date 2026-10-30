#!/usr/bin/env node
/**
 * Builds site-dist/ for the Cloudflare Pages project `antikythera` (antikytheraexhibit.com):
 * the exhibit (web/dist, built first with `npm run build` in web/) at the root, and the landing
 * page (site/) beside it, its index.html renamed landing.html so Pages serves it at /landing.
 * The two share no paths: the landing keeps site.css, site.js and media/; the exhibit everything else.
 *
 *   node tools/build-pages.mjs
 *   npx wrangler@4 pages deploy site-dist --project-name antikythera --branch main
 *
 * The showcase kit's finish-site.mjs writes the landing videos' routes and sizes; this script then
 * adds the exhibit's _headers rule for its hashed bundles, routes the page entries through
 * functions/_middleware.js, and the narration through functions/audio/ for byte ranges.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'site-dist');
const web = path.join(root, 'web/dist');
const site = path.join(root, 'site');
const kit = path.resolve(root, '../../Github Hub/kit/tools/finish-site.mjs');

if (!fs.existsSync(path.join(web, 'index.html'))) throw new Error('web/dist is empty: run `npm run build` in web/ first');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(web, out, { recursive: true });
for (const name of fs.readdirSync(site)) {
  const dest = path.join(out, name === 'index.html' ? 'landing.html' : name);
  if (fs.existsSync(dest)) throw new Error(`site/${name} would overwrite the exhibit's ${path.relative(out, dest)}`);
  fs.cpSync(path.join(site, name), dest, { recursive: true });
}

execFileSync(process.execPath, [kit, out, '--root', root], { stdio: 'inherit' });

const headers = path.join(out, '_headers');
fs.writeFileSync(headers, `${fs.readFileSync(path.join(web, '_headers'), 'utf8').trimEnd()}\n${fs.readFileSync(headers, 'utf8')}`);

const routesFile = path.join(out, '_routes.json');
const routes = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
routes.include = ['/', '/about', '/landing', '/landing/', '/audio/*', ...routes.include];
fs.writeFileSync(routesFile, JSON.stringify(routes, null, 1));

const sizesFile = path.join(root, 'functions/media/sizes.json');
const sizes = JSON.parse(fs.readFileSync(sizesFile, 'utf8'));
for (const f of fs.readdirSync(path.join(out, 'audio')).filter((f) => f.endsWith('.mp3'))) {
  sizes[`/audio/${f}`] = fs.statSync(path.join(out, 'audio', f)).size;
}
fs.writeFileSync(sizesFile, `${JSON.stringify(sizes, null, 1)}\n`);
console.log(`site-dist: exhibit at /, landing at /landing, ${routes.include.length} routes through functions`);
