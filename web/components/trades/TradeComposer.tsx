"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

function thirdFridayOfMonthNY(monthIndex0: number, year: number): number {
  // Compute 3rd Friday in America/New_York by taking local NY midnight approximation
  // Note: For scaffold purposes we ignore DST boundary nuances.
  const firstDay = new Date(year, monthIndex0, 1);
  const dow = firstDay.getDay(); // 0=Sun..6=Sat
  const toFirstFriday = (5 - dow + 7) % 7; // Friday=5
  const firstFriday = 1 + toFirstFriday;
  const thirdFriday = firstFriday + 14;
  const d = new Date(year, monthIndex0, thirdFriday, 17, 0, 0, 0); // 5pm local as a safe anchor
  return d.getTime();
}

function numberOrNull(x: number | ""): number | null {
  return x === "" ? null : Number(x);
}

export default function TradeComposer({ onSubmitted }: { onSubmitted?: () => void }) {
  const [tab, setTab] = useState<"stock" | "option">("option");

  // Stock form state
  const [sSymbol, setSSymbol] = useState("");
  const [sAction, setSAction] = useState<"BUY" | "SELL">("BUY");
  const [sQty, setSQty] = useState<number | "">("");
  const [sPrice, setSPrice] = useState<number | "">("");
  const [sTradeDate, setSTradeDate] = useState(""); // Execution date (required)
  const [sAccount, setSAccount] = useState("");
  const [sNotes, setSNotes] = useState("");

  // Option form state
  const [oUnderlying, setOUnderlying] = useState("");
  const [oType, setOType] = useState<"CALL" | "PUT">("PUT");
  const [oAction, setOAction] = useState<"BTO" | "BTC" | "STO" | "STC">("STO");
  const [oStrike, setOStrike] = useState<number | "">("");
  const [oMonth, setOMonth] = useState<string>(""); // e.g., "October 2025" or "October"
  const [oExpMs, setOExpMs] = useState<number | null>(null);
  const [oQty, setOQty] = useState<number | "">("");
  const [oPremium, setOPremium] = useState<number | "">("");
  const [oTradeDate, setOTradeDate] = useState(""); // Execution date (required)
  const [oAccount, setOAccount] = useState("");
  const [oNotes, setONotes] = useState("");

  const createStock = useMutation(api.trades.createStockTrade);
  const createOption = useMutation(api.trades.createOptionTrade);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<number | null>(null);

  const resolvedExpiration = useMemo(() => {
    if (oExpMs) return oExpMs;
    const raw = oMonth.trim();
    if (!raw) return null;

    const parts = raw.split(/\s+/);
    const now = new Date();
    const nyYear = now.getFullYear();

    const monthName = parts[0];
    const monthIndex = [
      "january","february","march","april","may","june",
      "july","august","september","october","november","december",
    ].indexOf(monthName.toLowerCase());
    if (monthIndex < 0) return null;

    let year = nyYear;
    if (parts.length >= 2) {
      const y = parseInt(parts[1], 10);
      if (!isNaN(y)) year = y;
    }

    const thisYearThirdFriday = thirdFridayOfMonthNY(monthIndex, year);
    const nowMs = now.getTime();

    if (parts.length === 1) {
      return thisYearThirdFriday < nowMs
        ? thirdFridayOfMonthNY(monthIndex, year + 1)
        : thisYearThirdFriday;
    }

    return thisYearThirdFriday;
  }, [oMonth, oExpMs]);

  const stockErrors = useMemo(() => {
    const errs: string[] = [];
    if (!sSymbol.trim()) errs.push("Symbol is required");
    const qty = numberOrNull(sQty);
    if (!qty || qty <= 0) errs.push("Shares must be > 0");
    const price = numberOrNull(sPrice);
    if (!price || price <= 0) errs.push("Price must be > 0");
    if (!sTradeDate) errs.push("Execution date is required");
    return errs;
  }, [sSymbol, sQty, sPrice, sTradeDate]);

  const optionErrors = useMemo(() => {
    const errs: string[] = [];
    if (!oUnderlying.trim()) errs.push("Underlying is required");
    const strike = numberOrNull(oStrike);
    if (!strike || strike <= 0) errs.push("Strike must be > 0");
    const qty = numberOrNull(oQty);
    if (!qty || qty <= 0) errs.push("Contracts must be > 0");
    const prem = numberOrNull(oPremium);
    if (!prem || prem <= 0) errs.push("Premium must be > 0");
    if (!resolvedExpiration) errs.push("Expiration is required or could not be resolved");
    if (!oTradeDate) errs.push("Execution date is required");
    return errs;
  }, [oUnderlying, oStrike, oQty, oPremium, resolvedExpiration, oTradeDate]);

  const stockHasInput = useMemo(() => {
    return sSymbol.trim().length > 0 || sQty !== "" || sPrice !== "" || sAccount.trim().length > 0 || sNotes.trim().length > 0;
  }, [sSymbol, sQty, sPrice, sAccount, sNotes]);
  const stockValid = stockErrors.length === 0;
  const stockReady = stockHasInput && stockValid;

  const optionHasInput = useMemo(() => {
    return (
      oUnderlying.trim().length > 0 ||
      oStrike !== "" ||
      oMonth.trim().length > 0 ||
      oExpMs !== null ||
      oQty !== "" ||
      oPremium !== "" ||
      oAccount.trim().length > 0 ||
      oNotes.trim().length > 0
    );
  }, [oUnderlying, oStrike, oMonth, oExpMs, oQty, oPremium, oAccount, oNotes]);
  const optionValid = optionErrors.length === 0;
  const optionReady = optionHasInput && optionValid;

  const stockSummary = useMemo(() => {
    const qty = Math.abs(numberOrNull(sQty) ?? 0);
    const price = numberOrNull(sPrice) ?? 0;
    const notional = qty * price;
    const effect = sAction === "BUY" ? `Increase by ${qty} shares` : `Reduce by ${qty} shares`;
    return { qty, price, notional, effect };
  }, [sQty, sPrice, sAction]);

  const optionSummary = useMemo(() => {
    const qty = Math.abs(numberOrNull(oQty) ?? 0);
    const prem = numberOrNull(oPremium) ?? 0;
    const mult = 100;
    const notional = qty * prem * mult;
    let effect = "";
    if (oAction === "BTO") effect = `Increase Long by ${qty} contracts`;
    else if (oAction === "BTC") effect = `Reduce Short by ${qty} contracts`;
    else if (oAction === "STO") effect = `Increase Short by ${qty} contracts`;
    else effect = `Reduce Long by ${qty} contracts`;
    return { qty, prem, mult, notional, effect };
  }, [oQty, oPremium, oAction]);

  async function submitStock() {
    if (stockErrors.length > 0) return;
    const tradeTime = sTradeDate ? new Date(sTradeDate + 'T17:00:00').getTime() : undefined;
    await createStock({
      symbol: sSymbol,
      action: sAction,
      quantity_shares: Number(sQty),
      price_per_share: Number(sPrice),
      tradeTime,
      accountTag: sAccount || undefined,
      notes: sNotes || undefined,
    });
    setSSymbol(""); setSQty(""); setSPrice(""); setSTradeDate(""); setSAccount(""); setSNotes("");
    if (toastTimer) window.clearTimeout(toastTimer);
    const t = window.setTimeout(() => setToast(null), 2500);
    setToastTimer(t);
    setToast("Stock trade submitted");
    onSubmitted?.();
  }

  async function submitOption() {
    if (optionErrors.length > 0 || !resolvedExpiration) return;
    const tradeTime = oTradeDate ? new Date(oTradeDate + 'T17:00:00').getTime() : undefined;
    await createOption({
      underlying: oUnderlying,
      optionType: oType,
      strike: Number(oStrike),
      expiration: resolvedExpiration,
      action: oAction,
      quantity_contracts: Number(oQty),
      premium_per_contract: Number(oPremium),
      tradeTime,
      accountTag: oAccount || undefined,
      notes: oNotes || undefined,
    });
    setOUnderlying(""); setOType("PUT"); setOAction("STO"); setOStrike(""); setOMonth(""); setOExpMs(null);
    setOQty(""); setOPremium(""); setOTradeDate(""); setOAccount(""); setONotes("");
    if (toastTimer) window.clearTimeout(toastTimer);
    const t = window.setTimeout(() => setToast(null), 2500);
    setToastTimer(t);
    setToast("Option trade submitted");
    onSubmitted?.();
  }

  return (
    <div className="border border-foreground/20 p-4 space-y-4">
      <div className="flex gap-2">
        <button className={cn("px-3 py-1 text-sm", tab === "option" ? "bg-foreground text-background" : "bg-transparent border border-foreground/30")}
          onClick={() => setTab("option")}>Option trade</button>
        <button className={cn("px-3 py-1 text-sm", tab === "stock" ? "bg-foreground text-background" : "bg-transparent border border-foreground/30")}
          onClick={() => setTab("stock")}>Stock trade</button>
      </div>

      {tab === "option" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <label className="text-xs">Underlying
            <input value={oUnderlying} onChange={(e) => setOUnderlying(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Type
            <select value={oType} onChange={(e) => setOType(e.target.value as "CALL" | "PUT")} className="w-full border px-2 py-1 text-sm">
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
          <label className="text-xs">Action
            <select value={oAction} onChange={(e) => setOAction(e.target.value as "BTO" | "BTC" | "STO" | "STC")} className="w-full border px-2 py-1 text-sm">
              <option value="BTO">Bought to Open</option>
              <option value="BTC">Bought to Close</option>
              <option value="STO">Sold to Open</option>
              <option value="STC">Sold to Close</option>
            </select>
          </label>
          <label className="text-xs">Strike
            <input type="number" min={0} value={oStrike === "" ? "" : oStrike} onChange={(e) => setOStrike(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Expiration (month/year or date)
            <input placeholder="e.g., October or October 2025" value={oMonth} onChange={(e) => setOMonth(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Or exact date
            <input type="date" onChange={(e) => {
              const d = e.target.value ? new Date(e.target.value + 'T17:00:00') : null; // 5pm local
              setOExpMs(d ? d.getTime() : null);
            }} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Contracts
            <input type="number" min={1} value={oQty === "" ? "" : oQty} onChange={(e) => setOQty(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Premium
            <input type="number" step="0.01" min={0} value={oPremium === "" ? "" : oPremium} onChange={(e) => setOPremium(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Execution Date *
            <input type="date" value={oTradeDate} onChange={(e) => setOTradeDate(e.target.value)} className="w-full border px-2 py-1 text-sm" required />
            <span className="text-[10px] text-foreground/60">Enter the actual trade execution date from your broker</span>
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Account tag
            <input value={oAccount} onChange={(e) => setOAccount(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Notes
            <input value={oNotes} onChange={(e) => setONotes(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>

          {/* Validation & summaries */}
          <div className="col-span-2 md:col-span-3 space-y-1 text-xs">
            {resolvedExpiration && (
              <div className="text-foreground/80">Expiration resolves to {new Date(resolvedExpiration).toLocaleDateString()} (3rd Friday rule)</div>
            )}
            {optionHasInput && (optionErrors.length > 0 ? (
              <ul className="text-red-600 list-disc list-inside">
                {optionErrors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            ) : (
              <div className="text-foreground/80">
                {optionSummary.effect} · Notional ${optionSummary.notional.toFixed(2)} ({optionSummary.qty} @ ${optionSummary.prem.toFixed(2)} × {optionSummary.mult})
              </div>
            ))}
          </div>

          <div className="col-span-2 md:col-span-3">
            <button disabled={!optionReady}
              className={cn("px-4 py-2 text-sm", !optionReady ? "bg-foreground/40 text-background cursor-not-allowed" : "bg-foreground text-background")}
              onClick={submitOption}>Submit option trade</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <label className="text-xs">Symbol
            <input value={sSymbol} onChange={(e) => setSSymbol(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Action
            <select value={sAction} onChange={(e) => setSAction(e.target.value as "BUY" | "SELL")} className="w-full border px-2 py-1 text-sm">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>
          <label className="text-xs">Shares
            <input type="number" min={1} value={sQty === "" ? "" : sQty} onChange={(e) => setSQty(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs">Price
            <input type="number" step="0.01" min={0} value={sPrice === "" ? "" : sPrice} onChange={(e) => setSPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Execution Date *
            <input type="date" value={sTradeDate} onChange={(e) => setSTradeDate(e.target.value)} className="w-full border px-2 py-1 text-sm" required />
            <span className="text-[10px] text-foreground/60">Enter the actual trade execution date from your broker</span>
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Account tag
            <input value={sAccount} onChange={(e) => setSAccount(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>
          <label className="text-xs col-span-2 md:col-span-3">Notes
            <input value={sNotes} onChange={(e) => setSNotes(e.target.value)} className="w-full border px-2 py-1 text-sm" />
          </label>

          {/* Validation & summaries */}
          <div className="col-span-2 md:col-span-3 space-y-1 text-xs">
            {stockHasInput && (stockErrors.length > 0 ? (
              <ul className="text-red-600 list-disc list-inside">
                {stockErrors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            ) : (
              <div className="text-foreground/80">
                {stockSummary.effect} · Notional ${stockSummary.notional.toFixed(2)} ({stockSummary.qty} @ ${stockSummary.price.toFixed(2)})
              </div>
            ))}
          </div>

          <div className="col-span-2 md:col-span-3">
            <button disabled={!stockReady}
              className={cn("px-4 py-2 text-sm", !stockReady ? "bg-foreground/40 text-background cursor-not-allowed" : "bg-foreground text-background")}
              onClick={submitStock}>Submit stock trade</button>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-2 text-sm shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
