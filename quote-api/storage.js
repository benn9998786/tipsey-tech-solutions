// Storage for quote requests.
//
// Render's free tier gives an *ephemeral* filesystem: anything written to disk is
// wiped on redeploy or restart. The JSON file backend is therefore only a
// convenience cache. The durable record of every enquiry is the email.
//
// Set DATABASE_URL to a Postgres database (Render offers a free one) and this
// switches to real durable storage automatically, with no other code changes.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "quotes.json");

let pgPool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });
  pgPool.on("error", (err) => console.error("[storage] pool error:", err.message));
}

function usingPostgres() {
  return pgPool !== null;
}

async function ensureTable() {
  if (!usingPostgres()) return;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      budget      TEXT,
      message     TEXT NOT NULL,
      source_page TEXT,
      referrer    TEXT,
      ip          TEXT
    )
  `);
}

async function save(quote) {
  if (usingPostgres()) {
    const { rows } = await pgPool.query(
      `INSERT INTO quotes (name, email, phone, budget, message, source_page, referrer, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
      [
        quote.name,
        quote.email,
        quote.phone || null,
        quote.budget || null,
        quote.message,
        quote.sourcePage || null,
        quote.referrer || null,
        quote.ip || null,
      ]
    );
    return rows[0];
  }

  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  let existing = [];
  try {
    existing = JSON.parse(await fs.promises.readFile(DATA_FILE, "utf8"));
  } catch {
    existing = [];
  }
  const record = { id: existing.length + 1, createdAt: new Date().toISOString(), ...quote };
  existing.push(record);
  // Write to a temp file then rename, so a crash mid-write cannot corrupt the store.
  const tmp = DATA_FILE + ".tmp";
  await fs.promises.writeFile(tmp, JSON.stringify(existing, null, 2));
  await fs.promises.rename(tmp, DATA_FILE);
  return record;
}

async function list() {
  if (usingPostgres()) {
    const { rows } = await pgPool.query(
      "SELECT id, created_at AS \"createdAt\", name, email, phone, budget, message, source_page AS \"sourcePage\" FROM quotes ORDER BY created_at DESC"
    );
    return rows;
  }
  try {
    const existing = JSON.parse(await fs.promises.readFile(DATA_FILE, "utf8"));
    return existing.slice().reverse();
  } catch {
    return [];
  }
}

async function remove(id) {
  if (usingPostgres()) {
    await pgPool.query("DELETE FROM quotes WHERE id = $1", [id]);
    return;
  }
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  let existing = [];
  try {
    existing = JSON.parse(await fs.promises.readFile(DATA_FILE, "utf8"));
  } catch {
    return;
  }
  const kept = existing.filter((q) => String(q.id) !== String(id));
  const tmp = DATA_FILE + ".tmp";
  await fs.promises.writeFile(tmp, JSON.stringify(kept, null, 2));
  await fs.promises.rename(tmp, DATA_FILE);
}

module.exports = { save, list, remove, usingPostgres, ensureTable };