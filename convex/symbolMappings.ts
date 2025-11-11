import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get symbol mapping for a user's symbol
 * Returns the confirmed mapping if it exists, null otherwise
 */
export const getSymbolMapping = query({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("symbol_mappings"),
      symbol: v.string(),
      confirmedSymbol: v.string(),
      name: v.string(),
      exchange: v.string(),
      region: v.string(),
      currency: v.string(),
      status: v.union(v.literal("pending"), v.literal("confirmed")),
      createdAt: v.number(),
      confirmedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const mapping = await ctx.db
      .query("symbol_mappings")
      .withIndex("by_user_and_symbol", (q) =>
        q.eq("userId", userId).eq("symbol", args.symbol.toUpperCase())
      )
      .first();

    return mapping ?? null;
  },
});

/**
 * List all pending symbol mappings (symbols awaiting user confirmation)
 */
export const listPendingMappings = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("symbol_mappings"),
      symbol: v.string(),
      confirmedSymbol: v.string(),
      name: v.string(),
      exchange: v.string(),
      region: v.string(),
      currency: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mappings = await ctx.db
      .query("symbol_mappings")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .collect();

    return mappings.map((m) => ({
      _id: m._id,
      symbol: m.symbol,
      confirmedSymbol: m.confirmedSymbol,
      name: m.name,
      exchange: m.exchange,
      region: m.region,
      currency: m.currency,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * Create or update a symbol mapping
 * If status is "confirmed", this finalizes the mapping
 */
export const upsertSymbolMapping = mutation({
  args: {
    symbol: v.string(),
    confirmedSymbol: v.string(),
    name: v.string(),
    exchange: v.string(),
    region: v.string(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed")),
  },
  returns: v.id("symbol_mappings"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const symbol = args.symbol.toUpperCase();

    // Check if mapping already exists
    const existing = await ctx.db
      .query("symbol_mappings")
      .withIndex("by_user_and_symbol", (q) =>
        q.eq("userId", userId).eq("symbol", symbol)
      )
      .first();

    if (existing) {
      // Update existing mapping
      await ctx.db.patch(existing._id, {
        confirmedSymbol: args.confirmedSymbol,
        name: args.name,
        exchange: args.exchange,
        region: args.region,
        currency: args.currency,
        status: args.status,
        confirmedAt: args.status === "confirmed" ? Date.now() : undefined,
      });
      return existing._id;
    } else {
      // Create new mapping
      return await ctx.db.insert("symbol_mappings", {
        userId,
        symbol,
        confirmedSymbol: args.confirmedSymbol,
        name: args.name,
        exchange: args.exchange,
        region: args.region,
        currency: args.currency,
        status: args.status,
        createdAt: Date.now(),
        confirmedAt: args.status === "confirmed" ? Date.now() : undefined,
      });
    }
  },
});

/**
 * Delete a symbol mapping (if user wants to start over)
 */
export const deleteSymbolMapping = mutation({
  args: { mappingId: v.id("symbol_mappings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mapping = await ctx.db.get(args.mappingId);
    if (!mapping) throw new Error("Mapping not found");
    if (mapping.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.mappingId);
    return null;
  },
});
