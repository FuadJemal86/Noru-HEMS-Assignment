const { google } = require("googleapis");

/**
 * Google Sheets helper for email scraping.
 *
 * Sheet layout (one row per website, emails spread across columns):
 *   A          | B       | C       | D       | ...
 *   Website    | Email 1 | Email 2 | Email 3 | ...
 */

let _sheets = null;
let _initError = null;

function getSheetsClient() {
  if (_sheets) return _sheets;
  if (_initError) throw _initError;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    _sheets = google.sheets({ version: "v4", auth });
    return _sheets;
  } catch (err) {
    _initError = err;
    throw err;
  }
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

/**
 * Ensure the header row exists (Website | Email 1 | Email 2 | …).
 * Called once lazily.
 */
let _headerChecked = false;
async function ensureHeader(sheets) {
  if (_headerChecked) return;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A1:A1",
  });

  if (!res.data.values || res.data.values.length === 0 || !res.data.values[0][0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["Website", "Emails →"]],
      },
    });
  }

  _headerChecked = true;
}

/**
 * Find the row number (1-based) for a given website, or null if not found.
 */
async function findWebsiteRow(sheets, website) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A:A",
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toLowerCase() === website.toLowerCase()) {
      return i + 1; // 1-based row number
    }
  }
  return null;
}

/** Convert a plain email into a clickable mailto: HYPERLINK formula */
function emailToHyperlink(email) {
  return `=HYPERLINK("mailto:${email}","${email}")`;
}

/** Extract the plain email from a HYPERLINK formula or plain text */
function extractEmail(cellValue) {
  if (!cellValue) return null;
  // Match =HYPERLINK("mailto:xxx","xxx")
  const match = cellValue.match(/=HYPERLINK\("mailto:([^"]+)"/i);
  return match ? match[1].toLowerCase() : cellValue.toLowerCase();
}

/**
 * Append or update a website row with its emails (as clickable mailto: links).
 * If the website already exists → merges new emails into the existing row.
 * If the website is new → appends a new row.
 *
 * @param {string} website  – website URL / name
 * @param {string[]} emails – array of email addresses
 */
async function appendEmailsToSheet(website, emails) {
  if (!SPREADSHEET_ID) {
    console.warn("GOOGLE_SHEETS_SPREADSHEET_ID not set – skipping sheet sync");
    return;
  }

  try {
    const sheets = getSheetsClient();
    await ensureHeader(sheets);

    const existingRow = await findWebsiteRow(sheets, website);

    if (existingRow) {
      // Read current row (with formulas) to merge emails
      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!${existingRow}:${existingRow}`,
        valueRenderOption: "FORMULA", // get raw formulas so we can parse HYPERLINK
      });

      const currentValues = (rowRes.data.values && rowRes.data.values[0]) || [];
      // currentValues[0] = website, currentValues[1..] = existing email formulas/text
      const existingCells = currentValues.slice(1).filter(Boolean);
      const existingSet = new Set(existingCells.map((c) => extractEmail(c)));

      // Merge: keep existing formulas + add new unique ones as hyperlinks
      const merged = [...existingCells];
      for (const email of emails) {
        if (!existingSet.has(email.toLowerCase())) {
          merged.push(emailToHyperlink(email));
          existingSet.add(email.toLowerCase());
        }
      }

      const rowData = [website, ...merged];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${existingRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row — emails as clickable mailto: links
      const rowData = [website, ...emails.map(emailToHyperlink)];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:A",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowData],
        },
      });
    }

    console.log(`Google Sheets: synced ${emails.length} email(s) for ${website}`);
  } catch (error) {
    console.error("Google Sheets sync error:", error.message);
    // Don't throw – DB save already succeeded, sheet sync is best-effort
  }
}

/**
 * Remove a website row from the sheet.
 *
 * @param {string} website – website URL / name to delete
 */
async function removeWebsiteFromSheet(website) {
  if (!SPREADSHEET_ID) return;

  try {
    const sheets = getSheetsClient();
    const rowNumber = await findWebsiteRow(sheets, website);
    if (!rowNumber) return; // not in sheet, nothing to do

    // Get the sheet's gid (sheetId) for batchUpdate
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties",
    });

    const sheet = meta.data.sheets.find(
      (s) => s.properties.title === "Sheet1"
    );
    if (!sheet) return;

    const sheetId = sheet.properties.sheetId;

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1, // 0-based
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    console.log(`Google Sheets: removed row for ${website}`);
  } catch (error) {
    console.error("Google Sheets remove error:", error.message);
  }
}

module.exports = {
  appendEmailsToSheet,
  removeWebsiteFromSheet,
};
