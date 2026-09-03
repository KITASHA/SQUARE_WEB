import { Hono } from "hono";
import { bandCard, escapeHtml, gigCard, layout, safeExternalUrl } from "./html.js";

const app = new Hono();

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
});

app.get("/", (c) => c.html(layout({
  title: "岡山アカペラサークル",
  body: `<section class="hero">
    <p class="eyebrow">Okayama A Cappella Circle</p>
    <h1>SQUARE</h1>
    <p>岡山で活動するアカペラサークル「SQUARE」の公式サイトです。</p>
  </section>
  <section class="links">
    <a class="panel" href="/homes/about">SQUAREについて</a>
    <a class="panel" href="/bands">バンド紹介</a>
    <a class="panel" href="/gigs">出演情報</a>
  </section>`
})));

app.get("/homes/about", (c) => c.html(layout({
  title: "SQUAREについて",
  body: '<section><h1>SQUAREについて</h1><p>現行サイトの文章と画像を確認後、このページへ移行します。</p></section>'
})));

for (const path of ["/homes/show_1", "/homes/show_2", "/homes/show_3", "/homes/option", "/homes/workshop"]) {
  app.get(path, (c) => c.html(layout({
    title: "SQUARE",
    body: '<section><h1>SQUARE</h1><p>現行ページの内容を移行準備中です。</p></section>'
  })));
}

app.get("/bands", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT slug, band_name, image_key FROM bands ORDER BY sort_order, band_name"
  ).all();
  const content = results.length
    ? results.map(bandCard).join("")
    : "<p>掲載準備中です。</p>";
  return c.html(layout({
    title: "バンド紹介",
    body: `<section><h1>バンド紹介</h1><div class="grid">${content}</div></section>`
  }));
});

app.get("/bands/:slug", async (c) => {
  const band = await c.env.DB.prepare(
    "SELECT id, slug, band_name, description, image_key FROM bands WHERE slug = ?"
  ).bind(c.req.param("slug")).first();
  if (!band) return c.redirect("/bands", 302);

  const [members, links] = await Promise.all([
    c.env.DB.prepare("SELECT name FROM band_members WHERE band_id = ? ORDER BY sort_order, id").bind(band.id).all(),
    c.env.DB.prepare("SELECT label, url FROM band_links WHERE band_id = ? ORDER BY sort_order, id").bind(band.id).all()
  ]);
  const image = band.image_key
    ? `<img class="detail-image" src="/media/${encodeURIComponent(band.image_key)}" alt="${escapeHtml(band.band_name)}">`
    : "";
  const memberList = members.results.map(({ name }) => `<li>${escapeHtml(name)}</li>`).join("");
  const linkList = links.results.map(({ label, url }) => {
    const safeUrl = safeExternalUrl(url);
    return safeUrl ? `<li><a href="${escapeHtml(safeUrl)}" rel="noopener noreferrer">${escapeHtml(label)}</a></li>` : "";
  }).join("");

  return c.html(layout({
    title: band.band_name,
    body: `<article><h1>${escapeHtml(band.band_name)}</h1>${image}
      <p class="preserve-lines">${escapeHtml(band.description)}</p>
      ${memberList ? `<h2>メンバー</h2><ul>${memberList}</ul>` : ""}
      ${linkList ? `<h2>リンク</h2><ul>${linkList}</ul>` : ""}
    </article>`
  }));
});

async function renderGigs(c, archived) {
  const operator = archived ? "<" : ">=";
  const order = archived ? "DESC" : "ASC";
  const { results } = await c.env.DB.prepare(
    `SELECT id, gig_name, event_date, location FROM gigs WHERE event_date ${operator} date('now') ORDER BY event_date ${order}`
  ).all();
  const cards = results.length ? results.map(gigCard).join("") : "<p>掲載情報はありません。</p>";
  return c.html(layout({
    title: archived ? "過去の出演情報" : "出演情報",
    body: `<section><h1>${archived ? "過去の出演情報" : "出演情報"}</h1>
      <p><a href="${archived ? "/gigs" : "/gigs/archive"}">${archived ? "今後の出演を見る" : "過去の出演を見る"}</a></p>
      <div class="grid">${cards}</div>
    </section>`
  }));
}

