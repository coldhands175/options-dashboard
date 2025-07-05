/**
 * Shared symbol configuration for watchlist and navbar ticker
 * This ensures consistency across all stock-related widgets
 */

export interface SymbolConfig {
  symbol: string;        // Raw symbol (e.g., "AAPL")
  proName: string;       // TradingView format (e.g., "NASDAQ:AAPL")
  title: string;         // Display name (e.g., "Apple Inc.")
}

// Default symbols used across the application
// These symbols will be used in both the navbar ticker and watchlist
// Sorted alphabetically by symbol for better organization
export const DEFAULT_SYMBOLS: SymbolConfig[] = [
  { symbol: "AAPL", proName: "NASDAQ:AAPL", title: "Apple Inc." },
  { symbol: "AMZN", proName: "NASDAQ:AMZN", title: "Amazon" },
  { symbol: "BBAI", proName: "NYSE:BBAI", title: "Big Bear AI" },
  { symbol: "GOOGL", proName: "NASDAQ:GOOGL", title: "Alphabet" },
  { symbol: "LNG", proName: "NYSE:LNG", title: "Cheniere" },
  { symbol: "META", proName: "NASDAQ:META", title: "Meta" },
  { symbol: "MSFT", proName: "NASDAQ:MSFT", title: "Microsoft" },
  { symbol: "MSTR", proName: "NASDAQ:MSTR", title: "Microstrategy" },
  { symbol: "NVDA", proName: "NASDAQ:NVDA", title: "Nvidia" },
  { symbol: "PLTR", proName: "NASDAQ:PLTR", title: "Palantir" },
  { symbol: "SYM", proName: "NASDAQ:SYM", title: "Symbotic" },
  { symbol: "TSLA", proName: "NASDAQ:TSLA", title: "Tesla" }
];

// Extract just the raw symbols for APIs that need them
export const DEFAULT_RAW_SYMBOLS = DEFAULT_SYMBOLS.map(s => s.symbol);

// Extract TradingView format symbols for the ticker
export const DEFAULT_TICKER_SYMBOLS = DEFAULT_SYMBOLS.map(s => ({
  proName: s.proName,
  title: s.title
}));

// Helper function to get TradingView symbol format from raw symbol
export function getRawSymbolsFromConfig(): string[] {
  return DEFAULT_RAW_SYMBOLS;
}

// Helper function to get ticker symbols in TradingView format
export function getTickerSymbolsFromConfig() {
  return DEFAULT_TICKER_SYMBOLS;
}
