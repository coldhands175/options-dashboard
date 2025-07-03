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
    Transaction_Date: '2018-04-15',
    tradeType: 'sell',
    Symbol: 'GILD',
    contractType: 'CALL',
    Quantity: 2, // 2 contracts
    StrikeDate: '2018-05-18',
    StrikePrice: 75.00,
    PremiumValue: 1.25, // $1.25 per share premium received
    Book_Cost: 2.50, // $2.50 total fees for the trade
    status: 'open'
  },
  
  // Closing trade: Buy back the call (profitable close)
  {
    Transaction_Date: '2018-05-10',
    tradeType: 'buy',
    Symbol: 'GILD',
    contractType: 'CALL',
    Quantity: 2, // 2 contracts
    StrikeDate: '2018-05-18',
    StrikePrice: 75.00,
    PremiumValue: 0.50, // $0.50 per share premium paid to close
    Book_Cost: 2.50, // $2.50 total fees for the trade
    status: 'close'
  },
  
  // Another set of trades: Cash secured put
  {
    Transaction_Date: '2018-03-20',
    tradeType: 'sell',
    Symbol: 'GILD',
    contractType: 'PUT',
    Quantity: 1, // 1 contract
    StrikeDate: '2018-05-18',
    StrikePrice: 70.00,
    PremiumValue: 2.00, // $2.00 per share premium received
    Book_Cost: 1.25, // $1.25 total fees
    status: 'open'
  },
  
  // Let this one expire worthless (profitable)
  {
    Transaction_Date: '2018-05-18',
    tradeType: 'buy',
    Symbol: 'GILD',
    contractType: 'PUT',
    Quantity: 1, // 1 contract
    StrikeDate: '2018-05-18',
    StrikePrice: 70.00,
    PremiumValue: 0.01, // $0.01 per share (essentially worthless)
    Book_Cost: 1.25, // $1.25 fees
    status: 'close'
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
    console.log(`Symbol: ${position.ticker}`);
    console.log(`Type: ${position.type}`);
    console.log(`Strike: $${position.strike}`);
    console.log(`Expiration: ${position.expiration}`);
    console.log(`Status: ${position.status}`);
    console.log(`Quantity: ${position.currentQuantity}`);
    
    // Calculate P&L
    const pnl = position.totalSalesBookCost - position.totalPurchasesBookCost;
    console.log(`\n💰 P&L Breakdown:`);
    console.log(`  Total Credits (Sales): $${position.totalSalesBookCost.toFixed(2)}`);
    console.log(`  Total Debits (Purchases): $${position.totalPurchasesBookCost.toFixed(2)}`);
    console.log(`  Net P&L: $${pnl.toFixed(2)} ${pnl >= 0 ? '✅' : '❌'}`);
    
    // Show trades for this position
    const trades = positionManager.getTradesForPosition(position.id);
    console.log(`\n📈 Trades (${trades.length}):`);
    trades.forEach(trade => {
      const tradeValue = trade.PremiumValue * trade.Quantity * 100;
      const direction = trade.tradeType === 'sell' ? 'CREDIT' : 'DEBIT';
      console.log(`  ${trade.Transaction_Date}: ${trade.tradeType.toUpperCase()} ${trade.Quantity} @ $${trade.PremiumValue} = $${tradeValue} ${direction} (fees: $${trade.Book_Cost})`);
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
