"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MonthlyData {
  month: string;
  stockTrades: number;
  optionTrades: number;
  totalTrades: number;
  stockVolume: number;
  optionVolume: number;
  totalVolume: number;
  stockBuys: number;
  stockSells: number;
  optionBuys: number;
  optionSells: number;
  premiumCollected: number;
  premiumPaid: number;
  netPremium: number;
}

interface MonthlyTableProps {
  data: MonthlyData[];
}

export default function MonthlyTable({ data }: MonthlyTableProps) {
  // Format month for display (e.g., "2025-01" -> "January 2025")
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  // Calculate percentage
  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return "0%";
    return `${((part / total) * 100).toFixed(0)}%`;
  };

  // Sort data by month descending (most recent first)
  const sortedData = [...data].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Breakdown</CardTitle>
        <CardDescription>Detailed trading statistics by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Month</TableHead>
                <TableHead className="text-right">Total Trades</TableHead>
                <TableHead className="text-right">Stock/Options</TableHead>
                <TableHead className="text-right">Total Volume</TableHead>
                <TableHead className="text-right">Net Premium</TableHead>
                <TableHead className="text-right">Avg Trade Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No trading data available yet
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((row) => {
                  const avgTradeSize = row.totalTrades > 0 ? row.totalVolume / row.totalTrades : 0;
                  const stockPercentage = calculatePercentage(row.stockTrades, row.totalTrades);
                  const optionPercentage = calculatePercentage(row.optionTrades, row.totalTrades);

                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.totalTrades)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm">{row.stockTrades}</span>
                            <Badge variant="secondary" className="text-xs">
                              {stockPercentage}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm">{row.optionTrades}</span>
                            <Badge variant="outline" className="text-xs">
                              {optionPercentage}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.totalVolume)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            row.netPremium >= 0
                              ? "text-green-600 dark:text-green-500 font-medium"
                              : "text-red-600 dark:text-red-500 font-medium"
                          }
                        >
                          {formatCurrency(row.netPremium)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(avgTradeSize)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {sortedData.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Most Active Month</p>
              <p className="text-lg font-semibold">
                {formatMonth(
                  sortedData.reduce((max, row) =>
                    row.totalTrades > max.totalTrades ? row : max
                  ).month
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(
                  sortedData.reduce((max, row) =>
                    row.totalTrades > max.totalTrades ? row : max
                  ).totalTrades
                )}{" "}
                trades
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Highest Volume Month</p>
              <p className="text-lg font-semibold">
                {formatMonth(
                  sortedData.reduce((max, row) =>
                    row.totalVolume > max.totalVolume ? row : max
                  ).month
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(
                  sortedData.reduce((max, row) =>
                    row.totalVolume > max.totalVolume ? row : max
                  ).totalVolume
                )}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Best Premium Month</p>
              <p className="text-lg font-semibold">
                {formatMonth(
                  sortedData.reduce((max, row) =>
                    row.netPremium > max.netPremium ? row : max
                  ).month
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(
                  sortedData.reduce((max, row) =>
                    row.netPremium > max.netPremium ? row : max
                  ).netPremium
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
