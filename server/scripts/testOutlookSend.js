require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const DEFAULT_RECIPIENT = "abdulahiredwann@gmail.com";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getGraphAccessToken({ tenantId, clientId, clientSecret }) {
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
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      `Token request failed (${tokenRes.status}): ${JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

async function sendEmailWithGraph({ accessToken, senderEmail, recipientEmail }) {
  const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;

  const payload = {
    message: {
      subject: "Outlook integration test from backend",
      body: {
        contentType: "Text",
        content: "This is a test email sent by backend script to verify Outlook credentials.",
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipientEmail,
          },
        },
      ],
    },
    saveToSentItems: "true",
  };

  const sendRes = await fetch(sendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (sendRes.status === 202) {
    return;
  }

  const errData = await sendRes.json().catch(() => ({}));
  throw new Error(
    `Send mail failed (${sendRes.status}): ${JSON.stringify(errData)}`
  );
}

async function main() {
  try {
    const tenantId = requiredEnv("MS_TENANT_ID");
    const clientId = requiredEnv("MS_CLIENT_ID");
    const clientSecret = process.env.MS_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error("Missing required environment variable: MS_CLIENT_SECRET (or OUTLOOK_CLIENT_SECRET)");
    }
    const senderEmail = requiredEnv("MS_SENDER_EMAIL");
    const recipientEmail = process.env.TEST_RECIPIENT_EMAIL || DEFAULT_RECIPIENT;

    console.log("Requesting Microsoft Graph access token...");
    const accessToken = await getGraphAccessToken({ tenantId, clientId, clientSecret });

    console.log(`Sending test email from ${senderEmail} to ${recipientEmail}...`);
    await sendEmailWithGraph({ accessToken, senderEmail, recipientEmail });

    console.log("Success: test email accepted by Microsoft Graph (HTTP 202).");
    console.log("Check recipient inbox/spam and Sent Items of sender mailbox.");
  } catch (error) {
    console.error("Outlook test failed:", error.message || error);
    process.exitCode = 1;
  }
}

main();
