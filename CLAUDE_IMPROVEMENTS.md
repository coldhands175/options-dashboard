# Claude Document Processing Enhancements

## Overview
We've significantly enhanced the Claude Sonnet 4 document processing system to better handle trade classification and multi-leg strategy detection.

## Key Improvements

### 1. Enhanced Trade Type Classification
- **Sophisticated Context Analysis**: Claude now uses advanced reasoning to determine BUY_TO_OPEN vs BUY_TO_CLOSE
- **Default Assumptions**: When unclear, assumes BUY_TO_OPEN for option purchases (most common case)
- **Position Flow Tracking**: Analyzes chronological sequences to understand position lifecycles
- **Premium Direction Logic**: Uses cash flow direction to infer trade types

### 2. Multi-Leg Strategy Detection
- **Strategy Identification**: Detects spreads, straddles, iron condors, and other complex strategies
- **Automatic Grouping**: Related trades are grouped with a common `strategyId`
- **Pattern Recognition**: Looks for same-day trades, quantity matching, and strike price patterns
- **Strategy Keywords**: Recognizes explicit strategy mentions in documents

### 3. Database Schema Enhancements
- **New Field**: Added `strategyId` to the trades table
- **Proper Indexing**: Added index for efficient strategy-based queries
- **Strategy Grouping**: Related trades can now be easily queried and displayed together

### 4. Strategy ID Format
```
[SYMBOL]-[EXPIRY_YYYYMMDD]-[STRATEGY_TYPE]-[SEQUENCE]
```
Examples:
- `AAPL-20240315-VERTICAL-001` (Bull call spread)
- `TSLA-20240419-STRADDLE-001` (Long straddle)
- `SPY-20240301-IRONCONDOR-001` (Iron condor)

### 5. Enhanced Notes System
When multi-leg strategies are detected, notes include:
- Strategy type and leg identification
- Cross-references to related trades
- Confidence assessments

## Benefits for Reprocessing

When you reupload your PDFs through the new system, you should see:

1. **Better Trade Classification**:
   - More accurate BUY_TO_OPEN vs BUY_TO_CLOSE determinations
   - Contextual analysis of position flow
   - Reduced misclassification of opening trades as closing trades

2. **Multi-Leg Strategy Recognition**:
   - Spreads will be identified and grouped together
   - Related trades will have matching `strategyId` values
   - Strategy notes will provide context about complex positions

3. **Improved Data Quality**:
   - Higher confidence scores for extracted data
   - Better handling of edge cases and ambiguous scenarios
   - More detailed notes about extraction decisions

## Usage

1. **Upload PDFs**: Use the existing upload interface
2. **Select Claude**: Choose Claude as the processor for better accuracy
3. **Review Results**: Check the extraction results and confidence scores
4. **Strategy Grouping**: Related trades will be automatically grouped by `strategyId`

## Next Steps

After reprocessing your documents:
1. Review the trade classifications to ensure accuracy
2. Check multi-leg strategies are properly grouped
3. Use the `strategyId` field to analyze complex positions
4. Consider implementing UI features to display strategy groups

The enhanced system should significantly improve the accuracy of trade type classification and provide better insights into your options trading strategies.
