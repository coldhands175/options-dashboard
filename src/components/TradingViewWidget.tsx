import React, { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { getTickerSymbolsFromConfig } from '../config/symbols';

interface TradingViewWidgetProps {
  symbols?: Array<{
    proName: string;
    title?: string;
  }>;
  colorTheme?: 'light' | 'dark';
  showSymbolLogo?: boolean;
  isTransparent?: boolean;
  displayMode?: 'adaptive' | 'regular' | 'compact';
  locale?: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbols = getTickerSymbolsFromConfig(),
  colorTheme,
  showSymbolLogo = true,
  isTransparent = false,
  displayMode = 'adaptive',
  locale = 'en'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  
  // Automatically detect theme if not explicitly provided
  const effectiveColorTheme = colorTheme || theme.palette.mode;
  
  // Debug theme detection
  React.useEffect(() => {
    console.log('TradingView Widget Theme Debug:', {
      colorTheme,
      'theme.palette.mode': theme.palette.mode,
      effectiveColorTheme,
      widgetWillReinitialize: true,
    });
  }, [colorTheme, theme.palette.mode, effectiveColorTheme]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing widget
    const container = containerRef.current;
    container.innerHTML = '';

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return; // Check again after timeout
      
      try {
        // Create widget container structure
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container__widget';
        
        const copyrightContainer = document.createElement('div');
        copyrightContainer.className = 'tradingview-widget-copyright';
        copyrightContainer.innerHTML = `
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
            <span class="blue-text">Track all markets on TradingView</span>
          </a>
        `;

        container.appendChild(widgetContainer);
        container.appendChild(copyrightContainer);

        // Create and configure the script
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
        script.async = true;
        
        const widgetConfig = {
          symbols,
          showSymbolLogo,
          displayMode,
          locale,
          colorTheme: effectiveColorTheme,
          isTransparent: true,
          largeChartUrl: "",
        };

        console.log('TradingView Widget Config:', JSON.stringify(widgetConfig, null, 2));
        script.innerHTML = JSON.stringify(widgetConfig);

        script.onerror = (error) => {
          console.warn('TradingView widget failed to load:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = '<p>Error loading widget.</p>';
          }
        };

        container.appendChild(script);
        
      } catch (error) {
        console.warn('TradingView widget initialization error:', error);
      }
    }, 100); // Small delay to ensure DOM readiness

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      const container = containerRef.current;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbols, effectiveColorTheme, showSymbolLogo, isTransparent, displayMode, locale, theme.palette.mode]);

  return (
    <Box
      ref={containerRef}
      className="tradingview-widget-container"
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '60px',
        // Make completely transparent to inherit parent background
        backgroundColor: 'transparent',
        '& .tradingview-widget-copyright': {
          display: 'none' // Hide copyright in navbar version
        },
        '& .tradingview-widget-container__widget': {
          backgroundColor: 'transparent',
          borderRadius: theme.shape.borderRadius,
        },
        '& iframe': {
          backgroundColor: 'transparent !important'
        }
      }}
    />
  );
};

export default TradingViewWidget;
