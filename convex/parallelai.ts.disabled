import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Search for company information using Parallel.ai Search API
 */
export const searchCompanyInfo = action({
  args: {
    symbol: v.string(),
    companyName: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      results: v.array(v.object({
        title: v.string(),
        url: v.string(),
        content: v.string(),
        source: v.string(),
      })),
    })
  ),
  handler: async (ctx, args) => {
    const parallelApiKey = process.env.PARALLEL_WEB_API_KEY;
    if (!parallelApiKey) {
      console.error("[Parallel.ai Search] PARALLEL_WEB_API_KEY not set");
      return null;
    }

    const symbol = args.symbol.toUpperCase();
    const query = args.companyName
      ? `${args.companyName} ${symbol} stock news analysis outlook 2025`
      : `${symbol} stock news analysis outlook 2025`;

    try {
      // Use Parallel.ai Search API
      const response = await fetch("https://api.parallel.ai/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${parallelApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          num_results: 5,
          search_depth: "advanced",
        }),
      });

      if (!response.ok) {
        console.error("[Parallel.ai Search] API error:", response.status, await response.text());
        return null;
      }

      const data = await response.json();

      // Transform results into our format
      const results = (data.results || []).map((result: any) => ({
        title: result.title || "",
        url: result.url || "",
        content: result.snippet || result.content || "",
        source: result.source || new URL(result.url).hostname,
      }));

      return { results };
    } catch (error) {
      console.error("[Parallel.ai Search] Error:", error);
      return null;
    }
  },
});

/**
 * Generate deep research report for a stock using AI
 * Analyzes company outlook, identifies headwinds and tailwinds
 */
type ResearchReport = {
  reportId: string;
  symbol: string;
  content: string;
  outlook: string;
  headwinds: string[];
  tailwinds: string[];
  generatedAt: number;
} | null;

export const generateResearch = action({
  args: {
    symbol: v.string(),
    context: v.optional(v.string()), // Optional: user's trading history or notes
  },
  returns: v.union(
    v.null(),
    v.object({
      reportId: v.string(),
      symbol: v.string(),
      content: v.string(),
      outlook: v.string(),
      headwinds: v.array(v.string()),
      tailwinds: v.array(v.string()),
      generatedAt: v.number(),
    })
  ),
  handler: async (ctx, args): Promise<ResearchReport> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const symbol = args.symbol.toUpperCase();

    // Check rate limit: max 1 report per stock per day per user
    const recentReport: any = await ctx.runQuery(api.parallelai._getRecentReport, { userId, symbol });
    if (recentReport) {
      const hoursSinceGeneration = (Date.now() - recentReport.generatedAt) / (1000 * 60 * 60);
      if (hoursSinceGeneration < 24) {
        console.log(`[Parallel.ai] Rate limit: report generated ${hoursSinceGeneration.toFixed(1)}h ago`);
        return {
          reportId: recentReport._id,
          symbol: recentReport.symbol,
          content: recentReport.content,
          outlook: recentReport.outlook || "Neutral",
          headwinds: recentReport.headwinds,
          tailwinds: recentReport.tailwinds,
          generatedAt: recentReport.generatedAt,
        };
      }
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[Parallel.ai] ANTHROPIC_API_KEY not set");
      return null;
    }

    try {
      // First, search for recent information about the company
      const searchResults = await ctx.runAction(api.parallelai.searchCompanyInfo, {
        symbol,
      });

      const client = new Anthropic({ apiKey });

      const userContext = args.context
        ? `\n\nUser's trading context:\n${args.context}`
        : "";

      const searchContext = searchResults && searchResults.results.length > 0
        ? `\n\nRecent news and analysis from the web:\n${searchResults.results
            .map((r: any, i: number) => `\n${i + 1}. ${r.title} (${r.source})\n   ${r.content}`)
            .join("\n")}`
        : "";

      const prompt = `You are an expert financial analyst. Provide a comprehensive research report on ${symbol}.

${userContext}
${searchContext}

Your analysis should include:

1. **Executive Summary** (2-3 paragraphs)
   - Current business overview
   - Recent performance and key metrics
   - Overall investment outlook

2. **Future Outlook** (bullish/bearish/neutral with reasoning)
   - Growth trajectory
   - Market positioning
   - Competitive advantages/disadvantages

3. **Tailwinds** (positive factors, 3-5 bullet points)
   - What could drive the stock higher?
   - Industry trends, product launches, market opportunities
   - Management strengths, financial position

4. **Headwinds** (risk factors, 3-5 bullet points)
   - What could hurt the stock?
   - Competition, regulatory risks, market risks
   - Valuation concerns, execution risks

Format your response as JSON with this structure:
{
  "outlook": "bullish" | "bearish" | "neutral",
  "summary": "2-3 paragraph executive summary",
  "tailwinds": ["tailwind 1", "tailwind 2", ...],
  "headwinds": ["headwind 1", "headwind 2", ...]
}

Be specific and actionable. Focus on recent developments and forward-looking analysis.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        console.error("[Parallel.ai] No text content in response");
        return null;
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[Parallel.ai] Could not find JSON in response");
        return null;
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Build full markdown content
      const content = `# ${symbol} Investment Research

*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

${analysis.summary}

## Outlook: ${analysis.outlook.toUpperCase()}

## Tailwinds 🚀

${analysis.tailwinds.map((t: string) => `- ${t}`).join("\n")}

## Headwinds ⚠️

${analysis.headwinds.map((h: string) => `- ${h}`).join("\n")}

---

*This analysis is AI-generated and should not be considered investment advice. Always conduct your own research.*
`;

      // Save to database
      const reportId: string = await ctx.runMutation(api.parallelai._saveReport, {
        userId,
        symbol,
        content,
        outlook: analysis.outlook,
        headwinds: analysis.headwinds,
        tailwinds: analysis.tailwinds,
      });

      console.log(`[Parallel.ai] Generated research report for ${symbol}`);

      return {
        reportId,
        symbol,
        content,
        outlook: analysis.outlook,
        headwinds: analysis.headwinds,
        tailwinds: analysis.tailwinds,
        generatedAt: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Parallel.ai] Error generating research for ${symbol}:`, error.message);
      return null;
    }
  },
});

