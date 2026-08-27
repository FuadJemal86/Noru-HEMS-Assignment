/**
 * Excel/Google Sheets email scraping route.
 * Reads websites from a sheet, finds rows with no email,
 * scrapes those websites, and updates the sheet.
 *
 * Supports:
 *   - Local Excel (.xlsx): set EXCEL_FILE_PATH or pass as CLI arg
 *   - Google Sheets: set GOOGLE_CREDENTIALS_PATH + GOOGLE_SHEETS_SPREADSHEET_ID
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { google } = require("googleapis");
const { scrapeWebsite } = require("./emailScraper");

const SERVER_DIR = path.join(__dirname, "..");
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH
  ? (path.isAbsolute(process.env.GOOGLE_CREDENTIALS_PATH)
      ? process.env.GOOGLE_CREDENTIALS_PATH
      : path.join(SERVER_DIR, process.env.GOOGLE_CREDENTIALS_PATH))
  : path.join(SERVER_DIR, "email-scraping-487408-f72b2f4ebf64.json");

function getSheetsAuth() {
  const keyPath = path.resolve(CREDENTIALS_PATH);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Google credentials file not found: ${keyPath}. Set GOOGLE_CREDENTIALS_PATH in .env`);
  }
  return new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/** Get service account email from credentials (for sharing private sheets) */
function getServiceAccountEmail() {
  try {
    const keyPath = path.resolve(CREDENTIALS_PATH);
    const creds = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    return creds.client_email || "email-scraping@email-scraping-487408.iam.gserviceaccount.com";
  } catch {
    return "email-scraping@email-scraping-487408.iam.gserviceaccount.com";
  }
}

/** Extract spreadsheet ID from URL or paste. Strips /edit?gid=0, #gid=0, etc. */
function resolveSpreadsheetId(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  const urlMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  const idMatch = trimmed.match(/^([a-zA-Z0-9-_]{40,50})/);
  if (idMatch) return idMatch[1];
  const beforeEdit = trimmed.split("/")[0].split("?")[0].split("#")[0];
  return beforeEdit || trimmed;
}
const SPREADSHEET_ID = resolveSpreadsheetId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH;

let _sheets = null;

function getSheetsClient() {
  if (_sheets) return _sheets;
  const auth = getSheetsAuth();
  _sheets = google.sheets({ version: "v4", auth });
  return _sheets;
}

/** Extract plain email from HYPERLINK formula or plain text */
function extractEmailFromCell(cellValue) {
  if (cellValue == null) return null;
  const str = String(cellValue);
  const match = str.match(/=HYPERLINK\("mailto:([^"]+)"/i);
  const extracted = match ? match[1] : str.trim();
  return extracted && extracted.includes("@") ? extracted : null;
}

/** Check if a row has at least one valid email (columns B onward) - for simple layout */
function rowHasEmail(cells) {
  if (!cells || cells.length < 2) return false;
  for (let i = 1; i < cells.length; i++) {
    const email = extractEmailFromCell(cells[i]);
    if (email && email.includes("@")) return true;
  }
  return false;
}

function emailToHyperlink(email) {
  return `=HYPERLINK("mailto:${email}","${email}")`;
}

/**
 * Unescape URL from escaped format (e.g. from JSON/Excel).
 * www\.hertz\.com, utm\_campaign, gmb\-Hertz → www.hertz.com, utm_campaign, gmb-Hertz
 */
