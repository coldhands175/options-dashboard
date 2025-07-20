import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin
const requireAdmin = async (ctx: any, userEmail: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", userEmail))
    .unique();
  
  if (!user || !user.isActive || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return user;
};

// Helper function to get user by email
const getUserByEmail = async (ctx: any, userEmail: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", userEmail))
    .unique();
  
  if (!user || !user.isActive) {
    throw new Error("User not found or inactive");
  }
  
  return user;
};

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
            return sum + trade.quantity; // quantity is already signed
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

// === ADMIN-ONLY TRADE FUNCTIONS ===

// Add bulk trades (Admin only) - for file uploads
export const addBulkTrades = mutation({
  args: {
    userEmail: v.string(), // Email of the requesting user
    trades: v.array(v.object({
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
    })),
  },
  returns: v.array(v.id("trades")),
  handler: async (ctx, args) => {
    // Check admin permissions
    await requireAdmin(ctx, args.userEmail);
    
    const now = new Date().toISOString();
    const tradeIds: any[] = [];
    const positionsToUpdate = new Set<string>();
    
    for (const tradeData of args.trades) {
      // Generate positionId if not provided
      const positionId = tradeData.positionId || 
        `${tradeData.symbol}-${tradeData.expirationDate}-${tradeData.strikePrice}-${tradeData.contractType}`;
      
      const fullTradeData = {
        ...tradeData,
        positionId,
        createdAt: now,
        updatedAt: now,
      };
      
      const tradeId = await ctx.db.insert("trades", fullTradeData);
      tradeIds.push(tradeId);
      positionsToUpdate.add(`${tradeData.userId}:${positionId}`);
    }
    
    // Update all affected positions
    for (const positionKey of positionsToUpdate) {
      const [userId, positionId] = positionKey.split(':');
      await updatePositionFromTrades(ctx.db, userId, positionId);
    }
    
    return tradeIds;
  },
});

// Delete all trades for a user (Admin only)
export const deleteAllUserTrades = mutation({
  args: {
    userEmail: v.string(), // Email of the requesting admin
    targetUserId: v.string(), // User whose trades to delete
  },
  returns: v.number(), // Number of deleted trades
  handler: async (ctx, args) => {
    // Check admin permissions
    await requireAdmin(ctx, args.userEmail);
    
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .collect();
    
    const positionsToUpdate = new Set<string>();
    
    for (const trade of trades) {
      await ctx.db.delete(trade._id);
      if (trade.positionId) {
        positionsToUpdate.add(`${trade.userId}:${trade.positionId}`);
      }
    }
    
    // Update all affected positions (likely to delete them)
    for (const positionKey of positionsToUpdate) {
      const [userId, positionId] = positionKey.split(':');
      await updatePositionFromTrades(ctx.db, userId, positionId);
    }
    
    return trades.length;
  },
});

// Get all users' trade summary (Admin only)
export const getAllUsersTradesSummary = query({
  args: {
    userEmail: v.string(), // Email of the requesting admin
  },
  returns: v.array(v.object({
    userId: v.string(),
    tradeCount: v.number(),
    positionCount: v.number(),
    totalVolume: v.number(),
    firstTradeDate: v.optional(v.string()),
    lastTradeDate: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // Check admin permissions
    const adminUser = await requireAdmin(ctx, args.userEmail);
    
    const trades = await ctx.db.query("trades").collect();
    const positions = await ctx.db.query("positions").collect();
    
    const userSummaries = new Map<string, any>();
    
    // Process trades
    for (const trade of trades) {
      if (!userSummaries.has(trade.userId)) {
        userSummaries.set(trade.userId, {
          userId: trade.userId,
          tradeCount: 0,
          positionCount: 0,
          totalVolume: 0,
          firstTradeDate: trade.transactionDate,
          lastTradeDate: trade.transactionDate,
        });
      }
      
      const summary = userSummaries.get(trade.userId);
      summary.tradeCount++;
      summary.totalVolume += Math.abs(trade.bookCost);
      
      if (trade.transactionDate < summary.firstTradeDate) {
        summary.firstTradeDate = trade.transactionDate;
      }
      if (trade.transactionDate > summary.lastTradeDate) {
        summary.lastTradeDate = trade.transactionDate;
      }
    }
    
    // Process positions
    for (const position of positions) {
      const summary = userSummaries.get(position.userId);
      if (summary) {
        summary.positionCount++;
      }
    }
    
    return Array.from(userSummaries.values());
  },
});

// === GLOBAL DATA FUNCTIONS ===

// Get all trades in the system (for single-source dashboard)
export const getAllTrades = query({
  args: {},
  handler: async (ctx) => {
    const trades = await ctx.db
      .query("trades")
      .order("desc")
      .collect();
    
    return trades;
  },
});

// Get all positions in the system (for single-source dashboard)
export const getAllPositions = query({
  args: {},
  handler: async (ctx) => {
    const positions = await ctx.db
      .query("positions")
      .order("desc")
      .collect();
    
    return positions;
  },
});

// === DEBUG FUNCTIONS ===

// Debug specific position calculation
export const debugPositionCalculation = query({
  args: {
    positionId: v.string(),
  },
  handler: async (ctx, { positionId }) => {
    // Get all trades for this position
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_position", (q) => q.eq("positionId", positionId))
      .collect();
    
    if (trades.length === 0) {
      return { error: "No trades found for position" };
    }
    
    // Sort trades by date
    trades.sort((a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
    
    // Aggregate trade data
    const aggregated = trades.reduce((acc: any, trade: any) => {
      acc.netQuantity += trade.quantity;
      const premiumAmount = trade.premium * Math.abs(trade.quantity) * 100;
      acc.totalPremium += trade.quantity < 0 ? premiumAmount : -premiumAmount;
      acc.totalCommission += trade.commission || 0;
      acc.totalFees += trade.fees || 0;
      return acc;
    }, {
      netQuantity: 0,
      totalPremium: 0,
      totalCommission: 0,
      totalFees: 0,
    });
    
    const firstTrade = trades[0];
    const daysToExpiration = calculateDaysToExpiration(firstTrade.expirationDate);
    
    // Debug calculations
    const isNetQuantityZero = Math.abs(aggregated.netQuantity) < 0.001;
    const isPastExpiration = daysToExpiration <= 0;
    const isSingleTrade = trades.length === 1;
    
    let status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED" = "OPEN";
    let realizedPL: number | undefined;
    
    if (isNetQuantityZero) {
      status = "CLOSED";
      realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
    } else if (isPastExpiration) {
      if (isSingleTrade) {
        status = "EXPIRED";
        realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
      } else {
        status = "ASSIGNED";
        realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
      }
    }
    
    return {
      positionId,
      trades: trades.map(t => ({
        id: t._id,
        date: t.transactionDate,
        type: t.tradeType,
        quantity: t.quantity,
        premium: t.premium,
      })),
      aggregated,
      daysToExpiration,
      checks: {
        isNetQuantityZero,
        isPastExpiration,
        isSingleTrade,
      },
      calculatedStatus: status,
      calculatedRealizedPL: realizedPL,
    };
  },
});

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

// Debug: Get all users to check their roles and status
export const debugGetAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      name: user.name
    }));
  },
});

