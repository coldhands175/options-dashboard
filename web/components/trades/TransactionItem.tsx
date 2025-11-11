"use client";

import { formatRelativeTime } from "@/utils";
import type { Transaction } from "@/types";
import { Pencil } from "lucide-react";

interface TransactionItemProps {
  item: Transaction;
  onEdit?: (item: Transaction) => void;
}

export default function TransactionItem({ item, onEdit }: TransactionItemProps) {
  return (
    <div className="group border border-foreground/20 p-3 text-sm relative hover:border-foreground/40 transition-colors">
      {item.kind === "stock" ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm">{item.symbol}</span>
            <span className={item.quantity_signed >= 0 ? 'bg-green-600/20 text-green-700' : 'bg-red-600/20 text-red-700'} style={{padding:'2px 6px', borderRadius:4, fontSize:12}}>
              {item.quantity_signed >= 0 ? "BUY" : "SELL"}
            </span>
            <span className="text-foreground/60">{formatRelativeTime(item.tradeTime)}</span>
          </div>
          <div className="text-foreground/80">
            Qty {Math.abs(item.quantity_signed)} @ ${item.price_per_share.toFixed(2)} · Notional ${item.notional.toFixed(2)}
            {item.accountTag ? <span className="ml-2 text-foreground/60">[{item.accountTag}]</span> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm">{item.underlying}</span>
            <span className={item.action === 'BTO' || item.action === 'BTC' ? 'bg-green-600/20 text-green-700' : 'bg-red-600/20 text-red-700'} style={{padding:'2px 6px', borderRadius:4, fontSize:12}}>
              {item.action}
            </span>
            <span className={item.optionType === 'CALL' ? 'bg-blue-600/20 text-blue-700' : 'bg-yellow-600/20 text-yellow-800'} style={{padding:'2px 6px', borderRadius:4, fontSize:12}}>
              {item.optionType}
            </span>
            <span className="bg-foreground/10 text-foreground/80 px-2 py-0.5 rounded text-xs">{item.strike}</span>
            <span className="bg-foreground/10 text-foreground/80 px-2 py-0.5 rounded text-xs">{new Date(item.expiration).toLocaleDateString()}</span>
            <span className="text-foreground/60">{formatRelativeTime(item.tradeTime)}</span>
          </div>
          <div className="text-foreground/80">
            {Math.abs(item.quantity_signed_contracts)} @ ${item.premium_per_contract.toFixed(2)} × 100 · Notional ${item.notional.toFixed(2)}
            {item.accountTag ? <span className="ml-2 text-foreground/60">[{item.accountTag}]</span> : null}
          </div>
        </div>
      )}

      {onEdit && (
        <button
          onClick={() => onEdit(item)}
          className="absolute top-2 right-2 p-1.5 rounded hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit trade"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

