import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const origin = process.argv[2] || 'http://127.0.0.1:8787';
const paths = ['/', '/homes/about', '/homes/show_1', '/homes/show_2', '/homes/show_3', '/homes/join'];
const assets = new Set(['/legacy.css', '/site.js', '/favicon.ico', '/apple-touch-icon.png', '/manifest.json', '/robots.txt', '/vendor/bootstrap-icons/bootstrap-icons.css', '/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2', '/vendor/bootstrap-icons/fonts/bootstrap-icons.woff']);
for (const pathname of paths) {
  const response = await fetch(new URL(pathname, origin));
  assert.equal(response.status, 200, pathname);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.match(response.headers.get('Content-Type'), /text\/html/);
  const html = await response.text();
  const file = pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;
  assert.equal(html, readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), pathname);
  for (const match of html.matchAll(/(?:src|(?:xlink:)?href)="(\/images\/[^"]+)"/g)) assets.add(match[1]);
}
for (const pathname of assets) {
  const response = await fetch(new URL(pathname, origin));
  assert.equal(response.status, 200, pathname);
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = readFileSync(new URL(`../public${pathname}`, import.meta.url));
  const digest = value => createHash('sha256').update(value).digest('hex');
  assert.equal(digest(actual), digest(expected), pathname);
}
for (const pathname of ['/bands', '/bands/old-band', '/gigs', '/gigs/archive', '/gigs/1', '/login', '/admin/bands/new', '/topics/1', '/releases/1', '/homes/option', '/homes/workshop', '/homes/workshop.html', '/homes/workshop/', '/events', '/events/1']) {
  const response = await fetch(new URL(pathname, origin), { redirect: 'manual' });
  assert.equal(response.status, 301, pathname);
  const target = pathname.startsWith('/events') ? '/homes/join' : '/';
  assert.equal(new URL(response.headers.get('Location'), origin).pathname, target);
}
assert.equal((await fetch(new URL('/this-page-does-not-exist', origin))).status, 404);
assert.equal((await fetch(new URL('/login', origin), { method: 'POST' })).status, 405);
const head = await fetch(new URL('/homes/about', origin), { method: 'HEAD' });
assert.equal(head.status, 200);
assert.equal(await head.text(), '');
console.log(`${paths.length} pages, ${assets.size} assets, redirects, 404, disabled writes and HEAD verified at ${origin}`);