/**
 * Get the latest research report for a symbol
 */
export const getLatestReport = query({
  args: { symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      symbol: v.string(),
      content: v.string(),
      outlook: v.union(v.string(), v.null()),
      headwinds: v.array(v.string()),
      tailwinds: v.array(v.string()),
      generatedAt: v.number(),
      isStale: v.boolean(), // true if > 7 days old
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const symbol = args.symbol.toUpperCase();

    const report = await ctx.db
      .query("research_reports")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .order("desc")
      .first();

    if (!report) return null;

    const ageInDays = (Date.now() - report.generatedAt) / (1000 * 60 * 60 * 24);

    return {
      _id: report._id,
      symbol: report.symbol,
      content: report.content,
      outlook: report.outlook || null,
      headwinds: report.headwinds,
      tailwinds: report.tailwinds,
      generatedAt: report.generatedAt,
      isStale: ageInDays > 7,
    };
  },
});

// Internal helpers

import { api } from "./_generated/api";

export const _getRecentReport = query({
  args: { userId: v.id("users"), symbol: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      symbol: v.string(),
      content: v.string(),
      outlook: v.union(v.string(), v.null()),
      headwinds: v.array(v.string()),
      tailwinds: v.array(v.string()),
      generatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("research_reports")
      .withIndex("by_user_and_symbol", (q) => q.eq("userId", args.userId).eq("symbol", args.symbol))
      .order("desc")
      .first();

    if (!report) return null;

    return {
      _id: report._id,
      symbol: report.symbol,
      content: report.content,
      outlook: report.outlook || null,
      headwinds: report.headwinds,
      tailwinds: report.tailwinds,
      generatedAt: report.generatedAt,
    };
  },
});

export const _saveReport = mutation({
  args: {
    userId: v.id("users"),
    symbol: v.string(),
    content: v.string(),
    outlook: v.string(),
    headwinds: v.array(v.string()),
    tailwinds: v.array(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("research_reports", {
      userId: args.userId,
      symbol: args.symbol,
      content: args.content,
      outlook: args.outlook,
      headwinds: args.headwinds,
      tailwinds: args.tailwinds,
      generatedAt: Date.now(),
    });

    return reportId;
  },
});
