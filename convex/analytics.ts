import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get monthly analytics data for the current user
 * Returns aggregated data by month for charting and analysis
 */
export const getMonthlyAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Fetch all trades for the user
    const [stockTrades, optionTrades] = await Promise.all([
      ctx.db
        .query("stock_trades")
        .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("option_trades")
        .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    // Aggregate by month
    const monthlyData = new Map<string, {
      month: string; // YYYY-MM format
      stockTrades: number;
      optionTrades: number;
      totalTrades: number;
      stockVolume: number;
      optionVolume: number;
      totalVolume: number;
      stockBuys: number;
      stockSells: number;
      optionBuys: number; // BTO + BTC
      optionSells: number; // STO + STC
      premiumCollected: number; // Credits from STO/STC
      premiumPaid: number; // Debits from BTO/BTC
      netPremium: number;
    }>();

    // Process stock trades
    for (const trade of stockTrades) {
      const date = new Date(trade.tradeTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyData.get(monthKey) || {
        month: monthKey,
        stockTrades: 0,
        optionTrades: 0,
        totalTrades: 0,
        stockVolume: 0,
        optionVolume: 0,
        totalVolume: 0,
        stockBuys: 0,
        stockSells: 0,
        optionBuys: 0,
        optionSells: 0,
        premiumCollected: 0,
        premiumPaid: 0,
        netPremium: 0,
      };

      existing.stockTrades += 1;
      existing.totalTrades += 1;
      existing.stockVolume += trade.notional;
      existing.totalVolume += trade.notional;

      if (trade.action === "BUY") {
        existing.stockBuys += 1;
      } else {
        existing.stockSells += 1;
      }

      monthlyData.set(monthKey, existing);
    }

    // Process option trades
    for (const trade of optionTrades) {
      const date = new Date(trade.tradeTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyData.get(monthKey) || {
        month: monthKey,
        stockTrades: 0,
        optionTrades: 0,
        totalTrades: 0,
        stockVolume: 0,
        optionVolume: 0,
        totalVolume: 0,
        stockBuys: 0,
        stockSells: 0,
        optionBuys: 0,
        optionSells: 0,
        premiumCollected: 0,
        premiumPaid: 0,
        netPremium: 0,
      };

      existing.optionTrades += 1;
      existing.totalTrades += 1;
      existing.optionVolume += trade.notional;
      existing.totalVolume += trade.notional;

      // Premium tracking
      const premium = trade.premium_per_contract * Math.abs(trade.quantity_signed_contracts) * 100;

      if (trade.action === "BTO" || trade.action === "BTC") {
        existing.optionBuys += 1;
        existing.premiumPaid += premium;
      } else { // STO or STC
        existing.optionSells += 1;
        existing.premiumCollected += premium;
      }

      existing.netPremium = existing.premiumCollected - existing.premiumPaid;

      monthlyData.set(monthKey, existing);
    }

    // Convert to sorted array
    const monthlyArray = Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return monthlyArray;
  },
});

/**
 * Get summary statistics for the analytics overview
 */
export const getAnalyticsSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const [stockTrades, optionTrades] = await Promise.all([
      ctx.db
        .query("stock_trades")
        .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("option_trades")
        .withIndex("by_user_and_time", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    const now = Date.now();
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Current month stats
    const currentMonthStock = stockTrades.filter(t => t.tradeTime >= currentMonthStart);
    const currentMonthOptions = optionTrades.filter(t => t.tradeTime >= currentMonthStart);

    const currentMonthTrades = currentMonthStock.length + currentMonthOptions.length;
    const currentMonthVolume =
      currentMonthStock.reduce((sum, t) => sum + t.notional, 0) +
      currentMonthOptions.reduce((sum, t) => sum + t.notional, 0);

    // Calculate current month net premium
    let currentMonthPremiumCollected = 0;
    let currentMonthPremiumPaid = 0;

    for (const trade of currentMonthOptions) {
      const premium = trade.premium_per_contract * Math.abs(trade.quantity_signed_contracts) * 100;
      if (trade.action === "BTO" || trade.action === "BTC") {
        currentMonthPremiumPaid += premium;
      } else {
        currentMonthPremiumCollected += premium;
      }
    }

    const currentMonthNetPremium = currentMonthPremiumCollected - currentMonthPremiumPaid;

    // All-time stats
    const totalTrades = stockTrades.length + optionTrades.length;
    const totalVolume =
      stockTrades.reduce((sum, t) => sum + t.notional, 0) +
      optionTrades.reduce((sum, t) => sum + t.notional, 0);

    // Calculate all-time net premium
    let totalPremiumCollected = 0;
    let totalPremiumPaid = 0;

    for (const trade of optionTrades) {
      const premium = trade.premium_per_contract * Math.abs(trade.quantity_signed_contracts) * 100;
      if (trade.action === "BTO" || trade.action === "BTC") {
        totalPremiumPaid += premium;
      } else {
        totalPremiumCollected += premium;
      }
    }

    const totalNetPremium = totalPremiumCollected - totalPremiumPaid;

    return {
      currentMonth: {
        trades: currentMonthTrades,
        volume: currentMonthVolume,
        netPremium: currentMonthNetPremium,
        stockTrades: currentMonthStock.length,
        optionTrades: currentMonthOptions.length,
      },
      allTime: {
        trades: totalTrades,
        volume: totalVolume,
        netPremium: totalNetPremium,
        stockTrades: stockTrades.length,
        optionTrades: optionTrades.length,
      },
    };
  },
});
