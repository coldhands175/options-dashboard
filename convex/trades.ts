import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// Utility: normalize ticker to uppercase, trimmed
function normalizeTicker(t: string): string {
  return t.trim().toUpperCase();
}

// Compute signed quantities based on action
function signedShares(action: "BUY" | "SELL", qty: number): number {
  return action === "BUY" ? Math.abs(qty) : -Math.abs(qty);
}

function signedContracts(action: "BTO" | "BTC" | "STO" | "STC", qty: number): number {
  // Buys increase (BTO/BTC => +), sells reduce (STO/STC => -)
  return action === "BTO" || action === "BTC" ? Math.abs(qty) : -Math.abs(qty);
}

// Compute 3rd Friday of a given month/year in New York time (approximation)
function thirdFridayEpochMs(monthIndex0: number, year: number): number {
  const first = new Date(year, monthIndex0, 1);
  const dow = first.getDay(); // 0..6
  const toFirstFriday = (5 - dow + 7) % 7; // Friday=5
  const firstFriday = 1 + toFirstFriday;
  const thirdFriday = firstFriday + 14;
  const d = new Date(year, monthIndex0, thirdFriday, 17, 0, 0, 0); // 5pm local
  return d.getTime();
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export const createStockTrade = mutation({
  args: {
    symbol: v.string(),
    action: v.union(v.literal("BUY"), v.literal("SELL")),
    quantity_shares: v.number(), // positive
    price_per_share: v.number(), // > 0
    tradeTime: v.optional(v.number()), // ms epoch, default now
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("stock_trades"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const qty = Math.abs(args.quantity_shares);
    if (qty <= 0) throw new Error("Quantity must be > 0");
    if (args.price_per_share <= 0) throw new Error("Price per share must be > 0");

    const symbol = normalizeTicker(args.symbol);
    const qSigned = signedShares(args.action, qty);
    const notional = Math.abs(qty) * args.price_per_share;
    const tradeTime = args.tradeTime ?? Date.now();

    const id = await ctx.db.insert("stock_trades", {
      userId,
      symbol,
      action: args.action,
      quantity_shares: qty,
      quantity_signed: qSigned,
      price_per_share: args.price_per_share,
      notional,
      tradeTime,
      accountTag: args.accountTag,
      notes: args.notes,
      tags: args.tags,
    });

    return id;
  },
});

export const createOptionTrade = mutation({
  args: {
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(), // ms epoch (NY time reference)
    action: v.union(v.literal("BTO"), v.literal("BTC"), v.literal("STO"), v.literal("STC")),
    quantity_contracts: v.number(), // positive
    premium_per_contract: v.number(), // > 0
    tradeTime: v.optional(v.number()),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("option_trades"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const qty = Math.abs(args.quantity_contracts);
    if (qty <= 0) throw new Error("Contracts must be > 0");
    if (args.premium_per_contract <= 0) throw new Error("Premium must be > 0");

    const underlying = normalizeTicker(args.underlying);
    const qSigned = signedContracts(args.action, qty);
    const multiplier = 100;
    const notional = Math.abs(qty) * args.premium_per_contract * multiplier;
    const tradeTime = args.tradeTime ?? Date.now();

    const id = await ctx.db.insert("option_trades", {
      userId,
      underlying,
      optionType: args.optionType,
      strike: args.strike,
      expiration: args.expiration,
      action: args.action,
      quantity_contracts: qty,
      quantity_signed_contracts: qSigned,
      premium_per_contract: args.premium_per_contract,
      notional,
      tradeTime,
      accountTag: args.accountTag,
      notes: args.notes,
      tags: args.tags,
    });

    return id;
  },
});

// List current user's transactions (both types), newest first, with a discriminator
export const listUserTransactions = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.object({
      // A cursor indicating the last seen item time and type
      lastTime: v.number(),
      lastType: v.union(v.literal("stock"), v.literal("option")),
    })),
  },
  returns: v.object({
    items: v.array(v.union(
      v.object({
        kind: v.literal("stock"),
        _id: v.id("stock_trades"),
        tradeTime: v.number(),
        symbol: v.string(),
        action: v.union(v.literal("BUY"), v.literal("SELL")),
        quantity_signed: v.number(),
        price_per_share: v.number(),
        notional: v.number(),
        accountTag: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
      v.object({
        kind: v.literal("option"),
        _id: v.id("option_trades"),
        tradeTime: v.number(),
        underlying: v.string(),
        optionType: v.union(v.literal("CALL"), v.literal("PUT")),
        strike: v.number(),
        expiration: v.number(),
        action: v.union(v.literal("BTO"), v.literal("BTC"), v.literal("STO"), v.literal("STC")),
        quantity_signed_contracts: v.number(),
        premium_per_contract: v.number(),
        notional: v.number(),
        accountTag: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    )),
    nextCursor: v.optional(v.object({ lastTime: v.number(), lastType: v.union(v.literal("stock"), v.literal("option")) })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.min(args.limit ?? 30, 100);

    // Fetch recent stock and option trades
    let stockQ = ctx.db
      .query("stock_trades")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .order("desc");

    let optionQ = ctx.db
      .query("option_trades")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.cursor) {
      // Apply time filter to both; simple cursor strategy: fetch items strictly older than lastTime
      stockQ = stockQ.filter((q) => q.lt(q.field("tradeTime"), args.cursor!.lastTime));
      optionQ = optionQ.filter((q) => q.lt(q.field("tradeTime"), args.cursor!.lastTime));
    }

    const [stockTrades, optionTrades] = await Promise.all([
      stockQ.take(limit),
      optionQ.take(limit),
    ]);

    // Merge and sort by tradeTime desc
    const merged = [
      ...stockTrades.map((t) => ({
        kind: "stock" as const,
        _id: t._id,
        tradeTime: t.tradeTime,
        symbol: t.symbol,
        action: t.action,
        quantity_signed: t.quantity_signed,
        price_per_share: t.price_per_share,
        notional: t.notional,
        accountTag: t.accountTag,
        notes: t.notes,
      })),
      ...optionTrades.map((t) => ({
        kind: "option" as const,
        _id: t._id,
        tradeTime: t.tradeTime,
        underlying: t.underlying,
        optionType: t.optionType,
        strike: t.strike,
        expiration: t.expiration,
        action: t.action,
        quantity_signed_contracts: t.quantity_signed_contracts,
        premium_per_contract: t.premium_per_contract,
        notional: t.notional,
        accountTag: t.accountTag,
        notes: t.notes,
      }))
    ].sort((a, b) => b.tradeTime - a.tradeTime);

    const items = merged.slice(0, limit);
    const last = items[items.length - 1];
    const nextCursor = last ? { lastTime: last.tradeTime, lastType: last.kind } : undefined;

    return { items, nextCursor };
  },
});

// Active option positions for current user: group by contract key and sum; filter nonzero and not expired
export const listActiveOptionPositions = query({
  args: {},
  returns: v.array(v.object({
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
    netContracts: v.number(),
    side: v.union(v.literal("Long"), v.literal("Short")),
    openedAt: v.number(),
    latestTradeTime: v.number(),
    premium_per_contract: v.number(), // Weighted average premium
    notional: v.number(), // Total book value
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const rows = await ctx.db
      .query("option_trades")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .collect();

    // Group by contract key
    const map = new Map<string, {
      underlying: string;
      optionType: "CALL"|"PUT";
      strike: number;
      expiration: number;
      total: number;
      earliest: number;
      latest: number;
      totalNotional: number; // Sum of all trade notionals
      totalPremiumWeighted: number; // Sum of (premium * abs(quantity))
      totalQuantityAbs: number; // Sum of abs(quantity) for weighted average
    }>();

    for (const r of rows) {
      const key = `${r.underlying}|${r.optionType}|${r.strike}|${r.expiration}`;
      const prev = map.get(key);
      const total = (prev?.total ?? 0) + r.quantity_signed_contracts;
      const latest = Math.max(prev?.latest ?? 0, r.tradeTime);
      const earliest = Math.min(prev?.earliest ?? Number.POSITIVE_INFINITY, r.tradeTime);

      // Accumulate notional (book value) and weighted premium
      const absQty = Math.abs(r.quantity_signed_contracts);
      const totalNotional = (prev?.totalNotional ?? 0) + r.notional;
      const totalPremiumWeighted = (prev?.totalPremiumWeighted ?? 0) + (r.premium_per_contract * absQty);
      const totalQuantityAbs = (prev?.totalQuantityAbs ?? 0) + absQty;

      map.set(key, {
        underlying: r.underlying,
        optionType: r.optionType,
        strike: r.strike,
        expiration: r.expiration,
        total,
        earliest,
        latest,
        totalNotional,
        totalPremiumWeighted,
        totalQuantityAbs
      });
    }

    const positions = Array.from(map.values())
      .filter((p) => p.total !== 0 && p.expiration > now)
      .map((p) => ({
        underlying: p.underlying,
        optionType: p.optionType,
        strike: p.strike,
        expiration: p.expiration,
        netContracts: p.total,
        side: p.total > 0 ? ("Long" as const) : ("Short" as const),
        openedAt: isFinite(p.earliest) ? p.earliest : now,
        latestTradeTime: p.latest,
        premium_per_contract: p.totalQuantityAbs > 0 ? p.totalPremiumWeighted / p.totalQuantityAbs : 0,
        notional: Math.abs(p.totalNotional),
      }))
      .sort((a, b) =>
        a.underlying.localeCompare(b.underlying) ||
        (a.optionType === b.optionType ? 0 : a.optionType === "CALL" ? -1 : 1) ||
        a.strike - b.strike ||
        a.expiration - b.expiration
      );

    return positions;
  },
});

// Detailed trades for a specific option contract for the current user
export const getOptionContractDetails = query({
  args: {
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
  },
  returns: v.object({
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
    netContracts: v.number(),
    side: v.union(v.literal("Long"), v.literal("Short")),
    trades: v.array(v.object({
      _id: v.id("option_trades"),
      action: v.union(v.literal("BTO"), v.literal("BTC"), v.literal("STO"), v.literal("STC")),
      quantity_signed_contracts: v.number(),
      quantity_contracts: v.number(),
      premium_per_contract: v.number(),
      notional: v.number(),
      tradeTime: v.number(),
      accountTag: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Fetch trades for this contract using the compound index
    const rows = await ctx.db
      .query("option_trades")
      .withIndex(
        "by_underlying_and_type_and_strike_and_expiration_and_time",
        (q) => q
          .eq("underlying", args.underlying.toUpperCase())
          .eq("optionType", args.optionType)
          .eq("strike", args.strike)
          .eq("expiration", args.expiration)
      )
      .order("desc")
      .collect();

    // Filter to current user
    const mine = rows.filter((r) => r.userId === userId);

    let total = 0;
    for (const r of mine) total += r.quantity_signed_contracts;

    return {
      underlying: args.underlying.toUpperCase(),
      optionType: args.optionType,
      strike: args.strike,
      expiration: args.expiration,
      netContracts: total,
      side: total > 0 ? ("Long" as const) : ("Short" as const),
      trades: mine.map((t) => ({
        _id: t._id,
        action: t.action,
        quantity_signed_contracts: t.quantity_signed_contracts,
        quantity_contracts: t.quantity_contracts,
        premium_per_contract: t.premium_per_contract,
        notional: t.notional,
        tradeTime: t.tradeTime,
        accountTag: t.accountTag,
        notes: t.notes,
      })),
    };
  },
});

// Update an existing option trade (edit transaction fields)
export const updateOptionTrade = mutation({
  args: {
    tradeId: v.id("option_trades"),
    action: v.optional(v.union(v.literal("BTO"), v.literal("BTC"), v.literal("STO"), v.literal("STC"))),
    quantity_contracts: v.optional(v.number()), // positive number; absolute value will be used
    premium_per_contract: v.optional(v.number()), // > 0
    tradeTime: v.optional(v.number()), // ms epoch
    accountTag: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.tradeId);
    if (!existing) throw new Error("Trade not found");
    if (existing.userId !== userId) throw new Error("Not authorized to edit this trade");

    // Prepare updates and recompute derived fields
    const newAction = args.action ?? existing.action;
    const newQty = args.quantity_contracts !== undefined ? Math.abs(args.quantity_contracts) : existing.quantity_contracts;
    const newPrem = args.premium_per_contract !== undefined ? Math.abs(args.premium_per_contract) : existing.premium_per_contract;

    if (!(newQty > 0)) throw new Error("Contracts must be > 0");
    if (!(newPrem > 0)) throw new Error("Premium must be > 0");

    const updates: Partial<typeof existing> = {} as any;
    if (args.action !== undefined) updates.action = newAction;
    if (args.quantity_contracts !== undefined) updates.quantity_contracts = newQty;
    if (args.premium_per_contract !== undefined) updates.premium_per_contract = newPrem;

    updates.quantity_signed_contracts = signedContracts(newAction, newQty);
    updates.notional = Math.abs(newQty) * newPrem * 100;

    if (args.tradeTime !== undefined) updates.tradeTime = args.tradeTime;
    if (args.accountTag !== undefined) updates.accountTag = args.accountTag ?? undefined;
    if (args.notes !== undefined) updates.notes = args.notes ?? undefined;

    await ctx.db.patch(args.tradeId, updates as any);
    return null;
  },
});

// Update an existing stock trade
export const updateStockTrade = mutation({
  args: {
    tradeId: v.id("stock_trades"),
    action: v.optional(v.union(v.literal("BUY"), v.literal("SELL"))),
    quantity_shares: v.optional(v.number()), // positive number; absolute value will be used
    price_per_share: v.optional(v.number()), // > 0
    tradeTime: v.optional(v.number()), // ms epoch
    accountTag: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.tradeId);
    if (!existing) throw new Error("Trade not found");
    if (existing.userId !== userId) throw new Error("Not authorized to edit this trade");

    // Prepare updates and recompute derived fields
    const newAction = args.action ?? existing.action;
    const newQty = args.quantity_shares !== undefined ? Math.abs(args.quantity_shares) : existing.quantity_shares;
    const newPrice = args.price_per_share !== undefined ? Math.abs(args.price_per_share) : existing.price_per_share;

    if (!(newQty > 0)) throw new Error("Shares must be > 0");
    if (!(newPrice > 0)) throw new Error("Price must be > 0");

    const updates: Partial<typeof existing> = {} as any;
    if (args.action !== undefined) updates.action = newAction;
    if (args.quantity_shares !== undefined) updates.quantity_shares = newQty;
    if (args.price_per_share !== undefined) updates.price_per_share = newPrice;

    updates.quantity_signed = signedShares(newAction, newQty);
    updates.notional = Math.abs(newQty) * newPrice;

    if (args.tradeTime !== undefined) updates.tradeTime = args.tradeTime;
    if (args.accountTag !== undefined) updates.accountTag = args.accountTag ?? undefined;
    if (args.notes !== undefined) updates.notes = args.notes ?? undefined;

    await ctx.db.patch(args.tradeId, updates as any);
    return null;
  },
});

// Stock holdings for current user: group by symbol and sum; filter nonzero
export const listStockHoldings = query({
  args: {},
  returns: v.array(v.object({
    symbol: v.string(),
    netShares: v.number(),
    side: v.union(v.literal("Long"), v.literal("Short")),
    averagePrice: v.number(), // volume-weighted average price
    totalNotional: v.number(), // total invested/received
    latestTradeTime: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rows = await ctx.db
      .query("stock_trades")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
      .collect();

    // Group by symbol
    const map = new Map<string, { totalShares: number; totalNotional: number; latest: number }>();

    for (const r of rows) {
      const prev = map.get(r.symbol);
      const totalShares = (prev?.totalShares ?? 0) + r.quantity_signed;
      const totalNotional = (prev?.totalNotional ?? 0) + (r.quantity_signed * r.price_per_share);
      const latest = Math.max(prev?.latest ?? 0, r.tradeTime);
      map.set(r.symbol, { totalShares, totalNotional, latest });
    }

    const holdings = Array.from(map.entries())
      .filter(([symbol, data]) => data.totalShares !== 0)
      .map(([symbol, data]) => ({
        symbol,
        netShares: data.totalShares,
        side: data.totalShares > 0 ? ("Long" as const) : ("Short" as const),
        averagePrice: Math.abs(data.totalNotional / data.totalShares),
        totalNotional: Math.abs(data.totalNotional),
        latestTradeTime: data.latest,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    return holdings;
  },
});

// One-off migration: remove legacy 'multiplier' field from option_trades docs
export const migrateRemoveMultiplier = mutation({
  args: {},
  returns: v.object({ scanned: v.number(), updated: v.number() }),
  handler: async (ctx) => {
    // No auth required; this is a one-off migration
    let scanned = 0;
    let updated = 0;
    const rows = await ctx.db.query("option_trades").collect();
    for (const t of rows as any[]) {
      scanned++;
      if (t.multiplier !== undefined) {
        const { _id, multiplier, ...rest } = t;
        await ctx.db.replace(_id, rest);
        updated++;
      }
    }
    return { scanned, updated };
  },
});

// Parse human-readable option trades and create records in bulk.
// Expected lines (one per trade), examples:
// "Sold 10 VLO December 150 Puts at $5.15"
// "Bought 3 UNH Oct 320 Calls at 6.70"
export const createOptionTradesFromText = mutation({
  args: {
    text: v.string(),
    // Optional overrides
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(v.object({ line: v.number(), input: v.string(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lines = args.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const multiplier = 100;
    const errors: { line: number; input: string; message: string }[] = [];
    let created = 0;

    const now = new Date();
    const thisYear = now.getFullYear();

    function parseLine(raw: string): {
      action: "BTO" | "BTC" | "STO" | "STC";
      quantity: number;
      underlying: string;
      optionType: "CALL" | "PUT";
      strike: number;
      expiration: number; // ms epoch
      premium: number;
      brokerTradeNumber?: string;
      tradeTimeMs?: number;
    } | { error: string } {
      const original = raw;
      // Optional broker trade number suffix, e.g. "... at 5.15 #123456"
      const brokerTradeNumber = raw.match(/#([A-Za-z0-9_-]{3,})\s*$/)?.[1];
      // Optional trade time suffix, e.g. "... @tt=1694476800000"
      const ttMatch = raw.match(/@tt=(\d{10,13})\s*$/);
      const tradeTimeMs = ttMatch ? Number(ttMatch[1]) : undefined;
      // Optional open/close hint, e.g. "@oc=open"|"@oc=close"
      const ocMatch = raw.match(/@oc=(open|close)\s*$/i);
      const ocHint = ocMatch ? (ocMatch[1].toLowerCase() as "open"|"close") : undefined;
      // Optional qty override, e.g. "@qty=3"
      const qtyOverrideMatch = raw.match(/@qty=(\d{1,4})\s*$/);
      let s = raw.trim().replace(/\s+/g, " ");
      s = s.replace(/@tt=\d{10,13}\s*$/, "");
      s = s.replace(/@oc=(open|close)\s*$/i, "");
      s = s.replace(/@qty=\d{1,4}\s*$/, "");

      // Side phrase
      let action: "BTO" | "BTC" | "STO" | "STC";
      let sideMatched = false;
      let sideWord: "sold" | "bought" | null = null;
      const lower = s.toLowerCase();
      const sidePatterns: Array<{ rx: RegExp; map: "BTO"|"BTC"|"STO"|"STC"; capturesSide?: boolean }> = [
        { rx: /^(sold) to close\b/i, map: "STC", capturesSide: true },
        { rx: /^(sold) to open\b/i, map: "STO", capturesSide: true },
        { rx: /^(bought) to close\b/i, map: "BTC", capturesSide: true },
        { rx: /^(bought) to open\b/i, map: "BTO", capturesSide: true },
        { rx: /^(sold)\b/i, map: "STO", capturesSide: true },
        { rx: /^(bought)\b/i, map: "BTO", capturesSide: true },
      ];
      let matchedIndex = -1;
      for (let idx = 0; idx < sidePatterns.length; idx++) {
        const p = sidePatterns[idx];
        const m = s.match(p.rx);
        if (m) {
          action = p.map;
          if (p.capturesSide && m[1]) sideWord = (m[1].toLowerCase() as any);
          s = s.slice(m[0].length).trim();
          sideMatched = true;
          matchedIndex = idx;
          break;
        }
      }
      if (!sideMatched) return { error: "Could not parse side (Sold/Bought)" };

      // If we only matched bare Sold/Bought (without explicit to open/close), allow @oc hint to override
      const bareMatch = matchedIndex >= 4; // indexes 4 and 5 are bare sold/bought
      if (bareMatch && ocHint && sideWord) {
        if (sideWord === "sold") action = ocHint === "open" ? "STO" : "STC";
        if (sideWord === "bought") action = ocHint === "open" ? "BTO" : "BTC";
      }

      // Optional explicit overrides from suffixes
      const qtyOverride = raw.match(/@qty=(\d{1,4})\s*$/)?.[1];

      // Quantity
      const qtyM = s.match(/^(\d+)\b/);
      if (!qtyM && !qtyOverride) return { error: "Missing quantity" };
      const quantity = qtyOverride ? Number(qtyOverride) : Number(qtyM![1]);
      if (!qtyOverride) s = s.slice(qtyM![0].length).trim();

      // Ticker
      const ticM = s.match(/^([A-Za-z]{1,6})\b/);
      if (!ticM) return { error: "Missing ticker" };
      const underlying = normalizeTicker(ticM[1]);
      s = s.slice(ticM[0].length).trim();

      // Month
      const monM = s.match(/^([A-Za-z]+)/);
      if (!monM) return { error: "Missing month" };
      const monthWord = monM[1];
      const monthKey = monthWord.toLowerCase();
      const mi = MONTH_INDEX[monthKey.slice(0,3)] ?? MONTH_INDEX[monthKey];
      if (mi === undefined) return { error: `Unknown month '${monthWord}'` };
      s = s.slice(monM[0].length).trim();

      // Optional day or year — but avoid misinterpreting the strike as a day
      // Heuristic: If a 1–2 digit number appears after the month and is immediately
      // followed by "Puts"/"Calls", treat it as the STRIKE (do NOT consume as day).
      let day: number | null = null;
      let year: number | null = null;

      const firstTok = s.match(/^(\d{1,2})(?:\b|,)/);
      const firstTok4 = s.match(/^(\d{4})\b/);
      if (firstTok) {
        const d = Number(firstTok[1]);
        const after = s.slice(firstTok[0].length).trim();
        const nextIsType = /^(Puts?|Calls?)\b/i.test(after);
        if (!nextIsType && d >= 1 && d <= 31) {
          // Only treat as day if not followed by option type keyword
          day = d;
          s = s.slice(firstTok[0].length).trim();
          // Maybe followed by year
          const yTok = s.match(/^(\d{4})\b/);
          if (yTok) {
            year = Number(yTok[1]);
            s = s.slice(yTok[0].length).trim();
          }
        }
        // else: leave the number for the STRIKE parser below
      } else if (firstTok4) {
        year = Number(firstTok4[1]);
        s = s.slice(firstTok4[0].length).trim();
      }

      // Strike
      const strikeM = s.match(/^(\d+(?:\.\d+)?)\b/);
      if (!strikeM) return { error: "Missing strike" };
      const strike = Number(strikeM[1]);
      s = s.slice(strikeM[0].length).trim();

      // Type
      const typeM = s.match(/^(Puts?|Calls?)\b/i);
      if (!typeM) return { error: "Missing option type (Puts/Calls)" };
      const optionType = /put/i.test(typeM[1]) ? "PUT" : "CALL";
      s = s.slice(typeM[0].length).trim();

      // 'at' price
      const atM = s.match(/^at\s+(?:\$)?(\d+(?:\.\d+)?)\b/i);
      if (!atM) return { error: "Missing price after 'at'" };
      const premium = Number(atM[1]);
      s = s.slice(atM[0].length).trim();

      // Expiration resolution
      let expMs: number;
      if (day !== null) {
        // Weekly/specific date: month day [year]
        let y = year ?? thisYear;
        expMs = new Date(y, mi, day, 17, 0, 0, 0).getTime();
        if (expMs <= now.getTime()) {
          // If in the past and no explicit year, roll to next year
          if (year === null) {
            y = y + 1;
            expMs = new Date(y, mi, day, 17, 0, 0, 0).getTime();
          }
        }
      } else if (year !== null) {
        // Monthly with explicit year: 3rd Friday
        expMs = thirdFridayEpochMs(mi, year);
      } else {
        // Monthly without year: next upcoming 3rd Friday
        expMs = thirdFridayEpochMs(mi, thisYear);
        if (expMs <= now.getTime()) expMs = thirdFridayEpochMs(mi, thisYear + 1);
      }

      return { action: action!, quantity, underlying, optionType, strike, expiration: expMs, premium, brokerTradeNumber, tradeTimeMs };
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const parsed = parseLine(raw);
      if ((parsed as any).error) {
        errors.push({ line: i + 1, input: raw, message: (parsed as any).error });
        continue;
      }
      const { action, quantity, underlying, optionType, strike, expiration, premium, brokerTradeNumber, tradeTimeMs } = parsed as Exclude<ReturnType<typeof parseLine>, { error: string }>;

      // Validate numbers
      if (!(quantity > 0)) { errors.push({ line: i + 1, input: raw, message: "Quantity must be > 0" }); continue; }
      if (!(strike > 0)) { errors.push({ line: i + 1, input: raw, message: "Strike must be > 0" }); continue; }
      if (!(premium > 0)) { errors.push({ line: i + 1, input: raw, message: "Premium must be > 0" }); continue; }

      // If we have a broker trade number, use the index to dedupe across time
      if (brokerTradeNumber) {
        const existing = await ctx.db
          .query("option_trades")
          .withIndex("by_user_and_broker_trade_number", (q) =>
            q.eq("userId", userId).eq("brokerTradeNumber", brokerTradeNumber)
          )
          .first();
        if (existing) {
          // Skip duplicate
          continue;
        }
      }

      const qSigned = signedContracts(action, quantity);
      const notional = Math.abs(quantity) * premium * multiplier;
      await ctx.db.insert("option_trades", {
        userId,
        underlying,
        optionType,
        strike,
        expiration,
        action,
        quantity_contracts: quantity,
        quantity_signed_contracts: qSigned,
        premium_per_contract: premium,
        notional,
        tradeTime: tradeTimeMs ?? Date.now(),
        accountTag: args.accountTag,
        notes: args.notes,
        tags: undefined,
        brokerTradeNumber: brokerTradeNumber ?? undefined,
      });
      created++;
    }

    return { created, errors };
  },
});

// Internal variant: same as createOptionTradesFromText but runs as the provided userId.
// Useful for CLI/dashboard testing where no auth context is present.
import { internalMutation } from "./_generated/server";
// DEV helper: internal mutation variant to allow running PDF ingestion via CLI/Dashboard
export const createOptionTradesFromTextAsUser = internalMutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    created: v.number(),
    errors: v.array(v.object({ line: v.number(), input: v.string(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    const lines = args.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const multiplier = 100;
    const errors: { line: number; input: string; message: string }[] = [];
    let created = 0;

    const now = new Date();
    const thisYear = now.getFullYear();

    function parseLine(raw: string): {
      action: "BTO" | "BTC" | "STO" | "STC";
      quantity: number;
      underlying: string;
      optionType: "CALL" | "PUT";
      strike: number;
      expiration: number; // ms epoch
      premium: number;
      brokerTradeNumber?: string;
      tradeTimeMs?: number;
    } | { error: string } {
      const original = raw;
      // Optional broker trade number suffix, e.g. "... at 5.15 #123456"
      const brokerTradeNumber = raw.match(/#([A-Za-z0-9_-]{3,})\s*$/)?.[1];
      // Optional trade time suffix, e.g. "... @tt=1694476800000"
      const ttMatch = raw.match(/@tt=(\d{10,13})\s*$/);
      const tradeTimeMs = ttMatch ? Number(ttMatch[1]) : undefined;
      // Optional qty override, e.g. "@qty=3"
      const qtyOverrideMatch = raw.match(/@qty=(\d{1,4})\s*$/);
      let s = raw.trim().replace(/\s+/g, " ");
      s = s.replace(/@tt=\d{10,13}\s*$/, "");
      s = s.replace(/@qty=\d{1,4}\s*$/, "");

      // Side phrase
      let action: "BTO" | "BTC" | "STO" | "STC" = "BTO";
      let sideMatched = false;
      const lower = s.toLowerCase();
      const sidePatterns: Array<{ rx: RegExp; map: "BTO"|"BTC"|"STO"|"STC" }> = [
        { rx: /^(sold) to close\b/i, map: "STC" },
        { rx: /^(sold) to open\b/i, map: "STO" },
        { rx: /^(bought) to close\b/i, map: "BTC" },
        { rx: /^(bought) to open\b/i, map: "BTO" },
        { rx: /^(sold)\b/i, map: "STO" },
        { rx: /^(bought)\b/i, map: "BTO" },
      ];
      for (const p of sidePatterns) {
        const m = s.match(p.rx);
        if (m) {
          action = p.map;
          s = s.slice(m[0].length).trim();
          sideMatched = true;
          break;
        }
      }
      if (!sideMatched) return { error: "Could not parse side (Sold/Bought)" };

      // Optional explicit overrides from suffixes
      const qtyOverride = raw.match(/@qty=(\d{1,4})\s*$/)?.[1];

      // Quantity
      const qtyM = s.match(/^(\d+)\b/);
      if (!qtyM && !qtyOverride) return { error: "Missing quantity" };
      const quantity = qtyOverride ? Number(qtyOverride) : Number(qtyM![1]);
      if (!qtyOverride) s = s.slice(qtyM![0].length).trim();

      // Ticker
      const ticM = s.match(/^([A-Za-z]{1,6})\b/);
      if (!ticM) return { error: "Missing ticker" };
      const underlying = normalizeTicker(ticM[1]);
      s = s.slice(ticM[0].length).trim();

      // Month
      const monM = s.match(/^([A-Za-z]+)/);
      if (!monM) return { error: "Missing month" };
      const monthWord = monM[1];
      const monthKey = monthWord.toLowerCase();
      const mi = MONTH_INDEX[monthKey.slice(0,3)] ?? MONTH_INDEX[monthKey];
      if (mi === undefined) return { error: `Unknown month '${monthWord}'` };
      s = s.slice(monM[0].length).trim();

      // Optional day or year — but avoid misinterpreting the strike as a day
      // Heuristic: If a 1–2 digit number appears after the month and is immediately
      // followed by "Puts"/"Calls", treat it as the STRIKE (do NOT consume as day).
      let day: number | null = null;
      let year: number | null = null;

      const firstTok = s.match(/^(\d{1,2})(?:\b|,)/);
      const firstTok4 = s.match(/^(\d{4})\b/);
      if (firstTok) {
        const d = Number(firstTok[1]);
        const after = s.slice(firstTok[0].length).trim();
        const nextIsType = /^(Puts?|Calls?)\b/i.test(after);
        if (!nextIsType && d >= 1 && d <= 31) {
          // Only treat as day if not followed by option type keyword
          day = d;
          s = s.slice(firstTok[0].length).trim();
          // Maybe followed by year
          const yTok = s.match(/^(\d{4})\b/);
          if (yTok) {
            year = Number(yTok[1]);
            s = s.slice(yTok[0].length).trim();
          }
        }
        // else: leave the number for the STRIKE parser below
      } else if (firstTok4) {
        year = Number(firstTok4[1]);
        s = s.slice(firstTok4[0].length).trim();
      }

      // Strike
      const strikeM = s.match(/^(\d+(?:\.\d+)?)\b/);
      if (!strikeM) return { error: "Missing strike" };
      const strike = Number(strikeM[1]);
      s = s.slice(strikeM[0].length).trim();

      // Type
      const typeM = s.match(/^(Puts?|Calls?)\b/i);
      if (!typeM) return { error: "Missing option type (Puts/Calls)" };
      const optionType = /put/i.test(typeM[1]) ? "PUT" : "CALL";
      s = s.slice(typeM[0].length).trim();

      // 'at' price
      const atM = s.match(/^at\s+(?:\$)?(\d+(?:\.\d+)?)\b/i);
      if (!atM) return { error: "Missing price after 'at'" };
      const premium = Number(atM[1]);
      s = s.slice(atM[0].length).trim();

      // Expiration resolution
      let expMs: number;
      if (day !== null) {
        // If day specified, assume same year unless provided
        const y = year ?? thisYear;
        expMs = new Date(y, mi, day, 17, 0, 0, 0).getTime(); // 5pm local
      } else {
        // No day specified: assume monthly (3rd Friday)
        const y = year ?? thisYear;
        expMs = thirdFridayEpochMs(mi, y);
      }

      return { action, quantity, underlying, optionType, strike, expiration: expMs, premium, brokerTradeNumber, tradeTimeMs };
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const parsed = parseLine(raw);
      if ("error" in parsed) {
        errors.push({ line: i + 1, input: raw, message: parsed.error });
        continue;
      }

      const {
        action,
        quantity,
        underlying,
        optionType,
        strike,
        expiration,
        premium,
        brokerTradeNumber,
        tradeTimeMs,
      } = parsed;

      // If broker trade number is present, dedupe strictly by that index and skip duplicates
      if (brokerTradeNumber) {
        const existing = await ctx.db
          .query("option_trades")
          .withIndex("by_user_and_broker_trade_number", (q) =>
            q.eq("userId", args.userId).eq("brokerTradeNumber", brokerTradeNumber)
          )
          .first();
        if (existing) {
          continue;
        }
      }

      const qty = Math.abs(quantity);
      const qSigned = signedContracts(action, qty);

      const candidate = {
        userId: args.userId,
        underlying,
        optionType,
        strike,
        expiration,
        action,
        quantity_contracts: qty,
        quantity_signed_contracts: qSigned,
        premium_per_contract: premium,
        notional: Math.abs(qty * premium * multiplier),
        tradeTime: tradeTimeMs ?? Date.now(),
        accountTag: args.accountTag,
        notes: args.notes,
        tags: undefined as string[] | undefined,
        brokerTradeNumber: brokerTradeNumber ?? undefined,
      };

      // Fallback: if no brokerTradeNumber, try to avoid recent identical duplicates
      if (!brokerTradeNumber) {
        const oneDayAgo = Date.now() - 24*60*60*1000;
        const dup = await ctx.db
          .query("option_trades")
          .withIndex("by_user_and_time", (q) => q.eq("userId", args.userId))
          .filter((q) => q.gte(q.field("tradeTime"), oneDayAgo))
          .collect()
          .then((rows) => rows.find((t) =>
            t.underlying === candidate.underlying &&
            t.optionType === candidate.optionType &&
            t.strike === candidate.strike &&
            t.expiration === candidate.expiration &&
            t.action === candidate.action &&
            t.quantity_contracts === candidate.quantity_contracts &&
            t.premium_per_contract === candidate.premium_per_contract &&
            Math.abs(t.notional - candidate.notional) < 1e-6
          ));
        if (dup) {
          continue;
        }
      }

      await ctx.db.insert("option_trades", candidate);
      created++;
    }

    return { created, errors };
  },
});

/**
 * Get active option positions enriched with live market data and P&L
 * Returns positions with:
 * - Current stock price from Alpha Vantage
 * - Market value based on intrinsic value
 * - Cost basis from trade history
 * - Unrealized P&L and P&L percentage
 */
type PositionWithMarket = {
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiration: number;
  netContracts: number;
  side: "Long" | "Short";
  openedAt: number;
  latestTradeTime: number;
  premium_per_contract: number; // Average premium per contract
  notional: number; // Total notional value of the position
  currentStockPrice: number | null;
  intrinsicValue: number | null;
  marketValue: number | null;
  costBasis: number;
  unrealizedPnL: number | null;
  unrealizedPnLPercent: number | null;
};

export const listActiveOptionPositionsWithMarket = action({
  args: {},
  returns: v.array(v.object({
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
    netContracts: v.number(),
    side: v.union(v.literal("Long"), v.literal("Short")),
    openedAt: v.number(),
    latestTradeTime: v.number(),
    premium_per_contract: v.number(), // Average premium per contract
    notional: v.number(), // Total notional value of the position
    // Market data
    currentStockPrice: v.union(v.number(), v.null()),
    intrinsicValue: v.union(v.number(), v.null()), // per contract
    marketValue: v.union(v.number(), v.null()), // total position value
    // P&L data
    costBasis: v.number(), // total cost paid/received
    unrealizedPnL: v.union(v.number(), v.null()),
    unrealizedPnLPercent: v.union(v.number(), v.null()),
  })),
  handler: async (ctx): Promise<PositionWithMarket[]> => {
    // Get basic positions from the query
    const positions = await ctx.runQuery(api.trades.listActiveOptionPositions);

    // Get unique underlyings to fetch quotes for
    const underlyings: string[] = [...new Set(positions.map((p: any) => p.underlying))];

    // Check symbol mappings for each underlying
    const mappingPromises = underlyings.map(symbol =>
      ctx.runQuery(api.symbolMappings.getSymbolMapping, { symbol })
    );
    const mappings = await Promise.all(mappingPromises);

    // Create mapping lookup: original symbol -> confirmed symbol (or same if no mapping)
    const symbolMap = new Map<string, string>();
    const pendingSymbols: string[] = [];

    for (let i = 0; i < underlyings.length; i++) {
      const symbol = underlyings[i];
      const mapping = mappings[i];

      if (!mapping) {
        // No mapping exists - create a pending one and skip quote fetch
        pendingSymbols.push(symbol);

        // Search for symbol matches to create initial pending mapping
        const searchResults = await ctx.runAction(api.alphavantage.searchSymbol, {
          keywords: symbol
        });

        if (searchResults && searchResults.length > 0) {
          // Create pending mapping with the top match
          const topMatch = searchResults[0];
          await ctx.runMutation(api.symbolMappings.upsertSymbolMapping, {
            symbol: symbol,
            confirmedSymbol: topMatch.symbol,
            name: topMatch.name,
            exchange: topMatch.symbol.includes(".")
              ? topMatch.symbol.split(".")[1]
              : topMatch.region,
            region: topMatch.region,
            currency: topMatch.currency,
            status: "pending",
          });
        }
      } else if (mapping.status === "confirmed") {
        // Use confirmed symbol for quote fetch
        symbolMap.set(symbol, mapping.confirmedSymbol);
      } else {
        // Mapping exists but is still pending - skip quote fetch
        pendingSymbols.push(symbol);
      }
    }

    // Fetch quotes only for confirmed symbols
    const confirmedUnderlyings = underlyings.filter(s => symbolMap.has(s));
    const quotePromises = confirmedUnderlyings.map(symbol =>
      ctx.runAction(api.alphavantage.getQuote, {
        symbol: symbolMap.get(symbol)!
      })
    );
    const quotes = await Promise.all(quotePromises);

    // Create a map of original symbol -> quote price
    const quoteMap = new Map<string, number>();
    confirmedUnderlyings.forEach((symbol, idx) => {
      const quote = quotes[idx];
      if (quote) {
        quoteMap.set(symbol, quote.price);
      }
    });

    // For each position, fetch cost basis and calculate P&L
    const enrichedPromises = positions.map(async (position: any): Promise<PositionWithMarket> => {
      // Get all trades for this contract to calculate cost basis
      const details = await ctx.runQuery(api.trades.getOptionContractDetails, {
        underlying: position.underlying,
        optionType: position.optionType,
        strike: position.strike,
        expiration: position.expiration,
      });

      // Calculate cost basis: sum of (premium * contracts * 100) for each trade
      // Positive for money paid (BTO/BTC), negative for money received (STO/STC)
      let costBasis = 0;
      for (const trade of details.trades) {
        const sign = trade.action === "BTO" || trade.action === "BTC" ? -1 : 1; // Paying is negative, receiving is positive
        costBasis += sign * trade.premium_per_contract * Math.abs(trade.quantity_signed_contracts) * 100;
      }

      // Get current stock price
      const currentStockPrice = quoteMap.get(position.underlying) ?? null;

      // Calculate intrinsic value per contract
      let intrinsicValue: number | null = null;
      if (currentStockPrice !== null) {
        if (position.optionType === "CALL") {
          intrinsicValue = Math.max(0, currentStockPrice - position.strike);
        } else {
          intrinsicValue = Math.max(0, position.strike - currentStockPrice);
        }
      }

      // Calculate market value (intrinsic value * contracts * multiplier)
      const marketValue = intrinsicValue !== null
        ? intrinsicValue * Math.abs(position.netContracts) * 100
        : null;

      // Calculate P&L
      // For long positions: market value - cost basis (positive if profitable)
      // For short positions: cost basis - market value (positive if profitable)
      const unrealizedPnL = marketValue !== null
        ? (position.side === "Long"
            ? marketValue + costBasis  // costBasis is negative for longs
            : costBasis - marketValue) // costBasis is positive for shorts
        : null;

      const unrealizedPnLPercent = unrealizedPnL !== null && costBasis !== 0
        ? (unrealizedPnL / Math.abs(costBasis)) * 100
        : null;

      return {
        ...position,
        currentStockPrice,
        intrinsicValue,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });

    return await Promise.all(enrichedPromises);
  },
});
