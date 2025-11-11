"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OptionTrade = {
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
};

type StockTrade = {
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

type Trade = OptionTrade | StockTrade;

interface EditTradePanelProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditTradePanel({
  trade,
  open,
  onOpenChange,
  onSuccess,
}: EditTradePanelProps) {
  const updateOption = useMutation(api.trades.updateOptionTrade);
  const updateStock = useMutation(api.trades.updateStockTrade);

  // Option form state
  const [action, setAction] = useState<"BTO" | "BTC" | "STO" | "STC">("BTO");
  const [quantity, setQuantity] = useState("");
  const [premium, setPremium] = useState("");
  const [tradeDate, setTradeDate] = useState("");
  const [accountTag, setAccountTag] = useState("");
  const [notes, setNotes] = useState("");

  // Stock form state
  const [stockAction, setStockAction] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when trade changes
  useEffect(() => {
    if (!trade) return;

    if (trade.kind === "option") {
      setAction(trade.action);
      setQuantity(Math.abs(trade.quantity_signed_contracts).toString());
      setPremium(trade.premium_per_contract.toString());
      setTradeDate(new Date(trade.tradeTime).toISOString().split("T")[0]);
      setAccountTag(trade.accountTag || "");
      setNotes(trade.notes || "");
    } else {
      setStockAction(trade.action);
      setShares(Math.abs(trade.quantity_signed).toString());
      setPrice(trade.price_per_share.toString());
      setTradeDate(new Date(trade.tradeTime).toISOString().split("T")[0]);
      setAccountTag(trade.accountTag || "");
      setNotes(trade.notes || "");
    }
  }, [trade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const tradeTime = tradeDate ? new Date(tradeDate + "T17:00:00").getTime() : undefined;

      if (trade.kind === "option") {
        await updateOption({
          tradeId: trade._id,
          action,
          quantity_contracts: Number(quantity),
          premium_per_contract: Number(premium),
          tradeTime,
          accountTag: accountTag || null,
          notes: notes || null,
        });
      } else {
        await updateStock({
          tradeId: trade._id,
          action: stockAction,
          quantity_shares: Number(shares),
          price_per_share: Number(price),
          tradeTime,
          accountTag: accountTag || null,
          notes: notes || null,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to update trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!trade) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Trade</SheetTitle>
          <SheetDescription>
            {trade.kind === "option"
              ? `${trade.underlying} ${trade.optionType} $${trade.strike} ${new Date(trade.expiration).toLocaleDateString()}`
              : `${trade.symbol} stock trade`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {trade.kind === "option" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTO">Buy to Open</SelectItem>
                    <SelectItem value="BTC">Buy to Close</SelectItem>
                    <SelectItem value="STO">Sell to Open</SelectItem>
                    <SelectItem value="STC">Sell to Close</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Contracts</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="premium">Premium per Contract</Label>
                <Input
                  id="premium"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="stock-action">Action</Label>
                <Select value={stockAction} onValueChange={(v) => setStockAction(v as typeof stockAction)}>
                  <SelectTrigger id="stock-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  min="1"
                  step="1"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price per Share</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="tradeDate">Execution Date *</Label>
            <Input
              id="tradeDate"
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the actual trade execution date from your broker
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountTag">Account Tag</Label>
            <Input
              id="accountTag"
              type="text"
              value={accountTag}
              onChange={(e) => setAccountTag(e.target.value)}
              placeholder="Optional account identifier"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this trade"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
