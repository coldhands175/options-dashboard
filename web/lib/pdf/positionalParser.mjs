import { createRequire } from "module";

const require = createRequire(import.meta.url);

let pdfjsLibPromise = null;
let canvasInitialized = false;

const COLUMN_HINTS = [
  { key: "description", match: /description/i },
  { key: "quantity", match: /quantity|qty/i },
  { key: "symbol", match: /(symbol|security)/i },
  { key: "price", match: /price/i },
  { key: "grossAmount", match: /gross/i },
  { key: "fees", match: /(commission|fees?)/i },
  { key: "netAmount", match: /\bnet\b/i },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function loadPdfjs() {
  if (pdfjsLibPromise) return pdfjsLibPromise;

  pdfjsLibPromise = (async () => {
    ensureCanvasGlobals();
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
    if (typeof pdfjsLib.setVerbosityLevel === "function" && pdfjsLib.VerbosityLevel) {
      pdfjsLib.setVerbosityLevel(pdfjsLib.VerbosityLevel.ERRORS);
    }
    return pdfjsLib;
  })();

  return pdfjsLibPromise;
}

function ensureCanvasGlobals() {
  if (canvasInitialized) return;
  canvasInitialized = true;
  if (typeof global.DOMMatrix !== "undefined" && typeof global.Path2D !== "undefined" && typeof global.ImageData !== "undefined") {
    return;
  }
  try {
    const canvas = require("canvas");
    if (typeof global.DOMMatrix === "undefined" && canvas.DOMMatrix) {
      global.DOMMatrix = canvas.DOMMatrix;
    }
    if (typeof global.Path2D === "undefined" && canvas.Path2D) {
      global.Path2D = canvas.Path2D;
    }
    if (typeof global.ImageData === "undefined" && canvas.ImageData) {
      global.ImageData = canvas.ImageData;
    }
  } catch (err) {
    throw new Error(
      "canvas dependency is required for positional PDF parsing. Install the optional dependency `canvas` and ensure native bindings are available. " +
        `Underlying error: ${err?.message ?? err}`
    );
  }
}

function toUint8Array(buffer) {
  if (!buffer) throw new Error("parsePdfBuffer: missing buffer");
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(buffer)) {
    const view = buffer;
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (buffer.buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer.buffer);
  }
  throw new Error("parsePdfBuffer: unsupported buffer type");
}

export async function parsePdfBuffer(buffer, options = {}) {
  const pdfjsLib = await loadPdfjs();
  const bytes = toUint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent({ disableCombineTextItems: true });

    const textItems = textContent.items
      .map((item) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = transform[4];
        const y = transform[5];
        const estimatedWidth =
          (item.width ?? 0) * viewport.scale ||
          Math.abs(transform[0]) ||
          Math.max(item.str?.length ?? 0, 1) * 4;
        const height = Math.hypot(transform[2], transform[3]);
        const text = item.str?.replace(/\s+/g, " ").trim() ?? "";
        return {
          text,
          x,
          y,
          width: estimatedWidth,
          height,
        };
      })
      .filter((item) => item.text.length > 0);

    const rows = clusterIntoRows(textItems);
    const header = detectHeaderRow(rows);
    const columns = header ? estimateColumnBounds(header, COLUMN_HINTS) : {};
    const enrichedRows = rows.map((row) => enrichRow(row, columns));
    const rawText = rows.map((row) => row.items.map((item) => item.text).join(" ").trim()).join("\n");
    const analysis = parseTradeFromBlock(rawText);

    pages.push({
      pageNumber,
      headerDetected: Boolean(header),
      columns,
      rows: enrichedRows,
      rawText,
      analysis,
    });
  }

  const trades = pages
    .map((page) => {
      if (!page.analysis || !page.analysis.trade) return null;
      const line = normalizeTrade(page.analysis.trade);
      if (!line) return null;
      return {
        pageNumber: page.pageNumber,
        line,
        trade: page.analysis.trade,
        warnings: page.analysis.warnings,
      };
    })
    .filter(Boolean);

  return {
    fileName: options.fileName ?? null,
    pageCount: pdf.numPages,
    columnHints: COLUMN_HINTS.map((c) => c.key),
    pages,
    trades,
    normalizedLines: trades.map((t) => t.line),
  };
}

