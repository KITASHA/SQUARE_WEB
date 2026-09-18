import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['public/index.html', '誰でも入れるアカペラサークル'],
  ['public/homes/about.html', 'SQUAREについて'],
  ['public/homes/show_1.html', '定期活動会'],
  ['public/homes/show_2.html', 'Okayama Music SQUARE'],
  ['public/homes/show_3.html', 'スターターバンド制度'],
  ['public/homes/join.html', '入会について'],
  ['public/404.html', 'ページが見つかりません']
];

for (const [path, phrase] of pages) {
  test(`${path}: custom static layout is self-contained`, () => {
    const html = readFileSync(resolve(root, path), 'utf8');
    assert.match(html, new RegExp(phrase));
    assert.match(html, /\/static\/css\/style\.css/);
    assert.match(html, /\/static\/js\/site\.js/);
    assert.match(html, /data-site-header/);
    assert.match(html, /data-site-footer/);
    assert.doesNotMatch(html, /bootstrap|legacy\.css|theme\.css|(?:src|href)="\/images\//i);
  });
}

test('home keeps the six durable destinations', () => {
  const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
  for (const [href, label] of [
    ['/homes/about', 'SQUAREについて'],
    ['/homes/show_1', '定期活動会'],
    ['/homes/show_2', 'Okayama Music SQUARE'],
    ['/homes/show_3', 'スターターバンド制度'],
    ['/homes/join', '入会について'],
    ['https://www.youtube.com/channel/UCpcjVaT57zyOhB92BROiTBA', '活動の様子を動画で見る']
  ]) {
    assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"[^>]*>[\\s\\S]*?${label}`));
  }
});

test('all local static references exist', () => {
  const htmlFiles = pages.map(([path]) => path);
  for (const file of htmlFiles) {
    const html = readFileSync(resolve(root, file), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="(\/static\/[^"?#]+)"/g)) {
      assert.equal(existsSync(resolve(root, 'public', match[1].slice(1))), true, `${match[1]} referenced by ${file}`);
    }
  }
});

test('Bootstrap and old root asset folders are removed', () => {
  for (const path of ['public/legacy.css', 'public/theme.css', 'public/site.js', 'public/images', 'public/vendor']) {
    assert.equal(existsSync(resolve(root, path)), false, `${path} should not exist`);
  }
  assert.equal(existsSync(resolve(root, 'public/static/css/style.css')), true);
  assert.equal(existsSync(resolve(root, 'public/static/js/site.js')), true);
  assert.equal(existsSync(resolve(root, 'public/static/images')), true);
});

test('palette is centralized in CSS variables', () => {
  const css = readFileSync(resolve(root, 'public/static/css/style.css'), 'utf8');
  for (const variable of ['--sq-bg', '--sq-text', '--sq-accent', '--sq-accent-strong', '--sq-line']) {
    assert.match(css, new RegExp(variable));
  }
});
