import { Trade, Position } from "../options/models/types";
import { Id } from "../../convex/_generated/dataModel";

// Simple hash function to convert string to number
function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

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
    id: hashCode(convexTrade._id.toString()), // Create a numeric ID from Convex string ID
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
    // Optional Greeks (not in simplified schema but keeping for compatibility)
    impliedVolatility: undefined,
    delta: undefined,
    gamma: undefined,
    theta: undefined,
    vega: undefined,
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
  };
}

// Generate a consistent position ID from trade details
export function generatePositionId(symbol: string, expirationDate: string, strikePrice: number, contractType: "CALL" | "PUT"): string {
  return `${symbol}-${expirationDate}-${strikePrice}-${contractType}`;
}

// Helper to get current user ID (integrates with existing auth system)
export function getCurrentUserId(): string {
  // For now, always use the migrated user ID since that's where the data is
  // TODO: Update this once proper authentication is implemented
  const migratedUserId = 'migrated-user-1752958388313';
  
  // Debug log to verify the user ID being used
  console.log('🔑 getCurrentUserId returning:', migratedUserId);
  
  return migratedUserId;
}
