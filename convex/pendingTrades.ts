import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Pending Trades Review Workflow
 *
 * This module manages the review workflow for trades parsed from PDFs.
 * Instead of inserting directly to the database, parsed trades go through:
 * 1. Parse → pending_trades table (status: "pending")
 * 2. User reviews in UI
 * 3. User approves → insert to option_trades (status: "inserted")
 * 4. User rejects → mark as rejected (status: "rejected")
 */

// ============================================================================
// QUERIES - Fetch pending trades for review
// ============================================================================

/**
 * Get all pending trades for the current user
 */
export const listPendingTrades = query({
  args: {
    importId: v.optional(v.id("imports")),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("inserted")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 50, 100);

    let query = ctx.db
      .query("pending_trades")
      .withIndex("by_user_and_status", (q) => {
        if (args.status) {
          return q.eq("userId", userId).eq("status", args.status);
        }
        return q.eq("userId", userId);
      })
      .order("desc");

    let results = await query.take(limit);

    // Filter by importId if provided
    if (args.importId) {
      results = results.filter((t) => t.importId === args.importId);
    }

    return results;
  },
});

/**
 * Get count of pending trades by status
 */
export const getPendingTradesCounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { pending: 0, approved: 0, rejected: 0, inserted: 0 };

    const all = await ctx.db
      .query("pending_trades")
      .withIndex("by_user_and_createdAt", (q) => q.eq("userId", userId))
      .collect();

    return {
      pending: all.filter((t) => t.status === "pending").length,
      approved: all.filter((t) => t.status === "approved").length,
      rejected: all.filter((t) => t.status === "rejected").length,
      inserted: all.filter((t) => t.status === "inserted").length,
    };
  },
});

/**
 * Get a single pending trade by ID
 */
export const getPendingTrade = query({
  args: { id: v.id("pending_trades") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) return null;

    return trade;
  },
});

// ============================================================================
// MUTATIONS - Review actions
// ============================================================================

/**
 * Approve a pending trade (marks as approved, ready for insertion)
 */
export const approvePendingTrade = mutation({
  args: { id: v.id("pending_trades") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) {
      throw new Error("Trade not found");
    }

    if (trade.status !== "pending") {
      throw new Error("Trade already processed");
    }

    // Insert to option_trades table
    const tradeId = await ctx.db.insert("option_trades", {
      userId,
      underlying: trade.underlying,
      optionType: trade.optionType,
      strike: trade.strike,
      expiration: trade.expiration,
      action: trade.action,
      quantity_contracts: trade.quantity_contracts,
      quantity_signed_contracts:
        trade.action === "BTO" || trade.action === "BTC"
          ? Math.abs(trade.quantity_contracts)
          : -Math.abs(trade.quantity_contracts),
      premium_per_contract: trade.premium_per_contract,
      notional: Math.abs(trade.quantity_contracts) * trade.premium_per_contract * 100,
      tradeTime: trade.tradeTime,
      brokerTradeNumber: trade.brokerTradeNumber,
    });

    // Update pending trade status
    await ctx.db.patch(args.id, {
      status: "inserted",
      reviewedAt: Date.now(),
      insertedTradeId: tradeId,
    });

    return { success: true, tradeId };
  },
});

/**
 * Approve multiple pending trades in batch
 */
