"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function FundamentalsCard({ symbol }: { symbol: string }) {
  const getFundamentals = useAction(api.alphavantage.getFundamentals);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getFundamentals({ symbol });
        setData(result);
      } catch (error) {
        console.error("Error fetching fundamentals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, getFundamentals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12 border border-foreground/20 rounded">
        <p className="text-foreground/60">No fundamental data available for {symbol}</p>
      </div>
    );
  }

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <div className="border border-foreground/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold font-mono mb-2">{data.name}</h2>
        <div className="text-sm text-foreground/60 mb-4">
          {data.sector} • {data.industry}
        </div>
        <p className="text-sm leading-relaxed">{data.description}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Market Cap"
          value={formatMarketCap(data.marketCap)}
          colorClass="text-blue-500"
        />
        <MetricCard
          label="P/E Ratio"
          value={data.peRatio ? data.peRatio.toFixed(2) : "N/A"}
          colorClass="text-green-500"
        />
        <MetricCard
          label="EPS"
          value={data.eps ? `$${data.eps.toFixed(2)}` : "N/A"}
          colorClass="text-purple-500"
        />
        <MetricCard
          label="Dividend Yield"
          value={data.dividendYield ? `${(data.dividendYield * 100).toFixed(2)}%` : "N/A"}
          colorClass="text-yellow-500"
        />
      </div>

      {/* Price Ranges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RangeCard
          label="52-Week High"
          value={`$${data.week52High.toFixed(2)}`}
          colorClass="text-green-500"
        />
        <RangeCard
          label="52-Week Low"
          value={`$${data.week52Low.toFixed(2)}`}
          colorClass="text-red-500"
        />
        <RangeCard
          label="50-Day MA"
          value={data.movingAverage50 ? `$${data.movingAverage50.toFixed(2)}` : "N/A"}
          colorClass="text-blue-500"
        />
      </div>

      {/* 200-Day Moving Average */}
      {data.movingAverage200 && (
        <div className="border border-foreground/20 rounded-lg p-4">
          <div className="text-sm text-foreground/60">200-Day Moving Average</div>
          <div className="text-2xl font-bold font-mono text-blue-500">
            ${data.movingAverage200.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="border border-foreground/20 rounded-lg p-4">
      <div className="text-xs text-foreground/60 mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorClass}`}>{value}</div>
    </div>
  );
}

function RangeCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="border border-foreground/20 rounded-lg p-4">
      <div className="text-sm text-foreground/60 mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</div>
    </div>
  );
}
