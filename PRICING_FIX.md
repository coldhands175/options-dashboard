# Options Pricing Calculation Fix

## Summary

Fixed critical bug where option position values were calculated as `quantity × 100` instead of `premium × quantity × 100`, ignoring the premium entirely.

## Root Cause

**Semantic Mismatch**: Field was named `premium_per_contract` but contained `premium_per_share` value, causing backend confusion.

## The Fix

### 1. Field Renaming
| Old | New |
|-----|-----|
| `premium_per_contract` | `premium_per_share` |
| `premiumPerContract` | `averagePremiumPerShare` (in positions) |

### 2. Correct Calculation Formula

**Individual Trades:**
```
notional = premium_per_share × quantity_contracts × 100
```

**Aggregated Positions:**
```
average_premium_per_share = Σ(premium × qty) / Σ(qty)  [opening trades only]
notional = average_premium_per_share × netContracts × 100
```

### 3. Examples

#### Example 1: Simple Long Position
- **Input**: BTO 2 AAPL 150C @ $5.50/share
- **Calculation**: $5.50 × 2 × 100 = **$1,100**
- **Previous (wrong)**: 2 × 100 = $200 ❌

#### Example 2: Averaged Position
- **Trade 1**: BTO 5 TSLA 200P @ $3.25 → Cost: $1,625
- **Trade 2**: BTO 3 TSLA 200P @ $4.00 → Cost: $1,200
- **Net**: 8 contracts long
- **Avg Premium**: ($1,625 + $1,200) / (5 + 3) = $3.53/share
- **Total Value**: $3.53 × 8 × 100 = **$2,824**

#### Example 3: Partial Close
- **Trade 1**: BTO 5 SPY 450C @ $2.75 → Cost: $1,375
- **Trade 2**: STC 2 SPY 450C @ $3.50 → Proceeds: $700
- **Net**: 3 contracts long
- **Avg Premium**: $2.75 (from opening trade only)
- **Book Value**: $2.75 × 3 × 100 = **$825**

## Changes Made

### Swift Client (iOS App)
- ✅ `Models.swift`: Renamed fields and added documentation
- ✅ `PortfolioViewModel.swift`: Send `premium_per_share` to backend
- ✅ `AddPositionView.swift`: Clarified UI label "Premium per Share ($)"

### Convex Backend
- ✅ `convex/schema.ts`: Updated schema with correct field names
- ✅ `convex/trades.ts`: Fixed calculation logic in all functions
  - `createOptionTrade`: Calculates notional correctly
  - `listActiveOptionPositions`: Proper weighted average and aggregation
  - Comments explaining the math

## Deployment Steps

### 1. Deploy Backend First
```bash
cd dashboard-options
npm install
npx convex dev
```

### 2. Build and Run iOS App
```bash
# The iOS app changes are already in the codebase
# Build using Xcode or MCP tools
```

### 3. Test with Examples
Enter these trades and verify calculations:
- BTO 1 TEST 100C @ $5.00 → Should show $500 notional
- BTO 2 TEST 100C @ $3.00 → Should show total $1,100 for 3 contracts
- Average should be $3.67/share, notional $1,100

## Migration Notes

⚠️ **Important**: If you have existing trades in your database:

1. Old trades have `premium_per_contract` field (wrong name, but has per-share value)
2. New trades will have `premium_per_share` field
3. The backend schema now expects `premium_per_share`

**Migration Options:**

**Option A - Fresh Start (Recommended for Testing)**
- Clear database and re-enter trades
- Ensures all data uses new schema

**Option B - Data Migration Script**
```typescript
// Run this once to migrate existing trades
const trades = await ctx.db.query("option_trades").collect();
for (const trade of trades) {
  if (!trade.premium_per_share && trade.premium_per_contract) {
    await ctx.db.patch(trade._id, {
      premium_per_share: trade.premium_per_contract,
      // Recalculate notional with correct formula
      notional: trade.premium_per_contract * trade.quantity_contracts * 100
    });
  }
}
```

## Testing Checklist

- [ ] Single BTO trade shows correct notional
- [ ] Multiple trades to same position aggregate correctly
- [ ] Weighted average premium is accurate
- [ ] Partial closes maintain correct cost basis
- [ ] Short positions (STO) calculate correctly
- [ ] Position list shows accurate book values
- [ ] Trade history displays correct per-trade notionals

## Reference: Options Trading Math

### Key Concepts
- **Premium**: Price per share to buy/sell the option
- **Contract**: 1 contract = 100 shares
- **Notional**: Total dollar value (premium × contracts × 100)
- **Cost Basis**: Average premium paid for opening trades

### Sign Conventions
- **BTO/BTC**: Positive quantity (buying)
- **STO/STC**: Negative quantity (selling)
- **Long Position**: Net positive contracts
- **Short Position**: Net negative contracts