function clusterIntoRows(items, tolerance = 2.0) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  for (const item of sorted) {
    const found = rows.find((row) => Math.abs(row.y - item.y) <= tolerance);
    if (found) {
      found.items.push(item);
      found.y = (found.y * (found.count || 1) + item.y) / ((found.count || 1) + 1);
      found.count = (found.count || 1) + 1;
    } else {
      rows.push({ y: item.y, items: [item], count: 1 });
    }
  }
  rows.forEach((row) => row.items.sort((a, b) => a.x - b.x));
  return rows.map((row) => ({
    y: row.y,
    items: row.items,
  }));
}

function detectHeaderRow(rows) {
  return (
    rows.find((row) => {
      const text = row.items.map((item) => item.text.toLowerCase()).join(" ");
      return text.includes("quantity") && text.includes("price");
    }) ?? null
  );
}

function estimateColumnBounds(headerRow, hints) {
  const bounds = {};
  const items = headerRow.items;
  const merged = mergeAdjacentItems(items, 10);

  for (const item of merged) {
    const text = item.text.toLowerCase();
    for (const hint of hints) {
      if (hint.match.test(text) && !bounds[hint.key]) {
        bounds[hint.key] = {
          min: item.x - 12,
          max: item.x + item.width + 12,
          origin: item.text,
        };
      }
    }
  }

  const orderedKeys = Object.entries(bounds)
    .map(([key, value]) => ({ key, center: (value.min + value.max) / 2 }))
    .sort((a, b) => a.center - b.center);

  for (let i = 0; i < orderedKeys.length; i++) {
    const current = bounds[orderedKeys[i].key];
    const prev = orderedKeys[i - 1] ? bounds[orderedKeys[i - 1].key] : null;
    const next = orderedKeys[i + 1] ? bounds[orderedKeys[i + 1].key] : null;
    if (prev) {
      const midpoint = (prev.max + current.min) / 2;
      current.min = Math.min(current.min, midpoint);
    } else {
      current.min -= 40;
    }
    if (next) {
      const midpoint = (current.max + next.min) / 2;
      current.max = Math.max(current.max, midpoint);
    } else {
      current.max += 80;
    }
  }

  return bounds;
}

function enrichRow(row, columns) {
  const cells = row.items.map((item) => ({
    text: item.text,
    x: item.x,
    column: locateColumn(item, columns),
  }));

  const text = cells.map((cell) => cell.text).join(" ").trim();
  const tradeLike = isTradeLike(text);
  const guess = tradeLike ? deriveGuess(cells) : null;

  return {
    y: row.y,
    text,
    tradeLike,
    cells,
    guess,
  };
}

function locateColumn(item, columns) {
  const columnEntries = Object.entries(columns);
  if (columnEntries.length === 0) return null;

  let best = null;
  let bestWidth = Number.POSITIVE_INFINITY;

  for (const [key, bounds] of columnEntries) {
    if (item.x >= bounds.min && item.x <= bounds.max) {
      const span = bounds.max - bounds.min;
      if (span < bestWidth) {
        best = key;
        bestWidth = span;
      }
    }
  }

  if (
    !best &&
    item.x < Math.min(...columnEntries.map(([, c]) => c.min))
  ) {
    return "description";
  }

  return best;
}

function deriveGuess(cells) {
  const guess = {};
  const description = cells
    .filter((cell) => !cell.column || cell.column === "description")
    .map((cell) => cell.text)
    .join(" ");

  if (description) guess.description = description;

  for (const cell of cells) {
    if (!cell.column) continue;
    if (cell.column === "quantity") {
      const value = parseFloat(cell.text.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(value)) guess.quantityContracts = value;
    } else if (cell.column === "price") {
      const value = parseFloat(cell.text.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(value)) guess.price = value;
    } else if (cell.column === "grossAmount") {
      const value = parseFloat(cell.text.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(value)) guess.grossAmount = value;
    } else if (cell.column === "fees") {
      const value = parseFloat(cell.text.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(value)) guess.fees = value;
    } else if (cell.column === "netAmount") {
      const value = parseFloat(cell.text.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(value)) guess.netAmount = value;
    }
  }

  return Object.keys(guess).length > 0 ? guess : null;
}

function mergeAdjacentItems(items, threshold = 6) {
  if (items.length === 0) return [];
  const merged = [];
  let current = { ...items[0] };
  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const gap = item.x - (current.x + current.width);
    if (gap <= threshold) {
      current = {
        text: `${current.text} ${item.text}`.replace(/\s+/g, " ").trim(),
        x: Math.min(current.x, item.x),
        width:
          Math.max(current.x + current.width, item.x + item.width) -
          Math.min(current.x, item.x),
      };
    } else {
      merged.push(current);
      current = { ...item };
    }
  }
  merged.push(current);
  return merged;
}

