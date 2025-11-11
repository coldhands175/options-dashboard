"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface SymbolMatch {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: number;
  marketOpen: string;
  marketClose: string;
  timezone: string;
}

interface SymbolConfirmationProps {
  symbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}

export default function SymbolConfirmation({
  symbol,
  open,
  onOpenChange,
  onConfirm,
}: SymbolConfirmationProps) {
  const [matches, setMatches] = useState<SymbolMatch[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<SymbolMatch | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const searchSymbol = useAction(api.alphavantage.searchSymbol);
  const upsertMapping = useMutation(api.symbolMappings.upsertSymbolMapping);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchSymbol({ keywords: symbol });
      setMatches(results || []);
    } catch (error) {
      console.error("Failed to search symbol:", error);
      setMatches([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Search for matches when dialog opens
  useEffect(() => {
    if (open && !matches && symbol) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol]);

  const handleConfirm = async () => {
    if (!selectedMatch) return;

    setIsConfirming(true);
    try {
      await upsertMapping({
        symbol: symbol.toUpperCase(),
        confirmedSymbol: selectedMatch.symbol,
        name: selectedMatch.name,
        exchange: extractExchange(selectedMatch.symbol),
        region: selectedMatch.region,
        currency: selectedMatch.currency,
        status: "confirmed",
      });

      onConfirm?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to confirm mapping:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Extract exchange from symbol (e.g., "RY.TO" -> "TSX", "RY" -> "NYSE")
  const extractExchange = (fullSymbol: string): string => {
    if (fullSymbol.includes(".TO")) return "TSX";
    if (fullSymbol.includes(".L")) return "LSE";
    if (fullSymbol.includes(".HK")) return "HKEX";
    // Add more as needed
    return "NYSE/NASDAQ"; // Default for US stocks
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Stock Symbol: {symbol}</DialogTitle>
          <DialogDescription>
            Multiple listings found for this symbol. Please select the correct
            exchange and market.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {isSearching ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-pulse">Searching for matches...</div>
            </div>
          ) : matches === null ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No matches found for "{symbol}"
            </div>
          ) : (
            matches.map((match, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedMatch(match)}
                className={`w-full text-left p-4 border rounded-lg transition-all ${
                  selectedMatch?.symbol === match.symbol
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-foreground/20 hover:border-foreground/40 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{match.symbol}</span>
                      {selectedMatch?.symbol === match.symbol && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-foreground/80 mb-2">
                      {match.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{match.region}</Badge>
                      <Badge variant="secondary">{match.type}</Badge>
                      <Badge variant="outline">{match.currency}</Badge>
                      <Badge variant="outline">
                        Match: {(match.matchScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Trading hours: {match.marketOpen} - {match.marketClose} (
                      {match.timezone})
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMatch || isConfirming}
          >
            {isConfirming ? "Confirming..." : "Confirm Selection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
