import { Hono } from "hono";
import { createCsrfCookie, isAuthenticated, verifyCsrf } from "./auth.js";
import { escapeHtml, layout, safeExternalUrl } from "./html.js";

const admin = new Hono();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function detectedImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function checkedImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectedImageType(bytes);
  if (!detected || detected !== file.type || !IMAGE_TYPES.has(detected)) {
    throw new Error("画像ファイルの内容と形式が一致しません。");
  }
  return { bytes, extension: IMAGE_TYPES.get(detected), contentType: detected };
}

admin.use("*", async (c, next) => {
  if (!await isAuthenticated(c)) return c.redirect("/login", 303);
  await next();
});

function text(form, name, maxLength = 10000) {
  const value = String(form.get(name) || "").trim();
  return value.slice(0, maxLength);
}

function validSlug(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(value);
}

async function storeImage(c, file, prefix) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_TYPES.has(file.type)) throw new Error("画像はJPEG、PNG、WebPのみ使用できます。");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("画像は5MB以下にしてください。");
  const checked = await checkedImage(file);
  const key = `${prefix}/${crypto.randomUUID()}.${checked.extension}`;
  await c.env.IMAGES.put(key, checked.bytes, {
    httpMetadata: { contentType: checked.contentType },
    customMetadata: { originalName: file.name.slice(0, 200) }
  });
  return key;
}

function csrfInput(token) {
  return `<input type="hidden" name="csrf_token" value="${escapeHtml(token)}">`;
}

function linkFields(links = []) {
  return [0, 1, 2, 3].map((index) => `<fieldset><legend>リンク${index + 1}</legend>
    <label>表示名<input name="link_label_${index + 1}" maxlength="60" value="${escapeHtml(links[index]?.label || "")}"></label>
    <label>URL<input name="link_url_${index + 1}" type="url" maxlength="500" value="${escapeHtml(links[index]?.url || "")}"></label>
  </fieldset>`).join("");
}

function bandForm({ token, band = {}, members = [], links = [], error = "" }) {
  const editing = Boolean(band.id);
  return layout({
    title: editing ? "バンド編集" : "バンド登録",
    authenticated: true,
    body: `<section class="admin-form"><h1>${editing ? "バンド編集" : "バンド登録"}</h1>
      ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
      <form action="${editing ? `/admin/bands/${encodeURIComponent(band.slug)}` : "/admin/bands"}" method="post" enctype="multipart/form-data">
        ${csrfInput(token)}
        <label>バンド名<input name="band_name" required maxlength="30" value="${escapeHtml(band.band_name || "")}"></label>
        <label>slug（半角英数字とハイフン）<input name="slug" required maxlength="80" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${escapeHtml(band.slug || "")}"></label>
        <label>紹介文<textarea name="description" required maxlength="10000" rows="8">${escapeHtml(band.description || "")}</textarea></label>
        <label>メンバー（1行に1名）<textarea name="members" maxlength="2000" rows="8">${escapeHtml(members.map((item) => item.name).join("\n"))}</textarea></label>
        ${linkFields(links)}
        <label>画像（JPEG・PNG・WebP、5MB以下）<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <button class="button" type="submit">保存</button>
      </form>
      ${editing ? `<form action="/admin/bands/${encodeURIComponent(band.slug)}/delete" method="post" class="danger-form">${csrfInput(token)}<button type="submit">削除</button></form>` : ""}
    </section>`
  });
}

async function loadBand(c, slug) {
  const band = await c.env.DB.prepare("SELECT * FROM bands WHERE slug = ?").bind(slug).first();
  if (!band) return null;
  const [members, links] = await Promise.all([
    c.env.DB.prepare("SELECT name FROM band_members WHERE band_id = ? ORDER BY sort_order, id").bind(band.id).all(),
    c.env.DB.prepare("SELECT label, url FROM band_links WHERE band_id = ? ORDER BY sort_order, id").bind(band.id).all()
  ]);
  return { band, members: members.results, links: links.results };
}

