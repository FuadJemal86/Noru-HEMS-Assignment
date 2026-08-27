require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const DELAY_BETWEEN_EMAILS_MS = 4500;
const MAX_RECIPIENTS_PER_REQUEST = 50;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyPlaceholders(text, recipient) {
  if (!text || typeof text !== "string") return "";
  const name = recipient?.name != null ? String(recipient.name) : "";
  const website = recipient?.website != null ? String(recipient.website) : "";
  return text
    .replace(/\[name\]/gi, name)
    .replace(/\[website\]/gi, website);
}

function stripTags(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getAzureConfig() {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET;
  const senderEmail = process.env.MS_SENDER_EMAIL;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error(
      "Missing Azure mail env values. Required: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET (or OUTLOOK_CLIENT_SECRET), MS_SENDER_EMAIL."
    );
  }

  return { tenantId, clientId, clientSecret, senderEmail };
}

async function getGraphAccessToken({ tenantId, clientId, clientSecret }) {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt - now > 60 * 1000) {
    return cachedToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(60_000),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      `Azure token request failed (${tokenRes.status}): ${JSON.stringify(tokenData)}`
    );
  }

  const expiresInSec = Number(tokenData.expires_in || 3600);
  cachedToken = tokenData.access_token;
  cachedTokenExpiresAt = now + expiresInSec * 1000;
  return cachedToken;
}

async function sendOneEmailWithGraph({
  accessToken,
  senderEmail,
  to,
  subject,
  body,
}) {
  const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    senderEmail
  )}/sendMail`;

  const plainText = stripTags(body);

  const payload = {
    message: {
      subject,
      body: {
        contentType: "Text",
        content: plainText,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
    saveToSentItems: "true",
  };

  const response = await fetch(sendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (response.status === 202) return;

  const errorData = await response.json().catch(() => ({}));
  throw new Error(
    `Graph send failed (${response.status}): ${JSON.stringify(errorData)}`
  );
}

async function sendBulkEmailsAzure(
  recipients,
  subjectTemplate,
  bodyTemplate,
  bodyTemplateIsHtml = false
) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
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
      errors: [
        `Maximum ${MAX_RECIPIENTS_PER_REQUEST} recipients per request. You sent ${valid.length}.`,
      ],
    };
  }

  const config = getAzureConfig();
  const accessToken = await getGraphAccessToken(config);

  let sent = 0;
  let failed = 0;
  const errors = [];
  const sentRecipients = [];

  for (let i = 0; i < valid.length; i++) {
    const recipient = valid[i];
    const email = String(recipient.email).trim().toLowerCase();
    const subject = applyPlaceholders(subjectTemplate || "Hello", recipient);
    const body = applyPlaceholders(bodyTemplate || "", recipient);

    try {
      await sendOneEmailWithGraph({
        accessToken,
        senderEmail: config.senderEmail,
        to: email,
        subject,
        body,
      });
      sent++;

      if (recipient.businessScrapeId) {
        sentRecipients.push({ businessScrapeId: recipient.businessScrapeId });
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

module.exports = { sendBulkEmailsAzure, applyPlaceholders };
