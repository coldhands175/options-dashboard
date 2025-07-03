import { Trade, Position, PerformanceMetrics } from './types';

/**
 * Position Manager class that handles all position-related operations
 */
export class PositionManager {
  private trades: Trade[] = [];
  private positions: Position[] = [];
  private _nextId: number = 1;
  private _tradeIdCounter: number = 1;

  private generateTradeId(): number {
    return this._tradeIdCounter++;
  }

  private generateUniqueId(): number {
    return this._nextId++;
  }

  private createPositionKey(
    symbol: string,
    strikePrice: number,
    strikeDate: string,
    contractType: string
  ): string {
    return `${symbol}-${strikePrice}-${strikeDate}-${contractType}`;
  }

  private parseExpirationDate(dateString: string): Date | null {
    if (!dateString) return null;

    try {
      let date: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parts = dateString.split('-').map(Number);
        // YYYY-MM-DD -> new Date(year, monthIndex, day)
        date = new Date(parts[0], parts[1] - 1, parts[2]);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        const parts = dateString.split('/').map(Number);
        // MM/DD/YYYY -> new Date(year, monthIndex, day)
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
        const parts = dateString.split('-').map(Number);
        // MM-DD-YYYY -> new Date(year, monthIndex, day)
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      } else {
        // Fallback for other formats, might still have issues
        date = new Date(dateString);
      }

      // Ensure it's a valid date and set to local midnight
      if (isNaN(date.getTime())) {
        return null;
      }
      date.setHours(0, 0, 0, 0); // Ensure local midnight
      return date;
    } catch (e) {
      console.error(`Error parsing date string: ${dateString}`, e);
      return null;
    }
  }


  /**
   * Initialize with optional initial trades
   */
  constructor(initialTrades: Trade[] = []) {
    if (initialTrades.length > 0) {
      // Process initial trades to create positions
      this.trades = [...initialTrades];
      this.syncPositions();
    }
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Get all positions
   */
  getPositions(): Position[] {
    this.syncPositions(); // Ensure positions are up-to-date before returning
    return [...this.positions];
  }

  /**
   * Add a new trade and update affected positions
   */
  addTrade(trade: Omit<Trade, 'id'>): Trade {
    const newTrade: Trade = {
      ...trade,
      id: this.generateTradeId(),
      positionId: '' // Will be assigned during position processing
    };
    this.trades.push(newTrade);
    this.syncPositions(); // Re-sync all positions after adding a trade
    return newTrade;
  }

  /**
   * Add multiple trades at once (e.g., for bulk import)
   */
  addTrades(trades: Omit<Trade, 'id'>[]): Trade[] {
    const addedTrades: Trade[] = [];
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.Transaction_Date).getTime() - new Date(b.Transaction_Date).getTime()
    );
    sortedTrades.forEach(trade => {
      addedTrades.push(this.addTrade(trade));
    });
    return addedTrades;
  }

  /**
   * Delete a trade and update affected positions
   */
  deleteTrade(tradeId: number): boolean {
    const tradeIndex = this.trades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return false;
    this.trades.splice(tradeIndex, 1);
    this.syncPositions();
    return true;
  }

  /**
   * Update an existing trade
   */
  updateTrade(tradeId: number, updates: Partial<Trade>): Trade | null {
    const tradeIndex = this.trades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return null;
    const updatedTrade = {
      ...this.trades[tradeIndex],
      ...updates
    };
    this.trades[tradeIndex] = updatedTrade;
    this.syncPositions();
    return updatedTrade;
  }

  /**
   * Find a position by ID
   */
  getPositionById(positionId: string): Position | null {
    return this.positions.find(p => p.id === positionId) || null;
  }

  /**
   * Get trades for a specific position
   */
  getTradesForPosition(positionId: string): Trade[] {
    return this.trades.filter(trade => trade.positionId === positionId)
      .sort((a, b) => new Date(a.Transaction_Date).getTime() - new Date(b.Transaction_Date).getTime());
  }

  /**
   * Get open positions
   */
  getOpenPositions(): Position[] {
    return this.positions.filter(p => p.status === 'Open');
  }

  /**
   * Get closed positions
   */
  getClosedPositions(): Position[] {
    return this.positions.filter(p => p.status === 'Closed');
  }

  /**
   * Calculate performance metrics for all closed positions
   */
  calculatePerformanceMetrics(): PerformanceMetrics {
    const closedPositions = this.getClosedPositions();
    
    if (closedPositions.length === 0) {
      return {
        winRate: 0,
        averageProfit: 0,
        averageLoss: 0,
        profitFactor: 0,
        totalProfitLoss: 0
      };
    }
    
    const winners = closedPositions.filter(p => (p.totalSalesBookCost - p.totalPurchasesBookCost) > 0);
    const losers = closedPositions.filter(p => (p.totalSalesBookCost - p.totalPurchasesBookCost) <= 0);
    
    const winRate = winners.length / closedPositions.length;
    
    const totalProfit = winners.reduce((sum, p) => sum + (p.totalSalesBookCost - p.totalPurchasesBookCost), 0);
    const totalLoss = Math.abs(losers.reduce((sum, p) => sum + (p.totalSalesBookCost - p.totalPurchasesBookCost), 0));
    
    const averageProfit = winners.length > 0 ? totalProfit / winners.length : 0;
    const averageLoss = losers.length > 0 ? totalLoss / losers.length : 0;
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    const totalProfitLoss = totalProfit - totalLoss;
    
    return {
      winRate,
      averageProfit,
      averageLoss,
      profitFactor,
      totalProfitLoss
    };
  }

  /**
   * Handle assignment or exercise of options
   */
  handleAssignmentOrExercise(
    positionId: string, 
    transactionDate: string, 
    fees: number = 0
  ): { updatedPosition: Position; newTrade: Trade } | null {
    const position = this.getPositionById(positionId);
    if (!position || position.status === 'Closed') return null;
    
    const newTrade: Trade = {
      id: this.generateTradeId(),
      Transaction_Date: transactionDate,
      Symbol: position.ticker,
      StrikePrice: position.strike,
      StrikeDate: position.expiration,
      tradeType: position.type.includes('Covered') || position.type.includes('Cash Secured') ? 'Buy' : 'Sell', 
      contractType: position.type, 
      PremiumValue: 0,
      Quantity: position.currentQuantity,
      Book_Cost: fees,
      status: 'Closed',
      positionId: position.id
    };
    
    this.trades.push(newTrade);
    this.syncPositions();
    
    const updatedPosition = this.getPositionById(positionId);
    if (!updatedPosition) return null;
    
    return { updatedPosition, newTrade };
  }

  /**
   * Roll a position to a new expiration/strike
   */
  rollPosition(
    positionId: string,
    transactionDate: string,
    newStrike: number,
    newExpiration: string,
    closePremium: number,
    openPremium: number,
    quantity: number,
    fees: number = 0
  ): {
    closingTrade: Trade;
    openingTrade: Trade;
    oldPosition: Position;
    newPosition: Position;
  } | null {
    const position = this.getPositionById(positionId);
    if (!position || position.status === 'Closed') return null;
    
    if (quantity > position.currentQuantity) {
      console.error('Cannot roll more contracts than exist in position');
      return null;
    }
    
    const closingTrade: Trade = {
      id: this.generateTradeId(),
      Transaction_Date: transactionDate,
      Symbol: position.ticker,
      StrikePrice: position.strike,
      StrikeDate: position.expiration,
      tradeType: position.type.includes('Covered') || position.type.includes('Cash Secured') ? 'Buy' : 'Sell', 
      contractType: position.type, 
      PremiumValue: closePremium,
      Quantity: quantity,
      Book_Cost: fees / 2,
      status: 'Closed',
      positionId: position.id
    };
    
    this.trades.push(closingTrade);
    
    const openingTrade: Trade = {
      id: this.generateTradeId(),
      Transaction_Date: transactionDate,
      Symbol: position.ticker,
      StrikePrice: newStrike,
      StrikeDate: newExpiration,
      tradeType: position.type.includes('Covered') || position.type.includes('Cash Secured') ? 'Sell' : 'Buy', 
      contractType: position.type, 
      PremiumValue: openPremium,
      Quantity: quantity,
      Book_Cost: fees / 2,
      status: 'Open',
      positionId: '' 
    };
    
    this.trades.push(openingTrade);
    this.syncPositions();
    
    const updatedOldPosition = this.getPositionById(positionId);
    if (!updatedOldPosition) return null;
    
    const newPosition = this.positions.find(p => 
      p.ticker === position.ticker &&
      p.strike === newStrike &&
      p.expiration === newExpiration &&
      p.type === position.type &&
      p.status === 'Open'
    );
    
    if (!newPosition) return null;
    
    return {
      closingTrade,
      openingTrade,
      oldPosition: updatedOldPosition,
      newPosition
    };
  }

  /**
   * Main method to synchronize positions based on all trades
   */
  private syncPositions(): void {
    // Clear existing positions to re-sync
    this.positions = [];

    // Sort trades by transaction date to process them chronologically
    this.trades.sort((a, b) => new Date(a.Transaction_Date).getTime() - new Date(b.Transaction_Date).getTime());

    // Map to hold currently open positions, keyed by a unique identifier (ticker-strike-expiration-type)
    const openPositions = new Map<string, Position>();

    this.trades.forEach(trade => {
      const positionKey = this.createPositionKey(
        trade.Symbol,
        trade.StrikePrice,
        trade.StrikeDate,
        trade.contractType
      );

      let currentPosition = openPositions.get(positionKey);

      // The trade data is already normalized to lowercase in the Positions component
      // So we can directly use the status values
      const tradeAction = `${trade.tradeType}/${trade.status}`;

      // Since all trades are individual actions marked as 'open',
      // we need to determine position status based on net quantity later
      // For now, treat all trades as contributing to the position
      
      if (true) { // Process all trades
        if (!currentPosition) {
          // Create a new position if one doesn't exist for this key
          currentPosition = {
            id: `pos-${this.generateUniqueId()}`,
            ticker: trade.Symbol,
            strike: trade.StrikePrice,
            expiration: trade.StrikeDate,
            type: trade.contractType,
            status: 'Open',
            openDate: trade.Transaction_Date,
            trades: [],
            currentQuantity: 0,
            totalSalesBookCost: 0,
            totalPurchasesBookCost: 0,
          };
          openPositions.set(positionKey, currentPosition);
        }

        // Add trade to position and update quantity
        currentPosition.trades.push(trade.id);
        currentPosition.currentQuantity += trade.tradeType === 'sell' ? -trade.Quantity : trade.Quantity;
        
        // For options P&L calculation using Book_Cost (includes US tax fees):
        // Book_Cost is the actual cash flow amount including all fees
        if (trade.tradeType === 'sell') {
          // Selling generates credit - use absolute value of Book_Cost
          currentPosition.totalSalesBookCost += Math.abs(trade.Book_Cost);
        } else if (trade.tradeType === 'buy') {
          // Buying generates debit - use absolute value of Book_Cost
          currentPosition.totalPurchasesBookCost += Math.abs(trade.Book_Cost);
        }

        // All trades are processed the same way since they're individual actions
        // Position status will be determined later based on net quantity
      }
    });

    // Add any remaining open positions to the final positions array
    openPositions.forEach(position => {
      // Determine if position should be marked as Closed or Expired
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (position.status === 'Open' && position.expiration) {
        const expirationDate = this.parseExpirationDate(position.expiration);
        if (expirationDate && expirationDate < today) {
          // Determine status based on whether the position was actively closed (net quantity = 0)
          // or just expired (net quantity != 0)
          if (position.currentQuantity === 0) {
            // Net quantity is zero - position was actively closed by offsetting trades
            position.status = 'Closed';
          } else {
            // Net quantity is not zero - position expired with open contracts
            position.status = 'Expired';
          }
          position.closeDate = position.expiration;
        }
      }
      this.positions.push(position);
    });
  }
}
