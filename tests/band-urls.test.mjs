import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import * as bands from '../public/static/js/bands.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
  globalThis.fetch = originalFetch;
});

function loadSiteScript() {
  const context = {
    ...bands,
    set fetch(value) { globalThis.fetch = value; },
    window: { location: new URL('https://square.example/') },
    document: {
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null
    }
  };
  globalThis.window = context.window;
  globalThis.document = context.document;
  return context;
}

test('image URL validation still requires explicit HTTP(S) URLs', () => {
  const { safeExternalUrl } = loadSiteScript();

  for (const value of ['https://example.com/band', 'http://example.com/', ' HTTPS://example.com/ ']) {
    assert.equal(safeExternalUrl(value), true, value);
  }

  for (const value of [
    '', null, 'example.com', '/about', './band', '#profile', '//example.com/',
    'https:example.com', 'https://', 'https://bad host/',
    'javascript:alert(1)', 'data:text/html,test', 'mailto:band@example.com', 'ftp://example.com/'
  ]) {
    assert.equal(safeExternalUrl(value), false, String(value));
  }
});

test('external link normalization adds HTTPS to domains and preserves existing HTTP(S) URLs', () => {
  const { normalizeExternalUrl } = loadSiteScript();

  for (const [value, expected] of [
    ['www.example.com', 'https://www.example.com/'],
    ['example.com/path', 'https://example.com/path'],
    ['www.example.com/music?a=1&b=2#live', 'https://www.example.com/music?a=1&b=2#live'],
    ['x.com/square_okayama', 'https://x.com/square_okayama'],
    ['instagram.com/square_okayama/', 'https://instagram.com/square_okayama/'],
    ['https://example.com/band', 'https://example.com/band'],
    ['http://example.com/music?a=1&b=2', 'http://example.com/music?a=1&b=2'],
    [' HTTPS://EXAMPLE.COM/Profile ', 'https://example.com/Profile']
  ]) {
    assert.equal(normalizeExternalUrl(value), expected, value);
  }
});

test('external link normalization rejects relative URLs, unsafe schemes and credentials', () => {
  const { normalizeExternalUrl } = loadSiteScript();

  for (const value of [
    '', null, '/about', './band', '../profile', 'profile', '#profile', '?page=1',
    '//example.com/', '\\\\example.com/path', 'https:example.com', 'https://', 'https://bad host/',
    'javascript:alert(1)', 'data:text/html,test', 'mailto:band@example.com',
    'ftp://example.com/', 'file:///etc/passwd',
    'https://user:password@example.com/', 'https://user@example.com/',
    'user:password@example.com/', 'user@example.com/',
    'https://exam\nple.com/', 'https://example.com/\tpath',
    'example.com/path\rmore', '\nhttps://example.com/', 'https://example.com/\u0000'
  ]) {
    assert.equal(normalizeExternalUrl(value), '', JSON.stringify(value));
  }
});

test('band link rendering normalizes SNS and other links and escapes query parameters', () => {
  const { createBandLinks } = loadSiteScript();
  const html = createBandLinks({
    x: 'x.com/square_okayama',
    instagram: 'instagram.com/square_okayama/',
    otherLinks: [
      { label: 'relative', url: '/about' },
      { label: 'protocol-relative', url: '//example.com/' },
      { label: 'website', url: 'www.example.com/music?a=1&b=2' },
      { label: '', url: 'http://example.com/music?a=1&b=2' }
    ]
  });

  assert.match(html, /href="https:\/\/x\.com\/square_okayama"/);
  assert.match(html, /href="https:\/\/instagram\.com\/square_okayama\/"/);
  assert.match(html, /href="https:\/\/www\.example\.com\/music\?a=1&amp;b=2"/);
  assert.match(html, /href="http:\/\/example\.com\/music\?a=1&amp;b=2"/);
  assert.match(html, /その他リンク/);
  assert.doesNotMatch(html, /href="\/|>\s*(relative|protocol-relative)\s*</);
  assert.equal(createBandLinks({
    x: 'javascript:alert(1)',
    instagram: '//instagram.com/square_okayama/',
    otherLinks: [{ url: 'https://user:password@example.com/' }]
  }), '');
});

test('band list and detail retain same-site R2 and absolute HTTP(S) images', () => {
  const { createBandCard, createBandDetail } = loadSiteScript();

  for (const imageUrl of ['/media/bands/sample.jpg', 'https://example.com/media/bands/sample.jpg']) {
    for (const render of [createBandCard, createBandDetail]) {
      const html = render({ id: 'band-1', name: 'Test band', imageUrl });
      assert.ok(html.includes(`src="${imageUrl}"`));
      assert.doesNotMatch(html, /No Image/);
    }
  }
});

test('missing or invalid band images retain the No Image placeholder', () => {
  const { createBandCard, createBandDetail } = loadSiteScript();

  for (const imageUrl of [
    undefined, '', '//example.com/image.jpg', 'javascript:alert(1)',
    '/media/bands/../../api/bands', 'example.com/image.jpg', 'www.example.com/image.jpg'
  ]) {
    for (const render of [createBandCard, createBandDetail]) {
      const html = render({ id: 'band-1', name: 'Test band', imageUrl });
      assert.match(html, /No Image/);
      assert.doesNotMatch(html, /<img\b/);
    }
  }
});

test('home band card uses a valid same-site image and retains its fallback for invalid URLs', async () => {
  for (const imageUrl of ['/media/bands/sample.jpg', '//example.com/image.jpg', 'example.com/image.jpg']) {
    const context = loadSiteScript();
    const image = { src: '/static/images/home/card-bands.webp' };
    context.document.querySelector = () => image;
    context.fetch = async () => ({
      ok: true,
      json: async () => ({ bands: [{ imageUrl }] })
    });

    await context.initializeBandsCard();
    assert.equal(image.src, imageUrl.startsWith('/media/bands/')
      ? imageUrl
      : '/static/images/home/card-bands.webp');
  }
});
