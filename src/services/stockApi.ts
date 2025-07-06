/**
 * Stock market data API service using Polygon.io
 */

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

// Validate API key is configured
if (!POLYGON_API_KEY) {
  console.warn('⚠️ POLYGON_API_KEY not configured. Stock data features will be disabled.');
}

// Rate limiting: Simple in-memory cache to prevent excessive API calls
class StockDataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for company data
  private readonly REQUEST_DELAY = 200; // 200ms between requests (free tier: 5 calls/minute, but we'll space them out)
  private lastRequestTime = 0;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private rateLimitedUntil = 0;
  private consecutiveFailures = 0;

  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📊 Using cached stock data for:', key);
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Check if we're in a rate-limited period
    if (now < this.rateLimitedUntil) {
      const waitTime = this.rateLimitedUntil - now;
      console.log(`⏱️ Rate limited: waiting ${Math.round(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const waitTime = this.REQUEST_DELAY - timeSinceLastRequest;
      await new Promise(resolve => 
        setTimeout(resolve, waitTime)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
  
  // Handle rate limit errors by setting a backoff period
  handleRateLimit(): void {
    this.consecutiveFailures++;
    // More aggressive backoff: start with 2 minutes, max 15 minutes
    const backoffTime = Math.min(120000 * Math.pow(2, this.consecutiveFailures - 1), 900000);
    this.rateLimitedUntil = Date.now() + backoffTime;
    console.log(`🚫 Rate limit hit. Backing off for ${Math.round(backoffTime/1000)}s (attempt ${this.consecutiveFailures})`);
  }
  
  // Reset failure count on successful request
  resetFailures(): void {
    this.consecutiveFailures = 0;
  }
  
  // Check if we're currently rate limited
  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  // Queue requests to avoid overwhelming the API
  async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await this.enforceRateLimit();
        await request();
      }
    }
    
    this.isProcessingQueue = false;
  }
}

const stockCache = new StockDataCache();

export class StockApiError extends Error {
  status?: number;
  code?: string;
  
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'StockApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Make request to Polygon API with rate limiting
 */
async function polygonRequest(endpoint: string): Promise<any> {
  try {
    // Check if API key is configured
    if (!POLYGON_API_KEY) {
      throw new StockApiError('Polygon API key not configured', 401, 'API_KEY_MISSING');
    }

    // Check cache first
    const cacheKey = endpoint;
    const cachedData = await stockCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Enforce rate limiting
    await stockCache.enforceRateLimit();

    return await stockCache.queueRequest(async () => {
      const url = `${POLYGON_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${POLYGON_API_KEY}`;
      console.log('📊 Fetching stock data from:', endpoint);

      const response = await fetch(url);

      if (!response.ok) {
        let message = `Polygon API Error: ${response.status} ${response.statusText}`;
        let code: string | undefined;

        if (response.status === 429) {
          code = 'RATE_LIMITED';
          message = 'Rate limit exceeded. Please wait before trying again.';
          stockCache.handleRateLimit(); // Trigger circuit breaker
        } else if (response.status === 401) {
          code = 'UNAUTHORIZED';
          message = 'Invalid API key or unauthorized access.';
        }
        
        throw new StockApiError(message, response.status, code);
      }

      const data = await response.json();
      
      // Cache successful responses
      stockCache.set(cacheKey, data);
      stockCache.resetFailures(); // Reset failure count on success
      
      return data;
    });
  } catch (error) {
    console.error('Polygon API request failed:', error);
    throw error;
  }
}

export interface StockQuote {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  previousClose?: number;
  marketCap?: number;
  updatedAt: string;
}

export interface StockDetails {
  ticker: string;
  name: string;
  description?: string;
  marketCap?: number;
  sharesOutstanding?: number;
  employeeCount?: number;
  industry?: string;
  sector?: string;
  website?: string;
}

/**
 * Stock API service methods
 */
export const stockApi = {
  /**
   * Get current quote for a single stock
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const data = await polygonRequest(`/v2/aggs/ticker/${symbol}/prev`);
    
    if (!data.results || data.results.length === 0) {
      throw new StockApiError(`No data found for symbol: ${symbol}`, 404);
    }

    const result = data.results[0];
    const change = result.c - result.o;
    const changePercent = (change / result.o) * 100;

    return {
      ticker: symbol,
      price: result.c,
      change: change,
      changePercent: changePercent,
      volume: result.v,
      previousClose: result.o,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get quotes for multiple stocks (batch request)
   * Note: Polygon free tier doesn't support true batch requests, so we'll make sequential calls
   */
  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
      } catch (error) {
        console.warn(`Failed to get quote for ${symbol}:`, error);
        // Add placeholder data for failed requests
        quotes.push({
          ticker: symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    
    return quotes;
  },

  /**
   * Get detailed company information
   */
  async getCompanyDetails(symbol: string): Promise<StockDetails> {
    const data = await polygonRequest(`/v3/reference/tickers/${symbol}`);
    
    if (!data.results) {
      throw new StockApiError(`No company details found for symbol: ${symbol}`, 404);
    }

    const result = data.results;
    
    return {
      ticker: symbol,
      name: result.name || symbol,
      description: result.description,
      marketCap: result.market_cap,
      sharesOutstanding: result.share_class_shares_outstanding,
      employeeCount: result.total_employees,
      industry: result.sic_description,
      sector: result.sector,
      website: result.homepage_url,
    };
  },

  /**
   * Search for stocks by name or symbol
   */
  async searchStocks(query: string): Promise<{ ticker: string; name: string }[]> {
    const data = await polygonRequest(`/v3/reference/tickers?search=${encodeURIComponent(query)}&limit=10`);
    
    if (!data.results) {
      return [];
    }

    return data.results
      .filter((item: any) => item.market === 'stocks' && item.active)
      .map((item: any) => ({
        ticker: item.ticker,
        name: item.name || item.ticker,
      }));
  },

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<{ market: string; serverTime: string; exchanges: any }> {
    const data = await polygonRequest('/v1/marketstatus/now');
    return data;
  },

  /**
   * Get ticker details including exchange information
   */
  async getTickerDetails(symbol: string): Promise<{
    ticker: string;
    name: string;
    market: string;
    primaryExchange: string;
    type: string;
    active: boolean;
    cik?: string;
    composite_figi?: string;
    currency_name?: string;
    locale: string;
  } | null> {
    try {
      const data = await polygonRequest(`/v3/reference/tickers/${symbol}`);
      
      if (!data.results) {
        return null;
      }

      const result = data.results;
      return {
        ticker: result.ticker,
        name: result.name,
        market: result.market,
        primaryExchange: result.primary_exchange,
        type: result.type,
        active: result.active,
        cik: result.cik,
        composite_figi: result.composite_figi,
        currency_name: result.currency_name,
        locale: result.locale,
      };
    } catch (error) {
      console.warn(`Failed to get ticker details for ${symbol}:`, error);
      return null;
    }
  },

  /**
   * Convert Polygon exchange code to TradingView market prefix
   */
  getTradingViewMarketPrefix(polygonExchange: string): string {
    const exchangeMap: { [key: string]: string } = {
      'XNAS': 'NASDAQ',
      'XNYS': 'NYSE', 
      'ARCX': 'NYSE', // NYSE Arca
      'BATS': 'NASDAQ', // BATS is part of Cboe, often use NASDAQ
      'XNGS': 'NASDAQ', // NASDAQ Global Select
      'XNCM': 'NASDAQ', // NASDAQ Capital Market
      'IEXG': 'NYSE', // IEX
      'EDGX': 'NASDAQ',
      'EDGA': 'NYSE',
    };
    
    return exchangeMap[polygonExchange] || 'NASDAQ'; // Default to NASDAQ
  },

  /**
   * Get properly formatted TradingView symbol with market prefix
   */
  async getTradingViewSymbol(symbol: string): Promise<{ name: string; displayName: string } | null> {
    try {
      const details = await this.getTickerDetails(symbol);
      
      if (!details) {
        // Symbol not found or API error - return null for fallback handling
        return null;
      }
      
      if (!details.active) {
        console.warn(`Symbol ${symbol} is not active`);
        return null;
      }

      const marketPrefix = this.getTradingViewMarketPrefix(details.primaryExchange);
      
      return {
        name: `${marketPrefix}:${symbol}`,
        displayName: details.name || symbol
      };
    } catch (error) {
      if (error instanceof StockApiError && error.status === 429) {
        // Rate limited - throw to be handled by caller
        throw error;
      }
      // Other errors (like 404) - return null for fallback
      console.warn(`Failed to get TradingView symbol for ${symbol}:`, error);
      return null;
    }
  },

  /**
   * Get multiple TradingView symbols with proper market prefixes
   * Uses fallback strategy for rate-limited or missing symbols
   */
  async getTradingViewSymbols(symbols: string[]): Promise<{ name: string; displayName: string }[]> {
    const results: { name: string; displayName: string }[] = [];
    
    console.log(`📊 Processing ${symbols.length} symbols for TradingView...`);
    
    // Check if we're rate limited and should skip API calls entirely
    if (stockCache.isRateLimited()) {
      console.log(`🚫 Skipping API calls due to rate limit. Using fallbacks for all symbols.`);
      // Return all symbols with NASDAQ fallback
      return symbols.map(symbol => ({
        name: `NASDAQ:${symbol}`,
        displayName: symbol
      }));
    }
    
    // Known delisted/problematic symbols to skip API calls for
    const delistedSymbols = new Set(['BBBY', 'BIG', 'CTL', 'DISCA', 'DISCB', 'GME_OLD', 'SPCE_OLD']);
    
    for (const symbol of symbols) {
      try {
        // Skip API call for known delisted symbols
        if (delistedSymbols.has(symbol)) {
          console.log(`⚠️ Skipping delisted symbol ${symbol}, using fallback`);
          results.push({
            name: `NASDAQ:${symbol}`,
            displayName: symbol
          });
          continue;
        }
        
        // Try to get the symbol with API data
        const tvSymbol = await this.getTradingViewSymbol(symbol);
        if (tvSymbol) {
          results.push(tvSymbol);
        } else {
          // Fallback: Use default NASDAQ prefix for unknown symbols
          console.log(`⚠️ Using fallback for ${symbol}`);
          results.push({
            name: `NASDAQ:${symbol}`,
            displayName: symbol
          });
        }
      } catch (error) {
        if (error instanceof StockApiError && error.status === 429) {
          console.log(`🚫 Rate limited while processing ${symbol}. Using fallbacks for remaining symbols.`);
          // Use fallbacks for this and all remaining symbols
          const remaining = symbols.slice(symbols.indexOf(symbol));
          remaining.forEach(sym => {
            results.push({
              name: `NASDAQ:${sym}`,
              displayName: sym
            });
          });
          break;
        }
        
        console.warn(`Failed to process symbol ${symbol}, using fallback:`, error);
        // Fallback: Use default NASDAQ prefix for failed symbols
        results.push({
          name: `NASDAQ:${symbol}`,
          displayName: symbol
        });
      }
    }
    
    console.log(`✅ Processed ${results.length}/${symbols.length} symbols`);
    return results;
  },
};
