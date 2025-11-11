"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Fetch previous close prices (no API key) via Yahoo Finance public endpoint.
// Note: Unofficial; acceptable for dev/hobby usage.
export const batchPrevClose = action({
  args: { symbols: v.array(v.string()) },
  returns: v.record(
    v.string(),
    v.object({
      prevClose: v.number(),
      currency: v.optional(v.string()),
      asOf: v.number(),
      source: v.literal("yahoo"),
    })
  ),
  handler: async (ctx, { symbols }) => {
    const out: Record<string, { prevClose: number; currency?: string; asOf: number; source: "yahoo" }> = {};
    const unique = Array.from(
      new Set(
        symbols
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s.length > 0)
      )
    );

    if (unique.length === 0) return out;

    const MAX_BATCH = 50;
    for (let i = 0; i < unique.length; i += MAX_BATCH) {
      const batch = unique.slice(i, i + MAX_BATCH);
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch.join(","))}`;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            // Some endpoints are picky without a UA
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          },
        });
        if (res.ok) {
          const data = await res.json();
          const results = data?.quoteResponse?.result ?? [];
          for (const q of results) {
            const sym = String(q.symbol ?? "").toUpperCase();
            const prev = Number(q.regularMarketPreviousClose);
            if (!sym || !Number.isFinite(prev)) continue;
            const asOf = Number(q.regularMarketTime ? q.regularMarketTime * 1000 : Date.now());
            const currency = typeof q.currency === "string" ? q.currency : undefined;
            out[sym] = { prevClose: prev, currency, asOf, source: "yahoo" };
          }
        }
      } catch {
        // ignore, we'll try fallback below
      }

      // Fallback for any symbols not returned by Yahoo: try Stooq (US tickers)
      const unresolved = batch.filter((s) => out[s] === undefined);
      if (unresolved.length > 0) {
        await Promise.all(
          unresolved.map(async (sym) => {
            const qsym = sym.toLowerCase().includes(".") ? sym.toLowerCase() : `${sym.toLowerCase()}.us`;
            const surl = `https://stooq.com/q/l/?s=${encodeURIComponent(qsym)}&f=sd2t2ohlcv&h&e=csv`;
            try {
              const sres = await fetch(surl);
              if (!sres.ok) return;
              const text = await sres.text();
              const rows = text.trim().split("\n");
              if (rows.length < 2) return;
              const cols = rows[1].split(",");
              // CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
              const close = Number(cols[6]);
              if (!Number.isFinite(close)) return;
              const asOf = Date.parse(`${cols[1]} ${cols[2]}`) || Date.now();
              out[sym] = { prevClose: close, currency: undefined, asOf, source: "yahoo" };
            } catch {
              // ignore
            }
          })
        );
      }
    }

    return out;
  },
});

// Fetch more detailed quote information including the company's full name and price/change.
export const batchQuoteDetails = action({
  args: { symbols: v.array(v.string()) },
  returns: v.record(
    v.string(),
    v.object({
      symbol: v.string(),
      fullName: v.optional(v.string()),
      shortName: v.optional(v.string()),
      currency: v.optional(v.string()),
      regularMarketPrice: v.optional(v.number()),
      regularMarketChangePercent: v.optional(v.number()),
      prevClose: v.optional(v.number()),
      asOf: v.number(),
      source: v.literal("yahoo"),
    })
  ),
  handler: async (ctx, { symbols }) => {
    const out: Record<string, {
      symbol: string;
      fullName?: string;
      shortName?: string;
      currency?: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
      prevClose?: number;
      asOf: number;
      source: "yahoo";
    }> = {};

    const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    if (unique.length === 0) return out;

    const MAX_BATCH = 50;
    for (let i = 0; i < unique.length; i += MAX_BATCH) {
      const batch = unique.slice(i, i + MAX_BATCH);
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch.join(","))}`;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          },
        });
        if (res.ok) {
          const data = await res.json();
          const results = data?.quoteResponse?.result ?? [];
          for (const q of results) {
            const sym = String(q.symbol ?? "").toUpperCase();
            if (!sym) continue;
            const asOf = Number(q.regularMarketTime ? q.regularMarketTime * 1000 : Date.now());
            out[sym] = {
              symbol: sym,
              fullName: typeof q.longName === "string" ? q.longName : undefined,
              shortName: typeof q.shortName === "string" ? q.shortName : undefined,
              currency: typeof q.currency === "string" ? q.currency : undefined,
              regularMarketPrice: Number.isFinite(Number(q.regularMarketPrice)) ? Number(q.regularMarketPrice) : undefined,
              regularMarketChangePercent: Number.isFinite(Number(q.regularMarketChangePercent)) ? Number(q.regularMarketChangePercent) : undefined,
              prevClose: Number.isFinite(Number(q.regularMarketPreviousClose)) ? Number(q.regularMarketPreviousClose) : undefined,
              asOf,
              source: "yahoo",
            };
          }
        }
      } catch {
        // ignore
      }
    }

    return out;
  },
});

// Fetch recent news for a batch of symbols (top N per symbol).
export const batchRecentNews = action({
  args: { symbols: v.array(v.string()), limit: v.optional(v.number()) },
  returns: v.record(
    v.string(),
    v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        publisher: v.optional(v.string()),
        link: v.string(),
        publishedAt: v.number(),
      })
    )
  ),
  handler: async (ctx, { symbols, limit }) => {
    const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    const out: Record<string, Array<{ id: string; title: string; publisher?: string; link: string; publishedAt: number }>> = {};
    if (unique.length === 0) return out;

    const per = Math.max(1, Math.min(5, limit ?? 1));

    await Promise.all(
      unique.map(async (sym) => {
        // Try Yahoo Finance news endpoint first
        const tryUrls = [
          `https://query1.finance.yahoo.com/v2/finance/news?symbols=${encodeURIComponent(sym)}&count=${per}`,
          // Fallback to search endpoint which can return news
          `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&newsCount=${per}`,
        ];

        for (const url of tryUrls) {
          try {
            const res = await fetch(url, {
              headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
              },
            });
            if (!res.ok) continue;
            const data = await res.json();
            let items: any[] = [];

            if (Array.isArray(data?.content)) {
              // Some variants return { content: [{ content: { title, pubDate, link, publisher } } ...] }
              items = data.content
                .map((c: any) => c?.content)
                .filter(Boolean);
            } else if (Array.isArray(data?.news)) {
              items = data.news;
            } else if (Array.isArray(data?.items)) {
              items = data.items;
            }

            const normalized = items
              .map((n: any) => {
                const title = n?.title ?? n?.headline ?? n?.titleOverride;
                const link = n?.link ?? n?.canonicalUrl ?? n?.url;
                const publisher = n?.publisher ?? n?.provider ?? n?.source;
                const ts = n?.pubDate ?? n?.providerPublishTime ?? n?.published_at ?? n?.publishedAt;
                const id = String(n?.id ?? n?.uuid ?? n?.guid ?? link ?? `${sym}-${ts ?? Date.now()}`);
                const publishedAt = Number(ts ? (String(ts).length < 13 ? Number(ts) * 1000 : Number(ts)) : Date.now());
                if (!title || !link) return null;
                return { id: String(id), title: String(title), publisher: publisher ? String(publisher) : undefined, link: String(link), publishedAt };
              })
              .filter(Boolean)
              .slice(0, per);

            if (normalized.length > 0) {
              out[sym] = normalized as any;
              return; // proceed to next symbol
            }
          } catch {
            // try next url
          }
        }

        // If no news found, set empty array to avoid re-fetching loops
        out[sym] = [];
      })
    );

    return out;
  },
});

