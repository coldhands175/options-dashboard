import type { Transaction } from "./trade";

export type CombinedFeedItem =
  | { type: "transaction"; ts: number; tx: Transaction };

export type TradesCursor = { lastTime: number; lastType: "stock" | "option" } | undefined;