// Create default admin user for development
export const createDefaultAdminUser = mutation({
  args: {},
  handler: async (ctx) => {
    const adminEmail = 'msbaxter@gmail.com';
    const now = new Date().toISOString();
    
    // Check if admin user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", adminEmail))
      .unique();

    if (existingUser) {
      return { message: 'Admin user already exists', userId: existingUser._id };
    }

    // Create admin user
    const userId = await ctx.db.insert("users", {
      email: adminEmail,
      firstName: 'Michael',
      lastName: 'Baxter',
      name: 'Michael Baxter',
      role: 'ADMIN',
      isActive: true,
      lastLogin: now,
      loginCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return { message: 'Admin user created successfully', userId };
  },
});

// Recalculate all positions with new P&L logic (Admin only)
export const recalculateAllPositions = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await requireAdmin(ctx, args.userEmail);
    
    // Get all unique position IDs from trades
    const trades = await ctx.db.query("trades").collect();
    const positionIds = new Set<string>();
    const userPositions = new Map<string, Set<string>>();
    
    for (const trade of trades) {
      if (trade.positionId) {
        positionIds.add(trade.positionId);
        
        if (!userPositions.has(trade.userId)) {
          userPositions.set(trade.userId, new Set());
        }
        userPositions.get(trade.userId)!.add(trade.positionId);
      }
    }
    
    let recalculatedCount = 0;
    
    // Recalculate each position
    for (const [userId, positions] of userPositions) {
      for (const positionId of positions) {
        await updatePositionFromTrades(ctx.db, userId, positionId);
        recalculatedCount++;
      }
    }
    
    return {
      message: `Recalculated ${recalculatedCount} positions with updated P&L logic`,
      positionsRecalculated: recalculatedCount
    };
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
    // Calculate net quantity (quantity is already signed: negative for sells, positive for buys)
    acc.netQuantity += trade.quantity;
    
    // Calculate total premiums (credits for sells, debits for buys)
    // Note: Each contract represents 100 shares
    const premiumAmount = trade.premium * Math.abs(trade.quantity) * 100;
    acc.totalPremium += trade.quantity < 0 ? premiumAmount : -premiumAmount;

    // Sum commissions and fees
    acc.totalCommission += trade.commission || 0;
    acc.totalFees += trade.fees || 0;

    return acc;
  }, {
    netQuantity: 0,
    totalPremium: 0,
    totalCommission: 0,
    totalFees: 0,
  });
  
  const firstTrade = trades[0];
  const lastTrade = trades[trades.length - 1];
  
  // Determine position status and calculate P&L
  let status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED" = "OPEN";
  let closeDate: string | undefined;
  let realizedPL: number | undefined;
  
  // Calculate days to expiration
  const daysToExpiration = calculateDaysToExpiration(firstTrade.expirationDate);
  
  if (Math.abs(aggregated.netQuantity) < 0.001) { 
    // Position is closed (accounting for floating point precision)
    status = "CLOSED";
    closeDate = lastTrade.transactionDate;
    // Calculate realized P&L for closed positions
    realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
  } else {
    // Position still has net quantity - check if it should be expired or assigned
    if (daysToExpiration <= 0) {
      // Position has passed expiration date
      if (trades.length === 1) {
        // Single trade that has expired - realize the P&L
        status = "EXPIRED";
        closeDate = firstTrade.expirationDate;
        // For expired positions with only one trade, the realized P&L is the premium collected minus costs
        // (Theoretically, there should be a closing trade at $0, but if there isn't, we treat it as expired)
        realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
      } else {
        // Multiple trades but still has net quantity and past expiration - likely assigned
        status = "ASSIGNED";
        closeDate = firstTrade.expirationDate;
        // Calculate realized P&L up to assignment
        realizedPL = aggregated.totalPremium - aggregated.totalCommission - aggregated.totalFees;
      }
    }
    // If daysToExpiration > 0 and netQuantity != 0, keep status as "OPEN"
  }
  
  // Check if position already exists
  const existingPosition = await db
    .query("positions")
    .withIndex("by_position_key", (q) => q.eq("positionKey", positionId))
    .first();
  
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
    daysToExpiration: status === "OPEN" ? daysToExpiration : undefined,
    lastUpdated: new Date().toISOString(),
    createdAt: existingPosition?.createdAt || new Date().toISOString(),
  };
  
  if (existingPosition) {
    await db.patch(existingPosition._id, positionData);
  } else {
    await db.insert("positions", positionData);
  }
}
