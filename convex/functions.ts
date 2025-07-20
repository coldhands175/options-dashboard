import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// === TRADE MUTATIONS ===

// Add a new trade
export const addTrade = mutation({
  args: {
    userId: v.string(),
    positionId: v.optional(v.string()),
    transactionDate: v.string(),
    tradeType: v.union(
      v.literal("BUY_TO_OPEN"),
      v.literal("SELL_TO_OPEN"),
      v.literal("BUY_TO_CLOSE"),
      v.literal("SELL_TO_CLOSE"),
      v.literal("ASSIGNMENT"),
      v.literal("EXPIRATION")
    ),
    symbol: v.string(),
    contractType: v.union(v.literal("CALL"), v.literal("PUT")),
    quantity: v.number(),
    expirationDate: v.string(),
    strikePrice: v.number(),
    premium: v.number(),
    bookCost: v.number(),
    commission: v.optional(v.number()),
    fees: v.optional(v.number()),
    status: v.union(
      v.literal("EXECUTED"),
      v.literal("CANCELLED"),
      v.literal("PENDING"),
      v.literal("EXPIRED")
    ),
    notes: v.optional(v.string()),
    extractionConfidence: v.optional(v.number()),
    impliedVolatility: v.optional(v.number()),
    delta: v.optional(v.number()),
    gamma: v.optional(v.number()),
    theta: v.optional(v.number()),
    vega: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Generate positionId if not provided
    const positionId = args.positionId || 
      `${args.symbol}-${args.expirationDate}-${args.strikePrice}-${args.contractType}`;
    
    const tradeData = {
      ...args,
      positionId,
      createdAt: now,
      updatedAt: now,
    };
    
    const tradeId = await ctx.db.insert("trades", tradeData);
    
    // Update or create corresponding position
    await updatePositionFromTrades(ctx.db, args.userId, positionId);
    
    return tradeId;
  },
});

// Update an existing trade
export const updateTrade = mutation({
  args: {
    tradeId: v.id("trades"),
    updates: v.object({
      transactionDate: v.optional(v.string()),
      tradeType: v.optional(v.union(
        v.literal("BUY_TO_OPEN"),
        v.literal("SELL_TO_OPEN"),
        v.literal("BUY_TO_CLOSE"),
        v.literal("SELL_TO_CLOSE"),
        v.literal("ASSIGNMENT"),
        v.literal("EXPIRATION")
      )),
      quantity: v.optional(v.number()),
      premium: v.optional(v.number()),
      bookCost: v.optional(v.number()),
      commission: v.optional(v.number()),
      fees: v.optional(v.number()),
      status: v.optional(v.union(
        v.literal("EXECUTED"),
        v.literal("CANCELLED"),
        v.literal("PENDING"),
        v.literal("EXPIRED")
      )),
      notes: v.optional(v.string()),
      extractionConfidence: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { tradeId, updates }) => {
    const trade = await ctx.db.get(tradeId);
    if (!trade) {
      throw new Error("Trade not found");
    }
    
    const updatedTrade = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await ctx.db.patch(tradeId, updatedTrade);
    
    // Update corresponding position
    if (trade.positionId) {
      await updatePositionFromTrades(ctx.db, trade.userId, trade.positionId);
    }
    
    return await ctx.db.get(tradeId);
  },
});

// Delete a trade
export const deleteTrade = mutation({
  args: {
    tradeId: v.id("trades"),
  },
  handler: async (ctx, { tradeId }) => {
    const trade = await ctx.db.get(tradeId);
    if (!trade) {
      throw new Error("Trade not found");
    }
    
    await ctx.db.delete(tradeId);
    
    // Update or delete corresponding position
    if (trade.positionId) {
      await updatePositionFromTrades(ctx.db, trade.userId, trade.positionId);
    }
  },
});

// === TRADE QUERIES ===

// Get all trades for a user
export const getTrades = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get trades by symbol
export const getTradesBySymbol = query({
  args: {
    userId: v.string(),
    symbol: v.string(),
  },
  handler: async (ctx, { userId, symbol }) => {
    return await ctx.db
      .query("trades")
      .withIndex("by_user_symbol", (q) => 
        q.eq("userId", userId).eq("symbol", symbol)
      )
      .order("desc")
      .collect();
  },
});

// Get trades for a specific position
export const getTradesByPosition = query({
  args: {
    positionId: v.string(),
  },
  handler: async (ctx, { positionId }) => {
    return await ctx.db
      .query("trades")
      .withIndex("by_position", (q) => q.eq("positionId", positionId))
      .order("desc")
      .collect();
  },
});

// === POSITION QUERIES ===

// Get all positions for a user
export const getPositions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("positions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get open positions for a user
export const getOpenPositions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("positions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", userId).eq("status", "OPEN")
      )
      .order("desc")
      .collect();
  },
});

