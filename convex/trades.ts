import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new option trade
 *
 * IMPORTANT: Premium calculation
 * - premium_per_share: The premium per share (user input, e.g., $5.50)
 * - 1 options contract = 100 shares
 * - Total notional = premium_per_share × quantity_contracts × 100
 *
 * Example: BTO 2 contracts @ $5.50/share
 * - quantity_contracts: 2
 * - premium_per_share: 5.50
 * - notional: 5.50 × 2 × 100 = $1,100
 */
export const createOptionTrade = mutation({
  args: {
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
    premium_per_share: v.number(),
    tradeTime: v.number(),
    brokerTradeNumber: v.optional(v.string()),
    accountTag: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Get userId from auth context
    const userId = "default"; // Placeholder until auth is implemented

    // Calculate signed quantity based on action
    // BTO/BTC: Positive (buying contracts)
    // STO/STC: Negative (selling contracts)
    const isBuy = args.action === "BTO" || args.action === "BTC";
    const quantity_signed_contracts = isBuy
      ? args.quantity_contracts
      : -args.quantity_contracts;

    // Calculate total notional value
    // Formula: premium_per_share × quantity_contracts × 100
    // 1 contract = 100 shares
    const notional = args.premium_per_share * args.quantity_contracts * 100;

    const tradeId = await ctx.db.insert("option_trades", {
      underlying: args.underlying.toUpperCase(),
      optionType: args.optionType,
      strike: args.strike,
      expiration: args.expiration,
      action: args.action,
      quantity_contracts: args.quantity_contracts,
      quantity_signed_contracts,
      premium_per_share: args.premium_per_share,
      notional,
      tradeTime: args.tradeTime,
      brokerTradeNumber: args.brokerTradeNumber,
      accountTag: args.accountTag,
      notes: args.notes,
      userId,
    });

    return tradeId;
  },
});

/**
 * List all active option positions (aggregated from trades)
 *
 * Aggregation logic:
 * 1. Group trades by contract specification (underlying, type, strike, expiration)
 * 2. Sum signed quantities to get net position
 * 3. Calculate weighted average premium per share
 * 4. Calculate total notional value
 */
export const listActiveOptionPositions = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Filter by userId from auth context
    const userId = "default";

    const trades = await ctx.db
      .query("option_trades")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // Group trades by contract specification
    const positionMap = new Map<
      string,
      {
        underlying: string;
        optionType: "CALL" | "PUT";
        strike: number;
        expiration: number;
        trades: typeof trades;
      }
    >();

    for (const trade of trades) {
      const key = `${trade.underlying}-${trade.optionType}-${trade.strike}-${trade.expiration}`;

      if (!positionMap.has(key)) {
        positionMap.set(key, {
          underlying: trade.underlying,
          optionType: trade.optionType,
          strike: trade.strike,
          expiration: trade.expiration,
          trades: [],
        });
      }

      positionMap.get(key)!.trades.push(trade);
    }

    // Calculate aggregated positions
    const positions = [];

    for (const [_, positionData] of positionMap) {
      const { underlying, optionType, strike, expiration, trades: posTrades } = positionData;

      // Calculate net position
      const netContracts = posTrades.reduce(
        (sum, trade) => sum + trade.quantity_signed_contracts,
        0
      );

      // Skip if position is fully closed
      if (Math.abs(netContracts) < 0.01) continue;

      // Determine position side
      const side = netContracts > 0 ? "Long" : "Short";

      // Calculate weighted average premium per share
      // Only include opening trades (BTO/STO) for cost basis
      const openingTrades = posTrades.filter(
        (t) => t.action === "BTO" || t.action === "STO"
      );

      const totalPremiumCost = openingTrades.reduce(
        (sum, trade) => sum + (trade.premium_per_share * trade.quantity_contracts),
        0
      );

      const totalOpeningContracts = openingTrades.reduce(
        (sum, trade) => sum + trade.quantity_contracts,
        0
      );

      const average_premium_per_share = totalOpeningContracts > 0
        ? totalPremiumCost / totalOpeningContracts
        : 0;

      // Calculate total notional (book value)
      // For long positions: premium paid (debit)
      // For short positions: premium received (credit)
      const notional = average_premium_per_share * Math.abs(netContracts) * 100;

      // Find earliest and latest trade times
      const sortedTrades = posTrades.sort((a, b) => a.tradeTime - b.tradeTime);
      const openedAt = sortedTrades[0].tradeTime;
      const latestTradeTime = sortedTrades[sortedTrades.length - 1].tradeTime;

      positions.push({
        underlying,
        optionType,
        strike,
        expiration,
        netContracts: Math.abs(netContracts),
        side,
        openedAt,
        latestTradeTime,
        average_premium_per_share,
        notional,
      });
    }

    // Sort by latest trade time (most recent first)
    positions.sort((a, b) => b.latestTradeTime - a.latestTradeTime);

    return positions;
  },
});

/**
 * List all user transactions (for trade history view)
 */
export const listUserTransactions = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Filter by userId from auth context
    const userId = "default";

    const trades = await ctx.db
      .query("option_trades")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();

    return {
      items: trades.map((trade) => ({
        kind: "option" as const,
        ...trade,
      })),
    };
  },
});

/**
 * Get all trades for a specific contract
 */
export const getOptionContractDetails = query({
  args: {
    underlying: v.string(),
    optionType: v.union(v.literal("CALL"), v.literal("PUT")),
    strike: v.number(),
    expiration: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Filter by userId from auth context
    const userId = "default";

    const trades = await ctx.db
      .query("option_trades")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("underlying"), args.underlying.toUpperCase()),
          q.eq(q.field("optionType"), args.optionType),
          q.eq(q.field("strike"), args.strike),
          q.eq(q.field("expiration"), args.expiration)
        )
      )
      .order("desc")
      .collect();

    return trades;
  },
});
