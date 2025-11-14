"use client";

import React, { useMemo } from "react";

// Matrix view: rows = symbols, columns = expiry buckets (monthly)
// Cards = compact option summaries (strike, P/C, moneyness, value, qty)

// -----------------------------------------------------------------------------
// Types matching Convex schema
// -----------------------------------------------------------------------------

type PositionRow = {
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiration: number;
  netContracts: number;
  side: "Long" | "Short";
  openedAt: number;
  latestTradeTime: number;
  currentStockPrice: number | null;
  intrinsicValue: number | null;
  marketValue: number | null;
  costBasis: number;
  unrealizedPnL: number | null;
  unrealizedPnLPercent: number | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const moneynessColor = (m: string) => {
  if (m === "ITM") return "bg-rose-600/10 text-rose-600";
  if (m === "ATM") return "bg-amber-500/10 text-amber-600";
  return "bg-emerald-500/10 text-emerald-600";
};

// Calculate moneyness based on current stock price
const calculateMoneyness = (
  optionType: "CALL" | "PUT",
  strike: number,
  stockPrice: number | null
): "ITM" | "ATM" | "OTM" => {
  if (stockPrice === null) return "OTM"; // Default when no price available

  const threshold = strike * 0.02; // 2% threshold for ATM

  if (optionType === "CALL") {
    if (stockPrice > strike + threshold) return "ITM";
    if (stockPrice < strike - threshold) return "OTM";
    return "ATM";
  } else {
    // PUT
    if (stockPrice < strike - threshold) return "ITM";
    if (stockPrice > strike + threshold) return "OTM";
    return "ATM";
  }
};

// Format expiration date as bucket label (e.g., "JAN26")
const getBucketLabel = (expirationMs: number): string => {
  const date = new Date(expirationMs);
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}${year}`;
};

// Get all unique monthly buckets from positions, sorted chronologically
const getExpiryBuckets = (positions: PositionRow[]): string[] => {
  const buckets = new Set<string>();
  positions.forEach((pos) => {
    buckets.add(getBucketLabel(pos.expiration));
  });
  return Array.from(buckets).sort((a, b) => {
    // Parse buckets back to compare chronologically
    const parseKey = (key: string) => {
      const month = key.slice(0, 3);
      const year = parseInt("20" + key.slice(3));
      const monthIndex = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(month);
      return year * 12 + monthIndex;
    };
    return parseKey(a) - parseKey(b);
  });
};

// -----------------------------------------------------------------------------
// Compact contract card (used only in matrix cells)
// -----------------------------------------------------------------------------

interface ContractCardProps {
  position: PositionRow;
}

const ContractCard: React.FC<ContractCardProps> = ({ position }) => {
  const moneyness = calculateMoneyness(position.optionType, position.strike, position.currentStockPrice);
  const value = position.marketValue !== null ? position.marketValue : Math.abs(position.costBasis);
  const isProfitable = position.unrealizedPnL !== null && position.unrealizedPnL > 0;
  const isLoss = position.unrealizedPnL !== null && position.unrealizedPnL < 0;

  return (
    <div className="text-[10px] leading-tight rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 flex flex-col gap-0.5 min-w-[110px] hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-slate-900">
          {position.strike}
          {position.optionType === "PUT" ? "P" : "C"}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${moneynessColor(moneyness)}`}>
          {moneyness}
        </span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>Value</span>
        <span className="font-medium">${(value / 1000).toFixed(1)}k</span>
      </div>
      <div className="flex justify-between text-slate-500">
        <span>Qty</span>
        <span>{Math.abs(position.netContracts)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-500">Side</span>
        <span className={`text-[9px] font-medium ${position.side === "Long" ? "text-emerald-600" : "text-rose-600"}`}>
          {position.side}
        </span>
      </div>
      {position.unrealizedPnL !== null && (
        <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
          <span className="text-slate-500">P&L</span>
          <span className={`font-semibold ${isProfitable ? "text-green-600" : isLoss ? "text-red-600" : "text-slate-600"}`}>
            {isProfitable ? "+" : ""}${(position.unrealizedPnL / 1000).toFixed(1)}k
          </span>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Matrix board: rows = symbols, columns = expiry buckets
// -----------------------------------------------------------------------------

interface MatrixBoardProps {
  positions: PositionRow[];
}

const MatrixBoard: React.FC<MatrixBoardProps> = ({ positions }) => {
  const symbols = useMemo(() => {
    return Array.from(new Set(positions.map((p) => p.underlying))).sort();
  }, [positions]);

  const expiryBuckets = useMemo(() => {
    return getExpiryBuckets(positions);
  }, [positions]);

  return (
    <div className="inline-block align-top overflow-x-auto">
      <table className="border-collapse text-[11px]">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 border border-slate-200 bg-slate-100 px-2 py-1 text-left text-slate-500 font-medium min-w-[70px]">
              Symbol
            </th>
            {expiryBuckets.map((bucket) => (
              <th
                key={bucket}
                className="border border-slate-200 bg-slate-50 px-2 py-1 text-left text-slate-500 font-medium min-w-[150px]"
              >
                {bucket}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {symbols.map((symbol) => (
            <tr key={symbol}>
              <td className="sticky left-0 z-10 border border-slate-200 px-2 py-1 font-semibold text-slate-800 bg-slate-100 align-top">
                {symbol}
              </td>
              {expiryBuckets.map((bucket) => (
                <td key={bucket} className="border border-slate-200 px-2 py-1 align-top bg-white">
                  <div className="flex flex-wrap gap-1">
                    {positions
                      .filter(
                        (p) => p.underlying === symbol && getBucketLabel(p.expiration) === bucket
                      )
                      .map((position, idx) => (
                        <ContractCard
                          key={`${position.underlying}-${position.optionType}-${position.strike}-${position.expiration}-${idx}`}
                          position={position}
                        />
                      ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main component wrapper
// -----------------------------------------------------------------------------

interface OptionsMatrixBoardProps {
  positions: PositionRow[];
}

const OptionsMatrixBoard: React.FC<OptionsMatrixBoardProps> = ({ positions }) => {
  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active option positions to display in matrix view
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Matrix-style view of your option positions. Rows represent symbols, columns represent monthly expiration buckets.
          Each card shows strike, type, moneyness, market value, quantity, side, and P&L.
        </p>
      </div>
      <MatrixBoard positions={positions} />
    </div>
  );
};

export default OptionsMatrixBoard;
