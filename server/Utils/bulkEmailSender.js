/**
 * Bulk email sender with strong anti-spam protection.
 * - Sends one email at a time (no BCC/CC bulk)
 * - Delay between each send to avoid provider throttling
 * - Personalized subject and body per recipient
 * - Uses Gmail with app password from env (EMAIL_USER, EMAIL_APP_PASSWORD)
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");

/** Public URL for the email header logo so it displays when recipients open the email. */
const LOGO_PUBLIC_URL = "https://usify.stockwise.store/usifyLogo.png";

const DELAY_BETWEEN_EMAILS_MS = 4500;
const MAX_RECIPIENTS_PER_REQUEST = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replace [name] and [website] in a string with recipient values.
 */
function applyPlaceholders(text, recipient) {
  if (!text || typeof text !== "string") return "";
  const name = recipient.name != null ? String(recipient.name) : "";
  const website = recipient.website != null ? String(recipient.website) : "";
  return text
    .replace(/\[name\]/gi, name)
    .replace(/\[website\]/gi, website);
}

/**
 * Strip HTML tags for plain-text fallback (email clients that don't support HTML).
 */
function stripTags(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Replace logo img src (relative path) in HTML with the public URL so the image displays in sent emails.
 */
function injectEmbeddedLogo(html) {
  if (!html || typeof html !== "string") return html;
  return html
    .replace(/src="\/usifyLogo\.png"/gi, `src="${LOGO_PUBLIC_URL}"`)
    .replace(/src="\/usifyLogo\.jpeg"/gi, `src="${LOGO_PUBLIC_URL}"`)
    .replace(/src="\/usifyLogo\.jpg"/gi, `src="${LOGO_PUBLIC_URL}"`);
}

/**
 * Get nodemailer transporter (Gmail). Uses EMAIL_USER and EMAIL_APP_PASSWORD from env.
 */
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env for bulk email. " +
      "Use Gmail app password (not your normal password)."
    );
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });
}

/**
 * Send bulk emails with anti-spam protection.
 * @param {Array<{ name: string, email: string, website?: string }>} recipients
 * @param {string} subjectTemplate - Subject line; [name] and [website] are replaced per recipient
 * @param {string} bodyTemplate - Plain text or HTML body; [name] and [website] are replaced per recipient
 * @param {boolean} [bodyTemplateIsHtml=false] - If true, bodyTemplate is HTML; send as html with text fallback
 * @returns {{ sent: number, failed: number, errors: string[], sentRecipients: Array }}
 */
async function sendBulkEmails(recipients, subjectTemplate, bodyTemplate, bodyTemplateIsHtml = false) {
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return { sent: 0, failed: 0, errors: ["No recipients provided"] };
  }

  const valid = recipients.filter(
    (r) => r && r.email && String(r.email).trim() && String(r.email).includes("@")
  );
  if (valid.length === 0) {
    return { sent: 0, failed: 0, errors: ["No valid email addresses"] };
  }

  if (valid.length > MAX_RECIPIENTS_PER_REQUEST) {
    return {
      sent: 0,
      failed: valid.length,
      errors: [`Maximum ${MAX_RECIPIENTS_PER_REQUEST} recipients per request. You sent ${valid.length}.`],
    };
  }

  const transporter = getTransporter();
  let sent = 0;
  let failed = 0;
  const errors = [];
  const sentRecipients = [];

  // Embed logo as base64 in HTML so it displays in sent emails (no external URL needed)
  let htmlBodyTemplate = bodyTemplate || "";
  if (bodyTemplateIsHtml && htmlBodyTemplate) {
    htmlBodyTemplate = injectEmbeddedLogo(htmlBodyTemplate);
  }

  for (let i = 0; i < valid.length; i++) {
    const recipient = valid[i];
    const email = String(recipient.email).trim().toLowerCase();
    const subject = applyPlaceholders(subjectTemplate || "Hello", recipient);
    const bodyProcessed = bodyTemplateIsHtml ? applyPlaceholders(htmlBodyTemplate, recipient) : applyPlaceholders(bodyTemplate || "", recipient);
    const text = bodyTemplateIsHtml ? stripTags(bodyProcessed) : bodyProcessed;
    const html = bodyTemplateIsHtml ? bodyProcessed : undefined;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        replyTo: process.env.EMAIL_USER,
        subject,
        text,
        ...(html && { html }),
        headers: {
          "X-Priority": "3",
          "X-Mailer": "Node",
        },
      });
      sent++;
      if (recipient.sheetRowIndex != null && recipient.blockIndex != null) {
        sentRecipients.push({ sheetRowIndex: recipient.sheetRowIndex, blockIndex: recipient.blockIndex });
      }
    } catch (err) {
      failed++;
      errors.push(`${email}: ${err.message || "Send failed"}`);
    }

    if (i < valid.length - 1) {
      await sleep(DELAY_BETWEEN_EMAILS_MS);
    }
  }

  return { sent, failed, errors, sentRecipients };
}

module.exports = { sendBulkEmails, applyPlaceholders };
