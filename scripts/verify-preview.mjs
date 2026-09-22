import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const origin = process.argv[2] || 'http://127.0.0.1:8787';

const pages = [
  ['/', 'index.html'],
  ['/about', 'about.html'],
  ['/session', 'session.html'],
  ['/stage', 'stage.html'],
  ['/bands', 'bands.html'],
  ['/band', 'band.html'],
  ['/join', 'join.html']
];

const assets = new Set([
  '/static/css/style.css',
  '/static/js/site.js',
  '/static/icons/favicon.ico',
  '/static/icons/apple-touch-icon.png',
  '/static/manifest.json',
  '/robots.txt'
]);

for (const [pathname, filename] of pages) {
  const response = await fetch(new URL(pathname, origin));
  assert.equal(response.status, 200, pathname);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.match(response.headers.get('Content-Type'), /text\/html/);

  const html = await response.text();
  assert.equal(
    html,
    readFileSync(new URL(`../public/${filename}`, import.meta.url), 'utf8'),
    pathname
  );

  for (const match of html.matchAll(/(?:src|href)="(\/static\/[^"?#]+)"/g)) {
    assets.add(match[1]);
  }
}

for (const pathname of assets) {
  const response = await fetch(new URL(pathname, origin));
  assert.equal(response.status, 200, pathname);

  const actual = Buffer.from(await response.arrayBuffer());
  const expected = readFileSync(new URL(`../public${pathname}`, import.meta.url));
  const digest = value => createHash('sha256').update(value).digest('hex');

  assert.equal(digest(actual), digest(expected), pathname);
}

const legacyRedirects = [
  ['/homes/about', '/about'],
  ['/homes/show_1', '/session'],
  ['/homes/show_2', '/stage'],
  ['/homes/show_3', '/bands'],
  ['/homes/bands', '/bands'],
  ['/homes/join', '/join'],
  ['/events', '/join'],
  ['/events/1', '/join']
];

for (const [pathname, target] of legacyRedirects) {
  const response = await fetch(new URL(pathname, origin), { redirect: 'manual' });
  assert.equal(response.status, 301, pathname);
  assert.equal(new URL(response.headers.get('Location'), origin).pathname, target);
}

for (const pathname of [
  '/gigs',
  '/gigs/archive',
  '/gigs/1',
  '/login',
  '/admin/bands/new',
  '/topics/1',
  '/releases/1',
  '/homes/option',
  '/homes/workshop',
  '/homes/workshop.html',
  '/homes/workshop/'
]) {
  const response = await fetch(new URL(pathname, origin), { redirect: 'manual' });
  assert.equal(response.status, 301, pathname);
  assert.equal(new URL(response.headers.get('Location'), origin).pathname, '/');
}

assert.equal(
  (await fetch(new URL('/this-page-does-not-exist', origin))).status,
  404
);

assert.equal(
  (await fetch(new URL('/login', origin), { method: 'POST' })).status,
  405
);

const head = await fetch(new URL('/about', origin), { method: 'HEAD' });
assert.equal(head.status, 200);
assert.equal(await head.text(), '');

console.log(
  `${pages.length} pages, ${assets.size} assets, redirects, 404, disabled writes and HEAD verified at ${origin}`
);
