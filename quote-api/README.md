# Quote request API — Tipsey Tech Solutions

Backend that receives quote requests from the website contact form, emails them to
you, and keeps them in a dashboard you can log into.

The marketing site in the repo root stays a **static** site — this is a separate
service, so nothing about the live site depends on this running.

---

## How a submission flows

```
Visitor fills in the form on contact.html
        ↓  POST (fetch) from script.js
/api/quote  ──►  honeypot check  ──► rate limit  ──► validate
        ↓
   save to storage        (Postgres if configured, else a local file)
        ↓
   send email             (best-effort; a mail failure never loses the lead)
        ↓
   202 back to the browser → "Thanks, we'll be in touch"
```

## Deploying to Render

1. Push this folder to GitHub (it is already in the repo under `quote-api/`).
2. In Render choose **New → Web Service**, connect the repo.
3. Set these values:
   - **Root Directory:** `quote-api`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Add the environment variables (see below). Use `quote-api/render.yaml` as a
   Blueprint instead if you prefer — it does steps 3–4 automatically.

Then set `ALLOWED_ORIGIN` to your site's URL so only your site can post to it.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Password for `/admin`. Use a long random string. |
| `ADMIN_USER` | | Defaults to `admin`. |
| `NOTIFY_EMAIL` | ✅ | Where enquiry emails are delivered. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | ✅ | Any SMTP provider. |
| `MAIL_FROM` | | `From` address. Some providers require one you own. |
| `DATABASE_URL` | | Postgres connection string. Enables durable storage. |
| `ALLOWED_ORIGIN` | | Comma-separated origins allowed to POST. |
| `RATE_LIMIT_PER_HOUR` | | Defaults to `10` per IP per hour. |

**Working SMTP combos:** Resend (`smtp.resend.com`, user `resend`, pass = API key),
SendGrid (`smtp.sendgrid.net`, user `apikey`), Gmail (`smtp.gmail.com`, port 465,
app password), Fastmail (`smtp.fastmail.com`, port 465).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/quote` | public | Submit a quote request. |
| `GET` | `/api/health` | public | Health check; reports storage + mail status. |
| `GET` | `/admin` | password | Dashboard listing every enquiry. |
| `GET` | `/admin/export` | password | Download all enquiries as CSV. |
| `POST` | `/admin/delete/:id` | password | Delete one enquiry. |

## Where the data lives — read this

Without `DATABASE_URL`, enquiries are written to a JSON file **on the service's
disk**. Render's free tier has an *ephemeral* filesystem, so **that file is wiped
on every redeploy or restart.**

This is why email is the primary record: **if you have SMTP working, you always
have every enquiry in your inbox**, and the dashboard is a convenience. To make
the dashboard itself permanent, create a free Postgres database in Render and set
`DATABASE_URL` — no code changes needed, it switches over automatically.

## Spam protection

- **Honeypot field** (`company_website`) — hidden from humans, filled in by bots.
  Bot submissions get a success response so it does not learn to adapt, but
  nothing is stored or emailed.
- **Rate limiting** — 10 submissions per IP per hour by default.
- **Validation** — name, a well-formed email, and a message are all required;
  lengths are capped to stop oversized payloads.

This is enough for ordinary form spam. If the list is ever hit hard, put Cloudflare
or a CAPTCHA in front of it.

## Running locally

```bash
cd quote-api
cp .env.example .env      # fill in the values
npm install
npm start                 # http://localhost:3000
```

Check it is alive: `curl http://localhost:3000/api/health`

## Changing the API address

The form posts to the URL at the top of [../script.js](../script.js):

```js
const QUOTE_API = "https://tipsey-quotes.onrender.com";
```

If your Render service gets a different hostname, update that line and redeploy
the site.