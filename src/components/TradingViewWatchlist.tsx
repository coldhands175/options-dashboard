import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';

export interface TradingViewSymbol {
  name: string;
  displayName: string;
}

export interface TradingViewSymbolGroup {
  name: string;
  symbols: TradingViewSymbol[];
}

interface TradingViewWatchlistProps {
  symbolsGroups?: TradingViewSymbolGroup[];
  width?: number | string;
  height?: number | string;
  colorTheme?: 'light' | 'dark';
  isTransparent?: boolean;
  showSymbolLogo?: boolean;
  backgroundColor?: string;
  locale?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewWatchlist: React.FC<TradingViewWatchlistProps> = ({
  symbolsGroups = [
    {
      name: "My Watchlist",
      symbols: [
        { name: "NASDAQ:AAPL", displayName: "Apple Inc." },
        { name: "NASDAQ:MSFT", displayName: "Microsoft Corp." },
        { name: "NASDAQ:TSLA", displayName: "Tesla Inc." },
        { name: "NASDAQ:NVDA", displayName: "NVIDIA Corp." },
        { name: "NASDAQ:AMZN", displayName: "Amazon.com Inc." },
        { name: "NASDAQ:META", displayName: "Meta Platforms Inc." },
        { name: "NASDAQ:GOOGL", displayName: "Alphabet Inc." }
      ]
    }
  ],
  width = "100%",
  height = 600,
  colorTheme = "dark",
  isTransparent = true,
  showSymbolLogo = true,
  backgroundColor = "#0F0F0F",
  locale = "en"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const initWidget = () => {
      if (containerRef.current) {
        // Clear any existing content
        containerRef.current.innerHTML = '';

        // Create the widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container__widget';
        containerRef.current.appendChild(widgetContainer);

        // Create and configure the script
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
          colorTheme,
          locale,
          largeChartUrl: "",
          isTransparent,
          showSymbolLogo,
          backgroundColor,
          support_host: "https://www.tradingview.com",
          width: typeof width === 'number' ? width : undefined,
          height: typeof height === 'number' ? height : undefined,
          symbolsGroups
        });

        containerRef.current.appendChild(script);
        scriptRef.current = script;
      }
    };

    // Initialize the widget
    initWidget();

    // Cleanup function
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [symbolsGroups, width, height, colorTheme, isTransparent, showSymbolLogo, backgroundColor, locale]);

  return (
    <Box sx={{ width: '100%', height: 'auto' }}>
      <div 
        className="tradingview-widget-container"
        ref={containerRef}
        style={{ 
          width: typeof width === 'string' ? width : `${width}px`,
          height: typeof height === 'string' ? height : `${height}px`
        }}
      />
    </Box>
  );
};

export default TradingViewWatchlist;
