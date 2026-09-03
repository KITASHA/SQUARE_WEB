import { Hono } from "hono";
import { createCsrfCookie, isAuthenticated, verifyCsrf } from "./auth.js";
import { escapeHtml, layout, safeExternalUrl } from "./html.js";

const gigsAdmin = new Hono();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

gigsAdmin.use("*", async (c, next) => {
  if (!await isAuthenticated(c)) return c.redirect("/login", 303);
  await next();
});

const field = (form, name, max = 10000) => String(form.get(name) || "").trim().slice(0, max);
const csrfInput = (token) => `<input type="hidden" name="csrf_token" value="${escapeHtml(token)}">`;

async function bandsForForm(c) {
  const { results } = await c.env.DB.prepare("SELECT id, band_name FROM bands ORDER BY sort_order, band_name").all();
  return results;
}

function gigLinks(links = []) {
  return [0, 1, 2].map((index) => `<fieldset><legend>リンク${index + 1}</legend>
    <label>表示名<input name="link_label_${index + 1}" maxlength="60" value="${escapeHtml(links[index]?.label || "")}"></label>
    <label>URL<input name="link_url_${index + 1}" type="url" maxlength="500" value="${escapeHtml(links[index]?.url || "")}"></label>
  </fieldset>`).join("");
}

function gigForm({ token, bands, gig = {}, selectedBandIds = [], links = [], images = [], error = "" }) {
  const editing = Boolean(gig.id);
  const bandOptions = bands.map((band) => `<label class="check"><input type="checkbox" name="band_ids" value="${band.id}" ${selectedBandIds.includes(Number(band.id)) ? "checked" : ""}>${escapeHtml(band.band_name)}</label>`).join("");
  const existingImages = images.length ? `<div><h2>登録済み画像</h2><div class="grid">${images.map((item) => `<img class="detail-image" src="/media/${encodeURIComponent(item.object_key)}" alt="${escapeHtml(item.alt_text || gig.gig_name || "")}">`).join("")}</div></div>` : "";
  return layout({
    title: editing ? "出演情報編集" : "出演情報登録",
    authenticated: true,
    body: `<section class="admin-form"><h1>${editing ? "出演情報編集" : "出演情報登録"}</h1>
      ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
      <form action="${editing ? `/admin/gigs/${gig.id}` : "/admin/gigs"}" method="post" enctype="multipart/form-data">
        ${csrfInput(token)}
        <label>イベント名<input name="gig_name" required maxlength="50" value="${escapeHtml(gig.gig_name || "")}"></label>
        <label>開催日<input name="event_date" type="date" required value="${escapeHtml(gig.event_date || "")}"></label>
        <label>開始時刻<input name="start_time" type="time" required value="${escapeHtml(String(gig.start_time || "").slice(0, 5))}"></label>
        <label>終了時刻<input name="end_time" type="time" value="${escapeHtml(String(gig.end_time || "").slice(0, 5))}"></label>
        <label>場所<input name="location" maxlength="255" value="${escapeHtml(gig.location || "")}"></label>
        <label>説明<textarea name="description" required maxlength="10000" rows="8">${escapeHtml(gig.description || "")}</textarea></label>
        <fieldset><legend>出演バンド</legend><div class="checkbox-grid">${bandOptions || "<p>先にバンドを登録してください。</p>"}</div></fieldset>
        ${gigLinks(links)}
        <label>追加画像（各5MB以下、複数選択可）<input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp"></label>
        <label>画像の代替テキスト<input name="image_alt" maxlength="200" value=""></label>
        <button class="button" type="submit">保存</button>
      </form>
      ${existingImages}
      ${editing ? `<form action="/admin/gigs/${gig.id}/delete" method="post" class="danger-form">${csrfInput(token)}<button type="submit">削除</button></form>` : ""}
    </section>`
  });
}

function parseGig(form) {
  const gigName = field(form, "gig_name", 50);
  const eventDate = field(form, "event_date", 10);
  const startTime = field(form, "start_time", 5);
  const endTime = field(form, "end_time", 5);
  const location = field(form, "location", 255);
  const description = field(form, "description", 10000);
  if (!gigName || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^\d{2}:\d{2}$/.test(startTime) || !description) {
    throw new Error("イベント名、開催日、開始時刻、説明を正しく入力してください。");
  }
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) throw new Error("終了時刻が正しくありません。");
  const bandIds = form.getAll("band_ids").map(Number).filter(Number.isSafeInteger);
  const links = [];
  for (let index = 1; index <= 3; index += 1) {
    const label = field(form, `link_label_${index}`, 60);
    const url = field(form, `link_url_${index}`, 500);
    if (!label && !url) continue;
    const safeUrl = safeExternalUrl(url);
    if (!label || !safeUrl) throw new Error("リンクは表示名とHTTPS URLを両方入力してください。");
    links.push({ label, url: safeUrl });
  }
  return { gigName, eventDate, startTime, endTime: endTime || null, location, description, bandIds, links };
}

async function uploadImages(c, form, gigName) {
  const files = form.getAll("images").filter((item) => item instanceof File && item.size > 0);
  const altText = field(form, "image_alt", 200) || gigName;
  const keys = [];
  try {
    for (const file of files) {
      const extension = IMAGE_TYPES.get(file.type);
      if (!extension) throw new Error("画像はJPEG、PNG、WebPのみ使用できます。");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("画像は1枚5MB以下にしてください。");
      const key = `gigs/${crypto.randomUUID()}.${extension}`;
      await c.env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { originalName: file.name.slice(0, 200) }
      });
      keys.push({ key, altText });
    }
    return keys;
  } catch (error) {
    await Promise.all(keys.map((item) => c.env.IMAGES.delete(item.key)));
    throw error;
  }
}

