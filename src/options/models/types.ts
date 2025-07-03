/**
 * Core types for options trading application
 */

/**
 * Represents an individual options trade/transaction
 */
export interface Trade {
  id: number;
  Transaction_Date: string; // Date the trade was executed (YYYY-MM-DD)
  tradeType: string;        // Type of trade (e.g., 'Buy', 'Sell')
  Symbol: string;           // Stock symbol
  contractType: string;     // Contract type (e.g., 'PUT', 'CALL')
  Quantity: number;         // Number of contracts
  StrikeDate: string;       // Strike date (YYYY-MM-DD)
  StrikePrice: number;      // Strike price
  PremiumValue: number;     // Premium received/paid per contract
  Book_Cost: number;        // Book cost of the trade
  Security_Number?: string; // Optional security number
  status: string;           // Status of the trade (e.g., 'Open', 'Closed')
  profitLoss?: number;      // Profit/Loss for closed trades
  positionId?: string;      // ID of the position this trade belongs to
}

/**
 * Represents an options position (collection of related trades)
 */
export interface Position {
  id: string;                 // Unique identifier
  ticker: string;             // Stock symbol
  strike: number;             // Strike price 
  expiration: string;         // Option expiration date (YYYY-MM-DD)
  type: string;               // Strategy type (Covered Call, CSP, etc.)
  status: 'Open' | 'Closed' | 'Expired';  // Position status
  openDate: string;           // Date position was opened
  closeDate?: string;         // Date position was closed (if closed)
  trades: number[];           // References to component trade IDs
  currentQuantity: number;    // Current size of position (0 if closed)
  totalSalesBookCost: number; // Accumulation of absolute book costs from 'sell' trades
  totalPurchasesBookCost: number; // Accumulation of absolute book costs from 'buy' trades

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