function unescapeUrl(url) {
  if (!url || typeof url !== "string") return url;
  return url
    .replace(/\\\./g, ".")
    .replace(/\\\//g, "/")
    .replace(/\\-/g, "-")
    .replace(/\\_/g, "_")
    .replace(/\\&/g, "&")
    .replace(/\\=/g, "=")
    .replace(/\\\?/g, "?")
    .trim();
}

/**
 * Parse structured blocks from row text.
 * Format: *Name:* X / *Address:* X / *Email:* N/A / *Website:* url or *URL:* url
 * Returns: [{ name, email, website, rawBlock, startIdx, endIdx }]
 */
function parseStructuredBlocks(text) {
  if (!text || typeof text !== "string") return [];
  const blocks = [];
  const parts = text.split(/(?=\*Name:\*)/i);
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim() || !/\*Name:\*/i.test(part)) {
      offset += part.length;
      continue;
    }
    const nameMatch = part.match(/\*Name:\*\s*([^\n]+)/i);
    const emailMatch = part.match(/\*Email:\*\s*([^\n*]+)/i);
    let rawUrl = "";
    const websiteMatch =
      part.match(/\*Website:\*\s*([^\n]+)/i) ||
      part.match(/\*URL:\*\s*([^\n]+)/i) ||
      part.match(/\*website:\*\s*([^\n]+)/i);
    if (websiteMatch) rawUrl = websiteMatch[1].trim();
    if (!rawUrl) {
      const urlMatches = part.match(/https?:\/\/[^\s\n"')>]+/g);
      if (urlMatches) rawUrl = urlMatches[0].trim();
    }
    let website = rawUrl && /https?:\/\//i.test(rawUrl) ? unescapeUrl(rawUrl) : "";
    if (/goo\.gl\/maps|maps\.google|google\.com\/maps/i.test(website)) website = "";
    if (!website) {
      offset += part.length;
      continue;
    }
    const email = emailMatch ? emailMatch[1].trim() : "";
    const addressMatch = part.match(/\*Address:\*\s*([^\n*]+)/i);
    const phoneMatch = part.match(/\*Phone:\*\s*([^\n*]+)/i);
    const rawPhone = phoneMatch ? phoneMatch[1].trim() : "";
    const phone = rawPhone.replace(/\\+/g, "+").replace(/\+{2,}/g, "+");
    const emailParts = (email || "").split(/[,\n]/).map((e) => e.trim()).filter(Boolean);
    const hasValidEmail = emailParts.some(
      (e) => e.includes("@") && !/^(N\/A|not found|null|none|''|""|-)$/i.test(e)
    );
    const emailSentMatch = part.match(/\*EmailSent:\*\s*(true|false)/i);
    const isEmailSent = emailSentMatch ? emailSentMatch[1].toLowerCase() === "true" : false;
    blocks.push({
      name: nameMatch ? nameMatch[1].trim() : "",
      email: email || "",
      address: addressMatch ? addressMatch[1].trim() : "",
      phone,
      website,
      hasValidEmail,
      isEmailSent,
      rawBlock: part,
      startIdx: offset,
      endIdx: offset + part.length,
    });
    offset += part.length;
  }
  return blocks;
}

/** Replace or insert *EmailSent:* value in a block string */
function replaceOrAddEmailSentInBlock(blockText, value) {
  const str = value === true || value === "true" ? "true" : "false";
  if (/\*EmailSent:\*/i.test(blockText)) {
    return blockText.replace(/\*EmailSent:\*\s*(true|false)/i, `*EmailSent:* ${str}`);
  }
  return blockText.trimEnd() + `\n*EmailSent:* ${str}\n`;
}

/** Replace or insert *Email:* value in a block string */
function replaceEmailInBlock(blockText, newEmail) {
  if (/\*Email:\*/i.test(blockText)) {
    return blockText.replace(/\*Email:\*\s*[^\n]*/i, `*Email:* ${newEmail}`);
  }
  if (/\*Website:\*/i.test(blockText)) {
    return blockText.replace(/(\*Website:\*)/i, `*Email:* ${newEmail}\n$1`);
  }
  if (/\*URL:\*/i.test(blockText)) {
    return blockText.replace(/(\*URL:\*)/i, `*Email:* ${newEmail}\n$1`);
  }
  return blockText.trimEnd() + `\n*Email:* ${newEmail}\n`;
}

/** Column index for result content (A=1, B=2, C=3, D=4). Sheet: location, search_query, max_cout, result */
const RESULT_COLUMN = parseInt(process.env.EXCEL_RESULT_COLUMN || process.env.SHEETS_RESULT_COLUMN || "4", 10);

/**
 * Run scraping check using LOCAL Excel file (.xlsx)
 * Sheet layout: A=location, B=search_query, C=max_cout, D=result (blocks with *Name:* *Email:* *Website:*)
 * Reads/writes the result column (default D=4). Processes ALL blocks in each row.
 */
async function runExcelFileScrapingCheck(excelPath) {
  const filePath = path.resolve(excelPath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet("Sheet1");
  if (!sheet) {
    throw new Error("No worksheet found");
  }

  const maxRow = Math.max(2, sheet.dimensions?.bottom || sheet.rowCount || 10000);
  const tasks = [];
  const rowTexts = {};

  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    let cellValue = row.getCell(RESULT_COLUMN).value;
    if (cellValue && typeof cellValue === "object" && cellValue.richText) {
      cellValue = cellValue.richText.map((r) => r.text).join("");
    }
    const rowText = cellValue ? String(cellValue) : "";
    rowTexts[rowNumber] = rowText;

    const blocks = parseStructuredBlocks(rowText);
    if (blocks.length > 0) {
      for (const block of blocks) {
        if (!block.hasValidEmail && block.website) {
          tasks.push({ rowNumber, block });
        }
      }
    } else {
      const website = rowText.trim();
      if (website && !/^(website|url|site|emails?\s*→?|location|search_query|max_cout|result)$/i.test(website) && website.startsWith("http")) {
        const cells = [];
        for (let c = 1; c <= 26; c++) cells.push(row.getCell(c).value);
        if (!rowHasEmail(cells)) {
          tasks.push({ rowNumber, website, simple: true, row });
        }
      }
    }
  }

  let updated = 0;
  let failed = 0;
  const rowReplacements = {};

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const website = task.simple ? task.website : task.block.website;

    const result = await scrapeWebsite(website);
    const allEmails = result.success && result.emails?.length ? result.emails : [];
    const emailStr = allEmails.length > 0 ? allEmails.join(", ") : null;

    console.log(`Website: ${website}`);
    const fallbackMsg = result.loadedViaJs ? "Emails present but require JS rendering" : (result.error || "No emails found");
    console.log(`Verified: ${emailStr || "- (" + fallbackMsg + ")"}${allEmails.length > 1 ? ` (${allEmails.length})` : ""}`);
    if (result.rejected?.length) {
      console.log(`Rejected: ${result.rejected.map((r) => `${r.email} (${r.reason})`).join("; ")}`);
    }
    console.log(`---`);

    if (task.simple) {
      if (emailStr) {
        task.row.getCell(2).value = { text: emailStr, hyperlink: `mailto:${allEmails[0]}` };
        updated++;
      } else {
        failed++;
      }
    } else {
      const { rowNumber, block } = task;
      const newEmail = emailStr || "not found";
      if (!rowReplacements[rowNumber]) rowReplacements[rowNumber] = [];
      rowReplacements[rowNumber].push({
        startIdx: block.startIdx,
        endIdx: block.endIdx,
        newBlock: replaceEmailInBlock(block.rawBlock, newEmail),
      });
      if (emailStr) updated++; else failed++;
    }
  }

  console.log(`\n========== TOTAL ==========`);
  console.log(`Total scraped: ${tasks.length}`);
  console.log(`Updated:       ${updated}`);
  console.log(`Failed:        ${failed}`);

  for (const [rowNumStr, replacements] of Object.entries(rowReplacements)) {
    const rowNum = parseInt(rowNumStr, 10);
    let text = rowTexts[rowNum] || "";
    replacements.sort((a, b) => b.startIdx - a.startIdx);
    for (const r of replacements) {
      text = text.slice(0, r.startIdx) + r.newBlock + text.slice(r.endIdx);
    }
    sheet.getRow(rowNum).getCell(RESULT_COLUMN).value = text;
  }

  if (updated > 0 || Object.keys(rowReplacements).length > 0) {
    await workbook.xlsx.writeFile(filePath);
    console.log(`[Excel scrape] Saved to ${filePath}`);
  }

  const total = tasks.length;
  return {
    updated,
    failed,
    skipped: Math.max(0, maxRow - 1 - total),
    total,
    message: `Scraped ${total} entries: ${updated} updated, ${failed} failed`,
  };
}

