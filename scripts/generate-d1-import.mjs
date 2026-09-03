import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2] || "migration/mysql-export.json";
const sqlPath = process.argv[3] || "migration/d1-import.sql";
const manifestPath = process.argv[4] || "migration/image-manifest.json";

const source = JSON.parse(await readFile(inputPath, "utf8"));
const tables = source.tables || {};
const attachments = tables.active_storage_attachments || [];
const blobs = new Map((tables.active_storage_blobs || []).map((blob) => [Number(blob.id), blob]));

const quote = (value) => value === null || value === undefined
  ? "NULL"
  : `'${String(value).replaceAll("'", "''")}'`;
const integer = (value) => Number.isSafeInteger(Number(value)) ? String(Number(value)) : "NULL";
const time = (value) => {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/(\d{2}:\d{2})(?::\d{2})?/);
  return match ? match[1] : text.slice(0, 5);
};
const safeName = (value) => path.basename(String(value || "image")).replace(/[^a-zA-Z0-9._-]/g, "_");

function attachmentFor(type, id, name) {
  return attachments.find((item) =>
    item.record_type === type && Number(item.record_id) === Number(id) && item.name === name
  );
}

function targetFor(type, record, attachment) {
  if (!attachment) return null;
  const blob = blobs.get(Number(attachment.blob_id));
  if (!blob) return null;
  const folder = type === "Band" ? `bands/${record.slug}` : `gigs/${record.id}`;
  return {
    sourceKey: blob.key,
    sourceFilename: blob.filename,
    sourceContentType: blob.content_type,
    sourceByteSize: Number(blob.byte_size),
    targetKey: `${folder}/${blob.key}-${safeName(blob.filename)}`
  };
}

const lines = [
  "PRAGMA foreign_keys = OFF;",
  "BEGIN TRANSACTION;",
  "DELETE FROM gig_images;",
  "DELETE FROM gig_links;",
  "DELETE FROM gig_bands;",
  "DELETE FROM band_links;",
  "DELETE FROM band_members;",
  "DELETE FROM gigs;",
  "DELETE FROM bands;"
];
const imageManifest = [];

for (const band of tables.bands || []) {
  const image = targetFor("Band", band, attachmentFor("Band", band.id, "image"));
  if (image) imageManifest.push({ recordType: "Band", recordId: Number(band.id), ...image });
  lines.push(`INSERT INTO bands (id, slug, band_name, description, image_key, created_at, updated_at) VALUES (${integer(band.id)}, ${quote(band.slug)}, ${quote(band.band_name)}, ${quote(band.description)}, ${quote(image?.targetKey)}, ${quote(band.created_at)}, ${quote(band.updated_at)});`);

  for (let index = 1; index <= 9; index += 1) {
    const name = String(band[`member_${index}`] || "").trim();
    if (name) lines.push(`INSERT INTO band_members (band_id, name, sort_order) VALUES (${integer(band.id)}, ${quote(name)}, ${index - 1});`);
  }
  for (let index = 1; index <= 4; index += 1) {
    const label = String(band[`link_name_${index}`] || "").trim();
    const url = String(band[`link_url_${index}`] || "").trim();
    if (label && url) lines.push(`INSERT INTO band_links (band_id, label, url, sort_order) VALUES (${integer(band.id)}, ${quote(label)}, ${quote(url)}, ${index - 1});`);
  }
}

for (const gig of tables.gigs || []) {
  lines.push(`INSERT INTO gigs (id, gig_name, event_date, start_time, end_time, location, description, created_at, updated_at) VALUES (${integer(gig.id)}, ${quote(gig.gig_name)}, ${quote(gig.date)}, ${quote(time(gig.start_time))}, ${quote(time(gig.end_time))}, ${quote(gig.location)}, ${quote(gig.description)}, ${quote(gig.created_at)}, ${quote(gig.updated_at)});`);

  for (let index = 1; index <= 3; index += 1) {
    const label = String(gig[`link_name_${index}`] || "").trim();
    const url = String(gig[`link_url_${index}`] || "").trim();
    if (label && url) lines.push(`INSERT INTO gig_links (gig_id, label, url, sort_order) VALUES (${integer(gig.id)}, ${quote(label)}, ${quote(url)}, ${index - 1});`);
  }

  const gigAttachments = attachments.filter((item) =>
    item.record_type === "Gig" && Number(item.record_id) === Number(gig.id) && item.name === "images"
  );
  gigAttachments.forEach((attachment, index) => {
    const image = targetFor("Gig", gig, attachment);
    if (!image) return;
    imageManifest.push({ recordType: "Gig", recordId: Number(gig.id), ...image });
    lines.push(`INSERT INTO gig_images (gig_id, object_key, alt_text, sort_order) VALUES (${integer(gig.id)}, ${quote(image.targetKey)}, ${quote(gig.gig_name)}, ${index});`);
  });
}

for (const relation of tables.gig_bands || []) {
  lines.push(`INSERT INTO gig_bands (gig_id, band_id) VALUES (${integer(relation.gig_id)}, ${integer(relation.band_id)});`);
}

lines.push("COMMIT;", "PRAGMA foreign_keys = ON;", "");
await mkdir(path.dirname(sqlPath), { recursive: true });
await writeFile(sqlPath, lines.join("\n"), { mode: 0o600 });
await writeFile(manifestPath, JSON.stringify(imageManifest, null, 2) + "\n", { mode: 0o600 });
console.log(`Generated ${sqlPath} and ${manifestPath} (${imageManifest.length} images)`);
