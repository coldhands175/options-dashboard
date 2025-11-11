"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/shared/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign
} from "lucide-react";
import Link from "next/link";

type PositionRow = {
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiration: number;
  netContracts: number;
  side: "Long" | "Short";
};

type Transaction = {
  _id: string;
  kind: string;
  tradeTime: number;
  [key: string]: unknown;
};

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch data
  const positions = useQuery(api.trades.listActiveOptionPositions) as PositionRow[] | undefined;
  const transactions = useQuery(api.trades.listUserTransactions, { limit: 5 }) as
    | { items: Transaction[] }
    | undefined;
  const holdings = useQuery(api.trades.listStockHoldings) as
    | Array<{ symbol: string; netShares: number; side: string; averagePrice: number; totalNotional: number }>
    | undefined;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Calculate portfolio stats
  const activePositionsCount = positions?.length ?? 0;
  const stockHoldingsCount = holdings?.filter((h) => h.netShares !== 0).length ?? 0;
  const totalStockValue = holdings?.reduce((sum, h) => sum + h.totalNotional, 0) ?? 0;
  const recentTransactionsCount = transactions?.items?.length ?? 0;

  // Get upcoming expirations (within 7 days)
  const now = Date.now();
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingExpirations = positions?.filter(
    (p) => p.expiration >= now && p.expiration <= sevenDaysFromNow
  ) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your trading activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Stock Holdings Value"
            value={`$${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={`${stockHoldingsCount} ${stockHoldingsCount === 1 ? "position" : "positions"}`}
            icon={DollarSign}
            changeType="neutral"
          />
          <StatCard
            title="Active Options"
            value={activePositionsCount}
            description="Open option contracts"
            icon={Activity}
            changeType="neutral"
          />
          <StatCard
            title="Expiring Soon"
            value={upcomingExpirations.length}
            description="Within 7 days"
            icon={upcomingExpirations.length > 0 ? TrendingDown : TrendingUp}
            changeType={upcomingExpirations.length > 3 ? "negative" : "neutral"}
          />
          <StatCard
            title="Recent Transactions"
            value={recentTransactionsCount}
            description="Last 5 trades"
            icon={Wallet}
            changeType="neutral"
          />
        </div>

        {/* Two Column Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Positions Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>Your current option positions</CardDescription>
            </CardHeader>
            <CardContent>
              {!positions || positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No active option positions
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Strike</TableHead>
                        <TableHead>Side</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.slice(0, 5).map((pos, idx) => (
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
                          <TableCell>
                            <Badge
                              variant={pos.side === "Long" ? "outline" : "destructive"}
                            >
                              {pos.side}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {positions.length > 5 && (
                    <div className="text-center">
                      <Link
                        href="/positions"
                        className="text-sm text-primary hover:underline"
                      >
                        View all {positions.length} positions →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              {!transactions || transactions.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent transactions
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {transactions.items.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {tx.kind === "stock" ? "Stock Trade" : "Option Trade"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.tradeTime).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{tx.kind}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <Link
                      href="/transactions"
                      className="text-sm text-primary hover:underline"
                    >
                      View all transactions →
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock Holdings */}
        {holdings && holdings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stock Holdings</CardTitle>
              <CardDescription>Your current equity positions</CardDescription>
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
                  {holdings.filter((h) => h.netShares !== 0).map((holding, idx) => (
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

        {/* Upcoming Expirations Alert */}
        {upcomingExpirations.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
                Upcoming Expirations
              </CardTitle>
              <CardDescription>
                {upcomingExpirations.length} position{upcomingExpirations.length !== 1 ? "s" : ""} expiring within 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingExpirations.map((pos, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-background rounded border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{pos.underlying}</span>
                      <Badge variant="outline">{pos.optionType}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ${pos.strike}
                      </span>
                    </div>
                    <span className="text-sm text-yellow-700 dark:text-yellow-500 font-medium">
                      Expires {new Date(pos.expiration).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
