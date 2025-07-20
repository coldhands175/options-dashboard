import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to process uploaded document with Gemini API
export const processDocumentWithGemini = action({
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
      const base64Content = Buffer.from(fileBuffer).toString('base64');

      // Process with Gemini API
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY environment variable not set");
      }

      const extractionResult = await processWithGemini(base64Content, geminiApiKey);

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
        // Add classification data if the mutation supports it
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

// Helper function to process document with Gemini API
async function processWithGemini(base64Content: string, apiKey: string) {
  const prompt = `You are an expert financial data extraction specialist with deep expertise in options trading documents. Analyze the provided document with surgical precision to extract ALL options trades and classify the document type.

# TASK
1. First, identify and classify the document type
2. Extract every options trade from the document with perfect accuracy
3. Apply context-aware trade type classification

# OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure:

{
  "documentClassification": {
    "type": "BROKERAGE_STATEMENT" | "TRADE_CONFIRMATION" | "TAX_DOCUMENT" | "PORTFOLIO_SUMMARY" | "TRADE_HISTORY" | "OTHER",
    "broker": "TD_AMERITRADE" | "CHARLES_SCHWAB" | "E_TRADE" | "FIDELITY" | "INTERACTIVE_BROKERS" | "ROBINHOOD" | "TASTYWORKS" | "WEBULL" | "OTHER" | "UNKNOWN",
    "dateRange": {
      "startDate": "YYYY-MM-DD" | null,
      "endDate": "YYYY-MM-DD" | null
    },
    "confidence": 0.95,
    "notes": "Brief description of document characteristics"
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
      "notes": "Additional context, unusual circumstances, or data quality notes",
      "extractionConfidence": 0.95
    }
  ]
}

# DOCUMENT CLASSIFICATION GUIDELINES

## Document Types:
- **BROKERAGE_STATEMENT**: Monthly/quarterly account statements with trade history
- **TRADE_CONFIRMATION**: Individual trade confirmation receipts
- **TAX_DOCUMENT**: 1099-B, tax summaries, realized gains/losses reports  
- **PORTFOLIO_SUMMARY**: Current positions, portfolio snapshots
- **TRADE_HISTORY**: Detailed trading activity exports/reports
- **OTHER**: Any other financial document with options data

## Broker Identification:
Look for logos, headers, account numbers, or formatting patterns:
- TD Ameritrade: "TD Ameritrade", "TDA", specific formatting
- Charles Schwab: "Schwab", "Charles Schwab", distinctive layout
- E*TRADE: "E*TRADE", "ETRADE", specific styling
- Fidelity: "Fidelity Investments", "Fidelity"
- Interactive Brokers: "Interactive Brokers", "IBKR", "IB"
- Robinhood: "Robinhood", mobile-first formatting
- tastyworks: "tastyworks", "TastyTrade"
- Webull: "Webull", specific formatting patterns

# TRADE EXTRACTION REQUIREMENTS

## Enhanced tradeType Classification:
**CRITICAL**: Analyze full context, not just action words!

### Opening Positions (Establishing new contracts):
- "BUY_TO_OPEN": Buying calls/puts to establish long position
- "SELL_TO_OPEN": Selling calls/puts to establish short position (covered calls, cash-secured puts)

### Closing Positions (Exiting existing contracts):
- "BUY_TO_CLOSE": Buying back previously sold options (closing short position)
- "SELL_TO_CLOSE": Selling previously bought options (closing long position)

### Context Clues for Classification:
1. **Position History**: Look for references to existing positions
2. **Action Descriptors**: "to open", "to close", "opening", "closing"
3. **Strategy Context**: "covered call", "protective put", "closing out position"
4. **Sequential Trades**: Multiple trades in same contract suggest opening then closing
5. **Premium Flow**: Opening typically involves premium payment/receipt, closing reverses it

### Common Patterns:
- **Covered Call Strategy**: SELL_TO_OPEN call → later BUY_TO_CLOSE call
- **Long Call Strategy**: BUY_TO_OPEN call → later SELL_TO_CLOSE call
- **Cash-Secured Put**: SELL_TO_OPEN put → later BUY_TO_CLOSE put or assignment
- **Protective Put**: BUY_TO_OPEN put → later SELL_TO_CLOSE put

## Data Validation & Quality:
- **quantity**: Always positive integer (1, 5, 10, etc.)
- **premium**: Price per contract, positive decimal (e.g., 2.50 = $2.50 per contract)
- **bookCost**: Total transaction value including fees
  - Negative = money paid out (buying options, closing short positions)
  - Positive = money received (selling options, closing long positions)
- **strikePrice**: Option strike price as decimal (e.g., 150.00)
- **contractType**: Exactly "CALL" or "PUT" (case-sensitive)
- **dates**: ISO format YYYY-MM-DD only
- **commission/fees**: Extract actual values; use 0 if not visible
- **extractionConfidence**: Your confidence level (0.0-1.0) in the extracted data accuracy

## Advanced Symbol & Date Parsing:
### Option Symbol Decoding (OCC format):
- **AAPL240315C00150000**: AAPL, expires 2024-03-15, Call, strike $150.00
- **TSLA231117P00200000**: TSLA, expires 2023-11-17, Put, strike $200.00
- **Format**: [SYMBOL][YYMMDD][C|P][8-digit strike price in cents]

### Date Format Variations:
- Handle: MM/DD/YYYY, MM-DD-YYYY, DD/MM/YYYY, YYYY-MM-DD
- Convert all to: YYYY-MM-DD
- Watch for European date formats (DD/MM/YYYY)

## Error Handling & Data Quality:
- **Missing Data**: Note in "notes" field what's missing and why
- **Ambiguous Dates**: Use document context, other trades, or statement period
- **Unclear Trade Types**: Analyze surrounding context, note uncertainty
- **Partial Information**: Extract what's available, flag incomplete data
- **Data Conflicts**: Note discrepancies, use most reliable source

# CRITICAL EXTRACTION RULES

1. **Completeness**: Extract EVERY options trade - scan entire document multiple times
2. **Accuracy**: Double-check all numbers, dates, and calculations
3. **Context Awareness**: Use full document context for trade type classification
4. **Consistency**: Apply same standards across all trades in document
5. **Quality Flagging**: Use extractionConfidence to indicate data quality
6. **JSON Only**: Return ONLY valid JSON - no markdown, explanations, or formatting
7. **Empty Response**: If no options trades found, return: {"documentClassification": {...}, "trades": []}

# PROCESSING WORKFLOW
1. Scan document to identify type, broker, and date range
2. Locate all options-related sections, tables, and line items
3. Extract each trade with full context analysis
4. Validate and cross-reference all extracted data
5. Apply confidence scoring based on data clarity
6. Return complete JSON structure

Process the document now:`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: "application/pdf",
            data: base64Content
          }
        }
      ]
    }]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("No response from Gemini API");
  }

  const responseText = data.candidates[0].content.parts[0].text;
  
  try {
    // Clean up response text (remove any markdown formatting)
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    // Validate the new response structure
    if (!parsed.documentClassification || !parsed.trades || !Array.isArray(parsed.trades)) {
      throw new Error("Invalid response format from Gemini API - missing documentClassification or trades array");
    }
    
    return parsed;
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error(`Failed to parse Gemini API response: ${parseError}`);
  }
}
