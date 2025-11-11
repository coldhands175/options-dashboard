"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Loader2, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type NewsItem = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment?: string;
};

export function NewsFeed({ symbol }: { symbol: string }) {
  const getNews = useAction(api.alphavantage.getNews);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const result = await getNews({ symbol, limit: 20 });
        if (result) {
          setNews(result);
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [symbol, getNews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center p-12 border border-foreground/20 rounded">
        <p className="text-foreground/60">No recent news for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-mono">Recent News</h2>
        <div className="text-sm text-foreground/60">{news.length} articles</div>
      </div>

      <div className="space-y-3">
        {news.map((article, index) => (
          <NewsCard key={index} article={article} />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ article }: { article: NewsItem }) {
  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return "text-foreground/60";
    const lower = sentiment.toLowerCase();
    if (lower.includes("positive") || lower.includes("bullish")) return "text-green-500";
    if (lower.includes("negative") || lower.includes("bearish")) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return null;
    const lower = sentiment.toLowerCase();
    if (lower.includes("positive") || lower.includes("bullish"))
      return <TrendingUp className="w-4 h-4" />;
    if (lower.includes("negative") || lower.includes("bearish"))
      return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-foreground/20 rounded-lg p-4 hover:border-foreground/40 hover:bg-foreground/5 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold mb-2 line-clamp-2 hover:underline">{article.title}</h3>
          <p className="text-sm text-foreground/70 line-clamp-3 mb-3">{article.summary}</p>

          <div className="flex items-center gap-4 text-xs text-foreground/60">
            <span className="font-mono">{article.source}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>

            {article.sentiment && (
              <>
                <span>•</span>
                <span className={`flex items-center gap-1 ${getSentimentColor(article.sentiment)}`}>
                  {getSentimentIcon(article.sentiment)}
                  {article.sentiment}
                </span>
              </>
            )}
          </div>
        </div>

        <ExternalLink className="w-4 h-4 text-foreground/40 flex-shrink-0 mt-1" />
      </div>
    </a>
  );
}
