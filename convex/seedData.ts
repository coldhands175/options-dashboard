import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Add sample trades for testing
export const addSampleTrades = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0];
    const nextQuarter = new Date(now.getFullYear(), now.getMonth() + 3, 15).toISOString().split('T')[0];

    console.log(`Adding sample trades for userId: ${userId}`);

    const sampleTrades = [
      {
        userId,
        transactionDate: today,
        tradeType: "SELL_TO_OPEN" as const,
        symbol: "AAPL",
        contractType: "CALL" as const,
        quantity: 1,
        expirationDate: nextMonth,
        strikePrice: 180,
        premium: 5.25,
        bookCost: -525,
        commission: 0.65,
        fees: 0.10,
        status: "EXECUTED" as const,
        notes: "Sample covered call trade",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId,
        transactionDate: today,
        tradeType: "BUY_TO_OPEN" as const,
        symbol: "TSLA",
        contractType: "PUT" as const,
        quantity: 2,
        expirationDate: nextQuarter,
        strikePrice: 200,
        premium: 8.50,
        bookCost: 1700,
        commission: 1.30,
        fees: 0.20,
        status: "EXECUTED" as const,
        notes: "Sample protective puts",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId,
        transactionDate: today,
        tradeType: "SELL_TO_OPEN" as const,
        symbol: "MSFT",
        contractType: "PUT" as const,
        quantity: 1,
        expirationDate: nextMonth,
        strikePrice: 350,
        premium: 12.75,
        bookCost: -1275,
        commission: 0.65,
        fees: 0.10,
        status: "EXECUTED" as const,
        notes: "Cash secured put",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        userId,
        transactionDate: today,
        tradeType: "BUY_TO_CLOSE" as const,
        symbol: "NVDA",
        contractType: "CALL" as const,
        quantity: 1,
        expirationDate: nextMonth,
        strikePrice: 900,
        premium: 2.10,
        bookCost: 210,
        commission: 0.65,
        fees: 0.10,
        status: "EXECUTED" as const,
        notes: "Closing profitable call",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const tradeIds = [];
    for (const trade of sampleTrades) {
      try {
        const tradeId = await ctx.db.insert("trades", trade);
        tradeIds.push(tradeId);
        console.log(`Added trade: ${trade.symbol} ${trade.contractType} ${trade.tradeType}`);
      } catch (error) {
        console.error('Error adding trade:', error, trade);
      }
    }

    console.log(`Successfully added ${tradeIds.length} sample trades`);
    return {
      success: true,
      addedTrades: tradeIds.length,
      tradeIds,
    };
  },
});

// Clear all trades for a user (for testing purposes)
export const clearAllTrades = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    console.log(`Clearing all trades for userId: ${userId}`);
    
    // Get all trades for the user
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Delete all trades
    for (const trade of trades) {
      await ctx.db.delete(trade._id);
    }

    // Get all positions for the user and delete them
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const position of positions) {
      await ctx.db.delete(position._id);
    }

    console.log(`Cleared ${trades.length} trades and ${positions.length} positions`);
    return {
      success: true,
      clearedTrades: trades.length,
      clearedPositions: positions.length,
    };
  },
});