export const approvePendingTradesBatch = mutation({
  args: { ids: v.array(v.id("pending_trades")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = { succeeded: 0, failed: 0, errors: [] as string[] };

    for (const id of args.ids) {
      try {
        await ctx.runMutation(api.pendingTrades.approvePendingTrade, { id });
        results.succeeded++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${id}: ${e.message}`);
      }
    }

    return results;
  },
});

/**
 * Reject a pending trade (user doesn't want to insert this)
 */
export const rejectPendingTrade = mutation({
  args: {
    id: v.id("pending_trades"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) {
      throw new Error("Trade not found");
    }

    if (trade.status !== "pending") {
      throw new Error("Trade already processed");
    }

    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewedAt: Date.now(),
      warnings: args.reason
        ? [...trade.warnings, `Rejected: ${args.reason}`]
        : trade.warnings,
    });

    return { success: true };
  },
});

/**
 * Edit a pending trade before approval
 */
export const editPendingTrade = mutation({
  args: {
    id: v.id("pending_trades"),
    updates: v.object({
      underlying: v.optional(v.string()),
      optionType: v.optional(v.union(v.literal("CALL"), v.literal("PUT"))),
      strike: v.optional(v.number()),
      expiration: v.optional(v.number()),
      action: v.optional(
        v.union(
          v.literal("BTO"),
          v.literal("BTC"),
          v.literal("STO"),
          v.literal("STC")
        )
      ),
      quantity_contracts: v.optional(v.number()),
      premium_per_contract: v.optional(v.number()),
      tradeTime: v.optional(v.number()),
      brokerTradeNumber: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) {
      throw new Error("Trade not found");
    }

    if (trade.status !== "pending") {
      throw new Error("Cannot edit processed trade");
    }

    // Apply updates
    await ctx.db.patch(args.id, {
      ...args.updates,
      userEdited: true,
    });

    return { success: true };
  },
});

/**
 * Delete a pending trade (removes from pending table)
 */
export const deletePendingTrade = mutation({
  args: { id: v.id("pending_trades") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.id);
    if (!trade || trade.userId !== userId) {
      throw new Error("Trade not found");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Auto-approve all high-confidence pending trades
 */
export const autoApproveHighConfidence = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const highConfidenceTrades = await ctx.db
      .query("pending_trades")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("confidence"), "high"))
      .collect();

    let approved = 0;
    let failed = 0;

    for (const trade of highConfidenceTrades) {
      try {
        await ctx.runMutation(api.pendingTrades.approvePendingTrade, {
          id: trade._id,
        });
        approved++;
      } catch (e) {
        failed++;
      }
    }

    return { approved, failed };
  },
});

// ============================================================================
// HELPERS - Confidence scoring
// ============================================================================

/**
 * Calculate confidence score for a parsed trade
 */
export function calculateConfidence(
  trade: {
    underlying: string;
    strike: number;
    expiration: number;
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
    trade.premium_per_contract &&
    trade.tradeTime
  ) {
    return "high";
  }

  // Low confidence: major field missing or many warnings
  if (
    !trade.quantity_contracts ||
    !trade.premium_per_contract ||
    warnings.length >= 3
  ) {
    return "low";
  }

  // Medium: some warnings but recoverable
  return "medium";
}

// ============================================================================
// INTERNAL MUTATIONS - Called by PDF parser
// ============================================================================

/**
 * Internal mutation to insert a pending trade (called by PDF parser action)
 */
export const _insertPendingTrade = mutation({
  args: {
    userId: v.id("users"),
    importId: v.id("imports"),
    trade: v.object({
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
    }),
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    warnings: v.array(v.string()),
    rawPageText: v.optional(v.string()),
    parseMethod: v.optional(v.union(v.literal("heuristic"), v.literal("llm"), v.literal("positional"))),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("pending_trades", {
      userId: args.userId,
      importId: args.importId,
      underlying: args.trade.underlying,
      optionType: args.trade.optionType,
      strike: args.trade.strike,
      expiration: args.trade.expiration,
      action: args.trade.action,
      quantity_contracts: args.trade.quantity_contracts,
      premium_per_contract: args.trade.premium_per_contract,
      tradeTime: args.trade.tradeTime,
      brokerTradeNumber: args.trade.brokerTradeNumber,
      status: "pending",
      confidence: args.confidence,
      warnings: args.warnings,
      parseMethod: args.parseMethod || "heuristic",
      rawPageText: args.rawPageText,
      createdAt: Date.now(),
    });

    return id;
  },
});
