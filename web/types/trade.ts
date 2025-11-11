import type { Id } from "@/convex/_generated/dataModel";

export type StockAction = "BUY" | "SELL";
export type OptionAction = "BTO" | "BTC" | "STO" | "STC";
export type OptionType = "CALL" | "PUT";

export interface TransactionStock {
  kind: "stock";
  _id: Id<"stock_trades">;
  tradeTime: number;
  symbol: string;
  action: StockAction;
  quantity_signed: number;
  price_per_share: number;
  notional: number;
  accountTag?: string;
  notes?: string;
}

export interface TransactionOption {
  kind: "option";
  _id: Id<"option_trades">;
  tradeTime: number;
  underlying: string;
  optionType: OptionType;
  strike: number;
  expiration: number;
  action: OptionAction;
  quantity_signed_contracts: number;
  premium_per_contract: number;
  notional: number;
  accountTag?: string;
  notes?: string;
}

export type Transaction = TransactionStock | TransactionOption;

