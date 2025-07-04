import React, { useEffect, useRef } from 'react';
import { Box, useTheme, alpha } from '@mui/material';

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
  symbols = [
    { proName: "NYSE:BBAI", title: "Big Bear AI" },
    { proName: "NASDAQ:MSFT", title: "Microsoft" },
    { proName: "NASDAQ:MSTR", title: "Microstrategy" },
    { proName: "NASDAQ:NVDA", title: "Nvidida" },
    { proName: "NASDAQ:PLTR", title: "Palantir" },
    { proName: "NYSE:LNG", title: "Cheniere" },
    { proName: "NASDAQ:SYM", title: "Symbotic" }
  ],
  colorTheme,
  showSymbolLogo = true,
  isTransparent = false,
  displayMode = 'adaptive',
  locale = 'en'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  
  // Automatically detect theme if not explicitly provided
  const effectiveColorTheme = colorTheme || (theme.palette.mode === 'dark' ? 'dark' : 'light');
  

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
          colorTheme: effectiveColorTheme,
          locale,
          largeChartUrl: "",
          isTransparent: false, // Don't use transparent, use solid color
          showSymbolLogo,
          displayMode
        };
        
        script.innerHTML = JSON.stringify(widgetConfig);

        // Add error handling for script loading
        script.onerror = (error) => {
          console.warn('TradingView widget failed to load:', error);
        };

        container.appendChild(script);
        
        console.log('Initialized script and appending to container');
        // Add iframe monitoring to override background after load
        const checkForIframe = () => {
          const iframe = container.querySelector('iframe');
          if (iframe) {
            console.log('Iframe found, attempting to override styles');
            console.log('Iframe original styles:', iframe.style);
            iframe.style.backgroundColor = 'transparent';
            iframe.style.background = 'transparent';
            
            // Try to access iframe content if same-origin (won't work for cross-origin)
            try {
              if (iframe.contentDocument) {
                const iframeBody = iframe.contentDocument.body;
                if (iframeBody) {
                  console.log('Successfully accessed iframe body, overriding styles');
                  iframeBody.style.backgroundColor = 'transparent';
                  iframeBody.style.background = 'transparent';
                }
              }
            } catch (e) {
              console.warn('Cross-origin restriction, unable to access iframe contentDocument', e);
            }
          } else {
            // Keep checking for iframe
            setTimeout(checkForIframe, 100);
          }
        };
        
        // Start checking for iframe after script loads
        setTimeout(checkForIframe, 500);
        
      } catch (error) {
        console.warn('TradingView widget initialization error:', error);
      }
    }, 100); // Small delay to ensure DOM readiness

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
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
