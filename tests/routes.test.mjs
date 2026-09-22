import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { readFileSync } from 'node:fs';

function assetEnv(preview = false) {
  return {
    PREVIEW: preview ? 'true' : 'false',
    ASSETS: {
      fetch: async () => new Response('original content', {
        headers: {
          'Content-Type': 'text/html',
          ETag: 'original'
        }
      })
    }
  };
}

test('legacy page URLs redirect to the new flat URLs', async () => {
  const cases = [
    ['/homes/about', '/about'],
    ['/homes/about/', '/about'],
    ['/homes/about.html', '/about'],
    ['/homes/show_1', '/session'],
    ['/homes/show_2', '/stage'],
    ['/homes/show_3', '/bands'],
    ['/homes/bands', '/bands'],
    ['/homes/band?id=abc123', '/band?id=abc123'],
    ['/homes/join', '/join']
  ];

  const env = {
    PREVIEW: 'true',
    ASSETS: {
      fetch() {
        throw new Error('Unexpected asset request');
      }
    }
  };

  for (const [source, target] of cases) {
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(
        new Request(`https://square.test${source}`, { method }),
        env
      );

      assert.equal(response.status, 301, source);
      assert.equal(response.headers.get('Location'), target);
      assert.equal(response.headers.get('Set-Cookie'), null);
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    }
  }
});

test('retired routes redirect without invoking static assets', async () => {
  const env = {
    PREVIEW: 'true',
    ASSETS: {
      fetch() {
        throw new Error('Unexpected asset request');
      }
    }
  };

  for (const prefix of [
    '/gigs',
    '/topics',
    '/releases',
    '/login',
    '/logout',
    '/sessions',
    '/admin',
    '/homes/option',
    '/homes/workshop'
  ]) {
    for (const suffix of ['', '/', '/123', '/123/edit', '.html', '?old=1']) {
      const response = await worker.fetch(
        new Request(`https://square.test${prefix}${suffix}`),
        env
      );

      assert.equal(response.status, 301, prefix + suffix);
      assert.equal(response.headers.get('Location'), '/');
    }
  }

  for (const pathname of ['/events', '/events/', '/events/1', '/events.html']) {
    const response = await worker.fetch(
      new Request(`https://square.test${pathname}`),
      env
    );

    assert.equal(response.status, 301, pathname);
    assert.equal(response.headers.get('Location'), '/join');
  }
});

test('ordinary non-API write methods are disabled', async () => {
  for (const pathname of [
    '/',
    '/about',
    '/session',
    '/stage',
    '/bands',
    '/band',
    '/join',
    '/login',
    '/admin/bands'
  ]) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await worker.fetch(
        new Request(`https://square.test${pathname}`, { method }),
        {}
      );

      assert.equal(response.status, 405, `${method} ${pathname}`);
      assert.equal(response.headers.get('Allow'), 'GET, HEAD');
      assert.equal(response.headers.get('Set-Cookie'), null);
    }
  }
});

test('current pages and assets are delegated to static assets', async () => {
  const paths = [
    '/',
    '/about',
    '/session',
    '/stage',
    '/bands',
    '/band',
    '/join',
    '/static/css/style.css',
    '/static/js/site.js',
    '/static/images/common/square-logo.png',
    '/bandstand'
  ];

  for (const pathname of paths) {
    for (const method of ['GET', 'HEAD']) {
      const request = new Request(`https://square.test${pathname}`, {
        method,
        headers: { Cookie: 'square_session=invalid.%' }
      });

      let calls = 0;
      const env = assetEnv();
      env.ASSETS.fetch = actual => {
        assert.equal(actual, request);
        calls++;
        return new Response('original content', {
          headers: {
            'Content-Type': 'text/html',
            ETag: 'original'
          }
        });
      };

      const response = await worker.fetch(request, env);

      assert.equal(calls, 1);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('ETag'), 'original');
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.equal(await response.text(), method === 'HEAD' ? '' : 'original content');
    }
  }
});

test('unknown asset responses remain 404', async () => {
  const response = await worker.fetch(
    new Request('https://square.test/missing'),
    {
      ASSETS: {
        fetch: async () => new Response('not found', { status: 404 })
      }
    }
  );

  assert.equal(response.status, 404);
});

test('bands API returns an empty list when no synced data exists', async () => {
  const response = await worker.fetch(
    new Request('https://square.test/api/bands'),
    {
      BAND_IMAGES: {
        get: async () => null
      }
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    bands: [],
    updatedAt: null
  });
});

test('band sync API requires the ingest secret', async () => {
  const response = await worker.fetch(
    new Request('https://square.test/api/bands-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bands: [] })
    }),
    {
      BAND_INGEST_SECRET: 'secret',
      BAND_IMAGES: {
        put: async () => {}
      }
    }
  );

  assert.equal(response.status, 401);
});

test('deployment configuration includes the band R2 binding and no database', () => {
  const config = JSON.parse(
    readFileSync(new URL('../wrangler.jsonc', import.meta.url))
  );

  for (const key of [
    'd1_databases',
    'routes',
    'route',
    'kv_namespaces'
  ]) {
    assert.equal(config[key], undefined);
  }

  assert.deepEqual(config.r2_buckets, [
    {
      binding: 'BAND_IMAGES',
      bucket_name: 'square-band-images'
    }
  ]);

  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(config.workers_dev, true);
  assert.equal(config.vars.PREVIEW, 'true');
  assert.equal(config.vars.BAND_INGEST_SECRET, undefined);

  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url))
  );

  assert.equal(pkg.dependencies, undefined);
  assert.ok(Object.keys(pkg.scripts).every(
    key => !/db:|data:|images:|secrets:/.test(key)
  ));
});
