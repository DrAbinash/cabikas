/* ============================================================================
 *  server.js — B. K. & Co., Chartered Accountants website
 *
 *  A small, zero-dependency Node.js server that:
 *    1. serves the static site from ./public
 *    2. exposes GET /api/settings — editable site details (phone, email,
 *       address, ICAI membership no., office hours, notice, photo)
 *    3. serves a password-protected admin panel at /admin where those
 *       details can be changed; they persist in DATA_DIR/settings.json
 *       (a Docker volume in production, so rebuilds never lose them)
 *
 *  Configuration (all optional):
 *    PORT            listen port                       (default 3000)
 *    DATA_DIR        writable dir for settings/photo   (default ./data)
 *    ADMIN_PASSWORD  password for /admin               (default changeme123)
 * ========================================================================= */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT || "3000", 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const PUBLIC_DIR = path.join(__dirname, "public");
const ADMIN_PAGE = path.join(__dirname, "admin", "admin.html");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const SECRET_FILE = path.join(DATA_DIR, "secret.key");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "bk_admin";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // decoded image size cap

/* ---------------------------------------------------------------- storage */

fs.mkdirSync(DATA_DIR, { recursive: true });

// Secret for signing session cookies; generated once and persisted so
// logins survive container restarts.
let SECRET;
try {
  SECRET = fs.readFileSync(SECRET_FILE, "utf8").trim();
  if (SECRET.length < 32) throw new Error("secret too short");
} catch {
  SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, SECRET, { mode: 0o600 });
}

// Defaults mirror the values baked into public/index.html. An empty override
// removes the key, falling back to these; membershipNo / officeHours / notice
// default to "" which the front end treats as "hidden".
const DEFAULT_SETTINGS = {
  phone: "+91 99734 97199",
  whatsapp: "+91 99734 97199",
  email: "mailmebikas@gmail.com",
  addressLines: [
    "Hotel Vijaya, Near Tower Chowk,",
    "Jalsar Road, Deoghar — 814112,",
    "Jharkhand, India",
  ],
  membershipNo: "",
  officeHours: "",
  notice: "",
  photoUrl: "",
};

function readSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(overrides) {
  const tmp = SETTINGS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(overrides, null, 2));
  fs.renameSync(tmp, SETTINGS_FILE);
}

// Only the overrides are stored on disk; this returns them (may be partial).
function readOverrides() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

/* ---------------------------------------------------------------- sessions */

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

function makeToken() {
  const expiry = String(Date.now() + SESSION_TTL_MS);
  return expiry + "." + sign(expiry);
}

function tokenValid(token) {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiry = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(expiry);
  if (mac.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  return Number(expiry) > Date.now();
}

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function isAuthed(req) {
  return tokenValid(getCookie(req, COOKIE_NAME));
}

/* Basic login rate limit: 10 attempts per 15 minutes per IP. */
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

/* ---------------------------------------------------------------- helpers */

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req, limitBytes) {
  const buf = await readBody(req, limitBytes);
  return JSON.parse(buf.toString("utf8") || "{}");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  // Assets may be cached for a week; HTML is revalidated on each visit so
  // updates appear immediately after a redeploy.
  const cache = ext === ".html" ? "no-cache" : "public, max-age=604800";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 500, { error: "read error" });
      return;
    }
    res.writeHead(status, {
      "Content-Type": type,
      "Content-Length": data.length,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
}

function serveNotFound(res) {
  const page = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(page)) serveFile(res, page, 404);
  else sendJson(res, 404, { error: "not found" });
}

/* --------------------------------------------------------- field cleaning */

const TEXT_FIELDS = {
  phone: 30,
  whatsapp: 30,
  email: 120,
  membershipNo: 40,
  officeHours: 140,
  notice: 300,
};

function cleanSettingsInput(input) {
  const cleaned = {};
  for (const [key, maxLen] of Object.entries(TEXT_FIELDS)) {
    if (!(key in input)) continue;
    if (typeof input[key] !== "string") throw new Error(`invalid ${key}`);
    cleaned[key] = input[key].trim().slice(0, maxLen);
  }
  if ("addressLines" in input) {
    let lines = input.addressLines;
    if (typeof lines === "string") lines = lines.split("\n");
    if (!Array.isArray(lines)) throw new Error("invalid addressLines");
    cleaned.addressLines = lines
      .map((l) => String(l).trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 6);
  }
  return cleaned;
}

/* ------------------------------------------------------------------ photo */

const PHOTO_BASENAME = "profile-photo";
const PHOTO_EXTS = [".jpg", ".png", ".webp"];

