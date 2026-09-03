import mysql from "mysql2/promise";
import { mkdir, writeFile } from "node:fs/promises";

const outputPath = process.argv[2] || "migration/mysql-export.json";
if (!process.env.MYSQL_URL) {
  throw new Error("Set MYSQL_URL in the environment. Never commit it.");
}

const connection = await mysql.createConnection(process.env.MYSQL_URL);

const tables = ["bands", "gigs", "gig_bands", "active_storage_attachments", "active_storage_blobs"];
const output = {
  exportedAt: new Date().toISOString(),
  source: "SQU-App MySQL read-only export",
  tables: {}
};

try {
  await connection.query("SET NAMES utf8mb4");
  await connection.query("SET time_zone = '+00:00'");
  await connection.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
  for (const table of tables) {
    const [rows] = await connection.query("SELECT * FROM ??", [table]);
    output.tables[table] = rows;
  }
  await connection.query("COMMIT");
} catch (error) {
  await connection.query("ROLLBACK");
  throw error;
} finally {
  await connection.end();
}

await mkdir(new URL("../migration/", import.meta.url), { recursive: true });
await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", { mode: 0o600 });
console.log(`Exported ${tables.map((name) => `${name}=${output.tables[name].length}`).join(", ")} to ${outputPath}`);
