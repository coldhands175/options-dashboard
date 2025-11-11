/**
 * Tradier API Integration
 *
 * Provides real-time market data for stocks and options using Tradier's API.
 * Supports both sandbox (delayed data) and production (real-time) environments.
 *
 * API Documentation: https://documentation.tradier.com/brokerage-api
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

// ===== Types =====

export interface TradierQuote {
  symbol: string;
  description: string;
  exch: string;
  type: string;
  last: number | null;
  change: number | null;
  change_percentage: number | null;
  volume: number;
  average_volume: number | null;
  last_volume: number | null;
  trade_date: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  prevclose: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  bid: number | null;
  bidsize: number | null;
  bidexch: string | null;
  bid_date: number | null;
  ask: number | null;
  asksize: number | null;
  askexch: string | null;
  ask_date: number | null;
  open_interest: number | null;
  contract_size: number | null;
  expiration_date: string | null;
  expiration_type: string | null;
  option_type: string | null;
  root_symbol: string | null;
  underlying: string | null;
  strike: number | null;
  greeks: TradierGreeks | null;
}

export interface TradierGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  phi: number;
  bid_iv: number;
  mid_iv: number;
  ask_iv: number;
  smv_vol: number;
  updated_at: string;
}

interface TradierQuotesResponse {
  quotes: {
    quote: TradierQuote | TradierQuote[];
  };
}

interface TradierError {
  fault: {
    faultstring: string;
    detail: {
      errorcode: string;
    };
  };
}

// ===== Helper Functions =====

/**
 * Check if using RapidAPI (based on key format)
 */
function isRapidAPI(): boolean {
  const apiKey = process.env.TRADIER_API_KEY || "";
  // RapidAPI keys contain 'msh' or 'jsn' in their format
  return apiKey.includes("msh") || apiKey.includes("jsn");
}

/**
 * Get the appropriate Tradier API endpoint based on sandbox mode
 */
function getApiEndpoint(): string {
  if (isRapidAPI()) {
    return "https://tradier.p.rapidapi.com/v1";
  }

  const isSandbox = process.env.TRADIER_SANDBOX === "true";
  return isSandbox
    ? "https://sandbox.tradier.com/v1"
    : "https://api.tradier.com/v1";
}

/**
 * Get Tradier API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.TRADIER_API_KEY;
  if (!apiKey) {
    throw new Error("TRADIER_API_KEY not set in environment variables");
  }
  return apiKey;
}

/**
 * Make a request to the Tradier API
 */
async function tradierRequest<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = getApiEndpoint();
  const usingRapidAPI = isRapidAPI();

  const queryString = new URLSearchParams(params).toString();
  const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Different auth headers for RapidAPI vs direct Tradier
  if (usingRapidAPI) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = "tradier.p.rapidapi.com";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Tradier API error: ${response.status} ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorBody) as TradierError;
      if (errorJson.fault) {
        errorMessage = `Tradier API error: ${errorJson.fault.faultstring} (${errorJson.fault.detail.errorcode})`;
      }
    } catch {
      // If error parsing fails, use default message
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data as T;
}

/**
 * Normalize quote array (Tradier returns single object if only one result)
 */
function normalizeQuotes(
  quotes: TradierQuote | TradierQuote[] | undefined
): TradierQuote[] {
  if (!quotes) return [];
  return Array.isArray(quotes) ? quotes : [quotes];
}

// ===== Public Actions =====

/**
 * Get a single stock quote
 *
 * @param symbol - Stock symbol (e.g., "AAPL", "SPY")
 * @returns Quote data or null if not found
 */
export const getStockQuote = action({
  args: { symbol: v.string() },
  handler: async (ctx, args): Promise<TradierQuote | null> => {
    try {
      const normalizedSymbol = args.symbol.trim().toUpperCase();

      const data = await tradierRequest<TradierQuotesResponse>(
        "/markets/quotes",
        {
          symbols: normalizedSymbol,
          greeks: "false",
        }
      );

      const quotes = normalizeQuotes(data.quotes?.quote);
      return quotes.length > 0 ? quotes[0] : null;
    } catch (error) {
      console.error(`Error fetching quote for ${args.symbol}:`, error);
      return null;
    }
  },
});

/**
 * Get multiple stock quotes in a single API call
 *
 * @param symbols - Array of stock symbols (e.g., ["AAPL", "MSFT", "SPY"])
 * @returns Array of quote data
 */