function isTradeLike(text) {
  if (!text) return false;
  if (/\b(PUTS?|CALLS?)\b/i.test(text)) return true;
  if (/\b(STO|BTO|BTC|STC)\b/.test(text)) return true;
  if (/Trade number:\s*\d+/i.test(text)) return true;
  if (/You (bought|sold)/i.test(text)) return true;
  return false;
}

function normalizeTrade(trade) {
  if (!trade) return null;
  let qty = trade.quantity_contracts ?? null;
  const notionalAbs = trade.notional != null ? Math.abs(trade.notional) : null;
  let premium = trade.premium_per_contract != null ? Math.abs(trade.premium_per_contract) : null;

  if ((!qty || qty <= 0) && premium && premium > 0 && notionalAbs) {
    const inferredQty = Math.round(notionalAbs / (premium * 100));
    if (inferredQty > 0) qty = inferredQty;
  }

  if ((!premium || premium <= 0) && notionalAbs && qty && qty > 0) {
    premium = notionalAbs / (qty * 100);
  }

  if (!qty || qty <= 0) return null;
  if (!premium || !Number.isFinite(premium)) return null;

  const sideOcMap = {
    STO: { side: "Sold", oc: "open" },
    STC: { side: "Sold", oc: "close" },
    BTO: { side: "Bought", oc: "open" },
    BTC: { side: "Bought", oc: "close" },
  };
  const meta = sideOcMap[trade.action];
  if (!meta) return null;

  let expirySource = Number.isFinite(trade.expiration) ? trade.expiration : null;
  if (expirySource === null && Number.isFinite(trade.tradeTime)) {
    expirySource = trade.tradeTime;
  }
  if (expirySource === null) return null;
  const expDate = new Date(expirySource);
  if (Number.isNaN(expDate.getTime())) return null;

  const month = MONTH_NAMES[expDate.getUTCMonth()];
  const day = expDate.getUTCDate();
  const year = expDate.getUTCFullYear();
  if (!month || !day || !year) return null;

  const strike = trade.strike;
  if (strike == null || !Number.isFinite(strike)) return null;
  const strikeStr = Number.isInteger(strike) ? String(strike) : strike.toString();
  const typeWord = trade.optionType === "PUT" ? "Puts" : "Calls";
  if (!typeWord) return null;

  const priceStr =
    premium < 0.1
      ? premium.toFixed(3)
      : Math.round(premium * 1000) % 10 !== 0
        ? premium.toFixed(3)
        : premium.toFixed(2);
  const qtyStr = String(qty);

  let line = `${meta.side} to ${meta.oc} ${qtyStr} ${trade.underlying} ${month} ${day} ${year} ${strikeStr} ${typeWord} at ${priceStr}`;
  if (Number.isFinite(trade.tradeTime)) {
    line += ` @tt=${Math.trunc(trade.tradeTime)}`;
  }
  if (
    trade.quantity_contracts != null &&
    trade.quantity_contracts !== qty
  ) {
    line += ` @qty=${qty}`;
  }
  if (trade.brokerTradeNumber) {
    line += ` #${trade.brokerTradeNumber}`;
  }
  return line;
}

