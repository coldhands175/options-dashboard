"use client";

import { useEffect, useRef, memo } from "react";

interface TradingViewWatchlistProps {
  symbols: string[];
  colorTheme?: "light" | "dark";
  isTransparent?: boolean;
  locale?: string;
}

function TradingViewWatchlist({
  symbols,
  colorTheme = "light",
  isTransparent = false,
  locale = "en",
}: TradingViewWatchlistProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || symbols.length === 0) return;

    // Create symbols array in TradingView format
    const symbolsArray = symbols.map((symbol) => ({
      name: symbol,
      displayName: symbol,
    }));

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme,
      locale,
      largeChartUrl: "",
      isTransparent,
      showSymbolLogo: true,
      width: "100%",
      height: 600,
      symbolsGroups: [
        {
          name: "Watchlist",
          symbols: symbolsArray,
        },
      ],
    });

    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = "";
      }
    };
  }, [symbols, colorTheme, isTransparent, locale]);

  if (symbols.length === 0) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-muted-foreground">No symbols in watchlist</div>
      </div>
    );
  }

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright text-xs text-center mt-2 text-muted-foreground">
        <a
          href="https://www.tradingview.com/markets/"
          rel="noopener nofollow noreferrer"
          target="_blank"
        >
          <span className="text-blue-600">Market summary</span> by TradingView
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWatchlist);
