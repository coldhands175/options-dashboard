"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Plus,
  Search,
  Loader2,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import DashboardLayout from "@/components/shared/DashboardLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import TradingViewWatchlist from "@/components/watchlist/TradingViewWatchlist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function WatchlistPage() {
  const router = useRouter();
  const watchlist = useQuery(api.watchlist.listWatchlist);
  const removeFromWatchlist = useMutation(api.watchlist.removeFromWatchlist);
  const syncWatchlistWithPositions = useMutation(api.watchlist.syncWatchlistWithPositions);
  const getQuote = useAction(api.alphavantage.getQuote);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterSource, setFilterSource] = useState<"all" | "manual" | "trade">("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sortField, setSortField] = useState<"symbol" | "change">("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");

  // Detect theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Auto-sync on page load
  useEffect(() => {
    const autoSync = async () => {
      try {
        await syncWatchlistWithPositions();
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    };
    autoSync();
  }, [syncWatchlistWithPositions]);

  // Fetch quotes for all watchlist symbols to enable sorting by change
  const fetchAllQuotes = async () => {
    if (!watchlist || watchlist.length === 0) return;

    setIsLoadingQuotes(true);
    try {
      // Fetch quotes for all symbols in parallel
      await Promise.all(
        watchlist.map((item) => getQuote({ symbol: item.symbol }))
      );
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  // Auto-fetch quotes on page load if sorting by change
  useEffect(() => {
    if (watchlist && watchlist.length > 0 && sortField === "change" && !hasMarketData) {
      fetchAllQuotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist, sortField]);

  // Filter, search, and sort watchlist
  const filteredWatchlist = watchlist?.filter((item) => {
    const matchesSearch = item.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSource === "all" || item.source === filterSource;
    return matchesSearch && matchesFilter;
  });

  const sortedWatchlist = [...(filteredWatchlist || [])].sort((a, b) => {
    if (sortOrder === "none") return 0;

    let comparison = 0;
    if (sortField === "symbol") {
      comparison = a.symbol.localeCompare(b.symbol);
    } else if (sortField === "change") {
      // Sort by change percent (if available)
      // Note: Stocks without cached market data will be treated as 0% change
      const aChange = a.changePercent ?? 0;
      const bChange = b.changePercent ?? 0;
      comparison = aChange - bChange;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Check if we have any market data for change sorting
  const hasMarketData = sortedWatchlist.some((item) => item.changePercent !== null);

  const toggleSort = () => {
    setSortOrder((current) => {
      if (current === "none") return "asc";
      if (current === "asc") return "desc";
      return "none";
    });
  };

  const handleRemove = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return;
    try {
      await removeFromWatchlist({ symbol });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
    }
  };

  const handleViewStock = (symbol: string) => {
    router.push(`/stocks/${symbol}`);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWatchlistWithPositions();
      console.log(`Synced watchlist: ${result.added} added, ${result.reactivated} reactivated, ${result.total} total`);
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (watchlist === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Watchlist"
          description="Track and research stocks you're trading or interested in"
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync with Positions
                  </>
                )}
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Stocks"
            value={watchlist.length}
            icon={Star}
          />
          <StatCard
            title="Manually Added"
            value={watchlist.filter((item) => item.source === "manual").length}
            icon={Plus}
          />
          <StatCard
            title="From Trades"
            value={watchlist.filter((item) => item.source === "trade").length}
            icon={BarChart3}
          />
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks..."
                  className="pl-10"
                />
              </div>

              {/* Filter and Sort Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={filterSource === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSource("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterSource === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSource("manual")}
                >
                  Manual
                </Button>
                <Button
                  variant={filterSource === "trade" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSource("trade")}
                >
                  From Trades
                </Button>

                {/* Sort Controls */}
                <div className="border-l pl-2 ml-2 flex gap-2 items-center">
                  <Select value={sortField} onValueChange={(value: "symbol" | "change") => setSortField(value)}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="symbol">Symbol</SelectItem>
                      <SelectItem value="change">% Change</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSort}
                    className="gap-2"
                  >
                    {sortOrder === "none" && <ArrowUpDown className="w-4 h-4" />}
                    {sortOrder === "asc" && <ArrowUp className="w-4 h-4" />}
                    {sortOrder === "desc" && <ArrowDown className="w-4 h-4" />}
                    Sort
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist Display */}
        {filteredWatchlist && filteredWatchlist.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery
                  ? "No stocks match your search"
                  : "Your watchlist is empty"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try a different search term"
                  : "Add stocks to track their performance and research"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Stock
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Market Data Warning */}
            {sortField === "change" && !hasMarketData && sortOrder !== "none" && (
              <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <BarChart3 className="w-5 h-5" />
                      <p className="text-sm">
                        {isLoadingQuotes
                          ? "Fetching market data for sorting..."
                          : "Market data is loading. Click refresh to load prices for sorting."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchAllQuotes}
                      disabled={isLoadingQuotes}
                      className="gap-2"
                    >
                      {isLoadingQuotes ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Refresh Prices
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <TradingViewWatchlist
                  symbols={sortedWatchlist.map((item) => item.symbol)}
                  colorTheme={theme}
                  isTransparent={false}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Add Stock Dialog */}
        <AddStockDialog open={showAddModal} onOpenChange={setShowAddModal} />
      </div>
    </DashboardLayout>
  );
}

function AddStockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addToWatchlist = useMutation(api.watchlist.addToWatchlist);
  const [symbol, setSymbol] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      setError("Please enter a stock symbol");
      return;
    }

    if (!/^[A-Z]{1,5}$/.test(normalizedSymbol)) {
      setError("Invalid stock symbol format");
      return;
    }

    setIsAdding(true);
    try {
      await addToWatchlist({ symbol: normalizedSymbol, source: "manual" });
      onOpenChange(false);
      setSymbol("");
      router.push(`/stocks/${normalizedSymbol}`);
    } catch (err: any) {
      setError(err.message || "Failed to add stock to watchlist");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock to Watchlist</DialogTitle>
          <DialogDescription>
            Enter a stock ticker symbol to add it to your watchlist
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol (Ticker)</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., AAPL, TSLA, NVDA"
              autoFocus
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground">
              Enter the stock ticker symbol (1-5 letters)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
