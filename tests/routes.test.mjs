import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { readFileSync } from 'node:fs';

test('retired GET and HEAD routes redirect without invoking storage', async () => {
  const env = { PREVIEW: 'true', ASSETS: { fetch() { throw new Error('Unexpected asset request'); } } };
  for (const prefix of ['/bands', '/gigs', '/topics', '/releases', '/login', '/logout', '/sessions', '/admin', '/homes/option', '/homes/workshop', '/events']) {
    for (const suffix of ['', '/', '/123', '/123/edit', '.html', '?old=1']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await worker.fetch(new Request(`https://square.test${prefix}${suffix}`, { method }), env);
        assert.equal(response.status, 301, prefix + suffix);
        assert.equal(response.headers.get('Location'), prefix === '/events' ? '/homes/join' : '/');
        assert.equal(response.headers.get('Set-Cookie'), null);
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      }
    }
  }
});

test('all write methods are disabled, including former admin routes', async () => {
  for (const pathname of ['/', '/login', '/logout', '/bands', '/gigs', '/admin/bands', '/events', '/homes/about']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await worker.fetch(new Request(`https://square.test${pathname}`, { method }), {});
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('Allow'), 'GET, HEAD');
      assert.equal(response.headers.get('Set-Cookie'), null);
    }
  }
});

test('retained pages and assets use static assets, HEAD preserves headers only', async () => {
  for (const pathname of ['/', '/homes/about', '/homes/show_1', '/homes/show_2', '/homes/show_3', '/homes/join', '/static/css/style.css', '/static/js/site.js', '/static/images/about_image_1.png', '/bandstand']) {
    for (const method of ['GET', 'HEAD']) {
      const request = new Request(`https://square.test${pathname}`, { method, headers: { Cookie: 'square_session=invalid.%' } });
      let calls = 0;
      const response = await worker.fetch(request, { ASSETS: { fetch(actual) {
        assert.equal(actual, request); calls++;
        return new Response('original content', { headers: { 'Content-Type': 'text/html', ETag: 'original' } });
      } } });
      assert.equal(calls, 1);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('ETag'), 'original');
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.equal(await response.text(), method === 'HEAD' ? '' : 'original content');
    }
  }
});

test('unknown asset responses remain 404', async () => {
  const response = await worker.fetch(new Request('https://square.test/missing'), {
    ASSETS: { fetch: async () => new Response('not found', { status: 404 }) }
  });
  assert.equal(response.status, 404);
});

test('deployment has no database, R2, secrets, custom domains or migration tooling', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url)));
  for (const key of ['d1_databases', 'r2_buckets', 'routes', 'route', 'kv_namespaces']) assert.equal(config[key], undefined);
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(config.workers_dev, true);
  assert.equal(config.vars.PREVIEW, 'true');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.dependencies, undefined);
  assert.ok(Object.keys(pkg.scripts).every(key => !/db:|data:|images:|secrets:/.test(key)));
});
