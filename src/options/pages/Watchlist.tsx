import React, { useEffect, useState } from 'react';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TradingViewWatchlist, { TradingViewSymbol, TradingViewSymbolGroup } from '../../components/TradingViewWatchlist';
import { xanoApi } from '../../services/xanoApi';
import { stockApi } from '../../services/stockApi';
import { Trade } from '../models/types';
import { getRawSymbolsFromConfig } from '../../config/symbols';

// Default watchlist symbols from shared configuration
const defaultWatchlistRawSymbols = getRawSymbolsFromConfig();

export default function Watchlist() {
  const [tradedStocks, setTradedStocks] = useState<string[]>([]);
  const [defaultSymbols, setDefaultSymbols] = useState<TradingViewSymbol[]>([]);
  const [tradedSymbols, setTradedSymbols] = useState<TradingViewSymbol[]>([]);
  const [includeTradedStocks, setIncludeTradedStocks] = useState<boolean>(true);
  const [watchlistTheme, setWatchlistTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState<boolean>(true);
  const [symbolsLoading, setSymbolsLoading] = useState<boolean>(false);

  // Fetch and convert default symbols to proper TradingView format from cache
  useEffect(() => {
    const convertDefaultSymbols = async () => {
      setSymbolsLoading(true);
      try {
        console.log('💾 Loading default symbols from Xano cache...');
        const { found, missing } = await xanoApi.getTradingViewSymbolsFromCache(defaultWatchlistRawSymbols);
        
        if (found.length > 0) {
          setDefaultSymbols(found);
          console.log('✅ Default symbols loaded from cache:', found.length, 'found');
        }
        
        if (missing.length > 0) {
          console.log('⚠️ Missing from cache, falling back to API for:', missing);
          // Fallback to API for missing symbols
          try {
            const apiSymbols = await stockApi.getTradingViewSymbols(missing);
            setDefaultSymbols(prev => [...prev, ...apiSymbols]);
            console.log('✅ Missing symbols fetched from API:', apiSymbols.length);
          } catch (apiError) {
            console.error('API fallback failed:', apiError);
            // Ultimate fallback: use NASDAQ prefix
            const fallbackSymbols = missing.map(symbol => ({
              name: `NASDAQ:${symbol}`,
              displayName: symbol
            }));
            setDefaultSymbols(prev => [...prev, ...fallbackSymbols]);
          }
        }
      } catch (err) {
        console.error('Failed to load symbols from cache:', err);
        // Fallback to NASDAQ prefix for all
        const fallbackSymbols = defaultWatchlistRawSymbols.map(symbol => ({
          name: `NASDAQ:${symbol}`,
          displayName: symbol
        }));
        setDefaultSymbols(fallbackSymbols);
      } finally {
        setSymbolsLoading(false);
      }
    };

    convertDefaultSymbols();
  }, []);

  // Fetch traded stocks from your Xano data and convert to TradingView format
  useEffect(() => {
    const fetchTradedStocks = async () => {
      try {
        setLoading(true);
        const data = await xanoApi.getTransactions();
        const trades = data as Trade[];
        
        // Extract unique stock symbols from trades
        const uniqueSymbols = Array.from(
          new Set(trades.map((trade: Trade) => trade.Symbol).filter(Boolean))
        ).sort();
        
        console.log('📈 Found traded stocks:', uniqueSymbols);
        setTradedStocks(uniqueSymbols);
        
        // Convert traded symbols to proper TradingView format using cache first
        if (uniqueSymbols.length > 0) {
          setSymbolsLoading(true);
          console.log('💾 Loading traded symbols from Xano cache...');
          
          const { found, missing } = await xanoApi.getTradingViewSymbolsFromCache(uniqueSymbols);
          
          if (found.length > 0) {
            setTradedSymbols(found);
            console.log('✅ Traded symbols loaded from cache:', found.length, 'found');
          }
          
          if (missing.length > 0) {
            console.log('⚠️ Missing traded symbols from cache, falling back to API for:', missing);
            try {
              const apiSymbols = await stockApi.getTradingViewSymbols(missing);
              setTradedSymbols(prev => [...prev, ...apiSymbols]);
              console.log('✅ Missing traded symbols fetched from API:', apiSymbols.length);
            } catch (apiError) {
              console.error('API fallback failed for traded symbols:', apiError);
              // Fallback: use NASDAQ prefix for missing symbols
              const fallbackSymbols = missing.map(symbol => ({
                name: `NASDAQ:${symbol}`,
                displayName: symbol
              }));
              setTradedSymbols(prev => [...prev, ...fallbackSymbols]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch traded stocks:', err);
      } finally {
        setLoading(false);
        setSymbolsLoading(false);
      }
    };

    fetchTradedStocks();
  }, []);

  // Create symbol groups based on user preferences
  const createSymbolGroups = (): TradingViewSymbolGroup[] => {
    const groups: TradingViewSymbolGroup[] = [];
    
    // Known problematic/delisted symbols to filter out
    const problematicSymbols = new Set([
      'DISCA', 'DISCB', 'CTL', 'BIG', 'BBBY', 'WYN', 'FISV_OLD', 'GME_OLD'
    ]);
    
    // Function to filter and deduplicate symbols
    const filterValidSymbols = (symbols: TradingViewSymbol[]) => {
      return symbols.filter(symbol => {
        const ticker = symbol.displayName || symbol.name.split(':')[1] || symbol.name;
        return !problematicSymbols.has(ticker);
      });
    };

    // Add default watchlist with filtered symbols
    if (defaultSymbols.length > 0) {
      const filteredDefault = filterValidSymbols(defaultSymbols);
      if (filteredDefault.length > 0) {
        groups.push({
          name: "Market Leaders",
          symbols: filteredDefault
        });
      }
    }

    // Add traded stocks if enabled, filtered, and deduplicated
    if (includeTradedStocks && tradedSymbols.length > 0) {
      const filteredTraded = filterValidSymbols(tradedSymbols);
      
      // Deduplicate by removing symbols that already exist in default list
      const defaultTickers = new Set(
        defaultSymbols.map(s => s.displayName || s.name.split(':')[1] || s.name)
      );
      
      const uniqueTraded = filteredTraded.filter(symbol => {
        const ticker = symbol.displayName || symbol.name.split(':')[1] || symbol.name;
        return !defaultTickers.has(ticker);
      });
      
      if (uniqueTraded.length > 0) {
        groups.push({
          name: "My Traded Stocks",
          symbols: uniqueTraded
        });
      }
    }

    return groups;
  };

  const symbolGroups = createSymbolGroups();

  if (loading || symbolsLoading) {
    return (
      <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" }, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Typography>Loading watchlist...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5" component="h2">
              Market Watchlist
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watchlistTheme === 'dark'}
                    onChange={() => setWatchlistTheme(watchlistTheme === 'dark' ? 'light' : 'dark')}
                  />
                }
                label="Dark Theme"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={includeTradedStocks}
                    onChange={() => setIncludeTradedStocks(!includeTradedStocks)}
                  />
                }
                label="Include My Stocks"
              />
            </Box>
          </Box>
          
          {/* Display traded stocks info */}
          {tradedStocks.length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1, opacity: 0.8 }}>
              <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
                📊 Found {tradedStocks.length} stocks from your trades
              </Typography>
              <Typography variant="caption" color="info.contrastText">
                ✅ Displaying {symbolGroups.reduce((total, group) => total + group.symbols.length, 0)} valid symbols 
                (filtered out delisted/problematic stocks)
              </Typography>
            </Box>
          )}
          
          {/* Display symbol loading status */}
          {symbolsLoading && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.contrastText">
                🔍 Looking up correct market exchanges for symbols...
              </Typography>
            </Box>
          )}
          
          {/* TradingView Watchlist Widget */}
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <TradingViewWatchlist
              symbolsGroups={symbolGroups}
              colorTheme={watchlistTheme}
              height={700}
              isTransparent={false}
              showSymbolLogo={true}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
