# Gemini Prompt Improvements and System Enhancements

## Overview
This document outlines the comprehensive improvements made to the Gemini AI prompt for options trading document processing, along with corresponding database and backend updates.

## Key Enhancements

### 1. Document Classification System
**NEW**: Added comprehensive document classification capabilities

- **Document Types**: BROKERAGE_STATEMENT, TRADE_CONFIRMATION, TAX_DOCUMENT, PORTFOLIO_SUMMARY, TRADE_HISTORY, OTHER
- **Broker Detection**: TD_AMERITRADE, CHARLES_SCHWAB, E_TRADE, FIDELITY, INTERACTIVE_BROKERS, ROBINHOOD, TASTYWORKS, WEBULL, OTHER, UNKNOWN
- **Confidence Scoring**: Each classification includes a confidence score (0.0-1.0)
- **Date Range Detection**: Automatically identifies document coverage period

### 2. Enhanced Trade Type Classification
**IMPROVED**: More sophisticated context-aware trade type determination

- **Context Analysis**: Analyzes full document context, not just action words
- **Position History**: Considers existing positions and sequential trades
- **Strategy Recognition**: Identifies common patterns (covered calls, protective puts, etc.)
- **Premium Flow Analysis**: Uses premium direction to validate trade classifications
- **Sequential Logic**: Better handling of multi-leg strategies and closing trades

### 3. Advanced Data Extraction Features
**NEW**: Additional data quality and extraction capabilities

- **Option Symbol Decoding**: Parses OCC format symbols (e.g., AAPL240315C00150000)
- **Date Format Handling**: Supports multiple date formats with automatic conversion
- **Extraction Confidence**: Per-trade confidence scoring for data quality assessment
- **Enhanced Error Handling**: Better handling of missing or ambiguous data
- **Data Validation**: Stricter validation rules for all numeric fields

### 4. Comprehensive Output Structure
**NEW**: Structured JSON response with classification and trade data

```json
{
  "documentClassification": {
    "type": "BROKERAGE_STATEMENT",
    "broker": "TD_AMERITRADE",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "confidence": 0.95,
    "notes": "TD Ameritrade monthly statement with options activity"
  },
  "trades": [
    {
      "transactionDate": "2024-01-15",
      "tradeType": "BUY_TO_OPEN",
      "symbol": "AAPL",
      "contractType": "CALL",
      "quantity": 10,
      "expirationDate": "2024-03-15",
      "strikePrice": 150.00,
      "premium": 5.50,
      "bookCost": -5500.00,
      "commission": 1.00,
      "fees": 0.50,
      "status": "EXECUTED",
      "notes": "Opening long call position",
      "extractionConfidence": 0.95
    }
  ]
}
```

## Database Schema Updates

### Documents Table
- Added `documentType` field for classification
- Added `broker` field for broker identification  
- Added `classificationConfidence` field for AI confidence scoring

### Trades Table
- Added `extractionConfidence` field for per-trade data quality
- Added `EXPIRED` status option for expired contracts
- Enhanced validation for all trade types

## Processing Workflow Improvements

### 1. Multi-Stage Analysis
1. **Document Scanning**: Initial classification of document type and broker
2. **Content Location**: Systematic scanning for options-related sections
3. **Context Analysis**: Full-context evaluation for trade type determination
4. **Data Extraction**: Precise extraction with confidence scoring
5. **Cross-Validation**: Internal consistency checks and validation

### 2. Quality Assurance
- **Confidence Scoring**: Every extracted item includes confidence assessment
- **Data Validation**: Comprehensive validation of all numeric and date fields
- **Error Flagging**: Clear identification and documentation of data quality issues
- **Contextual Notes**: Detailed notes for unusual circumstances or low-confidence extractions

### 3. Enhanced Trade Type Logic
- **Opening Positions**: BUY_TO_OPEN (long positions), SELL_TO_OPEN (short positions)
- **Closing Positions**: BUY_TO_CLOSE (closing shorts), SELL_TO_CLOSE (closing longs)
- **Context Clues**: Uses position history, action descriptors, strategy context
- **Sequential Analysis**: Analyzes trade sequences for proper classification

## Broker-Specific Handling
- **TD Ameritrade**: Specific formatting patterns and terminology recognition
- **Charles Schwab**: Layout-specific extraction rules
- **E*TRADE**: Distinctive styling identification
- **Fidelity**: Format-specific parsing logic
- **Interactive Brokers**: IBKR-specific data structure handling
- **Robinhood**: Mobile-first format recognition
- **tastyworks**: Specialized options broker format handling
- **Webull**: Platform-specific pattern matching

## Error Handling and Edge Cases
- **Missing Data**: Graceful handling with detailed notes
- **Ambiguous Dates**: Context-based date resolution
- **Unclear Trade Types**: Sophisticated context analysis with uncertainty flagging
- **Partial Information**: Extraction of available data with completeness indicators
- **Data Conflicts**: Identification and resolution of conflicting information

## Performance and Accuracy Improvements
- **Completeness**: Systematic scanning to ensure no trades are missed
- **Accuracy**: Enhanced validation and cross-referencing
- **Consistency**: Standardized processing across all document types
- **Reliability**: Robust error handling and fallback mechanisms

## Usage Instructions

### For Developers
1. The enhanced prompt is automatically used in `convex/documentProcessing.ts`
2. Response structure now includes both classification and trades data
3. All database schemas are updated to support new fields
4. Error handling is more comprehensive with detailed logging

### For Users
1. Document processing now provides classification information
2. Trade extractions include confidence scores for quality assessment
3. Better handling of various broker formats
4. More accurate trade type classifications

## Future Enhancements
1. **Machine Learning**: Use confidence scores to improve model training
2. **Broker Expansion**: Add support for additional brokers as needed
3. **Strategy Detection**: Enhanced multi-leg strategy recognition
4. **Real-time Validation**: API integration for real-time data validation
5. **User Feedback**: Incorporate user corrections to improve accuracy

## Technical Implementation
- **Backward Compatible**: All changes maintain compatibility with existing data
- **Extensible**: New classification types can be easily added
- **Performant**: Optimized prompt structure for faster processing
- **Maintainable**: Clear separation of concerns and documented logic

This enhanced system provides significantly improved accuracy, reliability, and insight into options trading document processing while maintaining ease of use and extensibility.
