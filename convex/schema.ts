import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Individual trades/transactions table
  trades: defineTable({
    // User relationship
    userId: v.string(), // Will be replaced with proper auth later
    
    // Trade identification  
    positionId: v.optional(v.string()), // Links to position for grouping
    transactionDate: v.string(), // ISO date string (YYYY-MM-DD)
    
    // Trade details
    tradeType: v.union(
      v.literal("BUY_TO_OPEN"),
      v.literal("SELL_TO_OPEN"), 
      v.literal("BUY_TO_CLOSE"),
      v.literal("SELL_TO_CLOSE"),
      v.literal("ASSIGNMENT"),
      v.literal("EXPIRATION")
    ),
    
    // Contract details
    symbol: v.string(),
    contractType: v.union(v.literal("CALL"), v.literal("PUT")),
    quantity: v.number(), // Negative for sales (SELL_*), positive for purchases (BUY_*)
    expirationDate: v.string(), // ISO date string (YYYY-MM-DD)
    strikePrice: v.number(),
    
    // Financial details
    premium: v.number(), // Premium per contract (always positive)
    bookCost: v.number(), // Total cost/proceeds (quantity * premium * 100 + commission)
    commission: v.optional(v.number()),
    fees: v.optional(v.number()),
    
    // Status and notes
    status: v.union(
      v.literal("EXECUTED"),
      v.literal("CANCELLED"), 
      v.literal("PENDING")
    ),
    notes: v.optional(v.string()),
  })
  .index("by_user", ["userId"])
  .index("by_symbol", ["symbol"])
  .index("by_position", ["positionId"])
  .index("by_user_symbol", ["userId", "symbol"])
  .index("by_transaction_date", ["transactionDate"]),

  // Computed positions table (aggregated view)
  positions: defineTable({
    // User relationship
    userId: v.string(),
    
    // Position identification
    positionKey: v.string(), // Unique key like "AAPL-2025-01-17-200-CALL"
    
    // Contract details
    symbol: v.string(),
    strikePrice: v.number(),
    expirationDate: v.string(), // ISO date string
    contractType: v.union(v.literal("CALL"), v.literal("PUT")),
    
    // Strategy and status
    strategy: v.union(
      v.literal("SINGLE_LEG"),
      v.literal("COVERED_CALL"),
      v.literal("CASH_SECURED_PUT"),
      v.literal("VERTICAL_SPREAD"),
      v.literal("IRON_CONDOR")
    ),
    status: v.union(
      v.literal("OPEN"),
      v.literal("CLOSED"), 
      v.literal("EXPIRED"),
      v.literal("ASSIGNED")
    ),
    
    // Dates
    openDate: v.string(), // Date position was first opened
    closeDate: v.optional(v.string()), // Date position was closed
    
    // Aggregated financials
    netQuantity: v.number(), // Current number of contracts (+1 long, -1 short)
    totalPremium: v.number(), // Net premium received (positive) or paid (negative)
    totalCommission: v.number(), // Total commissions paid
    totalFees: v.number(), // Total fees paid
    
    // P&L calculations
    realizedPL: v.optional(v.number()), // For closed positions
    unrealizedPL: v.optional(v.number()), // For open positions (requires market data)
    
    // Additional metrics
    daysToExpiration: v.optional(v.number()), // For open positions
    
    // Metadata
    lastUpdated: v.string(), // When position was last recalculated
    createdAt: v.string(),
  })
  .index("by_user", ["userId"])
  .index("by_symbol", ["symbol"])
  .index("by_status", ["status"])
  .index("by_user_status", ["userId", "status"])
  .index("by_user_symbol", ["userId", "symbol"])
  .index("by_position_key", ["positionKey"])
  .index("by_expiration", ["expirationDate"]),

  // Document processing table
  documents: defineTable({
    userId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.string(), // Convex file storage ID
    status: v.union(
      v.literal("UPLOADING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    errorMessage: v.optional(v.string()),
    extractedTradesCount: v.optional(v.number()),
    // Document classification fields
    documentType: v.optional(v.union(
      v.literal("BROKERAGE_STATEMENT"),
      v.literal("TRADE_CONFIRMATION"),
      v.literal("TAX_DOCUMENT"),
      v.literal("PORTFOLIO_SUMMARY"),
      v.literal("TRADE_HISTORY"),
      v.literal("OTHER")
    )),
    broker: v.optional(v.union(
      v.literal("TD_AMERITRADE"),
      v.literal("CHARLES_SCHWAB"),
      v.literal("E_TRADE"),
      v.literal("FIDELITY"),
      v.literal("INTERACTIVE_BROKERS"),
      v.literal("ROBINHOOD"),
      v.literal("TASTYWORKS"),
      v.literal("WEBULL"),
      v.literal("OTHER"),
      v.literal("UNKNOWN")
    )),
    classificationConfidence: v.optional(v.number()), // AI classification confidence (0.0-1.0)
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_user", ["userId"])
  .index("by_status", ["status"]),

  // Enhanced user table with authentication and roles
  users: defineTable({
    // Core identity
    email: v.string(),
    xanoUserId: v.optional(v.string()), // Link to Xano user ID
    
    // Profile information
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()), // Full name or display name
    
    // Authentication and authorization
    role: v.union(
      v.literal("ADMIN"),
      v.literal("USER")
    ),
    isActive: v.boolean(),
    
    // Security and session management
    lastLogin: v.optional(v.string()),
    loginCount: v.optional(v.number()),
    
    // Preferences and settings
    preferences: v.optional(v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
      notifications: v.optional(v.boolean()),
      defaultBroker: v.optional(v.string()),
    })),
    
    // Metadata
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_email", ["email"])
  .index("by_xano_user_id", ["xanoUserId"])
  .index("by_role", ["role"])
  .index("by_active_users", ["isActive"]),
});