export const getStockQuotes = action({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args): Promise<TradierQuote[]> => {
    try {
      if (args.symbols.length === 0) return [];

      const normalizedSymbols = args.symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      if (normalizedSymbols.length === 0) return [];

      const data = await tradierRequest<TradierQuotesResponse>(
        "/markets/quotes",
        {
          symbols: normalizedSymbols.join(","),
          greeks: "false",
        }
      );

      return normalizeQuotes(data.quotes?.quote);
    } catch (error) {
      console.error(`Error fetching quotes for ${args.symbols.join(", ")}:`, error);
      return [];
    }
  },
});

/**
 * Get quote with Greeks (for options)
 *
 * @param symbol - Option symbol (e.g., "AAPL250117C00150000")
 * @returns Quote data with Greeks or null if not found
 */
export const getOptionQuote = action({
  args: { symbol: v.string() },
  handler: async (ctx, args): Promise<TradierQuote | null> => {
    try {
      const normalizedSymbol = args.symbol.trim().toUpperCase();

      const data = await tradierRequest<TradierQuotesResponse>(
        "/markets/quotes",
        {
          symbols: normalizedSymbol,
          greeks: "true", // Enable Greeks for options
        }
      );

      const quotes = normalizeQuotes(data.quotes?.quote);
      return quotes.length > 0 ? quotes[0] : null;
    } catch (error) {
      console.error(`Error fetching option quote for ${args.symbol}:`, error);
      return null;
    }
  },
});

/**
 * Get option expirations for an underlying symbol
 *
 * @param underlying - Underlying stock symbol (e.g., "AAPL")
 * @returns Array of expiration dates in YYYY-MM-DD format
 */
export const getOptionsExpirations = action({
  args: { underlying: v.string() },
  handler: async (ctx, args): Promise<string[]> => {
    try {
      const normalizedSymbol = args.underlying.trim().toUpperCase();

      interface ExpirationsResponse {
        expirations: {
          date: string[];
        };
      }

      const data = await tradierRequest<ExpirationsResponse>(
        "/markets/options/expirations",
        {
          symbol: normalizedSymbol,
        }
      );

      return data.expirations?.date || [];
    } catch (error) {
      console.error(
        `Error fetching expirations for ${args.underlying}:`,
        error
      );
      return [];
    }
  },
});

/**
 * Get options chain for a specific expiration
 *
 * @param underlying - Underlying stock symbol (e.g., "AAPL")
 * @param expiration - Expiration date in YYYY-MM-DD format
 * @param greeks - Include Greeks in response (default: false)
 * @returns Array of option quotes
 */
export const getOptionsChain = action({
  args: {
    underlying: v.string(),
    expiration: v.string(),
    greeks: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<TradierQuote[]> => {
    try {
      const normalizedSymbol = args.underlying.trim().toUpperCase();

      interface OptionsChainResponse {
        options: {
          option: TradierQuote[];
        };
      }

      const data = await tradierRequest<OptionsChainResponse>(
        "/markets/options/chains",
        {
          symbol: normalizedSymbol,
          expiration: args.expiration,
          greeks: args.greeks ? "true" : "false",
        }
      );

      return data.options?.option || [];
    } catch (error) {
      console.error(
        `Error fetching options chain for ${args.underlying} ${args.expiration}:`,
        error
      );
      return [];
    }
  },
});

/**
 * Get historical pricing data
 *
 * @param symbol - Stock symbol
 * @param interval - Time interval (daily, weekly, monthly)
 * @param start - Start date (YYYY-MM-DD)
 * @param end - End date (YYYY-MM-DD)
 * @returns Array of historical price data
 */
export const getHistoricalPrices = action({
  args: {
    symbol: v.string(),
    interval: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    try {
      const normalizedSymbol = args.symbol.trim().toUpperCase();

      interface HistoryResponse {
        history: {
          day: any[];
        };
      }

      const params: Record<string, string> = {
        symbol: normalizedSymbol,
        interval: args.interval || "daily",
      };

      if (args.start) params.start = args.start;
      if (args.end) params.end = args.end;

      const data = await tradierRequest<HistoryResponse>(
        "/markets/history",
        params
      );

      return data.history?.day || [];
    } catch (error) {
      console.error(`Error fetching historical prices for ${args.symbol}:`, error);
      return [];
    }
  },
});
