import { Trade, Position, PerformanceMetrics } from './types';

/**
 * Position Manager class that handles all position-related operations.
 * This class is responsible for creating, updating, and managing positions
 * based on a series of trades.
 */
export class PositionManager {
  private trades: Trade[] = [];
  private positions: Position[] = [];
  private _nextPositionId: number = 1;
  private _nextTradeId: number = 1;

  private generateTradeId(): number {
    return this._nextTradeId++;
  }

  private generatePositionId(): string {
    return `pos-${this._nextPositionId++}`;
  }

  private createPositionKey(trade: Pick<Trade, 'symbol' | 'strikePrice' | 'expirationDate' | 'contractType'>): string {
    return `${trade.symbol}-${trade.expirationDate}-${trade.strikePrice}-${trade.contractType}`;
  }

  constructor(initialTrades: Omit<Trade, 'id'>[] = []) {
    if (initialTrades.length > 0) {
      this.addTrades(initialTrades);
    }
  }

  getTrades(): Trade[] {
    return [...this.trades];
  }

  getPositions(): Position[] {
    return [...this.positions];
  }

  addTrade(trade: Omit<Trade, 'id'>): Trade {
    const newTrade: Trade = {
      ...trade,
      id: this.generateTradeId(),
    };
    this.trades.push(newTrade);
    this.syncPositions();
    return newTrade;
  }

  addTrades(trades: Omit<Trade, 'id'>[]): Trade[] {
    const addedTrades = trades.map(trade => ({
      ...trade,
      id: this.generateTradeId(),
    }));
    this.trades.push(...addedTrades);
    this.syncPositions();
    return addedTrades;
  }

  deleteTrade(tradeId: number): boolean {
    const index = this.trades.findIndex(t => t.id === tradeId);
    if (index === -1) return false;
    this.trades.splice(index, 1);
    this.syncPositions();
    return true;
  }

  updateTrade(tradeId: number, updates: Partial<Omit<Trade, 'id'>>): Trade | null {
    const index = this.trades.findIndex(t => t.id === tradeId);
    if (index === -1) return null;
    const updatedTrade = { ...this.trades[index], ...updates } as Trade;
    this.trades[index] = updatedTrade;
    this.syncPositions();
    return updatedTrade;
  }

  getPositionById(positionId: string): Position | null {
    return this.positions.find(p => p.id === positionId) || null;
  }

  getOpenPositions(): Position[] {
    return this.positions.filter(p => p.status === 'OPEN');
  }

  getClosedPositions(): Position[] {
    return this.positions.filter(p => p.status === 'CLOSED');
  }

  calculatePerformanceMetrics(): PerformanceMetrics {
    const closed = this.getClosedPositions();
    if (closed.length === 0) {
      return { winRate: 0, averageProfit: 0, averageLoss: 0, profitFactor: 0, totalProfitLoss: 0 };
    }
    const winners = closed.filter(p => (p.realizedPL ?? 0) > 0);
    const losers = closed.filter(p => (p.realizedPL ?? 0) <= 0);
    const totalProfit = winners.reduce((sum, p) => sum + (p.realizedPL ?? 0), 0);
    const totalLoss = Math.abs(losers.reduce((sum, p) => sum + (p.realizedPL ?? 0), 0));
    return {
      winRate: winners.length / closed.length,
      averageProfit: winners.length > 0 ? totalProfit / winners.length : 0,
      averageLoss: losers.length > 0 ? totalLoss / losers.length : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0),
      totalProfitLoss: totalProfit - totalLoss,
    };
  }

  private syncPositions(): void {
    const positionMap = new Map<string, Position>();
    const sortedTrades = [...this.trades].sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

    for (const trade of sortedTrades) {
      const positionKey = this.createPositionKey(trade);
      let position = positionMap.get(positionKey);

      if (!position) {
        position = {
          id: this.generatePositionId(),
          symbol: trade.symbol,
          strikePrice: trade.strikePrice,
          expirationDate: trade.expirationDate,
          contractType: trade.contractType,
          strategy: 'SINGLE_LEG', // Default strategy
          status: 'OPEN',
          trades: [],
          netQuantity: 0,
          totalPremium: 0,
          totalCommission: 0,
          totalFees: 0,
          openDate: trade.transactionDate,
        };
        positionMap.set(positionKey, position);
      }

      trade.positionId = position.id;
      position.trades.push(trade);

      const sign = trade.tradeType.startsWith('SELL') ? 1 : -1;
      position.netQuantity -= sign * trade.quantity;
      position.totalPremium += sign * trade.bookCost;
      position.totalCommission += trade.commission ?? 0;
      position.totalFees += trade.fees ?? 0;

      if (position.netQuantity === 0) {
        position.status = 'CLOSED';
        position.closeDate = trade.transactionDate;
        position.realizedPL = position.totalPremium;
      } else {
        position.status = 'OPEN';
        delete position.closeDate;
        delete position.realizedPL;
      }
    }

    this.positions = Array.from(positionMap.values());
  }
}

