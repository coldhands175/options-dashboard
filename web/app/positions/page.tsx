"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import GanttPositions, { type MonthlyPremium } from "@/components/positions/GanttPositions";
import OptionsMatrixBoard from "@/components/positions/OptionsMatrixBoard";
import SymbolConfirmation from "@/components/stocks/SymbolConfirmation";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PositionRow = {
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiration: number;
  netContracts: number;
  side: "Long" | "Short";
  openedAt: number;
  latestTradeTime: number;
  // Market data
  currentStockPrice: number | null;
  intrinsicValue: number | null;
  marketValue: number | null;
  // P&L data
  costBasis: number;
  unrealizedPnL: number | null;
  unrealizedPnLPercent: number | null;
};

type StockHolding = {
  symbol: string;
  netShares: number;
  side: string;
  averagePrice: number;
  totalNotional: number;
};

export default function PositionsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [positions, setPositions] = useState<PositionRow[] | undefined>(undefined);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [symbolToConfirm, setSymbolToConfirm] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchPositions = useAction(api.trades.listActiveOptionPositionsWithMarket);
  const holdings = useQuery(api.trades.listStockHoldings) as StockHolding[] | undefined;
  const pendingMappings = useQuery(api.symbolMappings.listPendingMappings);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch positions with market data
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadPositions = async () => {
      setIsLoadingPositions(true);
      try {
        const data = await fetchPositions({});
        setPositions(data as PositionRow[]);
      } catch (error) {
        console.error("Failed to fetch positions:", error);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    loadPositions();

    // Refresh every 2 minutes to get updated market data
    const interval = setInterval(loadPositions, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchPositions]);

  // Sorting state (declared before any returns)
  const [sortKey, setSortKey] = useState<"underlying"|"optionType"|"strike"|"expiration"|"side"|"netContracts">("underlying");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const sortedPositions = useMemo(() => {
    const arr = [...(positions ?? [])];
    const cmp = (a: PositionRow, b: PositionRow) => {
      const mult = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "underlying": return mult * a.underlying.localeCompare(b.underlying);
        case "optionType": return mult * (a.optionType === b.optionType ? 0 : a.optionType === "CALL" ? -1 : 1);
        case "strike": return mult * (a.strike - b.strike);
        case "expiration": return mult * (a.expiration - b.expiration);
        case "side": return mult * a.side.localeCompare(b.side);
        case "netContracts": return mult * (a.netContracts - b.netContracts);
      }
    };
    return arr.sort(cmp);
  }, [positions, sortKey, sortDir]);

  // Calculate monthly net premiums grouped by expiration month
  const monthlyPremiums = useMemo((): MonthlyPremium[] => {
    if (!positions) return [];

    const monthMap = new Map<string, number>();

    positions.forEach((pos) => {
      const expirationDate = new Date(pos.expiration);
      const year = expirationDate.getFullYear();
      const month = expirationDate.getMonth();
      const key = `${year}-${month}`;

      // Cost basis is negative for bought (debit) and positive for sold (credit)
      // We want to show net premium: positive = collected, negative = paid
      const currentPremium = monthMap.get(key) || 0;
      monthMap.set(key, currentPremium + pos.costBasis);
    });

    return Array.from(monthMap.entries()).map(([key, netPremium]) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, netPremium };
    });
  }, [positions]);

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (isLoading || isLoadingPositions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Active Positions</h1>
          <p className="text-muted-foreground mt-2">
            View all your current option positions and stock holdings.
          </p>
        </div>

        {/* Pending Symbol Confirmations Banner */}
        {pendingMappings && pendingMappings.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Symbol Confirmation Required
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                    The following symbols need confirmation to ensure correct
                    market data:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingMappings.map((mapping) => (
                      <Button
                        key={mapping._id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSymbolToConfirm(mapping.symbol);
                          setShowConfirmDialog(true);
                        }}
                        className="bg-white dark:bg-gray-900"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Confirm {mapping.symbol}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Option Positions</CardTitle>
            <CardDescription>
              {positions?.length ?? 0} active option contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!positions || positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active option positions
              </div>
            ) : (
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="matrix">Matrix</TabsTrigger>
                </TabsList>

                {/* Table View */}
                <TabsContent value="table" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button className="hover:underline" onClick={() => handleSort("underlying")}>
                            Symbol {sortKey === "underlying" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="hover:underline" onClick={() => handleSort("optionType")}>
                            Type {sortKey === "optionType" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button className="hover:underline" onClick={() => handleSort("strike")}>
                            Strike {sortKey === "strike" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="hover:underline" onClick={() => handleSort("expiration")}>
                            Expiration {sortKey === "expiration" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button className="hover:underline" onClick={() => handleSort("side")}>
                            Side {sortKey === "side" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button className="hover:underline" onClick={() => handleSort("netContracts")}>
                            Contracts {sortKey === "netContracts" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">Stock Price</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">Cost Basis</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPositions.map((pos, idx) => {
                        const pnlPositive = pos.unrealizedPnL !== null && pos.unrealizedPnL > 0;
                        const pnlNegative = pos.unrealizedPnL !== null && pos.unrealizedPnL < 0;
                        const pnlColor = pnlPositive ? "text-green-600" : pnlNegative ? "text-red-600" : "";

                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/positions/${pos.underlying}/${pos.optionType}/${pos.strike}/${pos.expiration}`}
                                className="hover:underline"
                              >
                                {pos.underlying}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant={pos.optionType === "CALL" ? "default" : "secondary"}>
                                {pos.optionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">${pos.strike}</TableCell>
                            <TableCell>{new Date(pos.expiration).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={pos.side === "Long" ? "outline" : "destructive"}>
                                {pos.side}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{pos.netContracts}</TableCell>
                            <TableCell className="text-right">
                              {pos.currentStockPrice !== null
                                ? `$${pos.currentStockPrice.toFixed(2)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {pos.marketValue !== null
                                ? `$${pos.marketValue.toFixed(2)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              ${Math.abs(pos.costBasis).toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${pnlColor}`}>
                              {pos.unrealizedPnL !== null
                                ? `${pnlPositive ? "+" : ""}$${pos.unrealizedPnL.toFixed(2)}`
                                : "—"}
                              {pos.unrealizedPnLPercent !== null && (
                                <span className="text-xs ml-1">
                                  ({pnlPositive ? "+" : ""}{pos.unrealizedPnLPercent.toFixed(1)}%)
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Timeline View */}
                <TabsContent value="timeline" className="space-y-4">
                  <div>
                    <div className="mb-2 text-sm text-muted-foreground">
                      Timeline
                      <span className="ml-2 text-xs">(Monthly net premiums shown at expiration dates)</span>
                    </div>
                    <GanttPositions
                      items={(sortedPositions as PositionRow[]).map((p) => ({
                        id: `${p.underlying}-${p.optionType}-${p.strike}-${p.expiration}`,
                        label: `${p.underlying} ${p.optionType} ${p.strike} · exp ${new Date(p.expiration).toLocaleDateString()}`,
                        start: p.openedAt,
                        end: p.expiration,
                        color: p.side === "Long" ? "#10b981" : "#ef4444",
                        rowClassName: "hover:bg-accent/40",
                      }))}
                      monthlyPremiums={monthlyPremiums}
                    />
                  </div>
                </TabsContent>

                {/* Matrix View */}
                <TabsContent value="matrix" className="space-y-4">
                  <OptionsMatrixBoard positions={sortedPositions as PositionRow[]} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {holdings && holdings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stock Holdings</CardTitle>
              <CardDescription>
                {holdings.filter((h) => h.netShares !== 0).length} equity positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings
                    .filter((h) => h.netShares !== 0)
                    .map((holding, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{holding.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={holding.side === "Long" ? "outline" : "destructive"}>
                            {holding.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{holding.netShares}</TableCell>
                        <TableCell className="text-right">
                          ${holding.averagePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${holding.totalNotional.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Symbol Confirmation Dialog */}
        {symbolToConfirm && (
          <SymbolConfirmation
            symbol={symbolToConfirm}
            open={showConfirmDialog}
            onOpenChange={setShowConfirmDialog}
            onConfirm={() => {
              // Refresh positions after confirmation
              if (isAuthenticated) {
                fetchPositions({}).then((data) => {
                  setPositions(data as PositionRow[]);
                });
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
