import assert from 'node:assert/strict';
import test from 'node:test';

test('module entry initializes layout, photos and band pages', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    delete globalThis.window;
    delete globalThis.document;
    globalThis.fetch = originalFetch;
  });

  for (const page of ['home', 'bands', 'band']) {
    const header = { innerHTML: '' };
    const footer = { innerHTML: '' };
    const content = { innerHTML: '' };
    const photo = { src: '/fallback.webp' };
    const storage = new Map();
    const band = {
      id: 'sample', name: 'Sample Band', members: ['山田', '田中'],
      imageUrl: '/media/bands/sample.webp'
    };
    globalThis.window = {
      location: new URL(`http://localhost/${page}?id=sample`),
      localStorage: {
        getItem: key => storage.get(key),
        setItem: (key, value) => storage.set(key, value)
      }
    };
    globalThis.document = {
      title: '',
      querySelectorAll: selector => {
        if (selector === '[data-site-header]') return [header];
        if (selector === '[data-site-footer]') return [footer];
        return [];
      },
      querySelector: selector => {
        if (page === 'home' && selector === '[data-bands-card]') return photo;
        if (selector === '[data-session-hero]') return photo;
        return null;
      },
      getElementById: id => {
        if (page === 'bands' && id === 'bands-list') return content;
        if (page === 'band' && id === 'band-detail') return content;
        return null;
      }
    };
    globalThis.fetch = async url => {
      assert.equal(url, '/api/bands');
      return { ok: true, json: async () => ({ bands: [band] }) };
    };

    await import(`../public/static/js/site.js?page=${page}`);
    await new Promise(resolve => setImmediate(resolve));

    assert.match(header.innerHTML, /メインナビゲーション/);
    assert.match(footer.innerHTML, /お問い合わせ/);
    assert.equal(storage.get('square-session-hero-index'), '0');
    if (page === 'home') {
      assert.equal(photo.src, band.imageUrl);
    } else {
      assert.match(content.innerHTML, /Sample Band/);
      if (page === 'band') {
        assert.match(content.innerHTML, /山田/);
        assert.doesNotMatch(content.innerHTML, /class="section-label"/);
        assert.equal(document.title, 'Sample Band | 岡山アカペラサークルSQUARE');
      }
    }
  }
});