function deleteExistingPhotos() {
  for (const ext of PHOTO_EXTS) {
    const p = path.join(DATA_DIR, PHOTO_BASENAME + ext);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function savePhotoFromDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl || "");
  if (!match) throw new Error("photo must be a PNG, JPEG or WebP image");
  const ext = match[1] === "png" ? ".png" : match[1] === "webp" ? ".webp" : ".jpg";
  const buf = Buffer.from(match[2], "base64");
  if (buf.length === 0) throw new Error("empty image");
  if (buf.length > MAX_PHOTO_BYTES) throw new Error("image larger than 4 MB");
  deleteExistingPhotos();
  fs.writeFileSync(path.join(DATA_DIR, PHOTO_BASENAME + ext), buf);
  return "/uploads/" + PHOTO_BASENAME + ext + "?v=" + Date.now();
}

/* ------------------------------------------------------------------ server */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  try {
    /* ---- health ---- */
    if (p === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("ok");
      return;
    }

    /* ---- public settings ---- */
    if (p === "/api/settings" && req.method === "GET") {
      sendJson(res, 200, readSettings());
      return;
    }

    /* ---- admin auth ---- */
    if (p === "/api/admin/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress || "unknown";
      if (rateLimited(ip)) {
        sendJson(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
        return;
      }
      const body = await readJsonBody(req, 4096);
      const given = Buffer.from(String(body.password || ""));
      const actual = Buffer.from(ADMIN_PASSWORD);
      const ok =
        given.length === actual.length && crypto.timingSafeEqual(given, actual);
      if (!ok) {
        sendJson(res, 401, { error: "Incorrect password." });
        return;
      }
      res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
      );
      sendJson(res, 200, { ok: true });
      return;
    }

    if (p === "/api/admin/logout" && req.method === "POST") {
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (p === "/api/admin/session" && req.method === "GET") {
      sendJson(res, 200, { authed: isAuthed(req) });
      return;
    }

    /* ---- admin-only endpoints ---- */
    if (p.startsWith("/api/admin/")) {
      if (!isAuthed(req)) {
        sendJson(res, 401, { error: "Not logged in." });
        return;
      }

      if (p === "/api/admin/settings" && req.method === "PUT") {
        const body = await readJsonBody(req, 64 * 1024);
        const cleaned = cleanSettingsInput(body);
        const overrides = readOverrides();
        for (const [key, value] of Object.entries(cleaned)) {
          const isEmpty =
            value === "" || (Array.isArray(value) && value.length === 0);
          if (isEmpty) delete overrides[key];
          else overrides[key] = value;
        }
        writeSettings(overrides);
        sendJson(res, 200, readSettings());
        return;
      }

      if (p === "/api/admin/photo" && req.method === "PUT") {
        const body = await readJsonBody(req, 8 * 1024 * 1024);
        const overrides = readOverrides();
        overrides.photoUrl = savePhotoFromDataUrl(body.dataUrl);
        writeSettings(overrides);
        sendJson(res, 200, readSettings());
        return;
      }

      if (p === "/api/admin/photo" && req.method === "DELETE") {
        deleteExistingPhotos();
        const overrides = readOverrides();
        delete overrides.photoUrl;
        writeSettings(overrides);
        sendJson(res, 200, readSettings());
        return;
      }

      sendJson(res, 404, { error: "unknown admin endpoint" });
      return;
    }

    /* ---- uploaded photo (only the known filename is reachable) ---- */
    if (p.startsWith("/uploads/") && req.method === "GET") {
      const name = p.slice("/uploads/".length);
      const allowed = PHOTO_EXTS.map((ext) => PHOTO_BASENAME + ext);
      if (!allowed.includes(name)) {
        serveNotFound(res);
        return;
      }
      const filePath = path.join(DATA_DIR, name);
      if (!fs.existsSync(filePath)) {
        serveNotFound(res);
        return;
      }
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) return sendJson(res, 500, { error: "read error" });
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Length": data.length,
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(data);
      });
      return;
    }

    /* ---- admin page ---- */
    if (p === "/admin" || p === "/admin/") {
      serveFile(res, ADMIN_PAGE);
      return;
    }

    /* ---- static site ---- */
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }

    let rel = decodeURIComponent(p);
    if (rel.endsWith("/")) rel += "index.html";
    const resolved = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== PUBLIC_DIR) {
      serveNotFound(res);
      return;
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      serveFile(res, resolved);
      return;
    }
    serveNotFound(res);
  } catch (err) {
    const message = err && err.message ? err.message : "server error";
    const status =
      message === "payload too large" ? 413 :
      message.includes("JSON") ? 400 :
      /photo|image|invalid/.test(message) ? 400 : 500;
    sendJson(res, status, { error: message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`B. K. & Co. website listening on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
