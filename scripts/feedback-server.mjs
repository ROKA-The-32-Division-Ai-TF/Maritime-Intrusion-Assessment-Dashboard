import { createServer } from "node:http";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const PORT = Number(process.env.FEEDBACK_PORT || 3810);
const STORE_PATH = process.env.FEEDBACK_STORE_PATH || "/var/lib/baekryong-feedback/feedback.jsonl";
const ADMIN_PIN = process.env.FEEDBACK_ADMIN_PIN || "0000";
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
const rateLimit = new Map();

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function allowedByRateLimit(ip) {
  const now = Date.now();
  const current = rateLimit.get(ip) || [];
  const recent = current.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimit.set(ip, recent);
    return false;
  }

  recent.push(now);
  rateLimit.set(ip, recent);
  return true;
}

function sanitizeRecord(record) {
  const replies = Array.isArray(record.replies)
    ? record.replies.map((reply) => ({
      id: String(reply.id || ""),
      createdAt: String(reply.createdAt || ""),
      author: String(reply.author || "관리자").trim().slice(0, 40),
      message: String(reply.message || "").trim().slice(0, 600),
    })).filter((reply) => reply.message)
    : [];
  return {
    id: String(record.id || ""),
    createdAt: String(record.createdAt || ""),
    path: String(record.path || "").slice(0, 200),
    contact: String(record.contact || "").trim().slice(0, 80),
    message: String(record.message || "").trim().slice(0, 1200),
    replies,
  };
}

async function readRecords() {
  let text = "";
  try {
    text = await readFile(STORE_PATH, "utf8");
  } catch {
    return [];
  }

  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((item) => item?.message);
}

async function handleGet(_req, res) {
  const items = (await readRecords())
    .slice(-50)
    .reverse()
    .map(sanitizeRecord)
    .filter((item) => item.message);

  json(res, 200, { ok: true, items });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body_too_large");
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function handlePost(req, res) {
  const ip = clientIp(req);
  if (!allowedByRateLimit(ip)) {
    json(res, 429, { ok: false, error: "rate_limited" });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    json(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  const message = String(body.message || "").trim().slice(0, 1200);
  if (!message) {
    json(res, 400, { ok: false, error: "message_required" });
    return;
  }

  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ip,
    path: String(body.path || "").slice(0, 200),
    contact: String(body.contact || "").trim().slice(0, 80),
    message,
    userAgent: String(body.userAgent || req.headers["user-agent"] || "").slice(0, 300),
  };

  await mkdir(dirname(STORE_PATH), { recursive: true });
  await appendFile(STORE_PATH, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  json(res, 200, { ok: true, item: sanitizeRecord(record) });
}

async function handleReply(req, res) {
  const ip = clientIp(req);
  if (!allowedByRateLimit(ip)) {
    json(res, 429, { ok: false, error: "rate_limited" });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    json(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  if (String(body.pin || "") !== ADMIN_PIN) {
    json(res, 403, { ok: false, error: "invalid_pin" });
    return;
  }

  const id = String(body.id || "");
  const message = String(body.reply || body.message || "").trim().slice(0, 600);
  if (!id || !message) {
    json(res, 400, { ok: false, error: "reply_required" });
    return;
  }

  const records = await readRecords();
  const index = records.findIndex((record) => String(record.id || "") === id);
  if (index < 0) {
    json(res, 404, { ok: false, error: "not_found" });
    return;
  }

  const reply = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    author: String(body.author || "관리자").trim().slice(0, 40) || "관리자",
    message,
  };
  records[index] = {
    ...records[index],
    replies: [...(Array.isArray(records[index].replies) ? records[index].replies : []), reply].slice(-20),
  };

  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, { mode: 0o600 });
  json(res, 200, { ok: true, item: sanitizeRecord(records[index]) });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/api/feedback")) {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }

    if (url.pathname === "/api/feedback/reply") {
      if (req.method === "POST") {
        await handleReply(req, res);
        return;
      }
      json(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    if (req.method === "GET") {
      await handleGet(req, res);
      return;
    }

    if (req.method === "POST") {
      await handlePost(req, res);
      return;
    }

    json(res, 405, { ok: false, error: "method_not_allowed" });
  } catch {
    json(res, 500, { ok: false, error: "server_error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Baekryong feedback server listening on 127.0.0.1:${PORT}`);
});
