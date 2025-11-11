import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // User profiles - streamlined for trading platform
  profiles: defineTable({
    userId: v.id("users"), // Links to auth user
    username: v.string(), // Unique username (handle)
    displayName: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
    verified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"])
    .searchIndex("search_username", {
      searchField: "username",
      filterFields: ["verified"],
    })
    .searchIndex("search_displayName", {
      searchField: "displayName",
      filterFields: ["verified"],
    }),

  // Stock trades (equities)
  stock_trades: defineTable({
    userId: v.id("users"),
    symbol: v.string(), // uppercase ticker
    action: v.union(v.literal("BUY"), v.literal("SELL")),
    quantity_shares: v.number(), // positive input
    quantity_signed: v.number(), // derived: BUY => +, SELL => -
    price_per_share: v.number(),
    notional: v.number(), // abs(quantity_shares) * price_per_share
    tradeTime: v.number(), // ms epoch
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_user_and_time", ["userId", "tradeTime"])
    .index("by_symbol_and_time", ["symbol", "tradeTime"]),

  // Option trades (single-leg)
  option_trades: defineTable({
    userId: v.id("users"),
    underlying: v.string(), // uppercase underlying ticker
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(), // ms epoch (America/New_York reference)
    action: v.union(
      v.literal("BTO"),
      v.literal("BTC"),
      v.literal("STO"),
      v.literal("STC")
    ),
    quantity_contracts: v.number(), // positive input
    quantity_signed_contracts: v.number(), // derived: BTO/BTC => +, STO/STC => -
    premium_per_contract: v.number(),
    // TEMP: allow legacy 'multiplier' field to pass validation so we can migrate it away
    multiplier: v.optional(v.number()),
    notional: v.number(), // abs(contracts) * premium * 100
    tradeTime: v.number(),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // Broker-specific unique trade reference for deduping (e.g., "Trade number" from PDFs)
    brokerTradeNumber: v.optional(v.string()),
  })
    .index("by_user_and_time", ["userId", "tradeTime"])
    .index("by_underlying_and_time", ["underlying", "tradeTime"])
    .index(
      "by_underlying_and_type_and_strike_and_expiration_and_time",
      ["underlying", "optionType", "strike", "expiration", "tradeTime"]
    )
    .index("by_user_and_broker_trade_number", ["userId", "brokerTradeNumber"]),

  // Import jobs for PDF processing
  imports: defineTable({
    userId: v.id("users"),
    fileId: v.id("_storage"),
    fileSha256: v.optional(v.string()),
    fileName: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    batchId: v.optional(v.string()),
    // Add explicit createdAt for ordering and indexing (system _creationTime cannot be indexed)
    createdAt: v.optional(v.number()),
  })
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_fileSha", ["userId", "fileSha256"])
    .index("by_user_and_createdAt", ["userId", "createdAt"]),

  // Pending trades awaiting review before insertion
  pending_trades: defineTable({
    userId: v.id("users"),
    importId: v.id("imports"), // Link back to import job

    // Trade data (option trades for now)
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
    action: v.union(
      v.literal("BTO"),
      v.literal("BTC"),
      v.literal("STO"),
      v.literal("STC")
    ),
    quantity_contracts: v.number(),
    premium_per_contract: v.number(),
    tradeTime: v.number(),
    brokerTradeNumber: v.optional(v.string()),

    // Review metadata
    status: v.union(
      v.literal("pending"),    // Awaiting review
      v.literal("approved"),   // Approved, ready to insert
      v.literal("rejected"),   // Rejected by user
      v.literal("inserted")    // Successfully inserted to main table
    ),
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    warnings: v.array(v.string()),
    parseMethod: v.union(v.literal("heuristic"), v.literal("llm"), v.literal("positional")), // How it was parsed

    // Original data for reference
    rawPageText: v.optional(v.string()), // Original PDF page text

    // Timestamps
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    insertedTradeId: v.optional(v.id("option_trades")),

    // Optional: allow user edits before approval
    userEdited: v.optional(v.boolean()),
  })
    .index("by_user_and_status", ["userId", "status", "createdAt"])
    .index("by_import", ["importId"])
    .index("by_user_and_createdAt", ["userId", "createdAt"]),

  // Stock Watchlist - Track stocks for research and monitoring
  stock_watchlist: defineTable({
    userId: v.id("users"),
    symbol: v.string(), // Uppercase ticker symbol
    source: v.union(v.literal("manual"), v.literal("trade")), // How it was added
    isActive: v.boolean(), // Can be soft-deleted
    addedAt: v.number(),
  })
    .index("by_user_and_symbol", ["userId", "symbol"])
    .index("by_user_and_addedAt", ["userId", "addedAt"])
    .index("by_symbol", ["symbol"]),

  // Market Data Cache - Cache API responses to reduce costs
  market_data_cache: defineTable({
    symbol: v.string(),
    dataType: v.union(
      v.literal("quote"),
      v.literal("fundamentals"),
      v.literal("news")
    ),
    data: v.any(), // JSON blob from API
    fetchedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_symbol_and_type", ["symbol", "dataType"])
    .index("by_expiresAt", ["expiresAt"]), // For cleanup jobs

  // AI Research Reports - Store Parallel.ai generated analysis
  research_reports: defineTable({
    userId: v.id("users"),
    symbol: v.string(),
    content: v.string(), // Full markdown/text report
    outlook: v.optional(v.string()), // Summary outlook (bullish/bearish/neutral)
    headwinds: v.array(v.string()), // Array of headwind descriptions
    tailwinds: v.array(v.string()), // Array of tailwind descriptions
    generatedAt: v.number(),
  })
    .index("by_user_and_symbol", ["userId", "symbol"])
    .index("by_symbol_and_generatedAt", ["symbol", "generatedAt"]),

  // Stock Notes - User's personal notes per stock
  stock_notes: defineTable({
    userId: v.id("users"),
    symbol: v.string(),
    content: v.string(), // User's notes (markdown)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_symbol", ["userId", "symbol"]),

  // Symbol Mappings - User-confirmed stock symbol to exchange/market mappings
  symbol_mappings: defineTable({
    userId: v.id("users"),
    symbol: v.string(), // The ticker symbol as entered (e.g., "RY")
    confirmedSymbol: v.string(), // The full symbol with exchange (e.g., "RY" or "RY.TO")
    name: v.string(), // Company name
    exchange: v.string(), // Exchange code (e.g., "NYSE", "TSX")
    region: v.string(), // Region (e.g., "United States", "Canada")
    currency: v.string(), // Trading currency
    status: v.union(
      v.literal("pending"),    // Awaiting user confirmation
      v.literal("confirmed")   // User has confirmed this mapping
    ),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_user_and_symbol", ["userId", "symbol"])
    .index("by_user_and_status", ["userId", "status"]),

  // Greeks Snapshots - Historical Greek values for option positions
  greeks_snapshots: defineTable({
    userId: v.id("users"),
    tradeId: v.optional(v.id("option_trades")), // Link to specific trade (optional for portfolio-level)
    underlying: v.string(), // Underlying ticker symbol
    optionType: v.optional(v.union(v.literal("CALL"), v.literal("PUT"))), // null for portfolio-level
    strike: v.optional(v.number()),
    expiration: v.optional(v.number()),
    calculatedAt: v.number(), // When these Greeks were calculated
    stockPrice: v.number(), // Stock price at calculation time
    impliedVolatility: v.number(), // IV used for calculation
    // Greeks
    delta: v.number(),
    gamma: v.number(),
    theta: v.number(),
    vega: v.number(),
    rho: v.number(),
    // Additional metrics
    theoreticalPrice: v.number(),
    intrinsicValue: v.number(),
    extrinsicValue: v.number(),
    daysToExpiration: v.number(),
    // Snapshot type
    snapshotType: v.union(
      v.literal("position"),    // Individual position
      v.literal("portfolio")    // Aggregate portfolio
    ),
  })
    .index("by_user_and_time", ["userId", "calculatedAt"])
    .index("by_trade", ["tradeId"])
    .index("by_underlying", ["underlying"])
    .index("by_user_and_type_and_time", ["userId", "snapshotType", "calculatedAt"]),
});