function parseBand(form) {
  const band = {
    bandName: text(form, "band_name", 30),
    slug: text(form, "slug", 80).toLowerCase(),
    description: text(form, "description", 10000)
  };
  if (!band.bandName || !band.description || !validSlug(band.slug)) {
    throw new Error("バンド名、slug、紹介文を正しく入力してください。");
  }
  const members = text(form, "members", 2000).split(/\r?\n/).map((name) => name.trim()).filter(Boolean).slice(0, 30);
  const links = [];
  for (let index = 1; index <= 4; index += 1) {
    const label = text(form, `link_label_${index}`, 60);
    const url = text(form, `link_url_${index}`, 500);
    if (!label && !url) continue;
    const safeUrl = safeExternalUrl(url);
    if (!label || !safeUrl) throw new Error("リンクは表示名とHTTPS URLを両方入力してください。");
    links.push({ label, url: safeUrl });
  }
  return { ...band, members, links };
}

async function replaceBandRelations(c, bandId, members, links) {
  const statements = [
    c.env.DB.prepare("DELETE FROM band_members WHERE band_id = ?").bind(bandId),
    c.env.DB.prepare("DELETE FROM band_links WHERE band_id = ?").bind(bandId),
    ...members.map((name, index) => c.env.DB.prepare(
      "INSERT INTO band_members (band_id, name, sort_order) VALUES (?, ?, ?)"
    ).bind(bandId, name, index)),
    ...links.map((link, index) => c.env.DB.prepare(
      "INSERT INTO band_links (band_id, label, url, sort_order) VALUES (?, ?, ?, ?)"
    ).bind(bandId, link.label, link.url, index))
  ];
  await c.env.DB.batch(statements);
}

admin.get("/bands/new", (c) => {
  const csrf = createCsrfCookie();
  c.header("Set-Cookie", csrf.cookie);
  return c.html(bandForm({ token: csrf.token }));
});

admin.post("/bands", async (c) => {
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  let imageKey = null;
  try {
    const data = parseBand(form);
    imageKey = await storeImage(c, form.get("image"), "bands");
    const result = await c.env.DB.prepare(
      "INSERT INTO bands (slug, band_name, description, image_key) VALUES (?, ?, ?, ?)"
    ).bind(data.slug, data.bandName, data.description, imageKey).run();
    await replaceBandRelations(c, result.meta.last_row_id, data.members, data.links);
    return c.redirect(`/bands/${encodeURIComponent(data.slug)}`, 303);
  } catch (error) {
    if (imageKey) await c.env.IMAGES.delete(imageKey);
    const csrf = createCsrfCookie();
    c.header("Set-Cookie", csrf.cookie);
    return c.html(bandForm({ token: csrf.token, error: error.message }), 422);
  }
});

admin.get("/bands/:slug/edit", async (c) => {
  const data = await loadBand(c, c.req.param("slug"));
  if (!data) return c.redirect("/bands", 303);
  const csrf = createCsrfCookie();
  c.header("Set-Cookie", csrf.cookie);
  return c.html(bandForm({ token: csrf.token, ...data }));
});

admin.post("/bands/:slug", async (c) => {
  const current = await loadBand(c, c.req.param("slug"));
  if (!current) return c.redirect("/bands", 303);
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  let newImageKey = null;
  try {
    const data = parseBand(form);
    newImageKey = await storeImage(c, form.get("image"), "bands");
    const imageKey = newImageKey || current.band.image_key;
    await c.env.DB.prepare(
      "UPDATE bands SET slug = ?, band_name = ?, description = ?, image_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(data.slug, data.bandName, data.description, imageKey, current.band.id).run();
    await replaceBandRelations(c, current.band.id, data.members, data.links);
    if (newImageKey && current.band.image_key) await c.env.IMAGES.delete(current.band.image_key);
    return c.redirect(`/bands/${encodeURIComponent(data.slug)}`, 303);
  } catch (error) {
    if (newImageKey) await c.env.IMAGES.delete(newImageKey);
    const csrf = createCsrfCookie();
    c.header("Set-Cookie", csrf.cookie);
    return c.html(bandForm({ token: csrf.token, ...current, error: error.message }), 422);
  }
});

admin.post("/bands/:slug/delete", async (c) => {
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  const band = await c.env.DB.prepare("SELECT id, image_key FROM bands WHERE slug = ?").bind(c.req.param("slug")).first();
  if (band) {
    await c.env.DB.prepare("DELETE FROM bands WHERE id = ?").bind(band.id).run();
    if (band.image_key) await c.env.IMAGES.delete(band.image_key);
  }
  return c.redirect("/bands", 303);
});

export default admin;