// Get positions by symbol
export const getPositionsBySymbol = query({
  args: {
    userId: v.string(),
    symbol: v.string(),
  },
  handler: async (ctx, { userId, symbol }) => {
    return await ctx.db
      .query("positions")
      .withIndex("by_user_symbol", (q) => 
        q.eq("userId", userId).eq("symbol", symbol)
      )
      .order("desc")
      .collect();
  },
});

// === DOCUMENT PROCESSING ===

// Upload and process trade document
export const processTradeDocument = mutation({
  args: {
    userId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.string(), // Convex file storage ID
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Store document record
    const documentId = await ctx.db.insert("documents", {
      userId: args.userId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      status: "PROCESSING",
      createdAt: now,
      updatedAt: now,
    });
    
    return documentId;
  },
});

// Get documents for user
export const getDocuments = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Update document status
export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("UPLOADING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    extractedTradesCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // New classification fields
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
    classificationConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: new Date().toISOString(),
    };
    
    if (args.extractedTradesCount !== undefined) {
      updates.extractedTradesCount = args.extractedTradesCount;
    }
    
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    
    // Add new classification fields if provided
    if (args.documentType !== undefined) {
      updates.documentType = args.documentType;
    }
    
    if (args.broker !== undefined) {
      updates.broker = args.broker;
    }
    
    if (args.classificationConfidence !== undefined) {
      updates.classificationConfidence = args.classificationConfidence;
    }
    
    await ctx.db.patch(args.documentId, updates);
    
    return await ctx.db.get(args.documentId);
  },
});

// === POSITION ANALYSIS ===

// Get positions with their trade count and details
export const getPositionsWithTradeDetails = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const positionsWithTrades = [];
    
    for (const position of positions) {
      // Get all trades for this position
      const trades = await ctx.db
        .query("trades")
        .withIndex("by_position", (q) => q.eq("positionId", position.positionKey))
        .collect();
      
      positionsWithTrades.push({
        ...position,
        tradeCount: trades.length,
        isMultiTrade: trades.length > 1,
        trades: trades.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()),
        firstTradeDate: trades.length > 0 ? trades[0].transactionDate : null,
        lastTradeDate: trades.length > 0 ? trades[trades.length - 1].transactionDate : null,
      });
    }
    
    return positionsWithTrades.sort((a, b) => b.tradeCount - a.tradeCount);
  },
});

// Get only positions that have multiple trades
export const getMultiTradePositions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const multiTradePositions = [];
    
    for (const position of positions) {
      const trades = await ctx.db
        .query("trades")
        .withIndex("by_position", (q) => q.eq("positionId", position.positionKey))
        .collect();
      
      if (trades.length > 1) {
        multiTradePositions.push({
          ...position,
          tradeCount: trades.length,
          trades: trades.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()),
          totalQuantity: trades.reduce((sum, trade) => {
            return sum + (trade.tradeType.includes('OPEN') ? trade.quantity : -trade.quantity);
          }, 0),
          tradeTypes: [...new Set(trades.map(t => t.tradeType))],
        });
      }
    }
    
    return multiTradePositions;
  },
});

// === DATA CORRECTION FUNCTIONS ===

