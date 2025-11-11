import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, TrendingUp, Wallet } from "lucide-react";

interface MonthlyOverviewProps {
  summary: {
    currentMonth: {
      trades: number;
      volume: number;
      netPremium: number;
      stockTrades: number;
      optionTrades: number;
    };
    allTime: {
      trades: number;
      volume: number;
      netPremium: number;
      stockTrades: number;
      optionTrades: number;
    };
  };
}

export default function MonthlyOverview({ summary }: MonthlyOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="space-y-4">
      {/* Current Month Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Current Month</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trades
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary.currentMonth.trades)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.currentMonth.stockTrades} stocks, {summary.currentMonth.optionTrades} options
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.currentMonth.volume)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Trading volume this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Premium
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.currentMonth.netPremium >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {formatCurrency(summary.currentMonth.netPremium)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.currentMonth.netPremium >= 0 ? "Credit" : "Debit"} from options
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg per Trade
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.currentMonth.trades > 0
                  ? formatCurrency(summary.currentMonth.volume / summary.currentMonth.trades)
                  : "$0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average trade size
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All-Time Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All-Time Totals</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trades
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary.allTime.trades)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.allTime.stockTrades} stocks, {summary.allTime.optionTrades} options
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.allTime.volume)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time trading volume
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Premium
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.allTime.netPremium >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {formatCurrency(summary.allTime.netPremium)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.allTime.netPremium >= 0 ? "Net credit" : "Net debit"} from options
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg per Trade
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.allTime.trades > 0
                  ? formatCurrency(summary.allTime.volume / summary.allTime.trades)
                  : "$0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average trade size
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
