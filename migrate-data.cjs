#!/usr/bin/env node

/**
 * Data Migration Script: Xano → Convex
 * This script fetches transaction data from Xano and migrates it to Convex
 */

const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const XANO_BASE_URL = 'https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO';
const XANO_AUTH_TOKEN = process.env.VITE_XANO_AUTH_TOKEN || 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.G6FZR-AZK2A_KPTQVgigIGKRQyoGmP0WsQ2ZyCSi6WgxPaiH3_l1MQA-g7lzFAIsOnpKTnpowv6FxrcMVijWzevjzAjnLDvF.6LlQol8UhpbE1XfHIRPkrg.IivmUWqJHu3a2-7pBr7DR-fbWAHHs2iDq3XVjha7tlyp7weZy5XCoMlqFBjXzFcKAvKZz8JiZQoYGrof-0bDOxLenQgRxakb3vF3ErC34z5o1eDZcJXotxXG0v7I6xy9zPybuU3OtktuXjmq9JrUBQ.XoogO-3gvxaRkeNcN4JJz00BEdsErcpldrDUqfcZubo';
const DEFAULT_USER_ID = 'migrated-user-' + Date.now();

// Utility functions
async function fetchFromXano(endpoint) {
  try {
    const response = await fetch(`${XANO_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${XANO_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Xano API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Failed to fetch from Xano:', error);
    throw error;
  }
}

async function addTradeToConvex(trade) {
  try {
    // Map Xano field names to Convex format
    const tradeTypeMapping = {
      'Sold': 'SELL_TO_OPEN',
      'Bought': 'BUY_TO_OPEN',
      'Buy to Close': 'BUY_TO_CLOSE', 
      'Sell to Close': 'SELL_TO_CLOSE'
    };
    
    const convexTrade = {
      userId: DEFAULT_USER_ID,
      transactionDate: trade.Transaction_Date || new Date().toISOString().split('T')[0],
      tradeType: tradeTypeMapping[trade.tradeType] || 'BUY_TO_OPEN',
      symbol: trade.Symbol || 'UNKNOWN',
      contractType: (trade.contractType || 'CALL').toUpperCase(),
      quantity: Math.abs(Number(trade.Quantity)) || 1,
      expirationDate: trade.StrikeDate || '2024-01-01',
      strikePrice: Number(trade.StrikePrice) || 0,
      premium: Math.abs(Number(trade.PremiumValue)) || 0,
      bookCost: Number(trade.Book_Cost) || 0,
      commission: 0,
      fees: 0,
      status: 'EXECUTED',
      notes: `Security Number: ${trade.Security_Number || ''}`,
    };

    // Remove undefined values to avoid Convex validation errors
    Object.keys(convexTrade).forEach(key => {
      if (convexTrade[key] === undefined) {
        delete convexTrade[key];
      }
    });

    const argsJson = JSON.stringify(convexTrade);
    const command = `npx convex run functions:addTrade '${argsJson}'`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('warn')) {
      throw new Error(`Convex CLI Error: ${stderr}`);
    }

    return JSON.parse(stdout.trim());
  } catch (error) {
    throw error;
  }
}

// Main migration function
async function migrateData() {
  console.log('🚀 Starting Xano → Convex Migration');
  console.log('==================================');

  try {
    // Step 1: Test connections
    console.log('🔍 Testing Xano connection...');
    const xanoTrades = await fetchFromXano('/transactions');
    console.log(`✅ Connected to Xano - Found ${xanoTrades.length} transactions`);

    if (xanoTrades.length === 0) {
      console.log('📭 No transactions found in Xano. Migration complete.');
      return;
    }

    // Step 2: Show sample data
    console.log('\n📝 Sample transaction from Xano:');
    console.log(JSON.stringify(xanoTrades[0], null, 2));

    // Step 3: Confirm migration
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`\n🤔 Do you want to migrate ${xanoTrades.length} transactions to Convex? (y/N): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled by user');
      return;
    }

    // Step 4: Migrate trades
    console.log('\n🔄 Starting migration...');
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < xanoTrades.length; i++) {
      const trade = xanoTrades[i];
      try {
        await addTradeToConvex(trade);
        successful++;
        
        // Show progress every 10 trades
        if ((i + 1) % 10 === 0 || i === xanoTrades.length - 1) {
          console.log(`📊 Progress: ${i + 1}/${xanoTrades.length} trades processed`);
        }
      } catch (error) {
        failed++;
        errors.push({
          trade: trade,
          error: error.message
        });
        console.log(`⚠️  Failed to migrate trade ${trade.id || i}: ${error.message}`);
      }

      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 5: Show results
    console.log('\n🎉 Migration Complete!');
    console.log('=====================');
    console.log(`✅ Successfully migrated: ${successful} trades`);
    console.log(`❌ Failed to migrate: ${failed} trades`);

    if (errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.error}`);
      });
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateData().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { migrateData };
