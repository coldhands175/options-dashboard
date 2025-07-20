import { Trade, Position } from "../options/models/types";
import { Id } from "../../convex/_generated/dataModel";

// Type definitions for Convex data structures
export interface ConvexTrade {
  _id: Id<"trades">;
  _creationTime: number;
  userId: string;
  positionId?: string;
  transactionDate: string;
  tradeType: "BUY_TO_OPEN" | "SELL_TO_OPEN" | "BUY_TO_CLOSE" | "SELL_TO_CLOSE" | "ASSIGNMENT" | "EXPIRATION";
  symbol: string;
  contractType: "CALL" | "PUT";
  quantity: number;
  expirationDate: string;
  strikePrice: number;
  premium: number;
  bookCost: number;
  commission?: number;
  fees?: number;
  status: "EXECUTED" | "CANCELLED" | "PENDING";
  notes?: string;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConvexPosition {
  _id: Id<"positions">;
  _creationTime: number;
  userId: string;
  positionKey: string;
  symbol: string;
  strikePrice: number;
  expirationDate: string;
  contractType: "CALL" | "PUT";
  strategy: "SINGLE_LEG" | "COVERED_CALL" | "CASH_SECURED_PUT" | "VERTICAL_SPREAD" | "IRON_CONDOR";
  status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
  openDate: string;
  closeDate?: string;
  netQuantity: number;
  totalPremium: number;
  totalCommission: number;
  totalFees: number;
  realizedPL?: number;
  unrealizedPL?: number;
  daysToExpiration?: number;
  lastUpdated: string;
  createdAt: string;
}

// Convert Convex trade to your existing Trade interface
export function convexTradeToTrade(convexTrade: ConvexTrade): Trade {
  return {
    id: parseInt(convexTrade._id.replace("trades:", ""), 36), // Convert Convex ID to number for compatibility
    positionId: convexTrade.positionId,
    transactionDate: convexTrade.transactionDate,
    tradeType: convexTrade.tradeType,
    symbol: convexTrade.symbol,
    contractType: convexTrade.contractType,
    quantity: convexTrade.quantity,
    expirationDate: convexTrade.expirationDate,
    strikePrice: convexTrade.strikePrice,
    premium: convexTrade.premium,
    bookCost: convexTrade.bookCost,
    commission: convexTrade.commission,
    fees: convexTrade.fees,
    status: convexTrade.status,
    notes: convexTrade.notes,
    impliedVolatility: convexTrade.impliedVolatility,
    delta: convexTrade.delta,
    gamma: convexTrade.gamma,
    theta: convexTrade.theta,
    vega: convexTrade.vega,
  };
}

// Convert Convex position to your existing Position interface
export function convexPositionToPosition(convexPosition: ConvexPosition, trades: Trade[] = []): Position {
  return {
    id: convexPosition.positionKey,
    symbol: convexPosition.symbol,
    strikePrice: convexPosition.strikePrice,
    expirationDate: convexPosition.expirationDate,
    contractType: convexPosition.contractType,
    strategy: convexPosition.strategy,
    status: convexPosition.status,
    openDate: convexPosition.openDate,
    closeDate: convexPosition.closeDate,
    trades: trades, // You can populate this separately with related trades
    netQuantity: convexPosition.netQuantity,
    totalPremium: convexPosition.totalPremium,
    totalCommission: convexPosition.totalCommission,
    totalFees: convexPosition.totalFees,
    realizedPL: convexPosition.realizedPL,
    unrealizedPL: convexPosition.unrealizedPL,
    daysToExpiration: convexPosition.daysToExpiration,
  };
}

// Convert your existing Trade to Convex trade format for migration
export function convexTradeFromTrade(trade: Trade) {
  const now = new Date().toISOString();
  return {
    positionId: trade.positionId,
    transactionDate: trade.transactionDate,
    tradeType: trade.tradeType,
    symbol: trade.symbol,
    contractType: trade.contractType,
    quantity: trade.quantity,
    expirationDate: trade.expirationDate,
    strikePrice: trade.strikePrice,
    premium: trade.premium,
    bookCost: trade.bookCost,
    commission: trade.commission,
    fees: trade.fees,
    status: trade.status,
    notes: trade.notes,
    impliedVolatility: trade.impliedVolatility,
    delta: trade.delta,
    gamma: trade.gamma,
    theta: trade.theta,
    vega: trade.vega,
    createdAt: now,
    updatedAt: now,
  };
}

// Convert your existing Trade to Convex trade input format
export function tradeToConvexInput(trade: Omit<Trade, 'id'>, userId: string) {
  return {
    userId,
    positionId: trade.positionId,
    transactionDate: trade.transactionDate,
    tradeType: trade.tradeType,
    symbol: trade.symbol,
    contractType: trade.contractType,
    quantity: trade.quantity,
    expirationDate: trade.expirationDate,
    strikePrice: trade.strikePrice,
    premium: trade.premium,
    bookCost: trade.bookCost,
    commission: trade.commission,
    fees: trade.fees,
    status: trade.status,
    notes: trade.notes,
    impliedVolatility: trade.impliedVolatility,
    delta: trade.delta,
    gamma: trade.gamma,
    theta: trade.theta,
    vega: trade.vega,
  };
}

// Generate a consistent position ID from trade details
export function generatePositionId(symbol: string, expirationDate: string, strikePrice: number, contractType: "CALL" | "PUT"): string {
  return `${symbol}-${expirationDate}-${strikePrice}-${contractType}`;
}

// Helper to get current user ID (integrates with existing auth system)
export function getCurrentUserId(): string {
  // Get user ID from existing authentication system
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      // Try different possible user ID field names
      return user.id || user.userId || user.user_id || user.email || 'default-user';
    }
    
    // Fallback: try getting from auth token or other sources
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      // For development, create a consistent user ID based on some identifier
      // In production, this should be properly decoded from your auth system
      return 'authenticated-user';
    }
    
    return 'default-user';
  } catch (error) {
    console.warn('Error getting user ID:', error);
    return 'default-user';
  }
}