async function replaceRelations(c, gigId, data) {
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM gig_bands WHERE gig_id = ?").bind(gigId),
    c.env.DB.prepare("DELETE FROM gig_links WHERE gig_id = ?").bind(gigId),
    ...data.bandIds.map((bandId) => c.env.DB.prepare("INSERT INTO gig_bands (gig_id, band_id) VALUES (?, ?)").bind(gigId, bandId)),
    ...data.links.map((link, index) => c.env.DB.prepare("INSERT INTO gig_links (gig_id, label, url, sort_order) VALUES (?, ?, ?, ?)").bind(gigId, link.label, link.url, index))
  ]);
}

async function addImageRows(c, gigId, uploaded) {
  if (!uploaded.length) return;
  const row = await c.env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM gig_images WHERE gig_id = ?").bind(gigId).first();
  await c.env.DB.batch(uploaded.map((item, index) => c.env.DB.prepare(
    "INSERT INTO gig_images (gig_id, object_key, alt_text, sort_order) VALUES (?, ?, ?, ?)"
  ).bind(gigId, item.key, item.altText, Number(row.max_order) + index + 1)));
}

async function loadGig(c, id) {
  const gig = await c.env.DB.prepare("SELECT * FROM gigs WHERE id = ?").bind(id).first();
  if (!gig) return null;
  const [bands, links, images] = await Promise.all([
    c.env.DB.prepare("SELECT band_id FROM gig_bands WHERE gig_id = ?").bind(id).all(),
    c.env.DB.prepare("SELECT label, url FROM gig_links WHERE gig_id = ? ORDER BY sort_order, id").bind(id).all(),
    c.env.DB.prepare("SELECT object_key, alt_text FROM gig_images WHERE gig_id = ? ORDER BY sort_order, id").bind(id).all()
  ]);
  return { gig, selectedBandIds: bands.results.map((row) => Number(row.band_id)), links: links.results, images: images.results };
}

gigsAdmin.get("/new", async (c) => {
  const csrf = createCsrfCookie();
  c.header("Set-Cookie", csrf.cookie);
  return c.html(gigForm({ token: csrf.token, bands: await bandsForForm(c) }));
});

gigsAdmin.post("/", async (c) => {
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  let uploaded = [];
  try {
    const data = parseGig(form);
    uploaded = await uploadImages(c, form, data.gigName);
    const result = await c.env.DB.prepare(
      "INSERT INTO gigs (gig_name, event_date, start_time, end_time, location, description) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(data.gigName, data.eventDate, data.startTime, data.endTime, data.location, data.description).run();
    const gigId = result.meta.last_row_id;
    await replaceRelations(c, gigId, data);
    await addImageRows(c, gigId, uploaded);
    return c.redirect(`/gigs/${gigId}`, 303);
  } catch (error) {
    await Promise.all(uploaded.map((item) => c.env.IMAGES.delete(item.key)));
    const csrf = createCsrfCookie();
    c.header("Set-Cookie", csrf.cookie);
    return c.html(gigForm({ token: csrf.token, bands: await bandsForForm(c), error: error.message }), 422);
  }
});

gigsAdmin.get("/:id/edit", async (c) => {
  const data = await loadGig(c, c.req.param("id"));
  if (!data) return c.redirect("/gigs", 303);
  const csrf = createCsrfCookie();
  c.header("Set-Cookie", csrf.cookie);
  return c.html(gigForm({ token: csrf.token, bands: await bandsForForm(c), ...data }));
});

gigsAdmin.post("/:id", async (c) => {
  const current = await loadGig(c, c.req.param("id"));
  if (!current) return c.redirect("/gigs", 303);
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  let uploaded = [];
  try {
    const data = parseGig(form);
    uploaded = await uploadImages(c, form, data.gigName);
    await c.env.DB.prepare(
      "UPDATE gigs SET gig_name = ?, event_date = ?, start_time = ?, end_time = ?, location = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(data.gigName, data.eventDate, data.startTime, data.endTime, data.location, data.description, current.gig.id).run();
    await replaceRelations(c, current.gig.id, data);
    await addImageRows(c, current.gig.id, uploaded);
    return c.redirect(`/gigs/${current.gig.id}`, 303);
  } catch (error) {
    await Promise.all(uploaded.map((item) => c.env.IMAGES.delete(item.key)));
    const csrf = createCsrfCookie();
    c.header("Set-Cookie", csrf.cookie);
    return c.html(gigForm({ token: csrf.token, bands: await bandsForForm(c), ...current, error: error.message }), 422);
  }
});

gigsAdmin.post("/:id/delete", async (c) => {
  const form = await c.req.formData();
  if (!verifyCsrf(c, form.get("csrf_token"))) return c.text("Invalid CSRF token", 403);
  const { results } = await c.env.DB.prepare("SELECT object_key FROM gig_images WHERE gig_id = ?").bind(c.req.param("id")).all();
  await c.env.DB.prepare("DELETE FROM gigs WHERE id = ?").bind(c.req.param("id")).run();
  await Promise.all(results.map((item) => c.env.IMAGES.delete(item.object_key)));
  return c.redirect("/gigs", 303);
});

export default gigsAdmin;
