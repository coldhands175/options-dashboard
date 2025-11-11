#!/usr/bin/env node

/**
 * Prototype positional PDF extractor (CLI wrapper).
 *
 * Usage:
 *   node scripts/pdf-positional-inspect.mjs "./Q1 Trades-1 2025.pdf"
 *
 * Use --json (and optional --out) to emit structured JSON, or --lines/--lines-out
 * to dump normalized trade lines suitable for `createOptionTradesFromText`.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parsePdfBuffer } from "../lib/pdf/positionalParser.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let inputPath = null;
let format = "pretty";
let outputFile = null;
let showLines = false;
let linesFile = null;

while (args.length > 0) {
  const arg = args.shift();
  if (arg === "--json") {
    format = "json";
  } else if (arg.startsWith("--json=")) {
    format = "json";
    outputFile = arg.slice("--json=".length);
  } else if (arg === "--pretty") {
    format = "pretty";
  } else if (arg === "--out" || arg === "-o") {
    if (args.length === 0) {
      console.error("Missing value for --out option.");
      process.exit(1);
    }
    outputFile = args.shift();
  } else if (arg.startsWith("--out=")) {
    outputFile = arg.slice("--out=".length);
  } else if (arg === "--lines" || arg === "-l") {
    showLines = true;
  } else if (arg === "--lines-out" || arg === "-L") {
    if (args.length === 0) {
      console.error("Missing value for --lines-out option.");
      process.exit(1);
    }
    linesFile = args.shift();
    showLines = true;
  } else if (arg.startsWith("--lines-out=")) {
    linesFile = arg.slice("--lines-out=".length);
    showLines = true;
  } else if (!inputPath) {
    inputPath = arg;
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}

if (!inputPath) {
  console.error(
    "Usage: node scripts/pdf-positional-inspect.mjs [--json[=<file>]] [--out <file>] [--lines] [--lines-out <file>] <path-to-broker-pdf>"
  );
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ PDF not found at ${resolvedPath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(resolvedPath);
const result = await parsePdfBuffer(buffer, { fileName: path.basename(resolvedPath) });

const isJsonOutput = format === "json";
const log = (...values) => {
  if (!isJsonOutput) console.log(...values);
};

if (isJsonOutput && linesFile && result.normalizedLines.length > 0) {
  const targetPath = path.resolve(process.cwd(), linesFile);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, result.normalizedLines.join("\n") + "\n", "utf8");
}

if (isJsonOutput) {
  const payload = JSON.stringify(
    {
      fileName: result.fileName,
      pageCount: result.pageCount,
      columnHints: result.columnHints,
      pages: result.pages,
      trades: result.trades,
      normalizedLines: result.normalizedLines,
    },
    null,
    2
  );
  if (outputFile) {
    const targetPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, `${payload}\n`, "utf8");
  } else {
    console.log(payload);
  }
  process.exit(0);
}

log(`\n📄 File: ${result.fileName ?? path.basename(resolvedPath)}`);
log(`📄 Pages: ${result.pageCount}`);

for (const page of result.pages) {
  log(`\n────────── Page ${page.pageNumber} ──────────`);
  if (!page.headerDetected) {
    log("⚠️  Column header row not detected. Showing raw positional rows.");
  } else {
    const columns = Object.keys(page.columns);
    log(`Columns detected: ${columns.length > 0 ? columns.join(", ") : "(none)"}`);
  }

  for (const row of page.rows) {
    if (row.cells.length === 0) continue;
    const marker = row.tradeLike ? "→" : " ";
    log(`\n${marker} Row @ y=${row.y.toFixed(2)} (${row.text})`);
    if (row.tradeLike && row.guess) {
      log(`   Guess: ${JSON.stringify(row.guess, (_, v) => (typeof v === "number" ? Number(v.toFixed(4)) : v))}`);
    }
    for (const cell of row.cells) {
      const colName = cell.column ? `[${cell.column}]` : "";
      log(`   x=${cell.x.toFixed(2)}${colName.padEnd(12)} "${cell.text}"`);
    }
  }

  if (page.analysis) {
    const { trade, warnings } = page.analysis;
    if (trade) {
      log(
        `\n   Parsed trade: ${trade.action} ${trade.quantity_contracts ?? "?"} ${trade.underlying} ${trade.strike} ${trade.optionType}`
      );
      log(
        `   Premium: ${trade.premium_per_contract ?? "?"}, Net: ${trade.notional ?? "?"}, Trade #${trade.brokerTradeNumber ?? "-"}`
      );
    } else {
      log("   No structured trade parsed.");
    }
    warnings.forEach((warning) => log(`   ⚠️  ${warning}`));
  }
}

if (result.normalizedLines.length > 0) {
  if (showLines) {
    log("\nNormalized trade lines:");
    result.trades.forEach((entry) => {
      log(`   [p${entry.pageNumber}] ${entry.line}`);
    });
  }
  if (linesFile) {
    const targetPath = path.resolve(process.cwd(), linesFile);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, result.normalizedLines.join("\n") + "\n", "utf8");
    log(`\nNormalized lines written to ${targetPath}`);
  }
}

log("\nDone.\n");
