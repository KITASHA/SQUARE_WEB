const encoder = new TextEncoder();
const COOKIE_NAME = "square_session";
const CSRF_COOKIE = "square_csrf";
const SESSION_SECONDS = 60 * 60 * 12;

function bytesToBase64Url(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), part.slice(separator + 1)];
  }));
}

export async function verifyPassword(password, storedValue) {
  const [algorithm, iterationsText, saltText, hashText] = String(storedValue || "").split("$");
  if (algorithm !== "pbkdf2-sha256") return false;
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations < 210000) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64UrlToBytes(saltText),
    iterations
  }, key, 256));
  return timingSafeEqual(result, base64UrlToBytes(hashText));
}

export async function createSessionCookie(secret) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    authenticated: true,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })));
  const signature = bytesToBase64Url(await hmac(secret, payload));
  return `${COOKIE_NAME}=${payload}.${signature}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function isAuthenticated(c) {
  if (!c.env.SESSION_SECRET) return false;
  const cookies = parseCookies(c.req.header("Cookie"));
  const [payload, signature] = String(cookies[COOKIE_NAME] || "").split(".");
  if (!payload || !signature) return false;
  const expected = await hmac(c.env.SESSION_SECRET, payload);
  if (!timingSafeEqual(expected, base64UrlToBytes(signature))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return data.authenticated === true && data.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function createCsrfCookie() {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return {
    token,
    cookie: `${CSRF_COOKIE}=${token}; Path=/; Max-Age=3600; Secure; SameSite=Strict`
  };
}

export function verifyCsrf(c, submittedToken) {
  const cookies = parseCookies(c.req.header("Cookie"));
  const cookieToken = cookies[CSRF_COOKIE] || "";
  const left = encoder.encode(cookieToken);
  const right = encoder.encode(String(submittedToken || ""));
  return cookieToken.length >= 32 && timingSafeEqual(left, right);
}

async function clientKey(c) {
  const address = c.req.header("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(address));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function loginAllowed(c) {
  const key = await clientKey(c);
  const row = await c.env.DB.prepare(
    "SELECT failure_count, blocked_until FROM login_rate_limits WHERE client_key = ?"
  ).bind(key).first();
  return { key, allowed: !row || row.blocked_until <= Math.floor(Date.now() / 1000) };
}

export async function recordLoginFailure(c, key) {
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    "SELECT failure_count, window_started_at FROM login_rate_limits WHERE client_key = ?"
  ).bind(key).first();
  const withinWindow = row && now - row.window_started_at < 900;
  const failures = withinWindow ? row.failure_count + 1 : 1;
  const blockedUntil = failures >= 5 ? now + 900 : 0;
  await c.env.DB.prepare(
    "INSERT INTO login_rate_limits (client_key, window_started_at, failure_count, blocked_until) VALUES (?, ?, ?, ?) ON CONFLICT(client_key) DO UPDATE SET window_started_at = excluded.window_started_at, failure_count = excluded.failure_count, blocked_until = excluded.blocked_until"
  ).bind(key, withinWindow ? row.window_started_at : now, failures, blockedUntil).run();
}

export async function clearLoginFailures(c, key) {
  await c.env.DB.prepare("DELETE FROM login_rate_limits WHERE client_key = ?").bind(key).run();
}
