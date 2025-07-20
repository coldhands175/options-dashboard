import * as React from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { stockApi, StockApiError } from '../services/stockApi';

// Custom debounce function to avoid external dependencies
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: number | null = null;
  
  const debounced = ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => func(...args), delay);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

export interface StockSymbol {
  ticker: string;
  name: string;
  market?: string;
  type?: string;
}

interface StockSearchProps {
  onSymbolSelect?: (symbol: StockSymbol) => void;
  placeholder?: string;
  label?: string;
  value?: StockSymbol | null;
  onChange?: (symbol: StockSymbol | null) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

export default function StockSearch({
  onSymbolSelect,
  placeholder = "Search stocks...",
  label = "Stock Symbol",
  value = null,
  onChange,
  disabled = false,
  size = 'medium',
  fullWidth = true,
}: StockSearchProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<StockSymbol[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced search function to avoid too many API calls
  const debouncedSearch = React.useMemo(
    () => debounce(async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const results = await stockApi.searchStocks(searchTerm);
        
        // Transform results to match our interface
        const symbols: StockSymbol[] = results.map(result => ({
          ticker: result.ticker,
          name: result.name,
        }));
        
        setOptions(symbols);
      } catch (err) {
        console.error('Stock search error:', err);
        if (err instanceof StockApiError) {
          if (err.code === 'API_KEY_MISSING') {
            setError('Polygon API key not configured. Please check your environment variables.');
          } else if (err.code === 'RATE_LIMITED') {
            setError('Rate limit exceeded. Please wait a moment and try again.');
          } else if (err.code === 'UNAUTHORIZED') {
            setError('Invalid API key. Please check your Polygon API configuration.');
          } else {
            setError(`Search failed: ${err.message}`);
          }
        } else {
          setError('Failed to search stocks. Please try again.');
        }
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 500), // 500ms delay
    []
  );

  // Handle input changes
  React.useEffect(() => {
    if (inputValue) {
      setLoading(true);
      debouncedSearch(inputValue);
    } else {
      setOptions([]);
      setLoading(false);
    }

    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [inputValue, debouncedSearch]);

  const handleSelectionChange = (_event: any, newValue: StockSymbol | null) => {
    onChange?.(newValue);
    onSymbolSelect?.(newValue as StockSymbol);
  };

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  return (
    <Box>
      <Autocomplete
        value={value}
        onChange={handleSelectionChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options}
        loading={loading}
        disabled={disabled}
        size={size}
        fullWidth={fullWidth}
        filterOptions={(x) => x} // Disable built-in filtering since we handle it via API
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return `${option.ticker} - ${option.name}`;
        }}
        isOptionEqualToValue={(option, value) => option.ticker === value.ticker}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={!!error}
            helperText={error}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={option.ticker} 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {option.name}
                </Typography>
              </Box>
              {option.market && (
                <Typography variant="caption" color="text.secondary">
                  Market: {option.market}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        noOptionsText={
          inputValue.length < 2 
            ? "Type at least 2 characters to search..." 
            : loading 
            ? "Searching..." 
            : "No stocks found"
        }
      />
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 1 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}

// Example usage component for testing
export function StockSearchExample() {
  const [selectedStock, setSelectedStock] = React.useState<StockSymbol | null>(null);

  return (
    <Box sx={{ maxWidth: 500, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Stock Search Demo
      </Typography>
      
      <StockSearch
        label="Search for a stock"
        placeholder="e.g., AAPL, Microsoft, Tesla..."
        value={selectedStock}
        onChange={setSelectedStock}
        onSymbolSelect={(symbol) => {
          console.log('Selected stock:', symbol);
        }}
      />
      
      {selectedStock && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2">Selected Stock:</Typography>
          <Typography variant="body2">
            <strong>{selectedStock.ticker}</strong> - {selectedStock.name}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
