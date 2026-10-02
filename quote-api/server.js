// Tipsey Tech Solutions - quote request backend
//
// Endpoints:
//   POST /api/quote      - receive a website quote request (public)
//   GET  /api/health     - service health check (public)
//   GET  /admin          - password-protected list of all enquiries
//   GET  /admin/export   - same data as CSV download
//   GET  /admin/delete/:id - remove one enquiry
//
// Configure with the environment variables in .env.example.

const path = require("path");
const express = require("express");
const cors = require("cors");
const storage = require("./storage");
const { notify } = require("./mailer");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "32kb" }));
app.use(
  cors({
    // Restrict to the marketing site so the endpoint cannot be abused from
    // arbitrary pages. Falls back to reflecting the origin if unset.
    origin: process.env.ALLOWED_ORIGIN
      ? process.env.ALLOWED_ORIGIN.split(",").map((s) => s.trim())
      : true,
    methods: ["POST", "GET", "DELETE"],
  })
);

// --- Spam protection -------------------------------------------------------
// Two cheap layers: a hidden honeypot field that humans never fill, and a
// per-IP rate limit. Both are enough to stop naive scrapers and form spam.
const HONEYPOT_FIELD = "company_website";

const attempts = new Map();
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR) || 10;

function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (attempts.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  attempts.set(ip, hits);
  if (hits.length > RATE_LIMIT) {
    return res
      .status(429)
      .json({ ok: false, error: "Too many requests. Please try again later." });
  }
  // Stop the map growing without bound on a long-running instance.
  if (attempts.size > 5000) attempts.clear();
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const phone = String(body.phone || "").trim().slice(0, 40);
  const budget = String(body.budget || "").trim().slice(0, 40);
  const sourcePage = String(body.sourcePage || "").trim().slice(0, 200);

  if (!name) return { error: "Please provide your name." };
  if (name.length > 120) return { error: "Name is too long." };
  if (!EMAIL_RE.test(email)) return { error: "Please provide a valid email address." };
  if (email.length > 200) return { error: "Email is too long." };
  if (!message) return { error: "Please tell us a little about your project." };
  if (message.length > 5000) return { error: "Message is too long." };

  return { value: { name, email, message, phone, budget, sourcePage } };
}

// --- Public endpoints ------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    storage: storage.usingPostgres() ? "postgres" : "file (ephemeral on free tier)",
    mailConfigured: Boolean(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL),
  });
});

app.post("/api/quote", rateLimit, async (req, res) => {
  const body = req.body || {};

  // Honeypot filled in => almost certainly a bot. Respond as if it worked so the
  // bot does not learn to adapt, but store and send nothing.
  if (body[HONEYPOT_FIELD]) {
    return res.status(202).json({ ok: true });
  }

  const { error, value } = validate(body);
  if (error) return res.status(400).json({ ok: false, error });

  const quote = {
    ...value,
    referrer: String(req.get("referer") || "").slice(0, 300),
    ip: req.ip,
  };

  try {
    await storage.save(quote);
  } catch (err) {
    console.error("[quote] storage failed:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Could not save your enquiry. Please try again." });
  }

  // Email is best-effort. The enquiry is already safely stored, so a mail
  // outage must not turn into a failed submission for the customer.
  try {
    await notify(quote);
  } catch (err) {
    console.error("[quote] email failed:", err.message);
  }

  res.status(202).json({ ok: true });
});

// --- Admin -----------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res
      .status(503)
      .send("ADMIN_PASSWORD is not set on the server, so the dashboard is disabled.");
  }
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    const safeCompare = (a, b) => {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      return diff === 0;
    };
    if (safeCompare(user, ADMIN_USER) && safeCompare(pass, ADMIN_PASSWORD)) {
      return next();
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="Quote requests", charset="UTF-8"');
  res.status(401).send("Authentication required.");
}

const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

app.get("/admin", requireAdmin, async (req, res) => {
  const quotes = await storage.list();
  const rows = quotes
    .map(
      (q) => `<tr>
      <td>${esc(new Date(q.createdAt).toLocaleString("en-GB"))}</td>
      <td><strong>${esc(q.name)}</strong></td>
      <td><a href="mailto:${esc(q.email)}">${esc(q.email)}</a></td>
      <td>${q.phone ? `<a href="tel:${esc(q.phone)}">${esc(q.phone)}</a>` : "&mdash;"}</td>
      <td>${esc(q.budget)}</td>
      <td class="msg">${esc(q.message).replace(/\n/g, "<br>")}</td>
      <td><form method="post" action="/admin/delete/${esc(q.id)}" onsubmit="return confirm('Delete this enquiry?')"><button>Delete</button></form></td>
    </tr>`
    )
    .join("\n");

  res.type("html").send(`<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Quote requests - Tipsey Tech</title>
<style>
 body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#050905;color:#e9f6e3}
 h1{color:#7ce03e;margin:0 0 4px;font-size:22px}
 p.sub{color:#9dbb98;margin:0 0 20px}
 table{width:100%;border-collapse:collapse;background:#0e160e;border-radius:8px;overflow:hidden}
 th,td{padding:10px;border-bottom:1px solid rgba(126,224,66,.16);text-align:left;vertical-align:top}
 th{color:#7ce03e;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
 td.msg{white-space:pre-wrap;max-width:420px}
 a{color:#7ce03e}
 .empty{color:#9dbb98;padding:20px}
 button{cursor:pointer;background:#7ce03e;border:0;border-radius:4px;padding:4px 10px;font-weight:600}
</style></head><body>
<h1>Quote requests</h1>
<p class="sub">${quotes.length} received${
    storage.usingPostgres()
      ? " &middot; stored in Postgres (durable)"
      : " &middot; stored on disk (resets on redeploy &mdash; email is the permanent record)"
  }</p>
<p><a href="/admin/export">Download CSV</a></p>
${
  quotes.length
    ? `<table><tr><th>Received</th><th>Name</th><th>Email</th><th>Phone</th><th>Budget</th><th>Details</th><th></th></tr>\n${rows}</table>`
    : '<div class="empty">No enquiries yet.</div>'
}
</body></html>`);
});

app.get("/admin/export", requireAdmin, async (req, res) => {
  const quotes = await storage.list();
  const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const csv = [
    ["Received", "Name", "Email", "Phone", "Budget", "Details", "Page"]
      .map(cell)
      .join(","),
    ...quotes.map((q) =>
      [
        q.createdAt,
        q.name,
        q.email,
        q.phone,
        q.budget,
        q.message,
        q.sourcePage,
      ]
        .map(cell)
        .join(",")
    ),
  ].join("\r\n");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="quote-requests.csv"`);
  res.send(csv);
});

app.post("/admin/delete/:id", requireAdmin, async (req, res) => {
  await storage.remove(req.params.id).catch(() => {});
  res.redirect("/admin");
});

app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

storage
  .ensureTable()
  .catch((err) => console.error("[storage] table setup failed:", err.message))
  .finally(() =>
    app.listen(PORT, () => console.log(`Quote API listening on :${PORT}`))
  );

module.exports = app;