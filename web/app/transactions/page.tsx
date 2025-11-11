"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/shared/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PdfUpload from "@/components/trades/PdfUpload";
import TradeComposer from "@/components/trades/TradeComposer";
import BulkOptionInput from "@/components/trades/BulkOptionInput";
import TransactionItem from "@/components/trades/TransactionItem";
import EditTradePanel from "@/components/trades/EditTradePanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Transaction } from "@/types";
import type { Id } from "@/convex/_generated/dataModel";

// Type for EditTradePanel (matches what it expects)
type EditableTrade =
  | {
      _id: Id<"option_trades">;
      kind: "option";
      underlying: string;
      optionType: "CALL" | "PUT";
      strike: number;
      expiration: number;
      action: "BTO" | "BTC" | "STO" | "STC";
      quantity_signed_contracts: number;
      premium_per_contract: number;
      tradeTime: number;
      accountTag?: string;
      notes?: string;
    }
  | {
      _id: Id<"stock_trades">;
      kind: "stock";
      symbol: string;
      action: "BUY" | "SELL";
      quantity_signed: number;
      price_per_share: number;
      tradeTime: number;
      accountTag?: string;
      notes?: string;
    };

export default function TransactionsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [symbolFilter, setSymbolFilter] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [editingTrade, setEditingTrade] = useState<EditableTrade | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  const data = useQuery(api.trades.listUserTransactions, { limit: 100 }) as
    | { items: Transaction[] }
    | undefined;

  const items = data?.items ?? [];

  // Convert Transaction to EditableTrade (they're already compatible, just a type assertion)
  const handleEdit = (transaction: Transaction) => {
    setEditingTrade(transaction as EditableTrade);
    setShowEditPanel(true);
  };

  const handleEditSuccess = () => {
    // The query will automatically refetch due to Convex reactivity
    setShowEditPanel(false);
    setEditingTrade(null);
  };
  const filtered = useMemo(() => {
    const q = symbolFilter.trim().toUpperCase();
    const base = !q
      ? items
      : items.filter((it) =>
          (it.kind === "stock" ? (it as any).symbol : (it as any).underlying)
            ?.toUpperCase()
            .includes(q)
        );

    const arr = base.slice();
    arr.sort((a, b) =>
      sortDir === "desc" ? b.tradeTime - a.tradeTime : a.tradeTime - b.tradeTime
    );
    return arr;
  }, [items, symbolFilter, sortDir]);

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            Import, create, and manage your trading transactions.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Import from PDF</CardTitle>
              <CardDescription>Upload broker statements</CardDescription>
            </CardHeader>
            <CardContent>
              <PdfUpload />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Entry</CardTitle>
              <CardDescription>Add multiple trades</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkOptionInput />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manual Trade Entry</CardTitle>
            <CardDescription>Enter a single trade</CardDescription>
          </CardHeader>
          <CardContent>
            <TradeComposer />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>{filtered.length} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Input
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  placeholder="Filter by symbol"
                />
                {symbolFilter && (
                  <button
                    onClick={() => setSymbolFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              >
                {sortDir === "desc" ? "Newest" : "Oldest"}
              </Button>
            </div>

            {!data ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <TransactionItem
                    key={`${item.kind}:${item._id}`}
                    item={item}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <EditTradePanel
          trade={editingTrade}
          open={showEditPanel}
          onOpenChange={setShowEditPanel}
          onSuccess={handleEditSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