/**
 * Run scraping check using Google Sheets API (PRIVATE sheets via service account).
 * Column D (or auto-detected) = result blocks (*Name:* *Email:* *Website:* or *URL:*)
 * Requires: Share your private sheet with the service account email (Editor).
 */
async function runGoogleSheetsScrapingCheck() {
  if (!SPREADSHEET_ID) {
    const saEmail = getServiceAccountEmail();
    throw new Error(
      `GOOGLE_SHEETS_SPREADSHEET_ID is not set. Add it to .env.\n` +
      `For private sheets: Share the sheet with ${saEmail} (Editor).`
    );
  }

  const sheets = getSheetsClient();
  const saEmail = getServiceAccountEmail();
  console.log(`[Sheet scrape] Using credentials → ${saEmail}`);
  console.log(`[Sheet scrape] Spreadsheet ID: ${SPREADSHEET_ID}`);

  let sheetName = process.env.GOOGLE_SHEET_NAME;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties",
    });
    if (!sheetName) {
      const firstSheet = meta.data.sheets?.[0];
      sheetName = firstSheet?.properties?.title || "Sheet1";
      console.log(`[Sheet scrape] Using sheet: "${sheetName}"`);
    }
  } catch (err) {
    if (err.code === 403 || err.response?.status === 403 || err.message?.includes("permission") || err.message?.includes("403")) {
      throw new Error(
        `\nPermission denied. Your PRIVATE sheet must be shared with:\n\n  ${saEmail}\n\n` +
        `Steps: 1) Open the sheet → Share → Add "${saEmail}" → Editor → Send\n` +
        `       2) Run this script again.\n`
      );
    }
    throw err;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueRenderOption: "FORMULA",
  });

  const rows = res.data.values || [];
  if (rows.length === 0) {
    return { updated: 0, failed: 0, skipped: 0, message: "Sheet is empty" };
  }

  let colIdx = RESULT_COLUMN - 1;
  const dataRows = rows.slice(1);
  if (dataRows.length > 0) {
    const firstDataRow = dataRows[0];
    let bestCol = colIdx;
    let bestScore = 0;
    for (let c = 0; c < Math.min(firstDataRow.length, 20); c++) {
      const val = firstDataRow[c] ? String(firstDataRow[c]) : "";
      const hasBlocks = /\*Name:\*/.test(val) && (/\*Website:\*/.test(val) || /\*URL:\*/.test(val) || /https?:\/\//.test(val));
      const score = hasBlocks ? (val.length > bestScore ? val.length : 0) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestCol = c;
      }
    }
    if (bestScore > 0) colIdx = bestCol;
    console.log(`[Sheet scrape] Result column: ${String.fromCharCode(65 + colIdx)} (index ${colIdx})`);
  }

  const tasks = [];
  const rowTexts = {};

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowText = row && row[colIdx] ? String(row[colIdx]) : "";
    rowTexts[i + 2] = rowText;

    const blocks = parseStructuredBlocks(rowText);
    if (blocks.length > 0) {
      for (const block of blocks) {
        if (block.website) {
          const scrapeThis = process.env.SCRAPE_ALL === "true" || !block.hasValidEmail;
          if (scrapeThis) {
            tasks.push({ rowNumber: i + 2, block, row });
          }
        }
      }
    }
  }

  console.log(`[Sheet scrape] Found ${tasks.length} blocks to scrape (${process.env.SCRAPE_ALL === "true" ? "all" : "only missing email"})\n`);

  let updated = 0;
  let failed = 0;
  const rowReplacements = {};

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { rowNumber, block } = task;
    const website = block.website;

    const result = await scrapeWebsite(website);
    const allEmails = result.success && result.emails?.length ? result.emails : [];
    const emailStr = allEmails.length > 0 ? allEmails.join(", ") : null;

    if (emailStr) {
      updated++;
      console.log(`Website: ${website}`);
      console.log(`Verified: ${emailStr}${allEmails.length > 1 ? ` (${allEmails.length})` : ""}`);
      if (result.rejected?.length) {
        console.log(`Rejected: ${result.rejected.map((r) => `${r.email} (${r.reason})`).join("; ")}`);
      }
      console.log(`---`);
    } else {
      failed++;
      console.log(`Website: ${website}`);
      const errMsg = result.loadedViaJs ? "Emails present but require JS rendering" : (result.error || "No emails found");
      console.log(`Email:   - (${errMsg})`);
      console.log(`---`);
    }

    const newEmail = emailStr || "not found";
    if (!rowReplacements[rowNumber]) rowReplacements[rowNumber] = [];
    rowReplacements[rowNumber].push({
      startIdx: block.startIdx,
      endIdx: block.endIdx,
      newBlock: replaceEmailInBlock(block.rawBlock, newEmail),
    });
  }

  console.log(`\n========== TOTAL ==========`);
  console.log(`Total scraped: ${tasks.length}`);
  console.log(`Updated:       ${updated}`);
  console.log(`Failed:        ${failed}`);

  for (const [rowNumStr, replacements] of Object.entries(rowReplacements)) {
    const rowNum = parseInt(rowNumStr, 10);
    let text = rowTexts[rowNum] || "";
    replacements.sort((a, b) => b.startIdx - a.startIdx);
    for (const r of replacements) {
      text = text.slice(0, r.startIdx) + r.newBlock + text.slice(r.endIdx);
    }
    const colLetter = String.fromCharCode(65 + colIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${colLetter}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [[text]] },
    });
  }

  return {
    updated,
    failed,
    skipped: Math.max(0, dataRows.length - tasks.length),
    total: tasks.length,
    message: `Scraped ${tasks.length} entries: ${updated} updated, ${failed} failed`,
  };
}

