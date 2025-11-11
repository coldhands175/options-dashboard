# Scott Capital - Feature Specification

This document provides detailed specifications for each feature in the roadmap.

---

## Table of Contents

1. [Options Greeks Dashboard](#1-options-greeks-dashboard)
2. [Tradier API Integration](#2-tradier-api-integration)
3. [Implied Volatility Tracking](#3-implied-volatility-tracking)
4. [Real-Time Alerts System](#4-real-time-alerts-system)
5. [Options Strategy Builder](#5-options-strategy-builder)
6. [Risk Dashboard](#6-risk-dashboard)
7. [Tax Reporting](#7-tax-reporting)

---

## 1. Options Greeks Dashboard

### Overview
Display real-time Greeks (Delta, Gamma, Theta, Vega, Rho) for all option positions and aggregate portfolio-level Greeks.

### User Stories
- As a trader, I want to see the Delta of each position so I can understand directional exposure
- As a trader, I want to see my total portfolio Theta so I know my daily time decay
- As a trader, I want to track how Greeks change over time

### Technical Specification

#### Database Schema
```typescript
greeks_snapshots: defineTable({
  userId: v.id("users"),
  tradeId: v.id("option_trades"),
  underlying: v.string(),
  calculatedAt: v.number(),
  stockPrice: v.number(),
  impliedVolatility: v.number(),
  delta: v.number(),
  gamma: v.number(),
  theta: v.number(),
  vega: v.number(),
  rho: v.number(),
  daysToExpiration: v.number(),
})
  .index("by_user_and_time", ["userId", "calculatedAt"])
  .index("by_trade", ["tradeId"])
  .index("by_underlying", ["underlying"])
```

#### Calculation Engine
**File**: `lib/options/blackScholes.ts`

```typescript
interface OptionInput {
  stockPrice: number;
  strikePrice: number;
  daysToExpiration: number;
  riskFreeRate: number;
  impliedVolatility: number;
  optionType: 'CALL' | 'PUT';
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  theoreticalPrice: number;
}

export function calculateGreeks(input: OptionInput): Greeks;
export function calculatePortfolioGreeks(positions: Position[]): Greeks;
```

#### Components

**PositionGreeksTable** (`components/positions/PositionGreeksTable.tsx`)
- Display Greeks for each individual position
- Columns: Position, Delta, Gamma, Theta, Vega, Rho
- Color coding (green/red for positive/negative)
- Sortable by any Greek

**PortfolioGreeksCard** (`components/dashboard/PortfolioGreeksCard.tsx`)
- Aggregate portfolio Greeks
- Large numeric display
- Trend indicators (up/down from previous day)

**GreeksTimeline** (`components/positions/GreeksTimeline.tsx`)
- Line chart showing Greeks over time
- Recharts or lightweight-charts
- Selectable time ranges (1D, 1W, 1M, 3M, 1Y)

#### API Endpoints

**Convex Functions**:
- `greeks.calculateForPosition(positionId)` - Calculate Greeks for single position
- `greeks.calculateForPortfolio(userId)` - Calculate aggregate Greeks
- `greeks.getHistorical(userId, days)` - Get historical Greeks snapshots
- `greeks.snapshotCurrent(userId)` - Save current Greeks to database (cron job)

#### Edge Cases
- Handle expired options (Greeks = 0)
- Handle options with < 1 day to expiration
- Handle missing IV data (use historical or estimated)
- Rate limiting for calculation-heavy operations

#### Testing
- Unit tests for Black-Scholes calculations
- Verify Greeks match industry standards (compare with broker)
- Test edge cases (very deep ITM, OTM, near expiration)

---

## 2. Tradier API Integration

### Overview
Replace current market data providers (Yahoo Finance, Stooq) with Tradier API for real-time stock quotes and options chains.

### User Stories
- As a trader, I want real-time stock quotes with minimal delay
- As a trader, I want to see live bid/ask spreads
- As a developer, I want a reliable API with good uptime

### Technical Specification

#### Configuration
**Environment Variables**:
```bash
TRADIER_API_KEY=your_api_key_here
TRADIER_SANDBOX=true  # Use sandbox for testing
```

**Endpoints**:
- Sandbox: `https://sandbox.tradier.com/v1/markets/quotes`
- Production: `https://api.tradier.com/v1/markets/quotes`

#### Implementation
**File**: `convex/tradier.ts`

```typescript
interface TradierQuote {
  symbol: string;
  description: string;
  last: number;
  change: number;
  change_percentage: number;
  volume: number;
  average_volume: number;
  last_volume: number;
  trade_date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevclose: number;
  bid: number;
  bidsize: number;
  ask: number;
  asksize: number;
}

export const getQuotes = action({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args): Promise<TradierQuote[]> => {
    // Implementation
  }
});
```

#### Migration Plan
1. Create Tradier integration alongside existing providers
2. Test in sandbox with known symbols
3. Add feature flag to switch between providers
4. Monitor for 1 week with logging
5. Fully switch to Tradier if stable
6. Remove old provider code

#### Rate Limits
- Sandbox: 120 requests/minute
- Production: Varies by plan ($0/mo = 120 req/min, $10/mo = unlimited)

#### Error Handling
- Retry on 429 (rate limit) with exponential backoff
- Fallback to cached data if API down
- Log all API errors to monitoring

---

## 3. Implied Volatility Tracking

### Overview
Track and display implied volatility metrics (IV, IV Rank, IV Percentile) for better trade timing.

### User Stories
- As a trader, I want to know if current IV is high or low historically
- As a trader, I want to sell premium when IV is high
- As a trader, I want IV alerts when conditions are favorable

### Technical Specification

#### Database Schema
```typescript
iv_snapshots: defineTable({
  symbol: v.string(),
  date: v.number(),
  iv: v.number(),
  iv_rank: v.number(),      // 0-100
  iv_percentile: v.number(), // 0-100
  high_52w: v.number(),
  low_52w: v.number(),
})
  .index("by_symbol_and_date", ["symbol", "date"])
```

#### Calculations

**IV Rank**: Where current IV sits in 52-week range
```
IV Rank = (Current IV - 52W Low) / (52W High - 52W Low) * 100
```

**IV Percentile**: % of days IV was below current level (past 252 days)
```
IV Percentile = (Days Below Current IV / Total Days) * 100
```

#### Components

**IVRankBadge** (`components/stocks/IVRankBadge.tsx`)
- Color-coded badge (red >70, yellow 30-70, green <30)
- Tooltip with explanation

**IVChart** (`components/stocks/IVChart.tsx`)
- Line chart of IV over time
- Horizontal lines for 52W high/low
- Current level highlighted

---

## 4. Real-Time Alerts System

### Overview
Notify users when specific market conditions or thresholds are met.

### User Stories
- As a trader, I want alerts when stock reaches my target price
- As a trader, I want reminders 3 days before option expiration
- As a trader, I want alerts when a position hits 50% profit

### Technical Specification

#### Database Schema
```typescript
alerts: defineTable({
  userId: v.id("users"),
  alertType: v.union(
    v.literal("price_target"),
    v.literal("greek_threshold"),
    v.literal("pnl_threshold"),
    v.literal("expiration_reminder"),
    v.literal("unusual_activity"),
    v.literal("iv_rank_change")
  ),
  symbol: v.optional(v.string()),
  tradeId: v.optional(v.id("option_trades")),
  condition: v.string(),           // ">=", "<=", "==", etc.
  threshold: v.number(),
  currentValue: v.optional(v.number()),
  triggered: v.boolean(),
  triggeredAt: v.optional(v.number()),
  notificationMethod: v.array(v.union(
    v.literal("in_app"),
    v.literal("email"),
    v.literal("push")
  )),
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user_and_active", ["userId", "isActive"])
  .index("by_alert_type", ["alertType"])
```

#### Alert Types

1. **Price Target**: Stock reaches specific price
2. **P&L Threshold**: Position reaches profit/loss target
3. **Greek Threshold**: Delta/Theta/etc exceeds limit
4. **Expiration Reminder**: X days before expiration
5. **IV Rank Change**: IV Rank crosses threshold
6. **Unusual Activity**: Volume spike, large order

#### Execution
**Convex Cron Job**: Runs every 2 minutes
```typescript
export const checkAlerts = internalMutation({
  handler: async (ctx) => {
    // Get all active alerts
    // Fetch current market data
    // Evaluate conditions
    // Trigger notifications
    // Mark as triggered
  }
});
```

#### Notifications

**In-App**: Toast notification + notification center
**Email**: SendGrid/Resend integration (future)
**Push**: Web Push API (future)

---

## 5. Options Strategy Builder

### Overview
Visual tool to construct multi-leg option strategies with P&L diagrams.

### User Stories
- As a trader, I want to visualize payoff diagrams before entering trades
- As a trader, I want to see max profit/loss for my strategy
- As a trader, I want pre-built strategy templates

### Technical Specification

#### Strategy Definitions
```typescript
interface StrategyLeg {
  action: 'BTO' | 'STO';
  optionType: 'CALL' | 'PUT';
  strike: number;
  quantity: number;
  premium: number;
}

interface Strategy {
  name: string;
  underlying: string;
  expiration: number;
  legs: StrategyLeg[];
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  probabilityOfProfit: number;
}
```

#### Pre-Built Strategies

1. **Bull Call Spread**: BTO lower strike call + STO higher strike call
2. **Bear Put Spread**: BTO higher strike put + STO lower strike put
3. **Iron Condor**: BTO OTM put + STO closer put + STO closer call + BTO OTM call
4. **Iron Butterfly**: BTO OTM put + STO ATM put + STO ATM call + BTO OTM call
5. **Calendar Spread**: STO near-term + BTO far-term (same strike)
6. **Straddle**: BTO ATM call + BTO ATM put
7. **Strangle**: BTO OTM call + BTO OTM put
8. **Covered Call**: Own stock + STO OTM call
9. **Cash-Secured Put**: STO OTM put (with cash reserve)

#### P&L Calculation
```typescript
function calculatePayoff(strategy: Strategy, stockPriceRange: number[]): number[] {
  return stockPriceRange.map(price => {
    let payoff = 0;
    strategy.legs.forEach(leg => {
      const intrinsic = leg.optionType === 'CALL'
        ? Math.max(0, price - leg.strike)
        : Math.max(0, leg.strike - price);

      if (leg.action === 'BTO') {
        payoff += (intrinsic - leg.premium) * leg.quantity * 100;
      } else {
        payoff += (leg.premium - intrinsic) * leg.quantity * 100;
      }
    });
    return payoff;
  });
}
```

#### Components

**StrategyBuilder** (`components/strategies/StrategyBuilder.tsx`)
- Template selector dropdown
- Leg configuration forms
- Live P&L diagram
- Summary stats

**PayoffDiagram** (`components/strategies/PayoffDiagram.tsx`)
- D3.js or lightweight-charts
- X-axis: Stock price
- Y-axis: Profit/Loss
- Breakeven markers
- Max profit/loss markers

---

## 7. Tax Reporting

### Overview
Automated tax reporting with wash sale detection and Form 8949 generation.

### User Stories
- As a trader, I want to detect wash sales automatically
- As a trader, I want to export data for TurboTax
- As a trader, I want to see realized vs unrealized gains

### Technical Specification

#### Wash Sale Rule
**Definition**: If you sell a security at a loss and buy substantially identical security within 30 days before or after, the loss is disallowed.

**Algorithm**:
```typescript
function detectWashSales(trades: Trade[]): WashSale[] {
  const washSales: WashSale[] = [];

  trades.sort((a, b) => a.tradeTime - b.tradeTime);

  for (let i = 0; i < trades.length; i++) {
    const sale = trades[i];
    if (sale.action !== 'SELL' || sale.pnl >= 0) continue;

    // Look 30 days before and after
    const windowStart = sale.tradeTime - 30 * 24 * 60 * 60 * 1000;
    const windowEnd = sale.tradeTime + 30 * 24 * 60 * 60 * 1000;

    for (let j = 0; j < trades.length; j++) {
      const purchase = trades[j];
      if (purchase.action === 'BUY' &&
          purchase.symbol === sale.symbol &&
          purchase.tradeTime >= windowStart &&
          purchase.tradeTime <= windowEnd &&
          i !== j) {

        washSales.push({
          saleTradeId: sale._id,
          purchaseTradeId: purchase._id,
          disallowedLoss: sale.pnl,
          adjustedCostBasis: purchase.costBasis + Math.abs(sale.pnl)
        });
      }
    }
  }

  return washSales;
}
```

#### Form 8949 Data
```typescript
interface Form8949Entry {
  description: string;        // "10 shares AAPL"
  dateAcquired: Date;
  dateSold: Date;
  proceeds: number;
  costBasis: number;
  adjustments: number;        // Wash sale adjustment
  gainOrLoss: number;
  termType: 'short' | 'long'; // <1 year or >=1 year
}
```

#### Export Formats
- **CSV**: For manual entry
- **TXF**: TurboTax import
- **PDF**: Printable report

---

*This document is living and should be updated as features are designed and implemented.*
