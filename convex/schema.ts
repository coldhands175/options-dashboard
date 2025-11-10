import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  option_trades: defineTable({
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(), // Unix timestamp in milliseconds
    action: v.union(
      v.literal("BTO"),
      v.literal("BTC"),
      v.literal("STO"),
      v.literal("STC")
    ),
    quantity_contracts: v.number(), // Absolute value
    quantity_signed_contracts: v.number(), // Signed value for aggregation
    premium_per_share: v.number(), // Premium per share (NOT per contract)
    notional: v.number(), // Total cost: premium_per_share × quantity_contracts × 100
    tradeTime: v.number(), // Unix timestamp in milliseconds
    brokerTradeNumber: v.optional(v.string()),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.string(), // For multi-user support
  }),
});
