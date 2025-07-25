import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Helper function to convert ArrayBuffer to base64 (Convex-compatible)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Action to process uploaded document with Claude Sonnet 4 API
export const processDocumentWithClaude = action({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the document record
      const document = await ctx.runQuery(api.functions.getDocuments, { 
        userId: args.userId 
      });
      
      const docRecord = document.find(d => d._id === args.documentId);
      if (!docRecord) {
        throw new Error("Document not found");
      }

      // Get the file from storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) {
        throw new Error("File not found in storage");
      }

      // Download the file content
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const fileBuffer = await response.arrayBuffer();
      const base64Content = arrayBufferToBase64(fileBuffer);

      // Process with Claude Sonnet 4 API
      const claudeApiKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeApiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable not set");
      }

      const extractionResult = await processWithClaude(base64Content, claudeApiKey);

      // Add trades to database
      let successfulTrades = 0;
      const errors: string[] = [];

      for (const trade of extractionResult.trades) {
        try {
          await ctx.runMutation(api.functions.addTrade, {
            userId: args.userId,
            ...trade
          });
          successfulTrades++;
        } catch (error) {
          errors.push(`Failed to add trade: ${error}`);
        }
      }

      // Update document status with classification data
      await ctx.runMutation(api.functions.updateDocumentStatus, {
        documentId: args.documentId,
        status: errors.length === 0 ? "COMPLETED" : "FAILED",
        extractedTradesCount: successfulTrades,
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
        documentType: extractionResult.documentClassification?.type,
        broker: extractionResult.documentClassification?.broker,
        classificationConfidence: extractionResult.documentClassification?.confidence,
      });

      return {
        success: true,
        extractedTradesCount: successfulTrades,
        totalTrades: extractionResult.trades.length,
        errors: errors,
        documentClassification: extractionResult.documentClassification
      };

    } catch (error) {
      console.error("Document processing failed:", error);
      
      // Update document status to failed
      await ctx.runMutation(api.functions.updateDocumentStatus, {
        documentId: args.documentId,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

// Helper function to process document with Claude Sonnet 4 API
async function processWithClaude(base64Content: string, apiKey: string) {
  // Enhanced prompt optimized for Claude's strengths
  const prompt = `You are a specialized financial document analysis expert with deep expertise in options trading. I need you to analyze this PDF document with precision and extract all options trading data while classifying the document type.

<task>
1. **Document Classification**: Identify the document type, broker, date range, and provide confidence assessment
2. **Options Trade Extraction**: Extract every single options trade with complete accuracy
3. **Context-Aware Classification**: Use sophisticated reasoning to determine correct trade types (BUY_TO_OPEN vs BUY_TO_CLOSE, etc.)
</task>

<output_format>
Respond with ONLY a valid JSON object using this exact structure:

{
  "documentClassification": {
    "type": "BROKERAGE_STATEMENT" | "TRADE_CONFIRMATION" | "TAX_DOCUMENT" | "PORTFOLIO_SUMMARY" | "TRADE_HISTORY" | "OTHER",
    "broker": "TD_AMERITRADE" | "CHARLES_SCHWAB" | "E_TRADE" | "FIDELITY" | "INTERACTIVE_BROKERS" | "ROBINHOOD" | "TASTYWORKS" | "WEBULL" | "OTHER" | "UNKNOWN",
    "dateRange": {
      "startDate": "YYYY-MM-DD" | null,
      "endDate": "YYYY-MM-DD" | null
    },
    "confidence": 0.95,
    "notes": "Brief description of document characteristics and any notable features"
  },
  "trades": [
    {
      "transactionDate": "YYYY-MM-DD",
      "tradeType": "BUY_TO_OPEN" | "SELL_TO_OPEN" | "BUY_TO_CLOSE" | "SELL_TO_CLOSE",
      "symbol": "AAPL",
      "contractType": "CALL" | "PUT", 
      "quantity": 10,
      "expirationDate": "YYYY-MM-DD",
      "strikePrice": 150.00,
      "premium": 5.50,
      "bookCost": -5500.00,
      "commission": 1.00,
      "fees": 0.50,
      "status": "EXECUTED" | "CANCELLED" | "PENDING" | "EXPIRED",
      "notes": "Any relevant context, data quality notes, or unusual circumstances",
      "extractionConfidence": 0.95
    }
  ]
}
</output_format>

<classification_guidelines>

**Document Types:**
- BROKERAGE_STATEMENT: Monthly/quarterly account statements with comprehensive trade history
- TRADE_CONFIRMATION: Individual trade confirmation receipts or notifications
- TAX_DOCUMENT: 1099-B forms, tax summaries, realized gains/losses reports
- PORTFOLIO_SUMMARY: Current positions snapshots, holdings summaries
- TRADE_HISTORY: Detailed trading activity exports or transaction reports
- OTHER: Any other financial document containing options data

**Broker Identification Patterns:**
- TD Ameritrade: Look for "TD Ameritrade", "TDA", distinctive orange branding, specific account number formats
- Charles Schwab: "Schwab", "Charles Schwab", blue/white styling, specific layout patterns
- E*TRADE: "E*TRADE", "ETRADE", distinctive styling, specific formatting
- Fidelity: "Fidelity Investments", "Fidelity", green branding
- Interactive Brokers: "Interactive Brokers", "IBKR", "IB", minimalist design
- Robinhood: "Robinhood", mobile-first formatting, modern UI elements
- tastyworks: "tastyworks", "TastyTrade", options-focused layouts
- Webull: "Webull", specific color schemes and formatting

</classification_guidelines>

<extraction_requirements>

**Critical Trade Type Analysis:**
You must use sophisticated contextual reasoning to determine trade types. This is the most important aspect of the extraction.

**Opening Positions (Establishing New Contracts):**
- BUY_TO_OPEN: Purchasing calls or puts to establish a long position (paying premium)
- SELL_TO_OPEN: Writing/selling calls or puts to establish a short position (receiving premium)

**Closing Positions (Exiting Existing Contracts):**
- BUY_TO_CLOSE: Purchasing contracts to close out a previously sold/written position (paying premium to exit short)
- SELL_TO_CLOSE: Selling contracts to close out a previously purchased position (receiving premium to exit long)

**Advanced Context Analysis:**
1. **Sequential Pattern Recognition**: Analyze trade sequences within the same contract
2. **Premium Flow Logic**: Opening positions establish premium flow direction, closing reverses it
3. **Position References**: Look for explicit mentions of "opening", "closing", position numbers, or existing holdings
4. **Strategy Context**: Identify covered calls, protective puts, spreads, and other multi-leg strategies
5. **Temporal Analysis**: Use trade timing and quantities to infer position relationships

**Data Validation Standards:**
- quantity: Positive integers only (1, 5, 10, etc.)
- premium: Price per contract as positive decimal (e.g., 2.50 = $2.50 per share)
- bookCost: Total transaction value including all fees
  * Negative = cash outflow (buying options, closing short positions)
  * Positive = cash inflow (selling options, closing long positions)
- strikePrice: Strike price as decimal number
- contractType: Must be exactly "CALL" or "PUT"
- dates: Convert all date formats to YYYY-MM-DD
- extractionConfidence: Your assessment of data accuracy (0.0-1.0)

**Advanced Symbol Processing:**
- Handle OCC format: AAPL240315C00150000 = AAPL expiring 2024-03-15, Call, $150 strike
- Parse embedded contract details from symbols when explicit data is missing
- Cross-reference symbol data with table information for accuracy

</extraction_requirements>

<quality_standards>

**Completeness Requirements:**
- Scan the entire document systematically
- Check all tables, sections, and footnotes
- Verify no trades are missed by cross-referencing totals or summaries
- Extract partial data when complete information isn't available

**Accuracy Standards:**
- Validate all numeric calculations
- Cross-reference data between different sections of the document
- Flag any inconsistencies or ambiguities in notes
- Use document context to resolve unclear information

**Confidence Scoring:**
Rate your confidence in each extraction based on:
- Data clarity and completeness
- Consistency with document patterns
- Availability of supporting context
- Presence of validation information

</quality_standards>

<edge_case_handling>
- **Missing Data**: Extract available information, note gaps in the "notes" field
- **Ambiguous Dates**: Use document context, trading calendars, or surrounding information
- **Unclear Trade Types**: Apply contextual reasoning, document uncertainty if needed
- **Symbol Variations**: Handle different symbol formats, decode when possible
- **Multi-page Trades**: Aggregate information spread across multiple pages
- **Partial Fills**: Handle split executions and partial trade completions
</edge_case_handling>

Please analyze the provided PDF document now and return the structured JSON response.`;

  // Prepare the API request using Claude's document format
  const requestBody = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000, // Adequate for complex JSON responses
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Content
            }
          },
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ]
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.content?.[0]?.text) {
    throw new Error("No response from Claude API");
  }

  const responseText = data.content[0].text;
  
  try {
    // Clean up response text (Claude is generally clean but may use markdown)
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    // Validate the response structure
    if (!parsed.documentClassification || !parsed.trades || !Array.isArray(parsed.trades)) {
      throw new Error("Invalid response format from Claude API - missing documentClassification or trades array");
    }
    
    return parsed;
  } catch (parseError) {
    console.error("Failed to parse Claude response:", responseText);
    throw new Error(`Failed to parse Claude API response: ${parseError}`);
  }
}
