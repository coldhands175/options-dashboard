/**
 * Core types for options trading application
 */

/**
 * Represents an individual options trade/transaction
 */
export interface Trade {
  id: number;
  positionId?: string;      // ID of the position this trade belongs to
  transactionDate: string;  // Date the trade was executed (YYYY-MM-DD)
  tradeType: 'BUY_TO_OPEN' | 'SELL_TO_OPEN' | 'BUY_TO_CLOSE' | 'SELL_TO_CLOSE' | 'ASSIGNMENT' | 'EXPIRATION';
  symbol: string;           // Underlying stock symbol
  contractType: 'CALL' | 'PUT';
  quantity: number;         // Number of contracts (positive for buy, negative for sell)
  expirationDate: string;   // Option expiration date (YYYY-MM-DD)
  strikePrice: number;      // Strike price
  premium: number;          // Premium received/paid per contract (always positive)
  bookCost: number;         // Total cost/proceeds of the trade (quantity * premium * 100 + commission)
  commission?: number;      // Trading commission for this leg
  fees?: number;            // Other fees (e.g., regulatory fees)
  status: 'EXECUTED' | 'CANCELLED' | 'PENDING'; // Status of the individual trade transaction
  notes?: string;           // User-provided notes for the trade

  // Optional market data at the time of trade for advanced analysis
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

/**
 * Represents an options position (collection of related trades)
 */
/**
 * Defines the types of options strategies
 */
export type Strategy =
  | 'SINGLE_LEG'
  | 'COVERED_CALL'
  | 'CASH_SECURED_PUT'
  | 'VERTICAL_SPREAD'
  | 'IRON_CONDOR';

/**
 * Represents an options position (collection of related trades)
 */
export interface Position {
  id: string;                 // Unique identifier for the position (e.g., 'AAPL-2025-01-17-200-CALL')
  symbol: string;             // Underlying stock symbol
  strikePrice: number;      // Strike price of the option
  expirationDate: string;   // Expiration date of the option (YYYY-MM-DD)
  contractType: 'CALL' | 'PUT'; // Type of option contract
  strategy: Strategy;           // Strategy name (e.g., 'Covered Call', 'Cash-Secured Put', 'Iron Condor')
  status: 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ASSIGNED';
  openDate: string;           // Date position was opened (YYYY-MM-DD)
  closeDate?: string;         // Date position was closed (if applicable)
  trades: Trade[];            // Array of all trades constituting this position
  netQuantity: number;        // Current number of contracts held (e.g., +1 for long, -1 for short)
  totalPremium: number;       // Net premium received (positive) or paid (negative)
  totalCommission: number;    // Total commissions paid
  totalFees: number;          // Total fees paid
  realizedPL?: number;        // Realized Profit/Loss (for closed positions)
  unrealizedPL?: number;      // Unrealized Profit/Loss (for open positions, requires market data)
  daysToExpiration?: number;  // Days until the option expires (for open positions)
}

/**
 * Performance metrics for a set of positions
 */
export interface PerformanceMetrics {
  winRate: number;            // Percentage of winning trades
  averageProfit: number;      // Average profit on winning trades
  averageLoss: number;        // Average loss on losing trades
  profitFactor: number;       // Total profit / Total loss
  totalProfitLoss: number;    // Net P/L across all positions
}