/**
 * Read all data from sheet and return as flat list for display.
 * Returns: [{ category, name, email, address, location, phone, website }]
 */
async function getSheetData(options = {}) {
  const excelPath = options.excelPath || EXCEL_FILE_PATH;
  if (excelPath) {
    return getExcelSheetData(excelPath);
  }
  return getGoogleSheetData();
}

async function getExcelSheetData(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Excel file not found: ${resolved}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolved);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet("Sheet1");
  if (!sheet) return [];

  const maxRow = Math.max(2, sheet.dimensions?.bottom || sheet.rowCount || 10000);
  const resultCol = RESULT_COLUMN;
  const items = [];

  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const location = String(row.getCell(1)?.value ?? "").trim();
    const category = String(row.getCell(2)?.value ?? "").trim();
    let cellValue = row.getCell(resultCol)?.value;
    if (cellValue && typeof cellValue === "object" && cellValue.richText) {
      cellValue = cellValue.richText.map((r) => r.text).join("");
    }
    const rowText = cellValue ? String(cellValue) : "";
    const blocks = parseStructuredBlocks(rowText);
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex];
      items.push({
        sheetRowIndex: rowNumber,
        blockIndex,
        category,
        name: block.name,
        email: block.hasValidEmail ? block.email : "not found",
        address: block.address || "",
        location,
        phone: block.phone || "",
        website: block.website || "",
        isEmailSent: block.isEmailSent || false,
      });
    }
  }
  return items;
}

