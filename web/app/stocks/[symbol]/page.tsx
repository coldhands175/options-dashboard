"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingViewChart } from "@/components/stocks/TradingViewChart";
import { FundamentalsCard } from "@/components/stocks/FundamentalsCard";
import { NewsFeed } from "@/components/stocks/NewsFeed";
import { ResearchPanel } from "@/components/stocks/ResearchPanel";
import { StockNotes } from "@/components/stocks/StockNotes";
import { Star, TrendingUp, TrendingDown, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StockProfilePage() {
  const params = useParams() as { symbol: string };
  const symbol = params.symbol.toUpperCase();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");

  // Helpers for safe number formatting
  const fmt = (n: unknown, digits = 2): string => {
    const num = typeof n === "number" ? n : Number.NaN;
    return Number.isFinite(num) ? num.toFixed(digits) : "—";
  };

  // Check if stock is in watchlist
  const isInWatchlist = useQuery(api.watchlist.isInWatchlist, { symbol });
  const addToWatchlist = useMutation(api.watchlist.addToWatchlist);
  const removeFromWatchlist = useMutation(api.watchlist.removeFromWatchlist);

  // Fetch market data
  const quote = useAction(api.alphavantage.getQuote, { symbol });
  const fundamentals = useAction(api.alphavantage.getFundamentals, { symbol });

  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  const handleToggleWatchlist = async () => {
    setIsTogglingWatchlist(true);
    try {
      if (isInWatchlist) {
        await removeFromWatchlist({ symbol });
      } else {
        await addToWatchlist({ symbol, source: "manual" });
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <h1 className="text-4xl font-bold">{symbol}</h1>
                  {isInWatchlist && (
                    <Badge variant="secondary">
                      <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                      In Watchlist
                    </Badge>
                  )}
                </div>
                {quote && (
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold">${fmt((quote as any).price)}</span>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        typeof (quote as any).change === "number" && (quote as any).change >= 0
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      {typeof (quote as any).change === "number" && (quote as any).change >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>
                        {typeof (quote as any).change === "number" && (quote as any).change >= 0 ? "+" : ""}
                        {fmt((quote as any).change)} ({fmt((quote as any).changePercent)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleToggleWatchlist}
                disabled={isTogglingWatchlist}
                variant={isInWatchlist ? "default" : "outline"}
              >
                {isTogglingWatchlist ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className={`w-4 h-4 mr-2 ${isInWatchlist ? "fill-current" : ""}`} />
                )}
                {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="research">
              <TrendingUp className="w-4 h-4 mr-2" />
              AI Research
            </TabsTrigger>
            <TabsTrigger value="notes">My Notes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <TradingViewChart symbol={symbol} />

            {fundamentals && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${fmt(typeof fundamentals.marketCap === "number" ? fundamentals.marketCap / 1e9 : undefined)}B
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      P/E Ratio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {fmt((fundamentals as any).peRatio) === "—" ? "N/A" : fmt((fundamentals as any).peRatio)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      52-Week Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${fmt((fundamentals as any).week52Low)} - ${fmt((fundamentals as any).week52High)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Fundamentals Tab */}
          <TabsContent value="fundamentals" className="mt-6">
            <FundamentalsCard symbol={symbol} />
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="mt-6">
            <NewsFeed symbol={symbol} />
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="mt-6">
            <ResearchPanel symbol={symbol} />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-6">
            <StockNotes symbol={symbol} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
