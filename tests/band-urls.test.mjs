import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/static/js/site.js', import.meta.url), 'utf8');

function loadSiteScript() {
  const context = {
    URL,
    URLSearchParams,
    window: { location: new URL('https://square.example/') },
    document: {
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null
    }
  };
  runInNewContext(source, context, { filename: 'site.js' });
  return context;
}

test('band links accept explicit HTTP(S) URLs and reject relative or unsafe URLs', () => {
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

test('band link rendering filters invalid SNS and other links while preserving valid links', () => {
  const { createBandLinks } = loadSiteScript();
  const html = createBandLinks({
    x: 'https://x.com/square_okayama',
    instagram: '//instagram.com/square_okayama',
    otherLinks: [
      { label: 'relative', url: '/about' },
      { label: 'bare', url: 'example.com' },
      { label: '', url: 'http://example.com/music?a=1&b=2' }
    ]
  });

  assert.match(html, /href="https:\/\/x\.com\/square_okayama"/);
  assert.match(html, /href="http:\/\/example\.com\/music\?a=1&amp;b=2"/);
  assert.match(html, /その他リンク/);
  assert.doesNotMatch(html, /instagram\.com|href="\/about"|>\s*(relative|bare)\s*</);
  assert.equal(createBandLinks({ x: 'javascript:alert(1)', otherLinks: [{ url: 'example.com' }] }), '');
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
    '/media/bands/../../api/bands', 'example.com/image.jpg'
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
