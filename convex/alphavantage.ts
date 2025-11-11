import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Cache TTLs in milliseconds
const CACHE_TTL = {
  quote: 5 * 60 * 1000, // 5 minutes
  fundamentals: 24 * 60 * 60 * 1000, // 24 hours
  news: 60 * 60 * 1000, // 1 hour
};

/**
 * Get real-time quote data for a symbol
 * Returns: price, change, change%, volume, etc.
 */
type QuoteData = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
} | null;

export const getQuote = action({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      symbol: v.string(),
      price: v.number(),
      change: v.number(),
      changePercent: v.number(),
      volume: v.number(),
      high: v.number(),
      low: v.number(),
      open: v.number(),
      previousClose: v.number(),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args): Promise<QuoteData> => {
    const symbol = args.symbol.toUpperCase();

    // Check cache first
    const cached: any = await ctx.runQuery(api.alphavantage._getCachedData, {
      symbol,
      dataType: "quote",
    });

    if (cached) {
      console.log(`[AlphaVantage] Using cached quote for ${symbol}`);
      return cached;
    }

    // Fetch fresh data
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      console.warn("[AlphaVantage] API key not set");
      return null;
    }

    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"]) {
        console.error(`[AlphaVantage] Error for ${symbol}:`, data["Error Message"]);
        return null;
      }

      if (data["Note"]) {
        // Rate limit reached
        console.warn(`[AlphaVantage] Rate limit reached:`, data["Note"]);
        return null;
      }

      const quote = data["Global Quote"];
      if (!quote || !quote["05. price"]) {
        console.error(`[AlphaVantage] No quote data for ${symbol}`);
        return null;
      }

      const result = {
        symbol,
        price: parseFloat(quote["05. price"]),
        change: parseFloat(quote["09. change"]),
        changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
        volume: parseInt(quote["06. volume"]),
        high: parseFloat(quote["03. high"]),
        low: parseFloat(quote["04. low"]),
        open: parseFloat(quote["02. open"]),
        previousClose: parseFloat(quote["08. previous close"]),
        timestamp: Date.now(),
      };

      // Cache the result
      await ctx.runMutation(api.alphavantage._cacheData, {
        symbol,
        dataType: "quote",
        data: result,
        ttl: CACHE_TTL.quote,
      });

      console.log(`[AlphaVantage] Fetched fresh quote for ${symbol}`);
      return result;
    } catch (error: any) {
      console.error(`[AlphaVantage] Error fetching quote for ${symbol}:`, error.message);
      return null;
    }
  },
});

/**
 * Get company fundamentals
 * Returns: marketCap, PE ratio, EPS, revenue, profitability metrics
 */
type FundamentalsData = {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  week52High: number;
  week52Low: number;
  movingAverage50: number | null;
  movingAverage200: number | null;
  timestamp: number;
} | null;

export const getFundamentals = action({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      symbol: v.string(),
      name: v.string(),
      description: v.string(),
      sector: v.string(),
      industry: v.string(),
      marketCap: v.number(),
      peRatio: v.union(v.number(), v.null()),
      eps: v.union(v.number(), v.null()),
      dividendYield: v.union(v.number(), v.null()),
      week52High: v.number(),
      week52Low: v.number(),
      movingAverage50: v.union(v.number(), v.null()),
      movingAverage200: v.union(v.number(), v.null()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args): Promise<FundamentalsData> => {
    const symbol = args.symbol.toUpperCase();

    // Check cache first
    const cached: any = await ctx.runQuery(api.alphavantage._getCachedData, {
      symbol,
      dataType: "fundamentals",
    });

    if (cached) {
      console.log(`[AlphaVantage] Using cached fundamentals for ${symbol}`);
      return cached;
    }

    // Fetch fresh data
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      console.warn("[AlphaVantage] API key not set");
      return null;
    }

    try {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || !data.Symbol) {
        console.error(`[AlphaVantage] Error or no data for ${symbol}`);
        return null;
      }

      const result = {
        symbol: data.Symbol,
        name: data.Name || symbol,
        description: data.Description || "",
        sector: data.Sector || "Unknown",
        industry: data.Industry || "Unknown",
        marketCap: parseInt(data.MarketCapitalization || "0"),
        peRatio: data.PERatio ? parseFloat(data.PERatio) : null,
        eps: data.EPS ? parseFloat(data.EPS) : null,
        dividendYield: data.DividendYield ? parseFloat(data.DividendYield) : null,
        week52High: parseFloat(data["52WeekHigh"] || "0"),
        week52Low: parseFloat(data["52WeekLow"] || "0"),
        movingAverage50: data["50DayMovingAverage"] ? parseFloat(data["50DayMovingAverage"]) : null,
        movingAverage200: data["200DayMovingAverage"] ? parseFloat(data["200DayMovingAverage"]) : null,
        timestamp: Date.now(),
      };

      // Cache the result
      await ctx.runMutation(api.alphavantage._cacheData, {
        symbol,
        dataType: "fundamentals",
        data: result,
        ttl: CACHE_TTL.fundamentals,
      });

      console.log(`[AlphaVantage] Fetched fresh fundamentals for ${symbol}`);
      return result;
    } catch (error: any) {
      console.error(`[AlphaVantage] Error fetching fundamentals for ${symbol}:`, error.message);
      return null;
    }
  },
});