async function getGoogleSheetData() {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env");
  }
  const sheets = getSheetsClient();
  let sheetName = process.env.GOOGLE_SHEET_NAME;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties",
    });
    if (!sheetName) {
      sheetName = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
    }
  } catch (err) {
    if (err.code === 403 || err.response?.status === 403) {
      throw new Error(`Permission denied. Share the sheet with ${getServiceAccountEmail()} (Editor).`);
    }
    throw err;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueRenderOption: "FORMULA",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const dataRows = rows.slice(1);
  let colIdx = RESULT_COLUMN - 1;

  if (dataRows.length > 0) {
    const first = dataRows[0];
    let bestScore = 0;
    for (let c = 0; c < Math.min(first.length, 20); c++) {
      const val = first[c] ? String(first[c]) : "";
      const hasBlocks = /\*Name:\*/.test(val) && (/\*Website:\*|https?:\/\//.test(val));
      if (hasBlocks && val.length > bestScore) {
        bestScore = val.length;
        colIdx = c;
      }
    }
  }

  const items = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const location = row && row[0] ? String(row[0]).trim() : "";
    const category = row && row[1] ? String(row[1]).trim() : "";
    const rowText = row && row[colIdx] ? String(row[colIdx]) : "";
    const blocks = parseStructuredBlocks(rowText);
    const sheetRowIndex = i + 2;
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex];
      items.push({
        sheetRowIndex,
        blockIndex,
        category,
        name: block.name,
        email: block.hasValidEmail ? block.email : "not found",
        address: block.address || "",
        location,
        phone: block.phone || "",
        website: block.website || "",
        isEmailSent: block.isEmailSent || false,
      });
    }
  }
  return items;
}

