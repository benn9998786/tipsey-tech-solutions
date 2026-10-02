// Email notification for new quote requests.
//
// Works with any SMTP provider (Resend, SendGrid, Postmark, Gmail app password,
// Fastmail, ...). Configure via the SMTP_* environment variables in .env.example.
//
// If SMTP is not configured the API still accepts and stores the enquiry - it
// just skips the email, so a misconfigured mailer can never lose a lead.

const nodemailer = require("nodemailer");

function transporterFromEnv() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(q) {
  const row = (label, value) =>
    value
      ? `<tr><td style="padding:6px 12px 6px 0;color:#666;font:14px Arial,sans-serif;white-space:nowrap">${label}</td>` +
        `<td style="padding:6px 0;color:#111;font:14px Arial,sans-serif">${escapeHtml(value)}</td></tr>`
      : "";

  return (
    `<div style="font:16px Arial,sans-serif;color:#111;max-width:600px">` +
    `<h2 style="margin:0 0 4px">New website quote request</h2>` +
    `<p style="margin:0 0 16px;color:#666">From your website contact form.</p>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">` +
    row("Name", q.name) +
    row("Email", `<a href="mailto:${escapeHtml(q.email)}">${escapeHtml(q.email)}</a>`) +
    row("Phone", q.phone ? `<a href="tel:${escapeHtml(q.phone)}">${escapeHtml(q.phone)}</a>` : "") +
    row("Budget", q.budget) +
    row("Page", q.sourcePage) +
    `</table>` +
    `<h3 style="margin:0 0 6px;font-size:15px">Project details</h3>` +
    `<div style="white-space:pre-wrap;background:#f6f8f4;padding:14px;border-radius:6px;font:14px/1.5 Arial,sans-serif">${escapeHtml(q.message)}</div>` +
    `</div>`
  );
}

async function notify(q) {
  const transporter = transporterFromEnv();
  if (!transporter) {
    console.warn("[mail] SMTP_HOST not set - enquiry stored but no email sent.");
    return { sent: false, reason: "SMTP not configured" };
  }
  const to = process.env.NOTIFY_EMAIL;
  if (!to) {
    console.warn("[mail] NOTIFY_EMAIL not set - enquiry stored but no email sent.");
    return { sent: false, reason: "NOTIFY_EMAIL not set" };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || `"Tipsey Tech Website" <${to}>`,
    to,
    replyTo: q.email,
    subject: `New quote request from ${q.name}${q.budget ? ` (${q.budget})` : ""}`,
    text:
      `New quote request\n\nName: ${q.name}\nEmail: ${q.email}\n` +
      (q.phone ? `Phone: ${q.phone}\n` : "") +
      (q.budget ? `Budget: ${q.budget}\n` : "") +
      (q.sourcePage ? `Page: ${q.sourcePage}\n` : "") +
      `\nProject details:\n${q.message}\n`,
    html: renderEmail(q),
  });
  return { sent: true, id: info.messageId };
}

module.exports = { notify };