app.get("/gigs", (c) => renderGigs(c, false));
app.get("/gigs/archive", (c) => renderGigs(c, true));

app.get("/gigs/:id", async (c) => {
  const gig = await c.env.DB.prepare(
    "SELECT id, gig_name, event_date, start_time, end_time, location, description FROM gigs WHERE id = ?"
  ).bind(c.req.param("id")).first();
  if (!gig) return c.redirect("/gigs", 302);

  const [bands, images, links] = await Promise.all([
    c.env.DB.prepare("SELECT b.slug, b.band_name FROM bands b JOIN gig_bands gb ON gb.band_id = b.id WHERE gb.gig_id = ? ORDER BY b.band_name").bind(gig.id).all(),
    c.env.DB.prepare("SELECT object_key, alt_text FROM gig_images WHERE gig_id = ? ORDER BY sort_order, id").bind(gig.id).all(),
    c.env.DB.prepare("SELECT label, url FROM gig_links WHERE gig_id = ? ORDER BY sort_order, id").bind(gig.id).all()
  ]);

  const imageList = images.results.map(({ object_key, alt_text }) =>
    `<img class="detail-image" src="/media/${encodeURIComponent(object_key)}" alt="${escapeHtml(alt_text)}">`
  ).join("");
  const bandList = bands.results.map(({ slug, band_name }) =>
    `<li><a href="/bands/${encodeURIComponent(slug)}">${escapeHtml(band_name)}</a></li>`
  ).join("");
  const linkList = links.results.map(({ label, url }) => {
    const safeUrl = safeExternalUrl(url);
    return safeUrl ? `<li><a href="${escapeHtml(safeUrl)}" rel="noopener noreferrer">${escapeHtml(label)}</a></li>` : "";
  }).join("");

  return c.html(layout({
    title: gig.gig_name,
    body: `<article><h1>${escapeHtml(gig.gig_name)}</h1>
      <p><time datetime="${escapeHtml(gig.event_date)}">${escapeHtml(gig.event_date)}</time>
      ${escapeHtml(gig.start_time)}${gig.end_time ? `〜${escapeHtml(gig.end_time)}` : ""}</p>
      ${gig.location ? `<p>${escapeHtml(gig.location)}</p>` : ""}
      <p class="preserve-lines">${escapeHtml(gig.description)}</p>
      ${imageList}
      ${bandList ? `<h2>出演バンド</h2><ul>${bandList}</ul>` : ""}
      ${linkList ? `<h2>リンク</h2><ul>${linkList}</ul>` : ""}
    </article>`
  }));
});

app.get("/media/:key{.+}", async (c) => {
  const object = await c.env.IMAGES.get(c.req.param("key"));
  if (!object) return c.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

app.get("/login", (c) => c.html(layout({
  title: "会員ログイン",
  body: '<section><h1>会員ログイン</h1><p>安全な共通パスワード認証は次の実装工程で追加します。</p></section>'
})));

for (const path of ["/topics", "/releases", "/events"]) {
  app.all(path, (c) => c.redirect("/", 301));
}
app.all("/topics/*", (c) => c.redirect("/", 301));
app.all("/releases/*", (c) => c.redirect("/", 301));
app.all("/events/*", (c) => c.redirect("/", 301));

app.notFound((c) => c.html(layout({
  title: "ページが見つかりません",
  body: '<section><h1>ページが見つかりません</h1><p><a href="/">トップページへ戻る</a></p></section>'
}), 404));

app.onError((error, c) => {
  console.error(error);
  return c.html(layout({
    title: "エラー",
    body: '<section><h1>ページを表示できません</h1><p>時間をおいて再度お試しください。</p></section>'
  }), 500);
});

export default app;
