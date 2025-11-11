# Tradier Integration Guide

This document explains how to integrate Tradier API into your components and pages.

---

## Quick Start

### 1. Setup (One-time)

Follow [TRADIER_SETUP.md](../TRADIER_SETUP.md) to get your API key and add it to Convex.

### 2. Import the API

```typescript
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
```

### 3. Use in Components

```typescript
const MyComponent = () => {
  const getQuotes = useAction(api.tradier.getStockQuotes);

  const fetchQuotes = async () => {
    const quotes = await getQuotes({ symbols: ["AAPL", "MSFT"] });
    console.log(quotes);
  };

  return <button onClick={fetchQuotes}>Get Quotes</button>;
};
```

---

## Usage Examples

### Example 1: Fetch Multiple Stock Quotes

```typescript
"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

export function StockQuotes({ symbols }: { symbols: string[] }) {
  const getQuotes = useAction(api.tradier.getStockQuotes);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const data = await getQuotes({ symbols });
        setQuotes(data);
      } catch (error) {
        console.error("Failed to fetch quotes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();

    // Refresh every 30 seconds
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [symbols, getQuotes]);

  if (loading) return <div>Loading quotes...</div>;

  return (
    <div>
      {Object.entries(quotes).map(([symbol, quote]) => (
        <div key={symbol}>
          <h3>{symbol}</h3>
          <p>Price: ${quote.last}</p>
          <p>Change: {quote.changePercent}%</p>
          <p>Bid/Ask: ${quote.bid} / ${quote.ask}</p>
          <p>Volume: {quote.volume?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Single Stock Quote with Real-time Updates

```typescript
"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

interface QuoteData {
  symbol: string;
  last?: number;
  change?: number;
  changePercent?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  asOf: number;
}