/**
 * Get recent news articles for a symbol
 * Returns: array of news items with title, summary, source, URL, timestamp
 */
type NewsData = Array<{
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment?: string;
}> | null;

export const getNews = action({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        title: v.string(),
        summary: v.string(),
        source: v.string(),
        url: v.string(),
        publishedAt: v.number(),
        sentiment: v.optional(v.string()),
      })
    )
  ),
  handler: async (ctx, args): Promise<NewsData> => {
    const symbol = args.symbol.toUpperCase();
    const limit = args.limit || 10;

    // Check cache first
    const cached: any = await ctx.runQuery(api.alphavantage._getCachedData, {
      symbol,
      dataType: "news",
    });

    if (cached) {
      console.log(`[AlphaVantage] Using cached news for ${symbol}`);
      return cached.slice(0, limit);
    }

    // Fetch fresh data
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      console.warn("[AlphaVantage] API key not set");
      return null;
    }

    try {
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}&limit=50`;
      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"]) {
        console.error(`[AlphaVantage] Error for ${symbol}:`, data["Error Message"]);
        return null;
      }

      if (!data.feed || !Array.isArray(data.feed)) {
        console.error(`[AlphaVantage] No news data for ${symbol}`);
        return null;
      }

      const result = data.feed.map((item: any) => ({
        title: item.title,
        summary: item.summary || "",
        source: item.source || "Unknown",
        url: item.url,
        publishedAt: new Date(item.time_published).getTime(),
        sentiment: item.overall_sentiment_label || undefined,
      }));

      // Cache the result
      await ctx.runMutation(api.alphavantage._cacheData, {
        symbol,
        dataType: "news",
        data: result,
        ttl: CACHE_TTL.news,
      });

      console.log(`[AlphaVantage] Fetched fresh news for ${symbol} (${result.length} articles)`);
      return result.slice(0, limit);
    } catch (error: any) {
      console.error(`[AlphaVantage] Error fetching news for ${symbol}:`, error.message);
      return null;
    }
  },
});

/**
 * Search for symbol matches across exchanges
 * Returns: array of possible symbol matches with exchange info
 */
type SymbolSearchResult = Array<{
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}> | null;

export const searchSymbol = action({
  args: { keywords: v.string() },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        symbol: v.string(),
        name: v.string(),
        type: v.string(),
        region: v.string(),
        marketOpen: v.string(),
        marketClose: v.string(),
        timezone: v.string(),
        currency: v.string(),
        matchScore: v.number(),
      })
    )
  ),
  handler: async (ctx, args): Promise<SymbolSearchResult> => {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      console.warn("[AlphaVantage] API key not set");
      return null;
    }

    try {
      const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(args.keywords)}&apikey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"]) {
        console.error(`[AlphaVantage] Error searching for ${args.keywords}:`, data["Error Message"]);
        return null;
      }

      if (data["Note"]) {
        console.warn(`[AlphaVantage] Rate limit reached:`, data["Note"]);
        return null;
      }

      const matches = data["bestMatches"];
      if (!matches || !Array.isArray(matches)) {
        console.error(`[AlphaVantage] No matches for ${args.keywords}`);
        return null;
      }

      const result = matches.map((match: any) => ({
        symbol: match["1. symbol"],
        name: match["2. name"],
        type: match["3. type"],
        region: match["4. region"],
        marketOpen: match["5. marketOpen"],
        marketClose: match["6. marketClose"],
        timezone: match["7. timezone"],
        currency: match["8. currency"],
        matchScore: parseFloat(match["9. matchScore"]),
      }));

      console.log(`[AlphaVantage] Found ${result.length} matches for ${args.keywords}`);
      return result;
    } catch (error: any) {
      console.error(`[AlphaVantage] Error searching for ${args.keywords}:`, error.message);
      return null;
    }
  },
});

// Internal helpers for caching

import { query, mutation, internalMutation } from "./_generated/server";

export const _getCachedData = query({
  args: { symbol: v.string(), dataType: v.union(v.literal("quote"), v.literal("fundamentals"), v.literal("news")) },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args): Promise<any> => {
    const cache = await ctx.db
      .query("market_data_cache")
      .withIndex("by_symbol_and_type", (q) => q.eq("symbol", args.symbol).eq("dataType", args.dataType))
      .first();

    if (!cache) return null;

    // Check if expired (queries can't delete, let mutation handle cleanup)
    if (cache.expiresAt < Date.now()) {
      return null;
    }

    return cache.data;
  },
});

export const _cacheData = mutation({
  args: {
    symbol: v.string(),
    dataType: v.union(v.literal("quote"), v.literal("fundamentals"), v.literal("news")),
    data: v.any(),
    ttl: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete any existing cache entry
    const existing = await ctx.db
      .query("market_data_cache")
      .withIndex("by_symbol_and_type", (q) => q.eq("symbol", args.symbol).eq("dataType", args.dataType))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Insert new cache entry
    await ctx.db.insert("market_data_cache", {
      symbol: args.symbol,
      dataType: args.dataType,
      data: args.data,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + args.ttl,
    });

    return null;
  },
});
