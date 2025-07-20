// Test script with retry logic for Claude Sonnet document processing
// Usage: node test-claude-retry.js path/to/your/document.pdf

import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testClaudePromptWithRetry(pdfFilePath, maxRetries = 3) {
  // Check if file exists
  if (!fs.existsSync(pdfFilePath)) {
    console.error('File not found:', pdfFilePath);
    process.exit(1);
  }

  // Check file size (Claude has 32MB limit)
  const stats = fs.statSync(pdfFilePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  if (fileSizeMB > 32) {
    console.error(`File too large: ${fileSizeMB.toFixed(1)}MB (max 32MB)`);
    process.exit(1);
  }

  // Read and encode the PDF
  const fileBuffer = fs.readFileSync(pdfFilePath);
  const base64Content = fileBuffer.toString('base64');

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

</extraction_requirements>

Please analyze the provided PDF document now and return the structured JSON response.`;

  // Prepare the API request using Claude's document format
  const requestBody = {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8000,
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

  // Check for API key
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeApiKey) {
    console.error('Please set ANTHROPIC_API_KEY environment variable');
    console.error('You can get an API key from: https://console.anthropic.com/');
    process.exit(1);
  }

  console.log('Processing PDF with Claude 3.5 Sonnet...');
  console.log('File:', path.basename(pdfFilePath));
  console.log('Size:', fileSizeMB.toFixed(1) + ' MB');
  console.log('Max retries:', maxRetries);
  console.log('');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 529) {
        const retryAfter = response.headers.get('retry-after') || (attempt * 2);
        console.log(`⚠️  API overloaded (attempt ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          console.log(`⏱️  Waiting ${retryAfter} seconds before retry...`);
          await sleep(retryAfter * 1000);
          continue;
        } else {
          throw new Error('API overloaded after all retry attempts. Please try again later.');
        }
      }

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
        // Clean up response text and extract JSON
        let cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Find JSON object boundaries (Claude sometimes adds explanation after JSON)
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleanText = cleanText.substring(jsonStart, jsonEnd);
        }
        
        const parsed = JSON.parse(cleanText);
        
        // Validate the response structure
        if (!parsed.documentClassification || !parsed.trades || !Array.isArray(parsed.trades)) {
          throw new Error("Invalid response format from Claude API - missing documentClassification or trades array");
        }

        console.log('✅ Successfully processed document!');
        console.log('');

        // Display results
        console.log('='.repeat(70));
        console.log('DOCUMENT CLASSIFICATION:');
        console.log('='.repeat(70));
        console.log('Type:', parsed.documentClassification.type);
        console.log('Broker:', parsed.documentClassification.broker);
        console.log('Date Range:', parsed.documentClassification.dateRange.startDate, 'to', parsed.documentClassification.dateRange.endDate);
        console.log('Confidence:', (parsed.documentClassification.confidence * 100).toFixed(1) + '%');
        console.log('Notes:', parsed.documentClassification.notes);
        console.log('');

        console.log('='.repeat(70));
        console.log('EXTRACTED TRADES:', parsed.trades.length);
        console.log('='.repeat(70));
        
        if (parsed.trades.length === 0) {
          console.log('No options trades found in this document.');
        } else {
          parsed.trades.forEach((trade, index) => {
            console.log(`\nTrade ${index + 1}:`);
            console.log(`  Date: ${trade.transactionDate}`);
            console.log(`  Type: ${trade.tradeType}`);
            console.log(`  Contract: ${trade.symbol} ${trade.expirationDate} $${trade.strikePrice} ${trade.contractType}`);
            console.log(`  Quantity: ${trade.quantity} contracts`);
            console.log(`  Premium: $${trade.premium} per contract`);
            console.log(`  Book Cost: $${trade.bookCost.toFixed(2)}`);
            if (trade.commission > 0) console.log(`  Commission: $${trade.commission}`);
            if (trade.fees > 0) console.log(`  Fees: $${trade.fees}`);
            console.log(`  Status: ${trade.status}`);
            console.log(`  Extraction Confidence: ${(trade.extractionConfidence * 100).toFixed(1)}%`);
            if (trade.notes) {
              console.log(`  Notes: ${trade.notes}`);
            }
          });

          // Calculate summary statistics
          const totalTrades = parsed.trades.length;
          const avgConfidence = parsed.trades.reduce((sum, trade) => sum + trade.extractionConfidence, 0) / totalTrades;
          const tradeTypeBreakdown = parsed.trades.reduce((acc, trade) => {
            acc[trade.tradeType] = (acc[trade.tradeType] || 0) + 1;
            return acc;
          }, {});

          console.log('\n' + '='.repeat(70));
          console.log('SUMMARY STATISTICS:');
          console.log('='.repeat(70));
          console.log(`Total Trades: ${totalTrades}`);
          console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
          console.log('Trade Type Breakdown:');
          Object.entries(tradeTypeBreakdown).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} trades`);
          });
        }

        // Save results to file
        const outputFile = `claude-results-${Date.now()}.json`;
        fs.writeFileSync(outputFile, JSON.stringify(parsed, null, 2));
        console.log(`\n\nDetailed results saved to: ${outputFile}`);

        // Show usage stats if available
        if (data.usage) {
          console.log('\nAPI Usage:');
          console.log(`Input tokens: ${data.usage.input_tokens?.toLocaleString() || 'N/A'}`);
          console.log(`Output tokens: ${data.usage.output_tokens?.toLocaleString() || 'N/A'}`);
        }

        return parsed;
        
      } catch (parseError) {
        console.error("Failed to parse Claude response:");
        console.error("Raw response:", responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : ''));
        throw new Error(`Failed to parse Claude API response: ${parseError}`);
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("Error processing document after all retries:", error.message);
        process.exit(1);
      }
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
      console.log(`⏱️  Waiting ${waitTime/1000}s before retry...`);
      await sleep(waitTime);
    }
  }
}

// Run the test
if (process.argv.length < 3) {
  console.error('Usage: node test-claude-retry.js <path-to-pdf-file>');
  console.error('Example: node test-claude-retry.js ~/Downloads/statement.pdf');
  console.error('');
  console.error('Requirements:');
  console.error('- PDF must be under 32MB');
  console.error('- ANTHROPIC_API_KEY environment variable must be set');
  console.error('- Get API key from: https://console.anthropic.com/');
  process.exit(1);
}

const pdfFilePath = process.argv[2];
testClaudePromptWithRetry(pdfFilePath, 3);