// Fix incorrectly classified trade types based on position context
export const fixTradeTypeClassifications = mutation({
  args: {
    userId: v.string(),
    dryRun: v.optional(v.boolean()), // If true, don't make changes, just report
  },
  handler: async (ctx, { userId, dryRun = false }) => {
    const corrections = [];
    
    // Get all positions with multiple trades
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    for (const position of positions) {
      const trades = await ctx.db
        .query("trades")
        .withIndex("by_position", (q) => q.eq("positionId", position.positionKey))
        .collect();
      
      if (trades.length > 1) {
        // Sort trades by date to understand sequence
        const sortedTrades = trades.sort((a, b) => 
          new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
        );
        
        for (let i = 0; i < sortedTrades.length; i++) {
          const trade = sortedTrades[i];
          const isFirstTrade = i === 0;
          let correctTradeType = trade.tradeType;
          
          // Logic to determine correct trade type
          if (trade.tradeType === 'BUY_TO_OPEN' && !isFirstTrade) {
            // If this is not the first trade and it's BUY_TO_OPEN, it should probably be BUY_TO_CLOSE
            // Check if there was a previous SELL_TO_OPEN
            const hasPreviousSellToOpen = sortedTrades.slice(0, i).some(t => t.tradeType === 'SELL_TO_OPEN');
            if (hasPreviousSellToOpen) {
              correctTradeType = 'BUY_TO_CLOSE';
            }
          } else if (trade.tradeType === 'SELL_TO_OPEN' && !isFirstTrade) {
            // If this is not the first trade and it's SELL_TO_OPEN, check context
            const hasPreviousBuyToOpen = sortedTrades.slice(0, i).some(t => t.tradeType === 'BUY_TO_OPEN');
            if (hasPreviousBuyToOpen) {
              correctTradeType = 'SELL_TO_CLOSE';
            }
          }
          
          if (correctTradeType !== trade.tradeType) {
            corrections.push({
              tradeId: trade._id,
              positionKey: position.positionKey,
              symbol: trade.symbol,
              transactionDate: trade.transactionDate,
              currentType: trade.tradeType,
              correctType: correctTradeType,
              reason: `Trade #${i + 1} in sequence should be ${correctTradeType}`
            });
            
            if (!dryRun) {
              await ctx.db.patch(trade._id, {
                tradeType: correctTradeType,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
        
        // Recalculate position if we made changes
        if (!dryRun && corrections.some(c => c.positionKey === position.positionKey)) {
          await updatePositionFromTrades(ctx.db, userId, position.positionKey);
        }
      }
    }
    
    return {
      totalCorrections: corrections.length,
      corrections,
      dryRun
    };
  },
});

// === DEBUG FUNCTIONS ===

// Debug: Get all trades with their userIds (temporary for migration verification)
export const debugGetAllTrades = query({
  args: {},
  handler: async (ctx) => {
    const trades = await ctx.db.query("trades").collect();
    // Return just userId and basic info to see what's in the database
    return trades.map(trade => ({
      userId: trade.userId,
      symbol: trade.symbol,
      transactionDate: trade.transactionDate,
      tradeType: trade.tradeType
    }));
  },
});

// === HELPER FUNCTIONS ===

// Calculate days to expiration
function calculateDaysToExpiration(expirationDate: string): number {
  const expiry = new Date(expirationDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Determine strategy based on trades
function determineStrategy(trades: any[]): string {
  if (trades.length === 1) {
    return "SINGLE_LEG";
  }
  
  // Add more sophisticated strategy detection logic here
  // For now, default to SINGLE_LEG
  return "SINGLE_LEG";
}

// Update position from trades (core position calculation logic)
async function updatePositionFromTrades(db: any, userId: string, positionId: string) {
  // Get all trades for this position
  const trades = await db
    .query("trades")
    .withIndex("by_position", (q) => q.eq("positionId", positionId))
    .collect();
  
  if (trades.length === 0) {
    // Delete position if no trades exist
    const existingPosition = await db
      .query("positions")
      .withIndex("by_position_key", (q) => q.eq("positionKey", positionId))
      .first();
    
    if (existingPosition) {
      await db.delete(existingPosition._id);
    }
    return;
  }
  
  // Sort trades by date
  trades.sort((a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
  
  // Aggregate trade data
  const aggregated = trades.reduce((acc: any, trade: any) => {
    acc.netQuantity += trade.quantity;
    acc.totalPremium += trade.premium * Math.abs(trade.quantity);
    acc.totalCommission += trade.commission || 0;
    acc.totalFees += trade.fees || 0;
    
    // Track opening/closing for P&L calculation
    if (trade.tradeType.includes('OPEN')) {
      acc.openingPremium += trade.premium * Math.abs(trade.quantity);
    } else if (trade.tradeType.includes('CLOSE')) {
      acc.closingPremium += trade.premium * Math.abs(trade.quantity);
    }
    
    return acc;
  }, {
    netQuantity: 0,
    totalPremium: 0,
    totalCommission: 0,
    totalFees: 0,
    openingPremium: 0,
    closingPremium: 0,
  });
  
  const firstTrade = trades[0];
  const lastTrade = trades[trades.length - 1];
  
  // Determine position status
  let status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED" = "OPEN";
  let closeDate: string | undefined;
  let realizedPL: number | undefined;
  
  if (Math.abs(aggregated.netQuantity) < 0.001) { // Position is closed (accounting for floating point precision)
    status = "CLOSED";
    closeDate = lastTrade.transactionDate;
    // Calculate realized P&L for closed positions
    realizedPL = aggregated.closingPremium - aggregated.openingPremium - aggregated.totalCommission - aggregated.totalFees;
  }
  
  // Calculate days to expiration for open positions
  const daysToExpiration = status === "OPEN" ? calculateDaysToExpiration(firstTrade.expirationDate) : undefined;
  
  const positionData = {
    userId,
    positionKey: positionId,
    symbol: firstTrade.symbol,
    strikePrice: firstTrade.strikePrice,
    expirationDate: firstTrade.expirationDate,
    contractType: firstTrade.contractType,
    strategy: determineStrategy(trades),
    status,
    openDate: firstTrade.transactionDate,
    closeDate,
    netQuantity: aggregated.netQuantity,
    totalPremium: aggregated.totalPremium,
    totalCommission: aggregated.totalCommission,
    totalFees: aggregated.totalFees,
    realizedPL,
    daysToExpiration,
    lastUpdated: new Date().toISOString(),
    createdAt: firstTrade.createdAt,
  };
  
  // Check if position already exists
  const existingPosition = await db
    .query("positions")
    .withIndex("by_position_key", (q) => q.eq("positionKey", positionId))
    .first();
  
  if (existingPosition) {
    await db.patch(existingPosition._id, positionData);
  } else {
    await db.insert("positions", positionData);
  }
}
