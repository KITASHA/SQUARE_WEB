import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const manifestPath = process.argv[2] || "migration/image-manifest.json";
const uploadsRoot = path.resolve(process.argv[3] || "../SQU-App/public/uploads");
const bucket = process.argv[4] || "square-web-images";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function sourcePath(key) {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error(`Unsafe Active Storage key: ${key}`);
  const resolved = path.resolve(uploadsRoot, key.slice(0, 2), key.slice(2, 4), key);
  if (!resolved.startsWith(uploadsRoot + path.sep)) throw new Error("Resolved path escaped uploads root");
  return resolved;
}

for (const image of manifest) {
  const filePath = sourcePath(image.sourceKey);
  const bytes = await readFile(filePath);
  if (bytes.length !== image.sourceByteSize) {
    throw new Error(`Size mismatch: ${filePath}`);
  }
  if (image.sourceChecksum) {
    const checksum = createHash("md5").update(bytes).digest("base64");
    if (checksum !== image.sourceChecksum) throw new Error(`Checksum mismatch: ${filePath}`);
  }
  const args = [
    "wrangler", "r2", "object", "put",
    `${bucket}/${image.targetKey}`,
    "--file", filePath,
    "--content-type", image.sourceContentType || "application/octet-stream",
    "--remote"
  ];
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`R2 upload failed: ${image.targetKey}`);
}

console.log(`Uploaded and verified ${manifest.length} images to ${bucket}`);
