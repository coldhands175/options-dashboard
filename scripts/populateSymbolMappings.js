/**
 * Script to populate and maintain the symbol_mappings table in Xano
 * This handles delisted/changed symbols and maintains TradingView format mappings
 */

import fetch from 'node-fetch';

// Configuration
const POLYGON_API_KEY = 'z74avT5hoTIbszqRfJu5xJ0hRvbfSaQW';
const XANO_BASE_URL = 'https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO';
const WORKSPACE_ID = 1;
const SYMBOL_MAPPINGS_TABLE_ID = 45;

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate MCP tool calls (in a real implementation, you'd use the actual MCP client)
class MockMCPClient {
  async addTableContentBulk(tableId, workspaceId, items) {
    console.log(`📝 Mock: Adding ${items.length} items to table ${tableId}`);
    // In a real script, this would call the actual MCP client
    return { success: true, items };
  }
}

const mcpClient = new MockMCPClient();

/**
 * Convert Polygon exchange code to TradingView market prefix
 */
function getTradingViewMarketPrefix(polygonExchange) {
  const exchangeMap = {
    'XNAS': 'NASDAQ',
    'XNYS': 'NYSE',
    'ARCX': 'NYSE', // NYSE Arca
    'BATS': 'NASDAQ', // BATS is part of Cboe
    'XNGS': 'NASDAQ', // NASDAQ Global Select
    'XNCM': 'NASDAQ', // NASDAQ Capital Market
    'IEXG': 'NYSE', // IEX
    'EDGX': 'NASDAQ',
    'EDGA': 'NYSE',
  };
  
  return exchangeMap[polygonExchange] || 'NASDAQ'; // Default to NASDAQ
}

/**
 * Fetch ticker details from Polygon API with error handling
 */
async function getTickerDetails(symbol) {
  try {
    console.log(`🔍 Fetching details for ${symbol}...`);
    
    const url = `https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️  Symbol ${symbol} not found (possibly delisted)`);
        return { symbol, status: 'not_found', active: false };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.results) {
      console.log(`⚠️  No data available for ${symbol}`);
      return { symbol, status: 'no_data', active: false };
    }
    
    const result = data.results;
    
    // Check if the symbol is active
    if (!result.active) {
      console.log(`⚠️  Symbol ${symbol} is inactive/delisted`);
      return {
        symbol,
        status: 'inactive',
        active: false,
        name: result.name,
        ticker: result.ticker
      };
    }
    
    const marketPrefix = getTradingViewMarketPrefix(result.primary_exchange);
    
    return {
      symbol,
      status: 'active',
      active: true,
      ticker: result.ticker,
      name: result.name,
      market: result.market,
      primaryExchange: result.primary_exchange,
      marketPrefix,
      tradingViewSymbol: `${marketPrefix}:${symbol}`,
      type: result.type,
      locale: result.locale
    };
    
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error.message);
    return {
      symbol,
      status: 'error',
      active: false,
      error: error.message
    };
  }
}

/**
 * Save or update symbol mapping in Xano
 */
async function saveSymbolMapping(symbolData) {
  try {
    const payload = {
      symbol: symbolData.symbol,
      tradingview_symbol: symbolData.tradingViewSymbol || null,
      display_name: symbolData.name || symbolData.symbol,
      exchange_code: symbolData.primaryExchange || null,
      market_prefix: symbolData.marketPrefix || null,
      last_verified: new Date().toISOString(),
      is_active: symbolData.active
    };
    
    // For now, we'll use a simple POST to add table content
    // In a real implementation, you'd want to check if the symbol exists first
    const url = `${XANO_BASE_URL}/symbol_mappings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Saved ${symbolData.symbol} to Xano`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to save ${symbolData.symbol} to Xano:`, error.message);
    throw error;
  }
}

/**
 * Fetch traded symbols from Xano transactions
 */
async function getTradedSymbols() {
  try {
    console.log('📊 Fetching traded symbols from transactions...');
    
    const url = `${XANO_BASE_URL}/transactions`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const transactions = await response.json();
    
    // Extract unique symbols
    const symbols = [...new Set(
      transactions
        .map(transaction => transaction.Symbol)
        .filter(symbol => symbol && symbol.trim())
    )].sort();
    
    console.log(`📈 Found ${symbols.length} unique traded symbols:`, symbols.slice(0, 10));
    return symbols;
    
  } catch (error) {
    console.error('❌ Failed to fetch traded symbols:', error.message);
    return [];
  }
}

/**
 * Main function to populate symbol mappings
 */
async function populateSymbolMappings() {
  console.log('🚀 Starting symbol mappings population...');
  
  try {
    // Get symbols from multiple sources
    const defaultSymbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META', 'GOOGL'];
    const tradedSymbols = await getTradedSymbols();
    
    // Combine and deduplicate symbols
    const allSymbols = [...new Set([...defaultSymbols, ...tradedSymbols])].sort();
    
    console.log(`📋 Processing ${allSymbols.length} total symbols...`);
    
    const results = {
      processed: 0,
      active: 0,
      inactive: 0,
      errors: 0,
      notFound: 0
    };
    
    for (let i = 0; i < allSymbols.length; i++) {
      const symbol = allSymbols[i];
      
      try {
        console.log(`\n[${i + 1}/${allSymbols.length}] Processing ${symbol}...`);
        
        // Get ticker details from Polygon
        const symbolData = await getTickerDetails(symbol);
        results.processed++;
        
        // Update counters based on status
        switch (symbolData.status) {
          case 'active':
            results.active++;
            break;
          case 'inactive':
          case 'not_found':
            results.inactive++;
            if (symbolData.status === 'not_found') results.notFound++;
            break;
          case 'error':
            results.errors++;
            break;
        }
        
        // Save to Xano (even inactive symbols for record keeping)
        try {
          await saveSymbolMapping(symbolData);
        } catch (saveError) {
          console.error(`❌ Failed to save ${symbol}:`, saveError.message);
          results.errors++;
        }
        
        // Rate limiting: wait 12 seconds between requests (5 calls/minute limit)
        if (i < allSymbols.length - 1) {
          console.log('⏱️  Waiting 12 seconds for rate limit...');
          await delay(12000);
        }
        
      } catch (error) {
        console.error(`❌ Unexpected error processing ${symbol}:`, error.message);
        results.errors++;
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Total processed: ${results.processed}`);
    console.log(`🟢 Active symbols: ${results.active}`);
    console.log(`🟡 Inactive/delisted: ${results.inactive}`);
    console.log(`🔍 Not found: ${results.notFound}`);
    console.log(`❌ Errors: ${results.errors}`);
    
  } catch (error) {
    console.error('❌ Fatal error in populateSymbolMappings:', error.message);
  }
}

// Run the script
populateSymbolMappings()
  .then(() => {
    console.log('\n🎉 Symbol mappings population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export {
  populateSymbolMappings,
  getTickerDetails,
  saveSymbolMapping,
  getTradedSymbols
};
