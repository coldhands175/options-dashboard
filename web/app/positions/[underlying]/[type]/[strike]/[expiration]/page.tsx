"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

export default function ContractDetailPage() {
  const params = useParams() as { underlying: string; type: string; strike: string; expiration: string };
  const router = useRouter();

  const underlying = (params.underlying || "").toUpperCase();
  const optionType: 'CALL' | 'PUT' = (params.type || "CALL").toUpperCase() === "PUT" ? "PUT" : "CALL";
  const strike = Number(params.strike);
  const expiration = Number(params.expiration);

  const data = useQuery(api.trades.getOptionContractDetails, { underlying, optionType, strike, expiration });
  const updateTrade = useMutation(api.trades.updateOptionTrade);

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING CONTRACT... ]</p>
      </div>
    );
  }

  const expStr = new Date(data.expiration).toLocaleDateString();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="p-4 border-b border-foreground/20 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{data.underlying} {data.optionType} {data.strike}</h2>
          <div className="text-sm text-foreground/60">Expiration {expStr} · Net {data.netContracts} ({data.side})</div>
        </div>
        <button className="px-3 py-1 text-sm border border-foreground/40" onClick={() => router.back()}>Back</button>
      </div>

      <div className="p-4">
        {data.trades.length === 0 ? (
          <div className="text-sm text-foreground/60">No trades for this contract.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-foreground/20">
              <thead className="bg-foreground/5 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2">Transaction Date</th>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-right px-3 py-2">Qty (signed)</th>
                  <th className="text-right px-3 py-2">Premium</th>
                  <th className="text-right px-3 py-2">Notional</th>
                  <th className="text-left px-3 py-2">Account</th>
                  <th className="text-left px-3 py-2">Notes</th>
                  <th className="text-left px-3 py-2">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {data.trades.map((t) => (
                  <EditableTradeRow key={t._id} trade={t} onSave={async (patch) => {
                    await updateTrade({ tradeId: t._id, ...patch });
                  }} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type TradeRow = {
  _id: string;
  action: "BTO" | "BTC" | "STO" | "STC";
  quantity_signed_contracts: number;
  quantity_contracts: number;
  premium_per_contract: number;
  notional: number;
  tradeTime: number;
  accountTag?: string;
  notes?: string;
};

type Patch = Partial<{
  action: "BTO" | "BTC" | "STO" | "STC";
  quantity_contracts: number;
  premium_per_contract: number;
  tradeTime: number;
  accountTag: string | null;
  notes: string | null;
}>;

function EditableTradeRow({ trade, onSave }: { trade: TradeRow; onSave: (patch: Patch) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<TradeRow["action"]>(trade.action);
  const [qty, setQty] = useState<string>(String(trade.quantity_contracts));
  const [prem, setPrem] = useState<string>(String(trade.premium_per_contract));
  const [dt, setDt] = useState<string>(() => {
    const d = new Date(trade.tradeTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  });
  const [accountTag, setAccountTag] = useState<string>(trade.accountTag ?? "");
  const [notes, setNotes] = useState<string>(trade.notes ?? "");

  const toEpoch = (s: string) => {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : trade.tradeTime;
  };

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Patch = {};
      if (action !== trade.action) patch.action = action;
      if (qty && Number(qty) !== trade.quantity_contracts) patch.quantity_contracts = Number(qty);
      if (prem && Number(prem) !== trade.premium_per_contract) patch.premium_per_contract = Number(prem);
      const tt = toEpoch(dt);
      if (tt !== trade.tradeTime) patch.tradeTime = tt;
      if (accountTag !== (trade.accountTag ?? "")) patch.accountTag = accountTag || null;
      if (notes !== (trade.notes ?? "")) patch.notes = notes || null;
      if (Object.keys(patch).length > 0) await onSave(patch);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <tr>
        <td className="px-3 py-2">{new Date(trade.tradeTime).toLocaleString()}</td>
        <td className="px-3 py-2">{expandAction(trade.action)}</td>
        <td className="px-3 py-2 text-right">{trade.quantity_signed_contracts}</td>
        <td className="px-3 py-2 text-right">${trade.premium_per_contract.toFixed(2)} × 100</td>
        <td className="px-3 py-2 text-right">${trade.notional.toFixed(2)}</td>
        <td className="px-3 py-2">{trade.accountTag ?? ""}</td>
        <td className="px-3 py-2">{trade.notes ?? ""}</td>
        <td className="px-3 py-2">
          <button className="text-xs border px-2 py-1" onClick={() => setEditing(true)}>Edit</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2">
        <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className="border px-2 py-1 text-xs" />
      </td>
      <td className="px-3 py-2">
        <select value={action} onChange={(e)=>setAction(e.target.value as any)} className="border px-2 py-1 text-xs">
          <option value="BTO">Bought to Open</option>
          <option value="BTC">Bought to Close</option>
          <option value="STO">Sold to Open</option>
          <option value="STC">Sold to Close</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <input value={qty} onChange={(e)=>setQty(e.target.value)} type="number" min={1} className="w-24 border px-2 py-1 text-xs text-right" />
      </td>
      <td className="px-3 py-2 text-right">
        <input value={prem} onChange={(e)=>setPrem(e.target.value)} type="number" step="0.01" min={0.01} className="w-24 border px-2 py-1 text-xs text-right" />
      </td>
      <td className="px-3 py-2 text-right">${(Number(qty || 0) * Number(prem || 0) * 100).toFixed(2)}</td>
      <td className="px-3 py-2">
        <input value={accountTag} onChange={(e)=>setAccountTag(e.target.value)} placeholder="Account" className="border px-2 py-1 text-xs" />
      </td>
      <td className="px-3 py-2">
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes" className="border px-2 py-1 text-xs w-full" />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2 items-center">
          <button disabled={saving} className="text-xs border px-2 py-1" onClick={onSubmit}>{saving ? 'Saving…' : 'Save'}</button>
          <button disabled={saving} className="text-xs border px-2 py-1" onClick={()=>setEditing(false)}>Cancel</button>
        </div>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}

function expandAction(a: "BTO" | "BTC" | "STO" | "STC"): string {
  switch (a) {
    case "BTO": return "Bought to Open";
    case "BTC": return "Bought to Close";
    case "STO": return "Sold to Open";
    case "STC": return "Sold to Close";
  }
}