function parseTradeFromBlock(block) {
  if (!block) return { warnings: ["Empty block"], trade: null };

  let warnings = [];
  const lines = block.replace(/\r/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const text = lines.join("\n");

  const sold = /\bYou sold\b/i.test(text) || /\bSold\b/i.test(text);
  const bought = /\bYou bought\b/i.test(text) || /\bBought\b/i.test(text);
  const opening = /\bOPENING\s+TRANS|OPENING\s+TRANSACTION|to open\b/i.test(text);
  const closing = /\bCLOSING\s+TRANS|CLOSING\s+TRANSACTION|to close\b/i.test(text);
  let action = null;
  if (sold && opening) action = "STO";
  else if (sold && closing) action = "STC";
  else if (bought && opening) action = "BTO";
  else if (bought && closing) action = "BTC";
  if (!action) warnings.push("Could not confidently determine action (BTO/BTC/STO/STC)");

  let optionType = null;
  const hasPut = /\bPUT\b/i.test(text);
  const hasCall = /\bCALL\b/i.test(text);
  if (hasPut && !hasCall) optionType = "PUT";
  else if (hasCall && !hasPut) optionType = "CALL";
  else if (hasPut && hasCall) {
    const putIdx = text.search(/\bPUT\b/i);
    const callIdx = text.search(/\bCALL\b/i);
    optionType = putIdx !== -1 && (callIdx === -1 || putIdx < callIdx) ? "PUT" : "CALL";
  }
  if (!optionType) warnings.push("Missing option type");

  let underlying = null;
  const undM = text.match(/\b(PUT|CALL)\s*-?\d+\s+([A-Z]{1,6})\b/i);
  if (undM) {
    underlying = undM[2].toUpperCase();
    const token = undM[1].toUpperCase();
    optionType = token === "PUT" ? "PUT" : "CALL";
  } else {
    warnings.push("Could not parse underlying");
  }

  let strike = null;
  const strikeM = text.match(/@\s*(\d+(?:\.\d+)?)/);
  if (strikeM) strike = Number(strikeM[1]); else warnings.push("Could not parse strike");

  let expiration = null;
  const expM = text.match(/EXPIRES ON\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (expM) {
    const month = expM[1];
    const day = Number(expM[2]);
    const year = Number(expM[3]);
    const d = Date.parse(`${month} ${day}, ${year} 17:00:00`);
    if (!Number.isNaN(d)) expiration = d; else warnings.push("Could not parse expiration date");
  } else warnings.push("Expiration line not found");

  let tradeTime = null;
  const timeM = text.match(/Transaction on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (timeM) {
    const t = Date.parse(timeM[1]);
    if (!Number.isNaN(t)) tradeTime = t; else warnings.push("Could not parse trade time");
  } else warnings.push("Transaction date not found");

  const tradeNum = text.match(/Trade number:\s*(\d+)/i)?.[1];

  let qtyTotal = null;
  let extractedPrice = null;
  const qpIdx = lines.findIndex((l) => /\bQuantity\b/i.test(l) && /\bPrice\b/i.test(l));
  const priceHeaderIdx = lines.findIndex((l) => /\bPrice\s*\(\$\)\b/i.test(l));
  if (qpIdx !== -1) {
    let sum = 0;
    let found = false;
    const bare = [];
    const prices = [];
    for (let i = qpIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^Gross transaction amount\b/i.test(l) || /^Equals\b/i.test(l) || /^Security number:/i.test(l)) break;

      const mergedQP = l.match(/^(\d+)(\d\.\d{2})$/);
      if (mergedQP) {
        const fullStr = mergedQP[1];
        const priceDecimal = mergedQP[2];
        const qty = fullStr.length >= 2 ? Number(fullStr.substring(0, 2)) : Number(fullStr[0]);
        const price = Number(priceDecimal);
        sum += qty;
        prices.push(price);
        found = true;
        continue;
      }

      const rowM = l.match(/^\s*(\d{1,4})\s+(?:USD\s*)?\$?(\d+(?:\.\d{1,3})?)\b/);
      if (rowM) {
        sum += Number(rowM[1]);
        prices.push(Number(rowM[2]));
        found = true;
        continue;
      }
      const altM = l.match(/^\s*(?:USD\s*)?\$?(\d+(?:\.\d{1,3})?)\s+(\d{1,4})\b/);
      if (altM) {
        sum += Number(altM[2]);
        prices.push(Number(altM[1]));
        found = true;
        continue;
      }
      const bareQty = l.match(/^\s*(\d{1,4})\s*$/);
      if (bareQty) bare.push(Number(bareQty[1]));
    }
    if (found) {
      qtyTotal = sum;
      if (prices.length > 0) {
        extractedPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    } else if (bare.length > 0) {
      if (bare.length >= 2) {
        const sumExLast = bare.slice(0, -1).reduce((a, b) => a + b, 0);
        qtyTotal = sumExLast === bare[bare.length - 1] ? sumExLast : bare.reduce((a, b) => a + b, 0);
      } else {
        qtyTotal = bare[0];
      }
    }
  }
  if (qtyTotal === null) {
    const quantityHeaderIdx = lines.findIndex((l) => /\bQuantity\b/i.test(l));
    if (quantityHeaderIdx !== -1) {
      const nums = [];
      for (let i = quantityHeaderIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^(Gross transaction amount|Equals|Security number:)/i.test(l)) break;
        const m = l.match(/^\s*(\d{1,4})\s*$/);
        if (m) nums.push(Number(m[1]));
      }
      if (nums.length > 0) {
        if (nums.length >= 2) {
          const sumExLast = nums.slice(0, -1).reduce((a, b) => a + b, 0);
          qtyTotal = sumExLast === nums[nums.length - 1] ? sumExLast : nums.reduce((a, b) => a + b, 0);
        } else {
          qtyTotal = nums[0];
        }
      }
    }
  }
  if (qtyTotal === null) {
    const headQty = text.match(/\b(?:You\s+sold|Sold|You\s+bought|Bought)\s+(\d{1,4})\b/i)?.[1];
    if (headQty) qtyTotal = Number(headQty);
  }
  if (qtyTotal === null) warnings.push("Could not determine total contracts (multi-fill table not detected)");

  let grossAmount = null;
  const grossM = text.match(/Gross transaction amount\s+USD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (grossM) {
    grossAmount = Number(grossM[1].replace(/,/g, ""));
    if (Number.isNaN(grossAmount)) grossAmount = null;
  }

  let notional = null;
  const netM = text.match(/Net transaction amount\s+USD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (netM) {
    notional = Number(netM[1].replace(/,/g, ""));
    if (Number.isNaN(notional)) { notional = null; warnings.push("Failed to parse net amount"); }
  } else warnings.push("Net transaction amount not found");

  if (qtyTotal && extractedPrice && grossAmount) {
    const calculated = qtyTotal * extractedPrice * 100;
    const percentDiff = Math.abs(calculated - grossAmount) / grossAmount;

    if (percentDiff > 0.05) {
      const mergedMatch = text.match(/(\d+)(\d\.\d{2})/);
      if (mergedMatch) {
        const fullStr = mergedMatch[1];
        const priceDecimal = Number(mergedMatch[2]);
        const candidates = [];

        if (fullStr.length >= 1) {
          const qty1 = Number(fullStr[0]);
          const remainingDigits = fullStr.substring(1) + String(priceDecimal).substring(2);
          const price1 = Number("0." + remainingDigits.substring(0, 2));
          const calc1 = qty1 * price1 * 100;
          candidates.push({qty: qty1, price: price1, diff: Math.abs(calc1 - grossAmount) / grossAmount});
        }
        if (fullStr.length >= 2) {
          const qty2 = Number(fullStr.substring(0, 2));
          const calc2 = qty2 * priceDecimal * 100;
          candidates.push({qty: qty2, price: priceDecimal, diff: Math.abs(calc2 - grossAmount) / grossAmount});
        }
        if (fullStr.length >= 3) {
          const qty3 = Number(fullStr);
          const calc3 = qty3 * priceDecimal * 100;
          candidates.push({qty: qty3, price: priceDecimal, diff: Math.abs(calc3 - grossAmount) / grossAmount});
        }

        const best = candidates.sort((a, b) => a.diff - b.diff)[0];
        if (best && best.diff < percentDiff) {
          qtyTotal = best.qty;
          extractedPrice = best.price;
          warnings.push(`Corrected qty/price split using gross amount validation: qty=${best.qty}, price=${best.price}`);
        }
      }
    }
  }

  let premium = null;
  if (extractedPrice !== null && extractedPrice > 0) {
    premium = extractedPrice;
  } else if (notional !== null && qtyTotal && qtyTotal > 0) {
    premium = Math.abs(notional) / (qtyTotal * 100);
  } else {
    const atPrice = text.match(/\bat\s+\$?(\d+(?:\.\d{1,3})?)\b/i)?.[1];
    if (atPrice && notional !== null) {
      const price = Number(atPrice);
      if (price > 0) {
        const computedQty = Math.round(Math.abs(notional) / (price * 100));
        if (!qtyTotal || qtyTotal <= 0) qtyTotal = computedQty;
        premium = Math.abs(notional) / ((qtyTotal || computedQty) * 100);
      }
    }
  }

  if (premium === null) warnings.push("Could not determine premium per contract");

  if ((qtyTotal === null || premium === null) && notional !== null) {
    const atPrice = text.match(/\bat\s+\$?(\d+(?:\.\d{1,3})?)\b/i)?.[1];
    const priceHeadline = atPrice ? Number(atPrice) : NaN;
    let priceTokens = [];

    if (qpIdx !== -1) {
      for (let i = qpIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^Gross transaction amount\b/i.test(l) || /^Equals\b/i.test(l) || /^Security number:/i.test(l)) break;
        const tok = l.match(/\$?(\d+\.\d{1,3})\b/);
        if (tok) {
          const p = Number(tok[1]);
          if (p >= 0.01 && p <= 1000) priceTokens.push(p);
        }
      }
    }

    if (priceHeaderIdx !== -1) {
      const start = Math.max(0, priceHeaderIdx - 1);
      const end = Math.min(priceHeaderIdx + 15, lines.length - 1);
      for (let i = start; i <= end; i++) {
        const l = lines[i];
        if (/\b(Net|Gross) transaction amount\b/i.test(l) || /\bUSD\b/i.test(l)) continue;
        const m = l.match(/\$?(\d+\.\d{1,3})\b/);
        if (m) {
          const pv = Number(m[1]);
          if (pv >= 0.01 && pv <= 1000) priceTokens.push(pv);
        }
      }
    }

    if (priceTokens.length === 0) {
      for (const l of lines) {
        if (/\b(Net|Gross) transaction amount\b/i.test(l) || /\bEquals\b/i.test(l) || /\bUSD\b/i.test(l) || /^(Security number|Trade number|Processed on|For settlement on)\b/i.test(l)) continue;
        const m = l.match(/\$?(\d+\.\d{1,3})\b/g);
        if (!m) continue;
        for (const s of m) {
          const v = Number(s.replace(/\$/g, ""));
          if (v >= 0.01 && v <= 1000) priceTokens.push(v);
        }
      }
    }

    const minToken = (!Number.isNaN(priceHeadline) && priceHeadline >= 1) ? Math.max(0.05, priceHeadline * 0.5) : 0.01;
    priceTokens = Array.from(new Set(priceTokens.filter((p) => p >= minToken && p <= 1000)));

    let bestQty = null;
    let bestErr = Infinity;
    const netAbs = Math.abs(notional);
    const hasTokens = priceTokens.length > 0;

    if (hasTokens) {
      for (const p of priceTokens) {
        const q = Math.round(netAbs / (p * 100));
        if (q <= 0 || q > 200) continue;
        const implied = netAbs / (q * 100);
        const err = Math.abs(implied - p) / p;
        if (err < bestErr) { bestErr = err; bestQty = q; }
      }
      if (bestQty && bestErr <= 0.02) {
        if ((!qtyTotal || qtyTotal <= 0)) qtyTotal = bestQty;
      }
    }

    if (!qtyTotal || qtyTotal <= 0) {
      let scoredBestQ = null;
      let scoredBest = Infinity;
      const step = 0.05;
      for (let q = 1; q <= 25; q++) {
        const implied = netAbs / (q * 100);
        const nearestStep = Math.round(implied / step) * step;
        const niceErr = Math.abs(implied - nearestStep) / Math.max(implied, 1e-6);
        let tokenErr = 0.25;
        if (hasTokens) {
          tokenErr = Math.min(...priceTokens.map((p) => Math.abs(implied - p) / p));
        }
        const headErr = !Number.isNaN(priceHeadline) ? Math.abs(implied - priceHeadline) / Math.max(priceHeadline, 1e-6) : 0.25;
        const qPenalty = q > 20 ? Math.min(0.5, (q - 20) / 20) : 0;
        const score = tokenErr * 0.82 + niceErr * 0.05 + headErr * 0.03 + qPenalty * 0.10;
        if (score < scoredBest) { scoredBest = score; scoredBestQ = q; }
      }
      if (scoredBestQ) qtyTotal = scoredBestQ;
    }

    if ((premium === null || !Number.isFinite(premium)) && qtyTotal && qtyTotal > 0) {
      premium = netAbs / (qtyTotal * 100);
    }
  }

  if (qtyTotal && qtyTotal > 0) {
    warnings = warnings.filter((w) => !/^Could not determine total contracts/i.test(w));
  }
  if (premium !== null && Number.isFinite(premium)) {
    warnings = warnings.filter((w) => !/^Could not determine premium per contract/i.test(w));
  }

  if (!underlying || !optionType || strike === null || !action) {
    return { warnings, trade: null };
  }

  return {
    warnings,
    trade: {
      kind: "option",
      underlying,
      optionType,
      strike,
      expiration,
      action,
      quantity_contracts: qtyTotal,
      premium_per_contract: premium,
      notional,
      tradeTime,
      brokerTradeNumber: tradeNum,
    },
  };
}

export const _internals = {
  clusterIntoRows,
  detectHeaderRow,
  estimateColumnBounds,
  enrichRow,
  locateColumn,
  deriveGuess,
  mergeAdjacentItems,
  isTradeLike,
  normalizeTrade,
  parseTradeFromBlock,
};

export default parsePdfBuffer;
