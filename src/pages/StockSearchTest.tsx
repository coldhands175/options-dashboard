import * as React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import StockSearch, { StockSearchExample, StockSymbol } from '../components/StockSearch';

export default function StockSearchTest() {
  const [selectedStock, setSelectedStock] = React.useState<StockSymbol | null>(null);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Stock Search Test
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This page is for testing the stock search autocomplete functionality using the Polygon API.
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Stock Search
        </Typography>
        
        <StockSearch
          label="Search for a stock"
          placeholder="Type a stock symbol or company name..."
          value={selectedStock}
          onChange={setSelectedStock}
          onSymbolSelect={(symbol) => {
            console.log('Stock selected:', symbol);
          }}
        />
        
        {selectedStock && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Stock Details:
            </Typography>
            <Typography variant="body2">
              <strong>Symbol:</strong> {selectedStock.ticker}
            </Typography>
            <Typography variant="body2">
              <strong>Company:</strong> {selectedStock.name}
            </Typography>
            {selectedStock.market && (
              <Typography variant="body2">
                <strong>Market:</strong> {selectedStock.market}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Example Component Demo
        </Typography>
        <StockSearchExample />
      </Paper>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          <strong>Note:</strong> Make sure you have a valid Polygon API key configured in your .env file 
          as VITE_POLYGON_API_KEY for this component to work properly.
        </Typography>
      </Box>
    </Container>
  );
}
