export interface ParsedTradeDetails {
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
}

export interface ParsedTrade {
  pageNumber: number;
  line: string;
  trade: ParsedTradeDetails;
  warnings: string[];
}

export interface ParsedRowCell {
  text: string;
  x: number;
  column: string | null;
}

export interface ParsedRow {
  y: number;
  text: string;
  tradeLike: boolean;
  cells: ParsedRowCell[];
  guess: Record<string, unknown> | null;
}

export interface ParsedPage {
  pageNumber: number;
  headerDetected: boolean;
  columns: Record<string, { min: number; max: number; origin: string }>;
  rows: ParsedRow[];
  rawText: string;
  analysis: {
    warnings: string[];
    trade: ParsedTradeDetails | null;
  };
}

export interface ParsedPdfResult {
  fileName: string | null;
  pageCount: number;
  columnHints: string[];
  pages: ParsedPage[];
  trades: ParsedTrade[];
  normalizedLines: string[];
}

export declare function parsePdfBuffer(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  options?: { fileName?: string }
): Promise<ParsedPdfResult>;

export default parsePdfBuffer;

export declare const _internals: Record<string, unknown>;
