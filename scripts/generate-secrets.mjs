import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.env.SQUARE_ADMIN_PASSWORD;
if (!password || password.length < 12) {
  throw new Error("Set SQUARE_ADMIN_PASSWORD to a new value of at least 12 characters.");
}

const iterations = 310000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const base64url = (value) => Buffer.from(value).toString("base64url");

console.log("ADMIN_PASSWORD_HASH");
console.log(`pbkdf2-sha256$${iterations}$${base64url(salt)}$${base64url(hash)}`);
console.log("\nSESSION_SECRET");
console.log(base64url(randomBytes(32)));
console.log("\nStore both values with wrangler secret put. Do not save this output in the repository.");
