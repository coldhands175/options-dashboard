import { Trade, Position, PerformanceMetrics } from './types';

/**
 * Position Manager class that handles all position-related operations
 */
export class PositionManager {
  private trades: Trade[] = [];
  private positions: Position[] = [];

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
    
    const winners = closedPositions.filter(p => (p.profitLoss || 0) > 0);
    const losers = closedPositions.filter(p => (p.profitLoss || 0) <= 0);
    
    const winRate = winners.length / closedPositions.length;
    
    const totalProfit = winners.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
    const totalLoss = Math.abs(losers.reduce((sum, p) => sum + (p.profitLoss || 0), 0));
    
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
    // Clear existing positions but remember their IDs
    const existingPositionIds = new Map<string, string>();
    this.positions.forEach(position => {
      // Create a unique key for each position based on ticker+strike+expiration+type
      const positionKey = this.createPositionKey(
        position.ticker, 
        position.strike, 
        position.expiration,
        position.type
      );
      existingPositionIds.set(positionKey, position.id);
    });
    
    // Reset positions array
    this.positions = [];
    
    // Group trades by their position attributes (ticker, strike, expiration, type)
    const positionGroups = new Map<string, Trade[]>();
    
    // Sort trades by date for proper processing
    const sortedTrades = [...this.trades].sort(
      (a, b) => new Date(a.Transaction_Date).getTime() - new Date(b.Transaction_Date).getTime()
    );
    
    // Group trades
    sortedTrades.forEach(trade => {
      const positionKey = this.createPositionKey(
        trade.Symbol, 
        trade.StrikePrice, 
        trade.StrikeDate,
        trade.contractType // Using contractType for position grouping for now
      );
      
      if (!positionGroups.has(positionKey)) {
        positionGroups.set(positionKey, []);
      }
      
      positionGroups.get(positionKey)!.push(trade);
    });
    
    // Process each group to create or update positions
    positionGroups.forEach((groupTrades, positionKey) => {
      // Use existing position ID if available, or generate a new one
      const positionId = existingPositionIds.has(positionKey) 
        ? existingPositionIds.get(positionKey)! 
        : `pos-${this.generateUniqueId()}`;
      
      // Update positionId on all trades in this group
      groupTrades.forEach(trade => {
        trade.positionId = positionId;
      });
      
      // Create position from grouped trades
      const position = this.createPositionFromTrades(groupTrades, positionId);
      if (position) {
        this.positions.push(position);
      }
    });
  }

  /**
   * Create a unique key to identify positions
   */
  private createPositionKey(ticker: string, strike: number, expiration: string, type: string): string {
    return `${ticker}-${strike}-${expiration}-${type}`;
  }

  /**
   * Create a position from a group of trades
   */
  private createPositionFromTrades(trades: Trade[], positionId: string): Position | null {
    if (trades.length === 0) return null;

    const firstTrade = trades[0];
    const expiration = firstTrade.StrikeDate;


    let currentQuantity = 0;
    let openDate = firstTrade.Transaction_Date;
    let closeDate: string | undefined;
    let profitLoss = 0;
    let status: 'Open' | 'Closed' | 'Expired' = 'Open';
    openDate = firstTrade.Transaction_Date;
    closeDate = undefined;

    trades.forEach(trade => {


      // Calculate quantity
      if (trade.tradeType === 'Buy') {
        if (trade.status === 'Open') {
          currentQuantity += trade.Quantity;
        } else { // Close
          currentQuantity -= trade.Quantity;
        }
      } else if (trade.tradeType === 'Sell') {
        if (trade.status === 'Open') {
          currentQuantity -= trade.Quantity;
        } else { // Close
          currentQuantity += trade.Quantity;
        }
      }

      // Calculate profit/loss
      const premiumEffect = trade.tradeType === 'Sell' ? 1 : -1; // Sell is credit (+), Buy is debit (-)
      profitLoss += (trade.PremiumValue * premiumEffect * 100) - trade.Book_Cost;
    });

    const expirationDate = new Date(expiration);


    const today = new Date(); // Get current date for comparison

    if (currentQuantity === 0) {
      // Position was explicitly closed by trades
      status = 'Closed';
      closeDate = trades[trades.length - 1].Transaction_Date;
    } else if (expirationDate < today) {
      // Position has contracts remaining, but expiration date has passed
      status = 'Expired';
      closeDate = expiration; // Use expiration date as close date for expired positions
    } else {
      // Position is still open
      status = 'Open';
      closeDate = undefined;
    }

    // Create position object
    const position: Position = {
      id: positionId,
      ticker: firstTrade.Symbol, // Use Symbol from Trade
      strike: firstTrade.StrikePrice, // Use StrikePrice from Trade
      expiration: firstTrade.StrikeDate, // Use StrikeDate from Trade
      type: firstTrade.contractType, // Use contractType from Trade
      status,
      openDate,
      closeDate,
      trades: trades.map(t => t.id),
      currentQuantity: Math.abs(currentQuantity), // Store as absolute value
      profitLoss
    };

    return position;
  }


  /**
   * Generate a unique trade ID
   */
  private generateTradeId(): number {
    // Find highest ID and increment by 1
    const highestId = this.trades.reduce(
      (max, trade) => Math.max(max, trade.id), 
      0
    );
    return highestId + 1;
  }

  /**
   * Generate a unique string ID for positions
   */
  private generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