export function LiveStockQuote({ symbol }: { symbol: string }) {
  const getQuote = useAction(api.tradier.getStockQuote);
  const [quote, setQuote] = useState<QuoteData | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchQuote = async () => {
      try {
        const data = await getQuote({ symbol });
        if (mounted && data) {
          setQuote(data);
        }
      } catch (error) {
        console.error("Quote fetch error:", error);
      }
    };

    fetchQuote();
    const interval = setInterval(fetchQuote, 10000); // 10s refresh

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, getQuote]);

  if (!quote) return <div>Loading {symbol}...</div>;

  const isPositive = (quote.change ?? 0) >= 0;

  return (
    <div className="border rounded p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{quote.symbol}</h2>
        <span className="text-sm text-gray-500">
          {new Date(quote.asOf).toLocaleTimeString()}
        </span>
      </div>

      <div className="mt-2">
        <div className="text-3xl font-bold">${quote.last?.toFixed(2)}</div>
        <div className={`text-lg ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? "+" : ""}{quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-gray-500">Bid</div>
          <div className="font-semibold">${quote.bid?.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Ask</div>
          <div className="font-semibold">${quote.ask?.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Volume</div>
          <div className="font-semibold">{quote.volume?.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Spread</div>
          <div className="font-semibold">
            ${((quote.ask ?? 0) - (quote.bid ?? 0)).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Example 3: Watchlist with Tradier Quotes

```typescript
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

export function TradierWatchlist() {
  const watchlist = useQuery(api.watchlist.list);
  const getQuotes = useAction(api.tradier.getStockQuotes);
  const [quotes, setQuotes] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!watchlist || watchlist.length === 0) return;

    const symbols = watchlist.map(item => item.symbol);

    const fetchQuotes = async () => {
      const data = await getQuotes({ symbols });
      setQuotes(data);
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [watchlist, getQuotes]);

  if (!watchlist) return <div>Loading watchlist...</div>;

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Price</th>
          <th>Change</th>
          <th>Volume</th>
          <th>Bid/Ask</th>
        </tr>
      </thead>
      <tbody>
        {watchlist.map(item => {
          const quote = quotes[item.symbol];
          const isPositive = (quote?.changePercent ?? 0) >= 0;

          return (
            <tr key={item._id}>
              <td className="font-semibold">{item.symbol}</td>
              <td>${quote?.last?.toFixed(2) ?? "—"}</td>
              <td className={isPositive ? "text-green-600" : "text-red-600"}>
                {quote?.changePercent?.toFixed(2) ?? "—"}%
              </td>
              <td>{quote?.volume?.toLocaleString() ?? "—"}</td>
              <td className="text-sm text-gray-600">
                ${quote?.bid?.toFixed(2)} / ${quote?.ask?.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

### Example 4: Replace Yahoo Finance with Tradier

**Before (using Yahoo Finance):**
```typescript
const quotes = await ctx.runAction(api.quotes.batchPrevClose, { symbols });
```

**After (using Tradier):**
```typescript
const quotes = await ctx.runAction(api.tradier.getStockQuotes, { symbols });
```

**Migration Helper Function:**
```typescript
// convex/helpers.ts
export const getQuotesUnified = action({
  args: { symbols: v.array(v.string()), useTradier: v.optional(v.boolean()) },
  handler: async (ctx, { symbols, useTradier = true }) => {
    if (useTradier) {
      // Use Tradier (real-time)
      return await ctx.runAction(api.tradier.getStockQuotes, { symbols });
    } else {
      // Fallback to Yahoo Finance
      return await ctx.runAction(api.quotes.batchPrevClose, { symbols });
    }
  }
});
```

---

## Advanced: Options Chain Integration

### Get Available Expirations

```typescript
const getExpirations = useAction(api.tradier.getOptionsExpirations);

const expirations = await getExpirations({ underlying: "AAPL" });
// Returns: ["2024-01-19", "2024-01-26", "2024-02-02", ...]
```

### Get Options Chain (Coming Soon)

```typescript
const getChain = useAction(api.tradier.getOptionsChain);

const chain = await getChain({
  underlying: "AAPL",
  expiration: "2024-01-19",
  greeks: true
});
```

---

## Best Practices

### 1. Caching

Tradier has rate limits. Cache quotes to avoid excessive requests:

```typescript
const [quoteCache, setQuoteCache] = useState<Record<string, any>>({});
const [lastFetch, setLastFetch] = useState(0);

const fetchQuotes = async (symbols: string[]) => {
  const now = Date.now();

  // Only fetch if > 30 seconds since last fetch
  if (now - lastFetch < 30000) {
    return quoteCache;
  }

  const quotes = await getQuotes({ symbols });
  setQuoteCache(quotes);
  setLastFetch(now);
  return quotes;
};
```

### 2. Error Handling

Always handle API errors gracefully:

```typescript
try {
  const quotes = await getQuotes({ symbols });
  setQuotes(quotes);
  setError(null);
} catch (error) {
  console.error("Quote fetch failed:", error);
  setError("Failed to load quotes. Using cached data.");
  // Fall back to cached data or show error UI
}
```

### 3. Batch Requests

Fetch multiple symbols in one request instead of individual calls:

```typescript
// ❌ Bad - 10 API calls
for (const symbol of symbols) {
  await getQuote({ symbol });
}

// ✅ Good - 1 API call
const quotes = await getQuotes({ symbols });
```

### 4. Refresh Intervals

Choose appropriate refresh rates:
- **Real-time trading**: 5-10 seconds
- **Dashboard/watchlist**: 30-60 seconds
- **Research pages**: 2-5 minutes
- **Historical views**: No auto-refresh needed

### 5. Loading States

Always show loading states during fetches:

```typescript
{loading ? (
  <div>Loading quotes...</div>
) : error ? (
  <div className="text-red-600">{error}</div>
) : (
  <QuoteDisplay quotes={quotes} />
)}
```

---

## Testing Your Integration

### 1. Test in Convex Dashboard

1. Go to https://dashboard.convex.dev/
2. Select your project
3. Go to Functions tab
4. Run `tradierTest:healthCheck` to verify API is working
5. Run `tradierTest:runTestSuite` for comprehensive tests

### 2. Test in Your App

Create a test page:

```typescript
// app/test-tradier/page.tsx
"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TestTradierPage() {
  const getQuote = useAction(api.tradier.getStockQuote);

  const testQuote = async () => {
    const quote = await getQuote({ symbol: "AAPL" });
    console.log("Quote:", quote);
    alert(`AAPL: $${quote?.last}`);
  };

  return (
    <div className="p-8">
      <h1>Tradier API Test</h1>
      <button onClick={testQuote} className="btn">
        Get AAPL Quote
      </button>
    </div>
  );
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "TRADIER_API_KEY not set" | Run `npx convex env set TRADIER_API_KEY your_key` |
| Rate limit exceeded (429) | Implement caching, reduce refresh rate, or upgrade plan |
| No data returned | Check if symbol is valid, try "SPY" as a test |
| Stale data | Verify `TRADIER_SANDBOX=true` uses 15-min delayed data |

---

## Next Steps

1. ✅ Set up Tradier API key
2. ✅ Test with `tradierTest:healthCheck`
3. 🔲 Replace Yahoo Finance calls with Tradier
4. 🔲 Implement options chain display
5. 🔲 Add Greeks calculations using Tradier data
6. 🔲 Build IV tracking system

---

For more details, see [TRADIER_SETUP.md](../TRADIER_SETUP.md)
