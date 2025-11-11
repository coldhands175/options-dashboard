declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    text: string;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}

/**
 * Shared TypeScript types for Convex backend
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Union type for Convex context (can be either Query or Mutation context)
 */
export type ConvexContext = QueryCtx | MutationCtx;

/**
 * Document types for better type safety
 */
export type ProfileDoc = Doc<"profiles">;
export type StockTradeDoc = Doc<"stock_trades">;
export type OptionTradeDoc = Doc<"option_trades">;
export type ImportDoc = Doc<"imports">;
export type PendingTradeDoc = Doc<"pending_trades">;
export type StockWatchlistDoc = Doc<"stock_watchlist">;
export type MarketDataCacheDoc = Doc<"market_data_cache">;
export type ResearchReportDoc = Doc<"research_reports">;
export type StockNotesDoc = Doc<"stock_notes">;

/**
 * ID types for better type safety
 */
export type UserId = Id<"users">;
export type ProfileId = Id<"profiles">;
export type StockTradeId = Id<"stock_trades">;
export type OptionTradeId = Id<"option_trades">;
export type ImportId = Id<"imports">;
export type PendingTradeId = Id<"pending_trades">;
export type StockWatchlistId = Id<"stock_watchlist">;
export type ResearchReportId = Id<"research_reports">;

