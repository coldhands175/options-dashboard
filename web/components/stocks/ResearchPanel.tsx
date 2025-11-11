"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ResearchPanel({ symbol }: { symbol: string }) {
  const latestReport = useQuery(api.parallelai.getLatestReport, { symbol });
  const generateResearch = useAction(api.parallelai.generateResearch);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateResearch = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateResearch({ symbol });
      if (!result) {
        setError("Failed to generate research. Please try again later.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while generating research.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Show empty state if no report exists
  if (!latestReport && !isGenerating) {
    return (
      <div className="text-center p-12 border border-foreground/20 rounded-lg">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-foreground/40" />
        <h3 className="text-xl font-bold mb-2">No Research Available</h3>
        <p className="text-foreground/60 mb-6">
          Generate an AI-powered research report for {symbol} to see deep analysis, outlook,
          tailwinds, and headwinds.
        </p>
        <button
          onClick={handleGenerateResearch}
          disabled={isGenerating}
          className="px-6 py-3 bg-foreground text-background rounded font-mono hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Research...
            </span>
          ) : (
            "Generate Research"
          )}
        </button>
        {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}
      </div>
    );
  }

  // Show loading state while generating first report
  if (isGenerating && !latestReport) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-mono">Generating AI Research...</p>
        <p className="text-sm text-foreground/60 mt-2">This may take 10-30 seconds</p>
      </div>
    );
  }

  if (!latestReport) return null;

  const getOutlookColor = (outlook: string | null) => {
    if (!outlook) return "text-foreground/60";
    const lower = outlook.toLowerCase();
    if (lower.includes("bullish")) return "text-green-500";
    if (lower.includes("bearish")) return "text-red-500";
    return "text-yellow-500";
  };

  const getOutlookBadge = (outlook: string | null) => {
    if (!outlook) return null;
    const lower = outlook.toLowerCase();
    if (lower.includes("bullish"))
      return <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-mono">Bullish</span>;
    if (lower.includes("bearish"))
      return <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-mono">Bearish</span>;
    return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-mono">Neutral</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono mb-1">AI Research Report</h2>
          <p className="text-sm text-foreground/60">
            Generated{" "}
            {formatDistanceToNow(new Date(latestReport.generatedAt), { addSuffix: true })}
            {latestReport.isStale && (
              <span className="text-yellow-500 ml-2">(Stale - consider regenerating)</span>
            )}
          </p>
        </div>

        <button
          onClick={handleGenerateResearch}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 border border-foreground/40 rounded hover:bg-foreground/5 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Outlook Badge */}
      {latestReport.outlook && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-foreground/60">Outlook:</span>
          {getOutlookBadge(latestReport.outlook)}
        </div>
      )}

      {/* Tailwinds */}
      {latestReport.tailwinds && latestReport.tailwinds.length > 0 && (
        <div className="border border-foreground/20 rounded-lg p-6">
          <h3 className="text-lg font-bold font-mono mb-4 flex items-center gap-2 text-green-500">
            <TrendingUp className="w-5 h-5" />
            Tailwinds (Positive Factors)
          </h3>
          <ul className="space-y-3">
            {latestReport.tailwinds.map((tailwind, index) => (
              <li key={index} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">{tailwind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Headwinds */}
      {latestReport.headwinds && latestReport.headwinds.length > 0 && (
        <div className="border border-foreground/20 rounded-lg p-6">
          <h3 className="text-lg font-bold font-mono mb-4 flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            Headwinds (Risk Factors)
          </h3>
          <ul className="space-y-3">
            {latestReport.headwinds.map((headwind, index) => (
              <li key={index} className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">{headwind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Report Content (Markdown) */}
      <div className="border border-foreground/20 rounded-lg p-6">
        <h3 className="text-lg font-bold font-mono mb-4">Full Report</h3>
        <div className="prose prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">
            {latestReport.content}
          </pre>
        </div>
      </div>

      <div className="text-xs text-foreground/50 italic text-center p-4">
        This analysis is AI-generated and should not be considered investment advice. Always conduct
        your own research.
      </div>
    </div>
  );
}
