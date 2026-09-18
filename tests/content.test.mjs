import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseline = JSON.parse(readFileSync(new URL("fixtures/content-baseline.json", import.meta.url), "utf8"));

// The fixture is an independent capture of the public Rails site, with only
// the explicitly retired sections removed. Do not regenerate it from public/.
function decode(value) {
  const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", raquo: "»" };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === "#") {
      const number = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return String.fromCodePoint(number);
    }
    return entities[name] ?? match;
  });
}

function normalizeText(value) {
  return decode(value).replace(/\s+/g, " ").trim();
}

function parseBody(html) {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
  const source = body.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const tree = { tag: "root", attrs: {}, children: [] };
  const stack = [tree];
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const tokens = source.match(/<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    const closing = /^<\/([\w:-]+)/.exec(token);
    if (closing) {
      const index = stack.findLastIndex((node) => node.tag === closing[1].toLowerCase());
      if (index > 0) stack.length = index;
      continue;
    }
    const opening = /^<([\w:-]+)\b/.exec(token);
    if (!opening) {
      if (!token.startsWith("<!")) stack.at(-1).children.push({ text: token });
      continue;
    }
    const node = { tag: opening[1].toLowerCase(), attrs: {}, children: [] };
    const attributes = token.slice(opening[0].length).replace(/\/?\s*>$/, "");
    for (const match of attributes.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      node.attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
    }
    stack.at(-1).children.push(node);
    if (!voids.has(node.tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  return tree;
}

function nodes(tree) {
  return [tree, ...(tree.children ?? []).flatMap(nodes)];
}

function textOf(tree) {
  return tree.text ?? (tree.children ?? []).map(textOf).join(" ");
}

function classes(value = "") {
  return value.split(/\s+/).filter(Boolean).sort().join(" ");
}

function style(value = "") {
  return value.split(";").map((part) => part.trim().replace(/\s*:\s*/g, ":").replace(/\s+/g, " ")).filter(Boolean).join(";");
}

function summarize(tree) {
  const elements = nodes(tree).filter((node) => node.tag);
  return {
    text: normalizeText(textOf(tree)),
    links: elements.filter((node) => node.tag === "a").map((node) => ({
      href: node.attrs.href ?? "",
      text: normalizeText(textOf(node))
    })),
    images: elements.filter((node) => node.tag === "img" || node.tag === "image").map((node) => ({
      tag: node.tag,
      path: node.attrs.src ?? node.attrs.href ?? node.attrs["xlink:href"] ?? "",
      alt: node.attrs.alt ?? null,
      width: node.attrs.width ?? null,
      height: node.attrs.height ?? null,
      preserveAspectRatio: node.attrs.preserveaspectratio ?? null
    })),
    presentation: elements.filter((node) => node.attrs.class || node.attrs.style).map((node) => ({
      tag: node.tag,
      class: classes(node.attrs.class),
      style: style(node.attrs.style)
    }))
  };
}

// Explicitly approved index changes are described independently of public/.
// Preserve the original source fixture, including its former workshop page.
const indexCards = [
  { href: "/homes/about", text: "SQUAREについて", path: "/images/about_image_1.png", alt: "ロゴ" },
  { href: "/homes/show_1", text: "定期活動会", path: "/images/about_image_4.jpg", alt: "定期活動会" },
  { href: "/homes/show_2", text: "Okayama Music SQUARE", path: "/images/image_2.jpg", alt: "集合写真" },
  { href: "/homes/show_3", text: "スターターバンド制度", path: "/images/about_image_6.jpg", alt: "スターターバンド制度" },
  { href: "/homes/join", text: "入会について", path: "/images/image_6.jpg", alt: "イメージ" },
  { href: "https://www.youtube.com/channel/UCpcjVaT57zyOhB92BROiTBA", text: "活動の様子を動画で見る", path: "/images/image_4.jpg", alt: "イメージ" }
];

function expectedIndex() {
  const original = baseline.pages.index;
  const cardStart = original.presentation.findIndex((node) => node.class === "col");
  const footerStart = original.presentation.findIndex((node) => node.tag === "footer");
  const originalCardText = "SQUAREについて Okayama Music SQUARE 活動の様子を動画で見る 入会について 発声ワークショップ動画";
  return {
    text: original.text.replace(originalCardText, indexCards.map(({ text }) => text).join(" ")),
    links: [
      ...original.links.slice(0, 4),
      ...indexCards.map(({ href, text }) => ({ href, text })),
      ...original.links.slice(-1)
    ],
    images: indexCards.map(({ path, alt }) => ({
      tag: "img", path, alt, width: null, height: null, preserveAspectRatio: null
    })),
    presentation: [
      ...original.presentation.slice(0, cardStart),
      ...indexCards.flatMap((_, index) => original.presentation.slice(
        cardStart + (index === 0 ? 0 : 5), cardStart + (index === 0 ? 5 : 10)
      )),
      ...original.presentation.slice(footerStart)
    ]
  };
}

for (const [name, original] of Object.entries(baseline.pages)) {
  if (name === "workshop") continue;
  const expected = name === "index" ? expectedIndex() : original;
  const path = name === "index" ? "public/index.html" : `public/homes/${name}.html`;
  test(`${name}: original content is preserved with only approved card changes`, () => {
    const html = readFileSync(resolve(root, path), "utf8");
    const actual = summarize(parseBody(html));
    assert.equal(actual.text, expected.text, "Retained text must match the public Rails source verbatim (ignoring HTML whitespace).");
    assert.deepEqual(actual.links, expected.links, "Keep retained links and labels, with the approved six index cards.");
    assert.deepEqual(actual.images, expected.images, "Keep original image paths, dimensions, alt text and SVG cropping.");
    assert.deepEqual(actual.presentation, expected.presentation, "Keep the original Bootstrap classes and inline styles.");
    assert.doesNotMatch(html, /<%|raw\.githubusercontent\.com|\/rails\/active_storage\//i);
    assert.equal(/<form\b/i.test(html), false, "No login or database management forms remain.");
    assert.equal(actual.links.some(({ href }) => /^\/(?:bands|gigs|login|logout|admin|topics|events|releases)(?:[/?#]|$)|^\/homes\/(?:option|workshop)(?:[/.?#]|$)/.test(href)), false, "Retired application routes must not remain in navigation.");
    if (name === "index") {
      assert.equal(existsSync(resolve(root, "public/homes/workshop.html")), false, "The retired workshop page must not be published.");
    }
    for (const { href } of actual.links) {
      assert.match(href, /^(?:\/|#|https:\/\/)/, "Retain only relative links and HTTPS external links.");
      if (href.startsWith("/") && !href.startsWith("//")) {
        const target = href.split(/[?#]/)[0];
        const file = target === "/" ? "index.html" : `${target.slice(1)}.html`;
        assert.doesNotThrow(() => readFileSync(resolve(root, "public", file)), `Internal page ${target} must exist.`);
      }
    }
  });
}

test("retained photographs and original compiled stylesheet are byte-identical", () => {
  for (const [path, expectedHash] of Object.entries(baseline.assets)) {
    const bytes = readFileSync(resolve(root, "public", path));
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash, expectedHash, `${path} must retain its original bytes.`);
  }
});
