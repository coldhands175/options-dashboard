"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import type { Id } from "./_generated/dataModel";
import type { ParsedPdfResult, ParsedTradeDetails } from "../lib/pdf/positionalParser";

const DEBUG = process.env.PDF_DEBUG === "1";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type PositionalParser = (buffer: Buffer | Uint8Array | ArrayBuffer, options?: { fileName?: string }) => Promise<ParsedPdfResult>;

let cachedPositionalParser: PositionalParser | null = null;

async function getPdfBuffer(ctx: any, fileId: Id<"_storage">): Promise<Buffer> {
  const blob = await ctx.storage.get(fileId);
  if (!blob) throw new Error("File not found in storage");
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getPositionalParser(): Promise<PositionalParser> {
  if (cachedPositionalParser) return cachedPositionalParser;
  const parserModule: any = await import("../lib/pdf/positionalParser.mjs");
  const parsePdfBuffer: PositionalParser | undefined = parserModule.parsePdfBuffer ?? parserModule.default;
  if (!parsePdfBuffer) {
    throw new Error("Positional parser not available");
  }
  cachedPositionalParser = parsePdfBuffer;
  return parsePdfBuffer;
}

function serializeParsedTrade(trade: ParsedTradeDetails | null) {
  if (!trade) return null;
  return {
    action: trade.action,
    underlying: trade.underlying,
    optionType: trade.optionType,
    strike: trade.strike,
    expiration: trade.expiration ?? null,
    quantity_contracts: trade.quantity_contracts ?? null,
    premium_per_contract: trade.premium_per_contract ?? null,
    notional: trade.notional ?? null,
    tradeTime: trade.tradeTime ?? null,
    brokerTradeNumber: trade.brokerTradeNumber,
  };
}

function buildPositionalVisualization(result: ParsedPdfResult): string {
  const lines: string[] = [];
  lines.push(`File: ${result.fileName ?? "unknown.pdf"}`);
  lines.push(`Pages: ${result.pageCount}`);
  for (const page of result.pages) {
    lines.push("");
    lines.push(`── Page ${page.pageNumber} ${page.headerDetected ? "(columns detected)" : "(no header)"}`);
    const columnKeys = Object.keys(page.columns ?? {});
    if (columnKeys.length > 0) {
      lines.push(`Columns: ${columnKeys.join(", ")}`);
      for (const key of columnKeys) {
        const col = page.columns[key];
        lines.push(`  [${key}] min=${col.min.toFixed(1)} max=${col.max.toFixed(1)} origin="${col.origin}"`);
      }
    }
    for (const row of page.rows) {
      if (row.cells.length === 0) continue;
      const marker = row.tradeLike ? "→" : " ";
      lines.push(`${marker} Y=${row.y.toFixed(2)} :: ${row.text}`);
      for (const cell of row.cells) {
        const colName = cell.column ? `[${cell.column}]` : "";
        lines.push(`    X=${cell.x.toFixed(2)} ${colName} "${cell.text}"`);
      }
    }
    if (page.analysis?.trade) {
      lines.push(`  Parsed trade: ${page.analysis.trade.action} ${page.analysis.trade.quantity_contracts ?? "?"} ${page.analysis.trade.underlying} ${page.analysis.trade.strike} ${page.analysis.trade.optionType}`);
    } else {
      lines.push("  Parsed trade: none");
    }
    for (const warning of page.analysis?.warnings ?? []) {
      lines.push(`  ⚠️  ${warning}`);
    }
  }
  return lines.join("\n");
}

export const debugPositionalExtraction = action({
  args: { fileId: v.id("_storage") },
  returns: v.object({
    pageCount: v.number(),
    normalizedLines: v.array(v.string()),
    visualization: v.string(),
    pages: v.array(
      v.object({
        pageNumber: v.number(),
        headerDetected: v.boolean(),
        columns: v.array(
          v.object({
            key: v.string(),
            min: v.number(),
            max: v.number(),
            origin: v.string(),
          })
        ),
        rows: v.array(
          v.object({
            y: v.number(),
            text: v.string(),
            tradeLike: v.boolean(),
            cells: v.array(
              v.object({
                text: v.string(),
                x: v.number(),
                column: v.union(v.string(), v.null()),
              })
            ),
          })
        ),
        analysis: v.object({
          warnings: v.array(v.string()),
          trade: v.union(
            v.null(),
            v.object({
              action: v.union(
                v.literal("BTO"),
                v.literal("BTC"),
                v.literal("STO"),
                v.literal("STC")
              ),
              underlying: v.string(),
              optionType: v.union(v.literal("CALL"), v.literal("PUT")),
              strike: v.number(),
              expiration: v.union(v.number(), v.null()),
              quantity_contracts: v.union(v.number(), v.null()),
              premium_per_contract: v.union(v.number(), v.null()),
              notional: v.union(v.number(), v.null()),
              tradeTime: v.union(v.number(), v.null()),
              brokerTradeNumber: v.optional(v.string()),
            })
          ),
        }),
        rawText: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const buf = await getPdfBuffer(ctx, args.fileId);
    const parsePdfBuffer = await getPositionalParser();
    const result = await parsePdfBuffer(buf, { fileName: undefined });

    const pages = result.pages.map((page) => ({
      pageNumber: page.pageNumber,
      headerDetected: Boolean(page.headerDetected),
      columns: Object.entries(page.columns ?? {}).map(([key, value]) => ({
        key,
        min: value.min,
        max: value.max,
        origin: value.origin,
      })),
      rows: page.rows.map((row) => ({
        y: row.y,
        text: row.text,
        tradeLike: Boolean(row.tradeLike),
        cells: row.cells.map((cell) => ({
          text: cell.text,
          x: cell.x,
          column: cell.column ?? null,
        })),
      })),
      analysis: {
        warnings: page.analysis?.warnings ?? [],
        trade: serializeParsedTrade(page.analysis?.trade ?? null),
      },
      rawText: page.rawText ?? "",
    }));

    return {
      pageCount: result.pageCount,
      normalizedLines: result.normalizedLines,
      visualization: buildPositionalVisualization(result),
      pages,
    };
  },
});

type NormalizedTrade = { text: string; brokerTradeNumber?: string };

function normalizePdfTextToTrades(raw: string): string {
  // Retained for preview/debug compatibility; delegates to new structured extractor.
  const items = normalizePdfTextToItems(raw);
  // Preserve broker trade number by appending a suffix the trade importer can parse (e.g., "#123456").
  return items
    .map((it) => {
      let line = it.brokerTradeNumber ? `${it.text} #${it.brokerTradeNumber}` : it.text;
      if (it.tradeTimeMs && Number.isFinite(it.tradeTimeMs)) {
        line = `${line} @tt=${it.tradeTimeMs}`;
      }
      if (it.openClose) {
        line = `${line} @oc=${it.openClose}`; // open|close
      }
      return line;
    })
    .join("\n");
}

function normalizePdfTextToItems(raw: string): Array<{ text: string; brokerTradeNumber?: string; tradeTimeMs?: number; openClose?: "open"|"close" }> {
  let s = raw.replace(/\r/g, "\n");
  s = s
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !!l && !/^Page \d+ of \d+$/i.test(l))
    .join("\n");

  const lines = s.split("\n");
  const merged: string[] = [];
  for (const line of lines) {
    if (
      merged.length > 0 &&
      !/(?: at \$\d+(?:\.\d+)?\s*$)/i.test(merged[merged.length - 1]) &&
      !/^(Sold|Bought)/i.test(line)
    ) {
      merged[merged.length - 1] = (merged[merged.length - 1] + " " + line)
        .replace(/\s+/g, " ")
        .trim();
    } else {
      merged.push(line);
    }
  }

  let tradeLike = merged.filter(
    (l) => /\b(Sold|Bought)\b/i.test(l) && /(Puts?|Calls?)\b/i.test(l) && /\bat\s+\$?\d/i.test(l)
  );

  const items: Array<{ text: string; brokerTradeNumber?: string; tradeTimeMs?: number; openClose?: "open"|"close" }> = [];
  if (tradeLike.length > 0) {
    for (const t of tradeLike) items.push({ text: t });
    return items;
  }

  // TD Wealth style parsing: blocks like "You sold" ... "EXPIRES ON May 18, 2018" and later "Trade number: XXXXX"
  const UPPER = (x: string) => x.toUpperCase();
  const cap = (x: string) => x.slice(0,1).toUpperCase() + x.slice(1).toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const youM = line.match(/^you\s+(sold|bought)/i);
    if (!youM) continue;
    const sideWord = cap(youM[1]); // Sold / Bought

    // Look ahead a small window for security description and other fields
    const windowEnd = Math.min(lines.length, i + 40);
    let secIdx = -1;
    // Prefer the same line if it already contains PUT/CALL (common in TD docs)
    if (/(PUT|CALL)/i.test(line)) {
      secIdx = i;
    } else {
      for (let j = i + 1; j < windowEnd; j++) {
        if (/(PUT|CALL)/i.test(lines[j])) { secIdx = j; break; }
      }
    }
    if (secIdx === -1) continue;
    const sec = lines[secIdx];

    // Option type and underlying/strike from the security description line
    const typeM = sec.match(/(PUT|CALL)/i);
    const optionType = typeM ? (UPPER(typeM[1]) === 'PUT' ? 'Puts' : 'Calls') : null;

    // Underlying ticker appears after "PUT|CALL -100 <TICKER>"
    let underlying: string | null = null;
    const underlyingTok = sec.match(/(?:PUT|CALL)\s*-?\d+\s+([A-Z]{1,6})/i);
    if (underlyingTok) underlying = underlyingTok[1].toUpperCase();

    // Strike from '@70'
    let strike: string | null = null;
    const strikeM = sec.match(/@\s*(\d+(?:\.\d+)?)/);
    if (strikeM) strike = strikeM[1];

    // Expiration
    let month: string | null = null;
    let day: string | null = null;
    let year: string | null = null;
    for (let j = secIdx; j < windowEnd; j++) {
      const m = lines[j].match(/^EXPIRES ON\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
      if (m) { month = cap(m[1]); day = String(Number(m[2])); year = m[3]; break; }
    }
    if (!year || !month) {
      const m2 = sec.match(/'(\d{2})([A-Za-z]{2})/);
      if (m2) {
        const yy = Number(m2[1]);
        year = String(2000 + yy);
        const map2: Record<string, string> = { JA: 'January', FE: 'February', MR: 'March', AP: 'April', MY: 'May', JN: 'June', JL: 'July', AU: 'August', SE: 'September', OC: 'October', NV: 'November', DE: 'December' };
        const mm2 = m2[2].toUpperCase();
        if (map2[mm2]) month = map2[mm2];
      }
    }

    // Quantity and price: heuristics scanning both backward and forward around the security line
    let qty: string | null = null;
    let price: string | null = null;
    const scanStart = Math.max(0, secIdx - 10);
    for (let j = scanStart; j < windowEnd; j++) {
      const l = lines[j];
      if (/^Gross transaction amount/i.test(l)) break;
      const fused = l.match(/^(\d+)(\d\.\d{2})$/);
      if (fused) {
        const fusedQty = Number(fused[1]);
        const fusedPrice = Number(fused[2]);
        // Only treat as fused quantity+price if the price part is clearly a premium (< 1.00)
        if (fusedPrice < 1) {
          if (qty === null) qty = String(fusedQty);
          if (price === null) price = fused[2];
          if (qty && price) break;
          continue;
        }
        // Otherwise, consider this a standalone price like 17.30, not a fused "1" + "7.30".
        if (price === null) {
          price = fused[1] + fused[2]; // reconstruct full number (e.g., "17.30")
          if (qty && price) break;
          continue;
        }
      }
      if (qty === null && /^\d{1,4}$/.test(l)) {
        qty = l;
        continue;
      }
      if (price === null && /^(?!USD\b)\$?(\d+\.\d{1,2})$/.test(l)) {
        const pm = l.match(/\d+\.\d{1,2}/);
        if (pm) price = pm[0];
        continue;
      }
    }

    // Trade number in window
    let tradeNumber: string | undefined = undefined;
    for (let j = secIdx; j < windowEnd; j++) {
      const m = lines[j].match(/^Trade number:\s*(\d+)/i);
      if (m) { tradeNumber = m[1]; break; }
    }

    // Open/Close indicator in window
    let openClose: "open" | "close" | undefined = undefined;
    for (let j = Math.max(0, secIdx - 5); j < windowEnd; j++) {
      const L = lines[j];
      if (/\bopening transaction\b/i.test(L)) { openClose = "open"; break; }
      if (/\bclosing transaction\b/i.test(L)) { openClose = "close"; break; }
      if (/\bto open\b/i.test(L)) { openClose = "open"; break; }
      if (/\bto close\b/i.test(L)) { openClose = "close"; break; }
    }

    // Trade date/time in window (best-effort heuristics)
    let tradeTimeMs: number | undefined = undefined;
    const tryParseDate = (rawDate: string): number | undefined => {
      const cleaned = rawDate.replace(/\b(ET|EST|EDT|CT|CST|CDT|PT|PST|PDT)\b/gi, "").trim();
      const parsed = Date.parse(cleaned);
      if (!Number.isNaN(parsed)) return parsed;
      // Try MM/DD/YYYY
      const mdy = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
      if (mdy) {
        const mm = Number(mdy[1]) - 1;
        const dd = Number(mdy[2]);
        const yy = Number(mdy[3]);
        let hh = 12, min = 0;
        if (mdy[4] && mdy[5]) {
          hh = Number(mdy[4]);
          min = Number(mdy[5]);
          const ampm = (mdy[6] || '').toUpperCase();
          if (ampm === 'PM' && hh < 12) hh += 12;
          if (ampm === 'AM' && hh === 12) hh = 0;
        }
        return new Date(yy, mm, dd, hh, min, 0, 0).getTime();
      }
      return undefined;
    };
    for (let j = secIdx; j < windowEnd; j++) {
      const L = lines[j];
      const m1 = L.match(/^Trade date:\s*(.+)$/i) || L.match(/^Transaction date:\s*(.+)$/i) || L.match(/^Trade time:\s*(.+)$/i);
      if (m1) {
        const ms = tryParseDate(m1[1]);
        if (ms) { tradeTimeMs = ms; break; }
      }
    }

    if (sideWord && optionType && underlying && strike && qty && price && month && day && year) {
      const text = `${sideWord} ${qty} ${underlying} ${month} ${day} ${year} ${strike} ${optionType} at ${price}`;
      items.push({ text, brokerTradeNumber: tradeNumber, tradeTimeMs, openClose });
    }
  }

  return items;
}


// Structured parsing from PDF using the same per-page parser as PDFs
export const extractTradesFromPdfParsed = action({
  args: {
    fileId: v.id("_storage"),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(v.object({ line: v.number(), input: v.string(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.fileId);
    if (!blob) throw new Error("File not found in storage");
    const arrayBuffer = await blob.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse: any = (mod as any).default ?? (mod as any);
    const parsed = await pdfParse(buf);
    const text: string = parsed?.text ?? "";

    const pageTexts = splitPages(text);

    // Build normalized single-line inputs from structured parse for insertion
    const toLine = (t: {
      action: "BTO"|"BTC"|"STO"|"STC";
      quantity_contracts: number | null;
      underlying: string;
      optionType: "CALL"|"PUT";
      strike: number;
      expiration: number | null;
      premium_per_contract: number | null;
      brokerTradeNumber?: string;
      tradeTime?: number | null;
    }): string | null => {
      const qty = t.quantity_contracts ?? null;
      let prem = t.premium_per_contract ?? null;
      if (prem === null || !Number.isFinite(prem)) return null;
      if (!qty || qty <= 0 || !t.expiration) return null;
      const d = new Date(t.expiration);
      const month = monthNames[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();
      const typeWord = t.optionType === "PUT" ? "Puts" : "Calls";
      const priceStr = prem < 0.1 ? prem.toFixed(3) : (Math.round(prem * 1000) % 10 !== 0 ? prem.toFixed(3) : prem.toFixed(2));
      let side: "Sold" | "Bought"; let oc: "open" | "close";
      switch (t.action) {
        case "STO": side = "Sold"; oc = "open"; break;
        case "STC": side = "Sold"; oc = "close"; break;
        case "BTO": side = "Bought"; oc = "open"; break;
        case "BTC": side = "Bought"; oc = "close"; break;
      }
      const sufTime = t.tradeTime ? ` @tt=${t.tradeTime}` : "";
      const sufQty = qty ? ` @qty=${qty}` : "";
      const sufNum = t.brokerTradeNumber ? ` #${t.brokerTradeNumber}` : ""; // keep last for importer compatibility
      const withOc = `${side} to ${oc} ${qty} ${t.underlying} ${month} ${day} ${year} ${t.strike} ${typeWord} at ${priceStr}${sufTime}${sufQty}${sufNum}`;
      return withOc;
    };

    const lines: string[] = [];
    const errors: { line: number; input: string; message: string }[] = [];

    pageTexts.forEach((pt, idx) => {
      const { trade, warnings } = parseTradeFromPageBlock(pt);
      if (!trade) {
        errors.push({ line: idx + 1, input: pt.slice(0, 120), message: warnings.join("; ") || "Could not parse trade" });
        return;
      }
      const line = toLine(trade);
      if (!line) {
        errors.push({ line: idx + 1, input: pt.slice(0, 120), message: "Missing qty/premium/expiration in parsed trade" });
        return;
      }
      lines.push(line);
    });

    const textInput = lines.join("\n");

    const result: { created: number; errors: Array<{ line: number; input: string; message: string }> } = args.userId
      ? await ctx.runMutation(
          internal.trades.createOptionTradesFromTextAsUser,
          {
            userId: args.userId,
            text: textInput,
            accountTag: args.accountTag,
            notes: args.notes,
          }
        )
      : await ctx.runMutation(
          api.trades.createOptionTradesFromText,
          {
            text: textInput,
            accountTag: args.accountTag,
            notes: args.notes,
          }
        );

    const mergedErrors = [...errors, ...(result.errors || [])];
    return { created: result.created, errors: mergedErrors };
  },
});

export const extractTradesFromPdfPositional = action({
  args: {
    fileId: v.id("_storage"),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(
      v.object({
        line: v.number(),
        input: v.string(),
        message: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const buf = await getPdfBuffer(ctx, args.fileId);
    const parsePdfBuffer = await getPositionalParser();
    const result = await parsePdfBuffer(buf, { fileName: undefined });

    const errors: Array<{ line: number; input: string; message: string }> = [];

    for (const page of result.pages) {
      if (!page.analysis?.trade) {
        const message = (page.analysis?.warnings ?? []).join("; ") || "Could not parse trade";
        errors.push({ line: page.pageNumber, input: page.rawText?.slice(0, 120) ?? "", message });
      }
    }

    const normalized = result.normalizedLines;
    if (normalized.length === 0) {
      return { created: 0, errors };
    }

    const joined = normalized.join("\n");
    const mutationResult: { created: number; errors: Array<{ line: number; input: string; message: string }> } = args.userId
      ? await ctx.runMutation(
          internal.trades.createOptionTradesFromTextAsUser,
          {
            userId: args.userId,
            text: joined,
            accountTag: args.accountTag,
            notes: args.notes,
          }
        )
      : await ctx.runMutation(
          api.trades.createOptionTradesFromText,
          {
            text: joined,
            accountTag: args.accountTag,
            notes: args.notes,
          }
        );

    const mergedErrors = [...errors, ...(mutationResult.errors || [])];
    return { created: mutationResult.created, errors: mergedErrors };
  },
});

// Helper: split raw PDF text into trade pages.
// Prefer splitting on the anchor "Transaction on <Month DD, YYYY>".
// Fall back to "Page X of Y" markers if needed.
function splitPages(raw: string): string[] {
  const norm = raw.replace(/\r/g, "\n");
  const transRx = /(^|\n)\s*Transaction on\s+[A-Za-z]+\s+\d{1,2},\s*\d{4}\s*(?=\n)/g;
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = transRx.exec(norm)) !== null) {
    indices.push(m.index + (m[1] ? m[1].length : 0));
  }
  if (indices.length > 0) {
    const pages: string[] = [];
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : norm.length;
      pages.push(norm.slice(start, end).trim());
    }
    return pages;
  }

  // Fallback: page markers
  const lines = norm.split("\n");
  const pages2: string[] = [];
  let current: string[] = [];
  const isPageMarker = (l: string) => /^Page\s+\d+\s+of\s+\d+$/i.test(l.trim());
  for (const line of lines) {
    if (isPageMarker(line)) {
      if (current.length > 0) {
        pages2.push(current.join("\n"));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) pages2.push(current.join("\n"));
  return pages2.length > 0 ? pages2 : [raw];
}

// Dry-run: return normalized trade lines per page without inserting anything
    const toSimpleLine = (t: {
      action: "BTO"|"BTC"|"STO"|"STC";
      quantity_contracts: number | null;
      underlying: string;
      optionType: "CALL"|"PUT";
      strike: number;
      expiration: number | null;
      premium_per_contract: number | null;
      notional: number | null;
      brokerTradeNumber?: string;
      tradeTime?: number | null;
    }): string | null => {
      const qty = t.quantity_contracts ?? null;
      // Use net-based premium if possible
      let prem = t.premium_per_contract ?? null;
      if ((prem === null || !Number.isFinite(prem)) && t.notional !== null && qty && qty > 0) {
        prem = Math.abs(t.notional) / (qty * 100);
      }
      if (!qty || qty <= 0 || prem === null || !Number.isFinite(prem) || !t.expiration) return null;
      const d = new Date(t.expiration);
      const month = monthNames[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();
      const typeWord = t.optionType === "PUT" ? "Puts" : "Calls";
      // Prefer 3 decimals when the value isn't a clean 2-decimal price
      const needs3 = Math.round(prem * 1000) % 10 !== 0 || prem < 0.1;
      const priceStr = needs3 ? prem.toFixed(3) : prem.toFixed(2);
      const side = (t.action === "STO" || t.action === "STC") ? "Sold" : "Bought";
      const suf = t.brokerTradeNumber ? ` #${t.brokerTradeNumber}` : "";
      return `${side} ${qty} ${t.underlying} ${month} ${day} ${year} ${t.strike} ${typeWord} at ${priceStr}${suf}`;
    };

export const dryRunNormalizePerPage = action({
  args: { fileId: v.id("_storage") },
  returns: v.object({
    version: v.string(),
    pages: v.number(),
    perPage: v.array(
      v.object({
        page: v.number(),
        normalized: v.array(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.fileId);
    if (!blob) throw new Error("File not found in storage");
    const arrayBuffer = await blob.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse: any = (mod as any).default ?? (mod as any);
    const parsed = await pdfParse(buf);
    const text: string = parsed?.text ?? "";

    const pageTexts = splitPages(text);

    const perPage = pageTexts.map((pt, idx) => {
      const { trade } = parseTradeFromPageBlock(pt);
      if (trade) {
        const line = toSimpleLine(trade as any);
        if (line) {
          return { page: idx + 1, normalized: [line] };
        }
      }
      // Fallback to heuristic normalizer on this page
      const items = normalizePdfTextToItems(pt);
      const lines = items.map((it) => it.text);
      const note = lines.length === 0
        ? "No trade-like line detected on this page"
        : lines.length > 1
          ? `Found ${lines.length} trade-like lines on this page`
          : undefined;
      return { page: idx + 1, normalized: lines, notes: note };
    });

    return { version: "1.2", pages: pageTexts.length, perPage };
  },
});

// Heuristic parser for a single page block.
function parseTradeFromPageBlock(block: string): {
  warnings: string[];
  trade: null | {
    kind: "option";
    underlying: string;
    optionType: "CALL" | "PUT";
    strike: number;
    expiration: number | null;
    action: "BTO" | "BTC" | "STO" | "STC";
    quantity_contracts: number | null;
    premium_per_contract: number | null;
    notional: number | null;
    tradeTime: number | null;
    brokerTradeNumber?: string;
  };
} {
  let warnings: string[] = [];
  const lines = block.replace(/\r/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const text = lines.join("\n");

  // Side and open/close
  const sold = /\bYou sold\b/i.test(text) || /\bSold\b/i.test(text);
  const bought = /\bYou bought\b/i.test(text) || /\bBought\b/i.test(text);
  const opening = /\bOPENING\s+TRANS|OPENING\s+TRANSACTION|to open\b/i.test(text);
  const closing = /\bCLOSING\s+TRANS|CLOSING\s+TRANSACTION|to close\b/i.test(text);
  let action: "BTO" | "BTC" | "STO" | "STC" | null = null;
  if (sold && opening) action = "STO"; else if (sold && closing) action = "STC";
  else if (bought && opening) action = "BTO"; else if (bought && closing) action = "BTC";
  if (!action) warnings.push("Could not confidently determine action (BTO/BTC/STO/STC)");

  // Option type, underlying, strike
  let optionType: "CALL" | "PUT" | null = null;
  const hasPut = /\bPUT\b/i.test(text);
  const hasCall = /\bCALL\b/i.test(text);
  if (hasPut && !hasCall) optionType = "PUT";
  else if (hasCall && !hasPut) optionType = "CALL";
  else if (hasPut && hasCall) {
    // Prefer the token closest to the security description line
    const putIdx = text.search(/\bPUT\b/i);
    const callIdx = text.search(/\bCALL\b/i);
    optionType = putIdx !== -1 && (callIdx === -1 || putIdx < callIdx) ? "PUT" : "CALL";
  }
  if (!optionType) warnings.push("Missing option type");

  // Underlying and option type after PUT|CALL -100 <TICKER>
  let underlying: string | null = null;
  const undM = text.match(/\b(PUT|CALL)\s*-?\d+\s+([A-Z]{1,6})\b/i);
  if (undM) {
    underlying = undM[2].toUpperCase();
    const token = undM[1].toUpperCase();
    optionType = token === "PUT" ? "PUT" : "CALL";
  } else {
    warnings.push("Could not parse underlying");
  }

  // Strike after @
  let strike: number | null = null;
  const strikeM = text.match(/@\s*(\d+(?:\.\d+)?)/);
  if (strikeM) strike = Number(strikeM[1]); else warnings.push("Could not parse strike");

  // Expiration from EXPIRES ON Month DD, YYYY
  let expiration: number | null = null;
  const expM = text.match(/EXPIRES ON\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (expM) {
    const month = expM[1];
    const day = Number(expM[2]);
    const year = Number(expM[3]);
    const d = Date.parse(`${month} ${day}, ${year} 17:00:00`);
    if (!Number.isNaN(d)) expiration = d; else warnings.push("Could not parse expiration date");
  } else warnings.push("Expiration line not found");

  // Trade time from header "Transaction on <Month DD, YYYY>"
  let tradeTime: number | null = null;
  const timeM = text.match(/Transaction on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (timeM) {
    const t = Date.parse(timeM[1]);
    if (!Number.isNaN(t)) tradeTime = t; else warnings.push("Could not parse trade time");
  } else warnings.push("Transaction date not found");

  // Broker trade number
  const tradeNum = text.match(/Trade number:\s*(\d+)/i)?.[1];

  // Quantity rows: look in the section after a line with both "Quantity" and "Price"
  let qtyTotal: number | null = null;
  let extractedPrice: number | null = null; // Track price from table
  const qpIdx = lines.findIndex((l) => /\bQuantity\b/i.test(l) && /\bPrice\b/i.test(l));
  // Also capture explicit Price($) header location to probe next line(s)
  const priceHeaderIdx = lines.findIndex((l) => /\bPrice\s*\(\$\)\b/i.test(l));
  if (qpIdx !== -1) {
    let sum = 0; let found = false;
    const bare: number[] = [];
    const prices: number[] = [];
    for (let i = qpIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^Gross transaction amount\b/i.test(l) || /^Equals\b/i.test(l) || /^Security number:/i.test(l)) break;

      // NEW: Handle merged "QuantityPrice($)Amount($)\n500.45" pattern
      // Ambiguous: "500.45" could be qty=5,price=00.45 OR qty=50,price=0.45 OR qty=500,price=0.45
      // Store raw string - we'll determine correct split after extracting gross amount
      const mergedQP = l.match(/^(\d+)(\d\.\d{2})$/);
      if (mergedQP) {
        // For now, assume most common case: 2-digit quantity
        // e.g., "500.45" → qty=50, price=0.45
        const fullStr = mergedQP[1]; // "500"
        const priceDecimal = mergedQP[2]; // "0.45"

        // Default: take first 2 digits as qty, rest as price
        const qty = fullStr.length >= 2 ? Number(fullStr.substring(0, 2)) : Number(fullStr[0]);
        const price = Number(priceDecimal);

        sum += qty;
        prices.push(price);
        found = true;
        continue;
      }

      // Expect lines like: "2            17.30" or "19 0.13"
      const rowM = l.match(/^\s*(\d{1,4})\s+(?:USD\s*)?\$?(\d+(?:\.\d{1,3})?)\b/);
      if (rowM) {
        sum += Number(rowM[1]);
        prices.push(Number(rowM[2]));
        found = true;
        continue;
      }
      // Some PDFs put price first, then quantity; accept either order as long as both are present
      const altM = l.match(/^\s*(?:USD\s*)?\$?(\d+(?:\.\d{1,3})?)\s+(\d{1,4})\b/);
      if (altM) {
        sum += Number(altM[2]);
        prices.push(Number(altM[1]));
        found = true;
        continue;
      }
      // Bare quantity line (often the per-fill rows show only the quantity in the text extraction)
      const bareQty = l.match(/^\s*(\d{1,4})\s*$/);
      if (bareQty) bare.push(Number(bareQty[1]));
    }
    if (found) {
      qtyTotal = sum;
      // Use average price from table if we got multiple prices
      if (prices.length > 0) {
        extractedPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    else if (bare.length > 0) {
      if (bare.length >= 2) {
        const sumExLast = bare.slice(0, -1).reduce((a, b) => a + b, 0);
        // The last bare number is often the total line; if it equals the sum of prior rows, use the sum
        qtyTotal = sumExLast === bare[bare.length - 1] ? sumExLast : bare.reduce((a, b) => a + b, 0);
      } else {
        qtyTotal = bare[0];
      }
    }
  }
  // Fallback: extract quantity from headline sentence (e.g., "Sold 5 TICKER ...")
  // If still null, try parsing when Quantity header appears alone (separate from Price header)
  if (qtyTotal === null) {
    const quantityHeaderIdx = lines.findIndex((l) => /\bQuantity\b/i.test(l));
    if (quantityHeaderIdx !== -1) {
      const nums: number[] = [];
      for (let i = quantityHeaderIdx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^(Gross transaction amount|Equals|Security number:)/i.test(l)) break;
        const m = l.match(/^\s*(\d{1,4})\s*$/);
        if (m) nums.push(Number(m[1]));
      }
      if (nums.length > 0) {
        if (nums.length >= 2) {
          const sumExLast = nums.slice(0, -1).reduce((a, b) => a + b, 0);
          // If the last line equals the sum of prior rows, treat it as the total; otherwise sum all
          qtyTotal = sumExLast === nums[nums.length - 1] ? sumExLast : nums.reduce((a, b) => a + b, 0);
        } else {
          qtyTotal = nums[0];
        }
      }
    }
  }
  // Fallback: extract quantity from headline sentence (e.g., "Sold 5 TICKER ...")
  if (qtyTotal === null) {
    const headQty = text.match(/\b(?:You\s+sold|Sold|You\s+bought|Bought)\s+(\d{1,4})\b/i)?.[1];
    if (headQty) qtyTotal = Number(headQty);
  }
  if (qtyTotal === null) warnings.push("Could not determine total contracts (multi-fill table not detected)");

  // Gross and Net transaction amounts (USD X,XXX.XX)
  let grossAmount: number | null = null;
  const grossM = text.match(/Gross transaction amount\s+USD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (grossM) {
    grossAmount = Number(grossM[1].replace(/,/g, ""));
    if (Number.isNaN(grossAmount)) grossAmount = null;
  }

  let notional: number | null = null;
  const netM = text.match(/Net transaction amount\s+USD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (netM) {
    notional = Number(netM[1].replace(/,/g, ""));
    if (Number.isNaN(notional)) { notional = null; warnings.push("Failed to parse net amount"); }
  } else warnings.push("Net transaction amount not found");

  // VALIDATION: If we have qty, price, and gross amount, validate they match
  // Formula: qty × price × 100 should ≈ gross amount
  if (qtyTotal && extractedPrice && grossAmount) {
    const calculated = qtyTotal * extractedPrice * 100;
    const percentDiff = Math.abs(calculated - grossAmount) / grossAmount;

    // If mismatch > 5%, the qty/price split is probably wrong
    if (percentDiff > 0.05) {
      // Try re-interpreting: maybe we split the merged pattern incorrectly
      // Look for merged patterns in the text again and try different splits
      const mergedMatch = text.match(/(\d+)(\d\.\d{2})/);
      if (mergedMatch) {
        const fullStr = mergedMatch[1];
        const priceDecimal = Number(mergedMatch[2]);

        // Try all possible splits and pick the one that matches gross best
        const candidates: Array<{qty: number, price: number, diff: number}> = [];

        // 1-digit qty: "500.45" → qty=5, need to reconstruct price from "00.45"
        if (fullStr.length >= 1) {
          const qty1 = Number(fullStr[0]);
          const remainingDigits = fullStr.substring(1) + String(priceDecimal).substring(2); // "00" + "45"
          const price1 = Number("0." + remainingDigits.substring(0, 2));
          const calc1 = qty1 * price1 * 100;
          candidates.push({qty: qty1, price: price1, diff: Math.abs(calc1 - grossAmount) / grossAmount});
        }

        // 2-digit qty: "500.45" → qty=50, price=0.45
        if (fullStr.length >= 2) {
          const qty2 = Number(fullStr.substring(0, 2));
          const calc2 = qty2 * priceDecimal * 100;
          candidates.push({qty: qty2, price: priceDecimal, diff: Math.abs(calc2 - grossAmount) / grossAmount});
        }

        // 3-digit qty: "500.45" → qty=500, price=0.45
        if (fullStr.length >= 3) {
          const qty3 = Number(fullStr);
          const calc3 = qty3 * priceDecimal * 100;
          candidates.push({qty: qty3, price: priceDecimal, diff: Math.abs(calc3 - grossAmount) / grossAmount});
        }

        // Pick the candidate with smallest difference
        const best = candidates.sort((a, b) => a.diff - b.diff)[0];
        if (best && best.diff < percentDiff) {
          qtyTotal = best.qty;
          extractedPrice = best.price;
          warnings.push(`Corrected qty/price split using gross amount validation: qty=${best.qty}, price=${best.price}`);
        }
      }
    }
  }

  // Premium per contract: prefer table-extracted price, then derive from net
  let premium: number | null = null;

  // First try: use price extracted from table
  if (extractedPrice !== null && extractedPrice > 0) {
    premium = extractedPrice;
  }
  // Second try: derive from net amount if we have quantity
  else if (notional !== null && qtyTotal && qtyTotal > 0) {
    premium = Math.abs(notional) / (qtyTotal * 100);
  }
  // Fallback: if we have a single clear price like "at $6.60", back-solve quantity from net
  else {
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

  // Last-resort fallback: infer quantity/price tokens from the page block when net is available
  if ((qtyTotal === null || premium === null) && notional !== null) {
    // Headline price (e.g., "at $6.60") if present
    const atPrice = text.match(/\bat\s+\$?(\d+(?:\.\d{1,3})?)\b/i)?.[1];
    const priceHeadline = atPrice ? Number(atPrice) : NaN;

    // Gather candidate premium tokens from nearby table regions
    let priceTokens: number[] = [];

    // If we saw a Quantity/Price header, focus on that region first
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

    // Probe explicit Price($) header region (value may be on the next line in some PDFs)
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

    // Fallback: scan decimals but ignore non-price lines (net/gross/amount/headers)
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

    // Dynamic filter: if headline price is >= 1, ignore tokens less than half the headline
    const minToken = (!Number.isNaN(priceHeadline) && priceHeadline >= 1) ? Math.max(0.05, priceHeadline * 0.5) : 0.01;
    priceTokens = Array.from(new Set(priceTokens.filter((p) => p >= minToken && p <= 1000)));

    // Choose the best quantity using token match and price "niceness"
    let bestQty: number | null = null;
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
      // If a token match within 2% exists, prefer it strictly
      if (bestQty && bestErr <= 0.02) {
        if ((!qtyTotal || qtyTotal <= 0)) qtyTotal = bestQty;
      }
    }

    // If still undecided, score 1..25 contracts by combined token error + niceness
    if (!qtyTotal || qtyTotal <= 0) {
      let scoredBestQ: number | null = null;
      let scoredBest = Infinity;
      const step = 0.05;
      for (let q = 1; q <= 25; q++) {
        const implied = netAbs / (q * 100);
        const nearestStep = Math.round(implied / step) * step;
        const niceErr = Math.abs(implied - nearestStep) / Math.max(implied, 1e-6);
        let tokenErr = 0.25; // default penalty if no tokens
        if (hasTokens) {
          tokenErr = Math.min(...priceTokens.map((p) => Math.abs(implied - p) / p));
        }
        const headErr = !Number.isNaN(priceHeadline) ? Math.abs(implied - priceHeadline) / Math.max(priceHeadline, 1e-6) : 0.25;
        const qPenalty = q > 20 ? Math.min(0.5, (q - 20) / 20) : 0; // discourage very large q
        const score = tokenErr * 0.82 + niceErr * 0.05 + headErr * 0.03 + qPenalty * 0.10;
        if (score < scoredBest) { scoredBest = score; scoredBestQ = q; }
      }
      if (scoredBestQ) qtyTotal = scoredBestQ;
    }

    if ((premium === null || !Number.isFinite(premium)) && qtyTotal && qtyTotal > 0) {
      premium = netAbs / (qtyTotal * 100);
    }
  }

  // Remove stale warnings if we recovered values via fallbacks
  if (qtyTotal && qtyTotal > 0) {
    warnings = warnings.filter((w) => !/^Could not determine total contracts/i.test(w));
  }
  if (premium !== null && Number.isFinite(premium)) {
    warnings = warnings.filter((w) => !/^Could not determine premium per contract/i.test(w));
  }

  // If key parts missing, return null
  if (!underlying || !optionType || strike === null || !action) {
    return { warnings, trade: null };
  }

  return {
    warnings,
    trade: {
      kind: "option",
      underlying,
      optionType,
      strike: strike!,
      expiration,
      action: action!,
      quantity_contracts: qtyTotal,
      premium_per_contract: premium,
      notional,
      tradeTime,
      brokerTradeNumber: tradeNum,
    }
  };
}

export const dryRunParsePerPage = action({
  args: { fileId: v.id("_storage") },
  returns: v.object({
    version: v.string(),
    pages: v.number(),
    perPage: v.array(
      v.object({
        page: v.number(),
        parsed: v.union(
          v.null(),
          v.object({
            kind: v.literal("option"),
            underlying: v.string(),
            optionType: v.union(v.literal("CALL"), v.literal("PUT")),
            strike: v.number(),
            expiration: v.union(v.number(), v.null()),
            action: v.union(v.literal("BTO"), v.literal("BTC"), v.literal("STO"), v.literal("STC")),
            quantity_contracts: v.union(v.number(), v.null()),
            premium_per_contract: v.union(v.number(), v.null()),
            notional: v.union(v.number(), v.null()),
            tradeTime: v.union(v.number(), v.null()),
            brokerTradeNumber: v.optional(v.string()),
          })
        ),
        warnings: v.array(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.fileId);
    if (!blob) throw new Error("File not found in storage");
    const arrayBuffer = await blob.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse: any = (mod as any).default ?? (mod as any);
    const parsed = await pdfParse(buf);
    const text: string = parsed?.text ?? "";

    const pageTexts = splitPages(text);

    const perPage = pageTexts.map((pt, idx) => {
      const { warnings, trade } = parseTradeFromPageBlock(pt);
      return { page: idx + 1, parsed: trade, warnings };
    });

    return { version: "1.1", pages: pageTexts.length, perPage };
  },
});





// ============================================================================
// AI-POWERED PARSER using Claude API
// ============================================================================

/**
 * Use Claude AI to parse trade data from PDF text
 * This is more robust than regex-based parsing for varying PDF formats
 */
async function parseTradeWithAI(pageText: string, apiKey: string): Promise<{
  success: boolean;
  trade: any | null;
  warnings: string[];
  error?: string;
}> {
  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a financial trade data extractor. Extract option trade information from this PDF text.

PDF Text:
${pageText}

IMPORTANT PARSING NOTES:
- PDF text extraction often merges table columns without spaces (e.g., "QuantityPrice ($)Amount ($)92.40")
- The quantity is usually a small integer (1-100), while the price is a decimal dollar amount
- Look for patterns like "Quantity" followed by numbers, or numbers near "Price ($)"
- When you see merged numbers, the FIRST number is usually quantity, SECOND is price
- Example: "QuantityPrice ($)52.40" means quantity=5, price=2.40
- Example: "192.40" could mean quantity=1, price=92.40 OR quantity=19, price=2.40
- Use context from "Gross transaction amount" or "Net transaction amount" to verify
- Net amount should equal: quantity × price × 100 (for options)

Extract the following fields:
1. underlying: Stock ticker symbol (e.g., "LNG", "AAPL")
   - Usually appears after "PUT" or "CALL" in format like "PUT -100 LNG"

2. optionType: "CALL" or "PUT"
   - Look for these exact words in the security description

3. strike: Strike price as a number (e.g., 200, 150.5)
   - Usually appears after @ symbol (e.g., "@200")

4. expiration: Expiration date in format "YYYY-MM-DD"
   - Look for "EXPIRES ON" followed by date (e.g., "EXPIRES ON JUN 20,2025")

5. action: One of "BTO" (Buy to Open), "BTC" (Buy to Close), "STO" (Sell to Open), "STC" (Sell to Close)
   - If you see "You sold" or "Sold" + "OPENING TRANS", it's STO
   - If you see "You sold" or "Sold" + "CLOSING TRANS", it's STC
   - If you see "You bought" or "Bought" + "OPENING TRANS", it's BTO
   - If you see "You bought" or "Bought" + "CLOSING TRANS", it's BTC

6. quantity: Number of contracts (positive integer, usually 1-100)
   - Often appears standalone or near "Quantity" header
   - First number in merged sequences like "52.40"
   - Verify against net amount: net ÷ 100 ÷ price should equal quantity

7. premium: Premium per contract in dollars (e.g., 6.60)
   - Often appears near "Price ($)" header
   - Second number in merged sequences
   - Verify: quantity × premium × 100 should roughly equal net amount

8. tradeDate: Trade date in format "YYYY-MM-DD"
   - Look for "Transaction on" followed by date

9. brokerTradeNumber: Trade number/ID if present
   - Look for "Trade number:" followed by digits

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "underlying": "string",
  "optionType": "CALL or PUT",
  "strike": number,
  "expiration": "YYYY-MM-DD",
  "action": "BTO|BTC|STO|STC",
  "quantity": number,
  "premium": number,
  "tradeDate": "YYYY-MM-DD",
  "brokerTradeNumber": "string or null",
  "confidence": "high|medium|low",
  "warnings": ["array of any concerns or missing data"]
}

If you cannot extract a field with confidence, set it to null and add a warning.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response (strip markdown code blocks if present)
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      // Remove first line (```json or ```) and last line (```)
      jsonText = lines.slice(1, -1).join("\n").trim();
    }

    const parsed = JSON.parse(jsonText);

    // Convert date strings to timestamps
    const expiration = parsed.expiration ? new Date(parsed.expiration).getTime() : null;
    const tradeTime = parsed.tradeDate ? new Date(parsed.tradeDate).getTime() : null;

    const trade = {
      kind: "option" as const,
      underlying: parsed.underlying,
      optionType: parsed.optionType,
      strike: parsed.strike,
      expiration,
      action: parsed.action,
      quantity_contracts: parsed.quantity,
      premium_per_contract: parsed.premium,
      notional: parsed.quantity && parsed.premium ? Math.abs(parsed.quantity * parsed.premium * 100) : null,
      tradeTime,
      brokerTradeNumber: parsed.brokerTradeNumber || undefined,
    };

    return {
      success: true,
      trade,
      warnings: parsed.warnings || []
    };

  } catch (error: any) {
    return {
      success: false,
      trade: null,
      warnings: [],
      error: error.message || "AI parsing failed"
    };
  }
}

// ============================================================================
// NEW WORKFLOW (Positional): Extract trades to pending_trades table
// ============================================================================

export const extractTradesToPendingPositional = action({
  args: {
    fileId: v.id("_storage"),
    importId: v.id("imports"),
    userId: v.id("users"),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(v.object({ page: v.number(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    if (DEBUG) {
      console.log("[DEBUG] extractTradesToPendingPositional: Starting extraction", {
        fileId: args.fileId,
        importId: args.importId,
        userId: args.userId,
      });
    }

    const buf = await getPdfBuffer(ctx, args.fileId);
    const parsePdfBuffer = await getPositionalParser();
    const parseResult = await parsePdfBuffer(buf, { fileName: undefined });
    const pageByNumber = new Map(parseResult.pages.map((page: any) => [page.pageNumber, page]));

    const errors: Array<{ page: number; message: string }> = [];
    let created = 0;

    for (const page of parseResult.pages) {
      if (!page.analysis?.trade) {
        const message = page.analysis?.warnings?.join("; ") || "Could not parse trade";
        errors.push({ page: page.pageNumber, message });
      }
    }

    for (const entry of parseResult.trades) {
      const trade = entry.trade;
      const validationWarnings = [...(entry.warnings ?? [])];

      if (!trade.quantity_contracts || trade.quantity_contracts <= 0) {
        validationWarnings.push("Missing or invalid quantity");
      }
      if (!trade.premium_per_contract || !Number.isFinite(trade.premium_per_contract)) {
        validationWarnings.push("Missing or invalid premium");
      }
      if (!trade.expiration) {
        validationWarnings.push("Missing expiration date");
      }

      const sanitizedTrade = {
        underlying: trade.underlying,
        optionType: trade.optionType,
        strike: trade.strike,
        expiration: trade.expiration ?? Date.now(),
        action: trade.action,
        quantity_contracts: trade.quantity_contracts ?? 0,
        premium_per_contract: trade.premium_per_contract ?? 0,
        tradeTime: trade.tradeTime ?? trade.expiration ?? Date.now(),
        brokerTradeNumber: trade.brokerTradeNumber,
      };

      const confidence = calculateTradeConfidence(sanitizedTrade, validationWarnings);

      const page = pageByNumber.get(entry.pageNumber);
      const rawPageText = page?.rawText ? String(page.rawText).slice(0, 2000) : undefined;

      try {
        await ctx.runMutation(api.pendingTrades._insertPendingTrade, {
          userId: args.userId,
          importId: args.importId,
          trade: sanitizedTrade,
          confidence,
          warnings: validationWarnings,
          rawPageText,
          parseMethod: "positional",
        });
        created++;
      } catch (e: any) {
        const errorMsg = `Failed to save: ${e.message}`;
        errors.push({ page: entry.pageNumber, message: errorMsg });
      }
    }

    if (DEBUG) {
      console.log("[DEBUG] Positional extraction complete:", { created, errorsCount: errors.length });
    }
    return { created, errors };
  },
});

// ============================================================================
// Legacy heuristic + AI workflow (fallback)
// ============================================================================

export const extractTradesToPendingReview = action({
  args: {
    fileId: v.id("_storage"),
    importId: v.id("imports"),
    userId: v.id("users"),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(v.object({ page: v.number(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    if (DEBUG) {
      console.log("[DEBUG] extractTradesToPendingReview: Starting extraction", {
        fileId: args.fileId,
        importId: args.importId,
        userId: args.userId,
      });
    }

    const blob = await ctx.storage.get(args.fileId);
    if (!blob) throw new Error("File not found in storage");
    const arrayBuffer = await blob.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse: any = (mod as any).default ?? (mod as any);
    const parsed = await pdfParse(buf);
    const text: string = parsed?.text ?? "";

    if (DEBUG) {
      console.log("[DEBUG] PDF text extracted, length:", text.length);
    }

    const pageTexts = splitPages(text);
    if (DEBUG) {
      console.log("[DEBUG] Split into pages:", pageTexts.length);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not set. Please add it to .env.local");
    }

    let created = 0;
    const errors: Array<{ page: number; message: string }> = [];

    for (let i = 0; i < pageTexts.length; i++) {
      const pageText = pageTexts[i];
      if (DEBUG) {
        console.log(`[DEBUG] Processing page ${i + 1}/${pageTexts.length}, text length:`, pageText.length);
      }

      const heuristicResult = parseTradeFromPageBlock(pageText);
      let trade = heuristicResult.trade;
      let warnings = heuristicResult.warnings;
      let parseMethod: "heuristic" | "llm" = "heuristic";

      if (DEBUG) {
        console.log(`[DEBUG] Page ${i + 1} heuristic result:`, {
          hasTrade: !!trade,
          warningsCount: warnings.length,
          warnings,
        });
      }

      if (!trade || warnings.length >= 2) {
        if (DEBUG) {
          console.log(
            `[DEBUG] Page ${i + 1}: Trying AI parser (heuristic failed or has ${warnings.length} warnings)`
          );
        }
        const aiResult = await parseTradeWithAI(pageText, apiKey);

        if (DEBUG) {
          console.log(`[DEBUG] Page ${i + 1} AI result:`, {
            success: aiResult.success,
            hasTrade: !!aiResult.trade,
            error: aiResult.error,
            warningsCount: aiResult.warnings.length,
          });
        }

        if (aiResult.success && aiResult.trade) {
          trade = aiResult.trade;
          warnings = aiResult.warnings;
          warnings.push("Parsed with AI (heuristic parser failed)");
          parseMethod = "llm";
        }
      }

      if (!trade) {
        const errorMsg = warnings.join("; ") || "Could not parse trade";
        if (DEBUG) {
          console.log(`[DEBUG] Page ${i + 1}: No trade extracted, error:`, errorMsg);
        }
        errors.push({
          page: i + 1,
          message: errorMsg,
        });
        continue;
      }

      if (DEBUG) {
        console.log(`[DEBUG] Page ${i + 1}: Trade extracted:`, {
          underlying: trade.underlying,
          optionType: trade.optionType,
          strike: trade.strike,
          action: trade.action,
          quantity: trade.quantity_contracts,
          premium: trade.premium_per_contract,
          expiration: trade.expiration,
        });
      }

      let validationWarnings = [...warnings];

      if (!trade.quantity_contracts || trade.quantity_contracts <= 0) {
        validationWarnings.push("Missing or invalid quantity");
      }
      if (!trade.premium_per_contract || !Number.isFinite(trade.premium_per_contract)) {
        validationWarnings.push("Missing or invalid premium");
      }
      if (!trade.expiration) {
        validationWarnings.push("Missing expiration date");
      }

      const confidence = calculateTradeConfidence(trade, validationWarnings);

      if (DEBUG) {
        console.log(`[DEBUG] Page ${i + 1}: Confidence=${confidence}, warnings=${validationWarnings.length}`);
      }

      try {
        await ctx.runMutation(api.pendingTrades._insertPendingTrade, {
          userId: args.userId,
          importId: args.importId,
          trade: {
            underlying: trade.underlying,
            optionType: trade.optionType,
            strike: trade.strike,
            expiration: trade.expiration || Date.now(),
            action: trade.action,
            quantity_contracts: trade.quantity_contracts || 0,
            premium_per_contract: trade.premium_per_contract || 0,
            tradeTime: trade.tradeTime ?? Date.now(),
            brokerTradeNumber: trade.brokerTradeNumber,
          },
          confidence,
          warnings: validationWarnings,
          rawPageText: pageText.slice(0, 2000),
          parseMethod,
        });
        created++;
        if (DEBUG) {
          console.log(`[DEBUG] Page ${i + 1}: Successfully saved to pending_trades, created count:`, created);
        }
      } catch (e: any) {
        const errorMsg = `Failed to save: ${e.message}`;
        if (DEBUG) {
          console.log(`[DEBUG] Page ${i + 1}: Save failed:`, errorMsg);
        }
        errors.push({
          page: i + 1,
          message: errorMsg,
        });
      }
    }

    if (DEBUG) {
      console.log("[DEBUG] Heuristic extraction complete:", { created, errorsCount: errors.length });
    }
    return { created, errors };
  },
});

function calculateTradeConfidence(
  trade: {
    underlying: string;
    strike: number;
    expiration: number | null;
    quantity_contracts: number | null;
    premium_per_contract: number | null;
    tradeTime: number | null;
  },
  warnings: string[]
): "high" | "medium" | "low" {
  // High confidence: all fields present, no warnings
  if (
    warnings.length === 0 &&
    trade.quantity_contracts &&
    trade.quantity_contracts > 0 &&
    trade.premium_per_contract &&
    trade.premium_per_contract > 0 &&
    trade.tradeTime &&
    trade.expiration
  ) {
    return "high";
  }

  // Low confidence: major field missing or many warnings
  if (
    !trade.quantity_contracts ||
    trade.quantity_contracts <= 0 ||
    !trade.premium_per_contract ||
    warnings.length >= 3
  ) {
    return "low";
  }

  // Medium: some warnings but recoverable
  return "medium";
}
