# Convex Backend - Option Trading Dashboard

## Overview

This directory contains the Convex backend functions for the Options Trading Dashboard iOS app.

## Critical Fix: Premium Calculation

### The Problem

The previous implementation was calculating notional value as:
```
notional = quantity_contracts × 100
```

This **ignored the premium entirely**, resulting in incorrect position values.

### The Solution

**Correct Formula:**
```typescript
notional = premium_per_share × quantity_contracts × 100
```

**Explanation:**
- Users enter **premium per share** (e.g., $5.50)
- 1 options contract = **100 shares**
- Total cost = premium × quantity × 100

**Example:**
- Action: BTO (Buy to Open)
- Quantity: 2 contracts
- Premium: $5.50 per share
- **Correct notional: $5.50 × 2 × 100 = $1,100**
- **Wrong notional: 2 × 100 = $200** ❌

## Field Name Changes

To fix the semantic mismatch, the field has been renamed:

| Old Name | New Name | Description |
|----------|----------|-------------|
| `premium_per_contract` | `premium_per_share` | Premium per share (NOT per contract) |

**Both client and backend now use `premium_per_share` consistently.**

## Key Functions

### `createOptionTrade`
Creates a new trade and calculates:
- `quantity_signed_contracts`: Positive for buy, negative for sell
- `notional`: `premium_per_share × quantity_contracts × 100`

### `listActiveOptionPositions`
Aggregates trades into positions:
1. Groups by contract spec (underlying, type, strike, expiration)
2. Sums signed quantities → `netContracts`
3. Calculates weighted average premium from opening trades
4. Calculates total notional: `avg_premium × netContracts × 100`

## Deployment

To deploy these fixes to your Convex backend:

```bash
# Install dependencies
npm install

# Deploy to Convex
npx convex dev
```

## Testing

Test the fix with these examples:

**Example 1: Simple Long Position**
```
BTO 2 AAPL 150C @ $5.50
Expected notional: $1,100
```

**Example 2: Partial Close**
```
BTO 5 TSLA 200P @ $3.25  → Cost: $1,625
STC 2 TSLA 200P @ $4.00  → Proceeds: $800
Net position: 3 contracts long
Avg premium: $3.25
Book value: $975
```

**Example 3: Short Position**
```
STO 1 SPY 450C @ $2.75
Expected notional: $275 (premium received)
Position: 1 contract short
```

## Migration Notes

If you have existing trades in the database with `premium_per_contract` instead of `premium_per_share`:

1. The field name change means existing trades will decode with `premium_per_share = 0`
2. You may need to migrate existing data or re-enter trades
3. Alternative: Update schema.ts to support both field names temporarily

## Auth Integration

Current implementation uses placeholder `userId = "default"`. To integrate with your auth system:

1. Update all queries/mutations to get userId from `ctx.auth`
2. Example:
   ```typescript
   const identity = await ctx.auth.getUserIdentity();
   const userId = identity?.subject ?? "anonymous";
   ```
