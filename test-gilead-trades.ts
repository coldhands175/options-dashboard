#!/usr/bin/env tsx

import { PositionManager } from './src/options/models/positionManager';
import { Trade } from './src/options/models/types';

/**
 * Test script to verify P&L calculations with Gilead trades
 * This script creates sample trades based on typical options scenarios
 */

// Sample Gilead trades with 2018-05-18 strike date
const gileadTrades: Omit<Trade, 'id'>[] = [
  // Opening trade: Sell covered call
  {
    transactionDate: '2018-04-15',
    tradeType: 'SELL_TO_OPEN',
    symbol: 'GILD',
    contractType: 'CALL',
    quantity: 2, // 2 contracts
    expirationDate: '2018-05-18',
    strikePrice: 75.00,
    premium: 1.25, // $1.25 per share premium received
    commission: 2.50, // $2.50 total fees for the trade
    bookCost: (2 * 1.25 * 100) - 2.50,
    status: 'EXECUTED'
  },
  
  // Closing trade: Buy back the call (profitable close)
  {
    transactionDate: '2018-05-10',
    tradeType: 'BUY_TO_CLOSE',
    symbol: 'GILD',
    contractType: 'CALL',
    quantity: 2, // 2 contracts
    expirationDate: '2018-05-18',
    strikePrice: 75.00,
    premium: 0.50, // $0.50 per share premium paid to close
    commission: 2.50, // $2.50 total fees for the trade
    bookCost: (2 * 0.50 * 100) + 2.50,
    status: 'EXECUTED'
  },
  
  // Another set of trades: Cash secured put
  {
    transactionDate: '2018-03-20',
    tradeType: 'SELL_TO_OPEN',
    symbol: 'GILD',
    contractType: 'PUT',
    quantity: 1, // 1 contract
    expirationDate: '2018-05-18',
    strikePrice: 70.00,
    premium: 2.00, // $2.00 per share premium received
    commission: 1.25, // $1.25 total fees
    bookCost: (1 * 2.00 * 100) - 1.25,
    status: 'EXECUTED'
  },
  
  // Let this one expire worthless (profitable)
  {
    transactionDate: '2018-05-18',
    tradeType: 'EXPIRATION',
    symbol: 'GILD',
    contractType: 'PUT',
    quantity: 1, // 1 contract
    expirationDate: '2018-05-18',
    strikePrice: 70.00,
    premium: 0.00, // Expired worthless
    commission: 0,
    bookCost: 0,
    status: 'EXECUTED'
  }
];

function runGileadTest() {
  console.log('🧪 Testing Gilead P&L Calculations with 2018-05-18 Strike Date');
  console.log('=' .repeat(70));
  
  // Initialize position manager with the trades
  const positionManager = new PositionManager(gileadTrades as Trade[]);
  
  // Get all positions
  const positions = positionManager.getPositions();
  
  console.log(`\n📊 Found ${positions.length} positions:`);
  
  positions.forEach((position, index) => {
    console.log(`\n--- Position ${index + 1} ---`);
    console.log(`ID: ${position.id}`);
    console.log(`Symbol: ${position.symbol}`);
    console.log(`Strategy: ${position.strategy}`);
    console.log(`Status: ${position.status}`);
    console.log(`Net Quantity: ${position.netQuantity}`);
    
    // Calculate P&L
    const pnl = position.realizedPL ?? 0;
    console.log(`
💰 P&L Breakdown:`);
    console.log(`  Total Premium: $${position.totalPremium.toFixed(2)}`);
    console.log(`  Total Commission: $${position.totalCommission.toFixed(2)}`);
    console.log(`  Net P&L: $${pnl.toFixed(2)} ${pnl >= 0 ? '✅' : '❌'}`);
    
    // Show trades for this position
    const trades = position.trades;
    console.log(`
📈 Trades (${trades.length}):`);
    trades.forEach(trade => {
      const tradeValue = trade.premium * trade.quantity * 100;
      const direction = trade.tradeType.startsWith('SELL') ? 'CREDIT' : 'DEBIT';
      console.log(`  ${trade.transactionDate}: ${trade.tradeType} ${trade.quantity} @ $${trade.premium} = $${tradeValue.toFixed(2)} ${direction} (commission: $${trade.commission})`);
    });
  });
  
  // Performance metrics
  const metrics = positionManager.calculatePerformanceMetrics();
  console.log(`\n📈 Performance Metrics:`);
  console.log(`  Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`  Total P&L: $${metrics.totalProfitLoss.toFixed(2)}`);
  console.log(`  Average Profit: $${metrics.averageProfit.toFixed(2)}`);
  console.log(`  Average Loss: $${metrics.averageLoss.toFixed(2)}`);
  console.log(`  Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
  
  console.log('\n' + '=' .repeat(70));
  console.log('🎯 Expected Results:');
  console.log('  Call Position: $250 - $100 = $150 profit (premium collected minus premium paid)');
  console.log('  Put Position: $200 - $1 = $199 profit (premium collected minus minimal close)');
  console.log('  Note: Fees are included in the Book_Cost and affect final P&L');
}

// Run the test if this file is executed directly
runGileadTest();

export { runGileadTest, gileadTrades };
