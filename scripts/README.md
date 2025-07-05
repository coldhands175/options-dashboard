# Symbol Mappings Population Script

This script populates the `symbol_mappings` table in Xano with correct TradingView market prefixes for stock symbols.

## Prerequisites

1. Install Node.js dependencies:
```bash
npm install node-fetch
```

2. Make sure your Xano API is accessible and the `symbol_mappings` table exists.

## Running the Script

```bash
node scripts/populateSymbolMappings.js
```

## What it does

1. **Fetches traded symbols** from your Xano transactions table
2. **Combines with default symbols** (AAPL, MSFT, etc.)
3. **Looks up each symbol** using Polygon API to get:
   - Company name
   - Primary exchange (NASDAQ, NYSE, etc.)
   - Active status
4. **Handles errors gracefully**:
   - Delisted companies
   - Changed symbols
   - API rate limits
5. **Saves to Xano** with proper TradingView format (NYSE:SYMBOL, NASDAQ:SYMBOL)

## Error Handling

- **Delisted symbols**: Marked as inactive but kept for historical reference
- **Not found**: Logged and marked as inactive
- **API errors**: Retries and graceful degradation
- **Rate limiting**: Waits 12 seconds between API calls (Polygon free tier: 5/minute)

## Expected Output

```
🚀 Starting symbol mappings population...
📊 Fetching traded symbols from transactions...
📈 Found 25 unique traded symbols: AAPL, MSFT, TSLA...
📋 Processing 32 total symbols...

[1/32] Processing AAPL...
🔍 Fetching details for AAPL...
✅ Saved AAPL to Xano

⏱️  Waiting 12 seconds for rate limit...

[2/32] Processing MSFT...
🔍 Fetching details for MSFT...
✅ Saved MSFT to Xano

...

📊 SUMMARY:
✅ Total processed: 32
🟢 Active symbols: 28
🟡 Inactive/delisted: 3
🔍 Not found: 1
❌ Errors: 0

🎉 Symbol mappings population completed!
```

## Maintenance

Run this script periodically to:
- Add new symbols from recent trades
- Update market information for existing symbols
- Mark delisted companies as inactive

The cache-first approach in your app will use these mappings instead of hitting the Polygon API on every page load.
