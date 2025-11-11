import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/**
 * Add a stock to the watchlist
 */
export const addToWatchlist = mutation({
  args: {
    symbol: v.string(),
    source: v.union(v.literal("manual"), v.literal("trade")),
  },
  returns: v.object({
    watchlistId: v.string(),
    symbol: v.string(),
    alreadyExists: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const symbol = args.symbol.toUpperCase();

    // Check if already exists
    const existing = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();

    if (existing) {
      // If it was soft-deleted, reactivate it
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true });
      }

      return {
        watchlistId: existing._id,
        symbol,
        alreadyExists: true,
      };
    }

    // Add new entry
    const watchlistId = await ctx.db.insert("stock_watchlist", {
      userId,
      symbol,
      source: args.source,
      isActive: true,
      addedAt: Date.now(),
    });

    return {
      watchlistId,
      symbol,
      alreadyExists: false,
    };
  },
});

/**
 * Remove a stock from the watchlist (soft delete)
 */
export const removeFromWatchlist = mutation({
  args: { symbol: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const symbol = args.symbol.toUpperCase();

    const existing = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();

    if (!existing) {
      return { success: false };
    }

    // Soft delete
    await ctx.db.patch(existing._id, { isActive: false });

    return { success: true };
  },
});

/**
 * Get all watchlist stocks with latest market data
 */
export const listWatchlist = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      symbol: v.string(),
      source: v.union(v.literal("manual"), v.literal("trade")),
      addedAt: v.number(),
      // Enriched data from cache (if available)
      price: v.union(v.number(), v.null()),
      changePercent: v.union(v.number(), v.null()),
      hasActivePositions: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all active watchlist entries
    const entries = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_addedAt", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Enrich with market data and position info
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        // Get cached quote if available
        let price: number | null = null;
        let changePercent: number | null = null;

        const cachedQuote = await ctx.db
          .query("market_data_cache")
          .withIndex("by_symbol_and_type", (q) =>
            q.eq("symbol", entry.symbol).eq("dataType", "quote")
          )
          .first();

        if (cachedQuote && cachedQuote.expiresAt > Date.now()) {
          price = cachedQuote.data.price;
          changePercent = cachedQuote.data.changePercent;
        }

        // Check if user has active option positions for this underlying
        const hasPositions = await ctx.db
          .query("option_trades")
          .withIndex("by_underlying_and_time", (q) => q.eq("underlying", entry.symbol))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        return {
          _id: entry._id,
          symbol: entry.symbol,
          source: entry.source,
          addedAt: entry.addedAt,
          price,
          changePercent,
          hasActivePositions: !!hasPositions,
        };
      })
    );

    // Sort by addedAt descending (most recent first)
    return enriched.sort((a, b) => b.addedAt - a.addedAt);
  },
});

/**
 * Check if a symbol is in the user's active watchlist
 */
export const isInWatchlist = query({
  args: { symbol: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const symbol = args.symbol.toUpperCase();

    const entry = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return !!entry;
  },
});

/**
 * Auto-track a stock when a trade is created
 * (Internal mutation called by trades.ts)
 */
export const autoTrackFromTrade = internalMutation({
  args: { userId: v.id("users"), underlying: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const symbol = args.underlying.toUpperCase();

    // Check if already in watchlist
    const existing = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", args.userId).eq("symbol", symbol))
      .first();

    if (existing) {
      // Reactivate if soft-deleted
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true });
      }
      return null;
    }

    // Add to watchlist
    await ctx.db.insert("stock_watchlist", {
      userId: args.userId,
      symbol,
      source: "trade",
      isActive: true,
      addedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get watchlist stats
 */
export const getWatchlistStats = query({
  args: {},
  returns: v.object({
    totalStocks: v.number(),
    manuallyAdded: v.number(),
    fromTrades: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalStocks: 0,
        manuallyAdded: 0,
        fromTrades: 0,
      };

    const entries = await ctx.db
      .query("stock_watchlist")
      .withIndex("by_user_and_addedAt", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const manuallyAdded = entries.filter((e) => e.source === "manual").length;
    const fromTrades = entries.filter((e) => e.source === "trade").length;

    return {
      totalStocks: entries.length,
      manuallyAdded,
      fromTrades,
    };
  },
});

/**
 * Sync watchlist with active option positions
 * Automatically adds all unique underlyings from active positions to watchlist
 */
export const syncWatchlistWithPositions = mutation({
  args: {},
  returns: v.object({
    added: v.number(),
    reactivated: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all option trades
    const trades = await ctx.db
      .query("option_trades")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .collect();

    // Group by underlying and calculate net positions
    const positionsByUnderlying = new Map<string, number>();
    for (const trade of trades) {
      const current = positionsByUnderlying.get(trade.underlying) || 0;
      positionsByUnderlying.set(trade.underlying, current + trade.quantity_signed_contracts);
    }

    // Filter to only underlyings with active positions (net != 0)
    const activeUnderlyings = Array.from(positionsByUnderlying.entries())
      .filter(([_, net]) => net !== 0)
      .map(([underlying]) => underlying);

    let added = 0;
    let reactivated = 0;

    // Add each underlying to watchlist
    for (const underlying of activeUnderlyings) {
      const symbol = underlying.toUpperCase();

      // Check if already exists
      const existing = await ctx.db
        .query("stock_watchlist")
        .withIndex("by_user_and_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
        .first();

      if (existing) {
        // If it was soft-deleted, reactivate it
        if (!existing.isActive) {
          await ctx.db.patch(existing._id, { isActive: true });
          reactivated++;
        }
      } else {
        // Add new entry
        await ctx.db.insert("stock_watchlist", {
          userId,
          symbol,
          source: "trade",
          isActive: true,
          addedAt: Date.now(),
        });
        added++;
      }
    }

    return {
      added,
      reactivated,
      total: activeUnderlyings.length,
    };
  },
});