/**
 * Mark blocks as isEmailSent=true in the Google Sheet.
 * items: [{ sheetRowIndex, blockIndex }]
 */
async function updateBlocksEmailSentInSheet(items) {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env");
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { updated: 0 };
  }

  const sheets = getSheetsClient();
  let sheetName = process.env.GOOGLE_SHEET_NAME;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties",
    });
    if (!sheetName) {
      sheetName = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
    }
  } catch (err) {
    if (err.code === 403 || err.response?.status === 403) {
      throw new Error(`Permission denied. Share the sheet with ${getServiceAccountEmail()} (Editor).`);
    }
    throw err;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueRenderOption: "FORMULA",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return { updated: 0 };

  const dataRows = rows.slice(1);
  let colIdx = RESULT_COLUMN - 1;
  if (dataRows.length > 0) {
    const first = dataRows[0];
    let bestScore = 0;
    for (let c = 0; c < Math.min(first.length, 20); c++) {
      const val = first[c] ? String(first[c]) : "";
      const hasBlocks = /\*Name:\*/.test(val) && (/\*Website:\*|https?:\/\//.test(val));
      if (hasBlocks && val.length > bestScore) {
        bestScore = val.length;
        colIdx = c;
      }
    }
  }

  const colLetter = String.fromCharCode(65 + colIdx);
  const rowUpdates = {};

  for (const { sheetRowIndex, blockIndex } of items) {
    const dataRowIndex = sheetRowIndex - 2;
    if (dataRowIndex < 0 || dataRowIndex >= dataRows.length) continue;
    if (!rowUpdates[sheetRowIndex]) {
      const row = dataRows[dataRowIndex];
      const rowText = row && row[colIdx] ? String(row[colIdx]) : "";
      rowUpdates[sheetRowIndex] = parseStructuredBlocks(rowText);
    }
    const blocks = rowUpdates[sheetRowIndex];
    if (blockIndex >= 0 && blockIndex < blocks.length) {
      blocks[blockIndex] = {
        ...blocks[blockIndex],
        rawBlock: replaceOrAddEmailSentInBlock(blocks[blockIndex].rawBlock, true),
      };
    }
  }

  let updated = 0;
  for (const [rowNumStr, blocks] of Object.entries(rowUpdates)) {
    const rowNum = parseInt(rowNumStr, 10);
    const newText = blocks.map((b) => (typeof b === "object" && b?.rawBlock ? b.rawBlock : b)).join("").trim();
    if (newText) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${colLetter}${rowNum}`,
        valueInputOption: "RAW",
        requestBody: { values: [[newText]] },
      });
      updated++;
    }
  }

  return { updated };
}

/**
 * Remove one or more blocks from the Google Sheet by sheet row and block index.
 * Body: { items: [{ sheetRowIndex, blockIndex }] }
 */
async function deleteBlocksFromSheet(items) {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env");
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { deleted: 0, message: "No items to delete" };
  }

  const sheets = getSheetsClient();
  let sheetName = process.env.GOOGLE_SHEET_NAME;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties",
    });
    if (!sheetName) {
      sheetName = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
    }
  } catch (err) {
    if (err.code === 403 || err.response?.status === 403) {
      throw new Error(`Permission denied. Share the sheet with ${getServiceAccountEmail()} (Editor).`);
    }
    throw err;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueRenderOption: "FORMULA",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return { deleted: 0, message: "Sheet is empty" };

  const dataRows = rows.slice(1);
  let colIdx = RESULT_COLUMN - 1;
  if (dataRows.length > 0) {
    const first = dataRows[0];
    let bestScore = 0;
    for (let c = 0; c < Math.min(first.length, 20); c++) {
      const val = first[c] ? String(first[c]) : "";
      const hasBlocks = /\*Name:\*/.test(val) && (/\*Website:\*|https?:\/\//.test(val));
      if (hasBlocks && val.length > bestScore) {
        bestScore = val.length;
        colIdx = c;
      }
    }
  }

  const colLetter = String.fromCharCode(65 + colIdx);
  const rowUpdates = {};

  for (const { sheetRowIndex, blockIndex } of items) {
    const dataRowIndex = sheetRowIndex - 2;
    if (dataRowIndex < 0 || dataRowIndex >= dataRows.length) continue;
    if (!rowUpdates[sheetRowIndex]) {
      const row = dataRows[dataRowIndex];
      const rowText = row && row[colIdx] ? String(row[colIdx]) : "";
      rowUpdates[sheetRowIndex] = parseStructuredBlocks(rowText);
    }
    const blocks = rowUpdates[sheetRowIndex];
    if (blockIndex >= 0 && blockIndex < blocks.length) {
      blocks[blockIndex] = null;
    }
  }

  let deleted = 0;
  for (const [rowNumStr, blocks] of Object.entries(rowUpdates)) {
    const rowNum = parseInt(rowNumStr, 10);
    const remaining = blocks.filter(Boolean);
    const newText = remaining.map((b) => b.rawBlock).join("").trim();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${colLetter}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newText]] },
    });
    deleted += blocks.length - remaining.length;
  }

  return { deleted, message: `Deleted ${deleted} block(s) from sheet` };
}

/**
 * Main: use Excel file if path provided, otherwise Google Sheets
 */
async function runSheetScrapingCheck(options = {}) {
  const excelPath = options.excelPath || process.argv[2] || EXCEL_FILE_PATH;

  if (excelPath) {
    return runExcelFileScrapingCheck(excelPath);
  }
  return runGoogleSheetsScrapingCheck();
}

/**
 * Check webhook secret if SCRAPE_WEBHOOK_SECRET is set.
 * Accepts: X-Webhook-Secret header or Authorization: Bearer <secret>
 */
function validateWebhookSecret(req) {
  const secret = process.env.SCRAPE_WEBHOOK_SECRET;
  if (!secret) return true;
  const headerSecret = req.headers["x-webhook-secret"];
  const authHeader = req.headers.authorization || "";
  const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return headerSecret === secret || bearerSecret === secret;
}

/**
 * Express route handler - POST webhook that triggers sheet scraping.
 * Body: { excelPath?: string } - optional path to local .xlsx (overrides env)
 * Headers: X-Webhook-Secret or Authorization: Bearer <secret> (required if SCRAPE_WEBHOOK_SECRET set)
 * If SCRAPE_WEBHOOK_ASYNC=true, returns 202 immediately and scrapes in background.
 */
const runSheetScrapingCheckRoute = async (req, res) => {
  if (!validateWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: "Invalid or missing webhook secret" });
  }

  const excelPath = req.body?.excelPath || EXCEL_FILE_PATH;
  const runAsync = process.env.SCRAPE_WEBHOOK_ASYNC === "true";

  const doScrape = async () => {
    try {
      return await runSheetScrapingCheck({ excelPath });
    } catch (error) {
      console.error("Excel scraping check error:", error);
      throw error;
    }
  };

  if (runAsync) {
    res.status(202).json({
      success: true,
      message: "Sheet scraping started in background",
      data: null,
    });
    doScrape()
      .then((result) => console.log("[Webhook] Background scrape done:", result))
      .catch((err) => console.error("[Webhook] Background scrape failed:", err.message));
    return;
  }

  try {
    const result = await doScrape();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to run sheet scraping check",
    });
  }
};

module.exports = {
  runSheetScrapingCheck,
  runSheetScrapingCheckRoute,
  getSheetData,
  deleteBlocksFromSheet,
  updateBlocksEmailSentInSheet,
};

// Run from CLI: node server/Utils/exelScrapingRoute.js
// Optional: node ... --share  (prints service account email for sharing private sheets)
if (require.main === module) {
  if (process.argv.includes("--share")) {
    console.log("\nShare your PRIVATE sheet with this email (Editor):\n");
    console.log("  ", getServiceAccountEmail());
    console.log("\nThen set GOOGLE_SHEETS_SPREADSHEET_ID in .env and run again.\n");
    process.exit(0);
  }
  runSheetScrapingCheck()
    .then((r) => {
      console.log("Done:", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
