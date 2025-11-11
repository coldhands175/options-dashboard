# Scott Capital - Product Roadmap

**Last Updated**: 2025-10-20
**Version**: 0.1.0

---

## Current Status

Scott Capital is an early-stage options trading platform (v0.1.0) with core functionality operational:
- ✅ Trade tracking (stocks & options)
- ✅ PDF import with positional parser (95-98% accuracy)
- ✅ Position monitoring with P&L
- ✅ Stock research & watchlist
- ✅ Real-time market data (Yahoo Finance, Alpha Vantage, Stooq)
- ✅ AI-powered research reports

---

## Development Phases

### Phase 1: Critical Options Features ⏳ (2-3 weeks)
**Goal**: Add essential options-specific analytics

#### 1.1 Options Greeks Dashboard 🔴 NOT STARTED
- [ ] Implement Black-Scholes calculation engine (`lib/options/blackScholes.ts`)
- [ ] Add `greeks_snapshots` table to schema
- [ ] Create PositionGreeksTable component
- [ ] Build PortfolioGreeksCard for aggregate exposure
- [ ] Add GreeksTimeline chart component
- [ ] Display Delta, Gamma, Theta, Vega, Rho per position
- [ ] Calculate portfolio-level Greeks
- **Priority**: HIGH
- **Estimated effort**: 5 days

#### 1.2 Tradier API Integration 🟡 IN PROGRESS
- [x] Research Tradier API documentation
- [ ] Add Tradier endpoints to `convex/tradier.ts`
- [ ] Implement stock quotes endpoint
- [ ] Test with sandbox environment
- [ ] Add options chain endpoint (future)
- [ ] Replace Yahoo Finance/Stooq with Tradier
- **Priority**: HIGH
- **Estimated effort**: 2 days

#### 1.3 Implied Volatility Tracking 🔴 NOT STARTED
- [ ] Add IV fields to quotes response
- [ ] Calculate IV Rank (52-week range)
- [ ] Calculate IV Percentile
- [ ] Create IV chart component
- [ ] Add IV Skew visualization
- [ ] Historical IV overlay on price charts
- **Priority**: HIGH
- **Estimated effort**: 3 days
- **Dependency**: Requires Tradier API (1.2)

#### 1.4 Real-Time Alerts System 🔴 NOT STARTED
- [ ] Add `alerts` table to schema
- [ ] Create alert configuration UI
- [ ] Implement alert conditions engine
- [ ] Add Convex cron jobs for alert checking
- [ ] In-app notifications
- [ ] Email notifications (future)
- [ ] Push notifications (future)
- **Alert types**:
  - [ ] Price targets
  - [ ] P&L thresholds
  - [ ] Greek thresholds
  - [ ] Expiration reminders
  - [ ] IV Rank changes
  - [ ] Unusual volume
- **Priority**: MEDIUM
- **Estimated effort**: 4 days

---

### Phase 2: Strategy & Risk Analysis (2-3 weeks)
**Goal**: Enable sophisticated strategy analysis and risk management

#### 2.1 Options Strategy Builder 🔴 NOT STARTED
- [ ] Create strategy definition system
- [ ] Build visual P&L diagram generator (D3.js)
- [ ] Implement pre-built strategies:
  - [ ] Vertical spreads (Bull/Bear Call/Put)
  - [ ] Iron Condor
  - [ ] Iron Butterfly
  - [ ] Calendar spreads
  - [ ] Diagonal spreads
  - [ ] Straddles/Strangles
  - [ ] Covered calls
  - [ ] Cash-secured puts
- [ ] Add max profit/loss calculations
- [ ] Calculate breakeven prices
- [ ] Probability of Profit estimates
- [ ] One-click strategy entry
- **Priority**: HIGH
- **Estimated effort**: 7 days

#### 2.2 Risk Dashboard 🔴 NOT STARTED
- [ ] Create `/app/risk/page.tsx`
- [ ] Portfolio-level Greeks aggregation
- [ ] Buying power usage tracking
- [ ] Concentration risk alerts
- [ ] Correlation analysis
- [ ] Beta-weighted Delta (vs SPX)
- [ ] Value at Risk (VaR) calculation
- **Priority**: MEDIUM
- **Estimated effort**: 4 days
- **Dependency**: Requires Greeks (1.1)

#### 2.3 Probability Calculators 🔴 NOT STARTED
- [ ] Probability of Profit (POP) - delta approximation
- [ ] Probability of Touch
- [ ] Expected Move calculator
- [ ] Monte Carlo simulation engine
- [ ] Add to strategy builder
- **Priority**: MEDIUM
- **Estimated effort**: 3 days

#### 2.4 Enhanced Trade Journal 🔴 NOT STARTED
- [ ] Add `trade_journal_entries` table
- [ ] Entry reasoning field
- [ ] Screenshot upload support
- [ ] Emotional state tracking
- [ ] Post-trade review section
- [ ] Trade grading (A-F)
- [ ] Enhanced tagging system
- **Priority**: LOW
- **Estimated effort**: 3 days

---

### Phase 3: Analytics & Performance (2 weeks)
**Goal**: Provide comprehensive performance tracking and tax reporting

#### 3.1 Performance Analytics Dashboard 🔴 NOT STARTED
- [ ] Add `performance_snapshots` table
- [ ] Calculate Win Rate
- [ ] Calculate Profit Factor
- [ ] Average Win/Loss metrics
- [ ] Sharpe Ratio calculation
- [ ] Max Drawdown tracking
- [ ] Daily/Weekly/Monthly returns
- [ ] Expectancy (avg $ per trade)
- [ ] Create `/app/analytics/page.tsx`
- [ ] Performance charts and visualizations
- **Priority**: MEDIUM
- **Estimated effort**: 5 days

#### 3.2 Tax Reporting & Wash Sale Detection 🔴 NOT STARTED
- [ ] Implement wash sale detection algorithm
- [ ] Cost basis tracking (FIFO, LIFO, Specific Lot)
- [ ] Short-term vs long-term classification
- [ ] Generate Form 8949 data
- [ ] Export to TurboTax format
- [ ] Export to TaxAct format
- [ ] Realized vs unrealized gains tracking
- [ ] Create `lib/tax/washSales.ts`
- **Priority**: HIGH (for US traders)
- **Estimated effort**: 6 days

#### 3.3 Options Scanner/Screener 🔴 NOT STARTED
- [ ] Create `/app/scanner/page.tsx`
- [ ] High IV Rank scanner
- [ ] Unusual volume detection
- [ ] Open Interest changes
- [ ] Cheap premium finder
- [ ] High Vega opportunities
- [ ] Deep ITM/OTM scanner
- [ ] Real-time results table
- [ ] Save custom scans
- **Priority**: MEDIUM
- **Estimated effort**: 4 days
- **Dependency**: Requires Tradier options data

---

### Phase 4: Advanced Features (4+ weeks)
**Goal**: Professional-grade tools for serious traders

#### 4.1 Backtesting Engine 🔴 NOT STARTED
- [ ] Define strategy rule language
- [ ] Historical data integration
- [ ] Backtest execution engine
- [ ] Performance metrics calculation
- [ ] Parameter optimization
- [ ] Walk-forward analysis
- [ ] Create `/app/backtest/page.tsx`
- **Priority**: LOW
- **Estimated effort**: 10 days
- **Note**: Requires historical options data

#### 4.2 Multi-Leg Strategy Tracking 🔴 NOT STARTED
- [ ] Add `strategy_groups` table to schema
- [ ] Link individual trades into strategies
- [ ] Track spread P&L as single unit
- [ ] Support 2-leg, 3-leg, 4-leg strategies
- [ ] Max profit/loss for grouped strategies
- [ ] Breakeven calculations
- [ ] Update positions view for multi-leg
- **Priority**: HIGH
- **Estimated effort**: 5 days

#### 4.3 Broker API Integration 🔴 NOT STARTED
- [ ] Research broker APIs (Tradier, IBKR, Schwab)
- [ ] Implement OAuth flow
- [ ] Encrypted API key storage
- [ ] Real-time position sync
- [ ] Order placement functionality
- [ ] Order status tracking
- [ ] Live account balance sync
- [ ] Add broker selection to settings
- **Priority**: LOW (high impact, complex implementation)
- **Estimated effort**: 15 days
- **Note**: Requires regulatory/compliance review

#### 4.4 Paper Trading Mode 🔴 NOT STARTED
- [ ] Add `paper_trades` table
- [ ] Virtual account balance tracking
- [ ] Same UI as live trading
- [ ] Simulated order fills
- [ ] Toggle between paper/live
- [ ] Performance comparison
- **Priority**: MEDIUM
- **Estimated effort**: 4 days

#### 4.5 Options Chain Visualization 🔴 NOT STARTED
- [ ] Create `/components/options/OptionsChain.tsx`
- [ ] Bid/ask spread display
- [ ] Volume and Open Interest
- [ ] Greeks at each strike
- [ ] IV heat map by strike
- [ ] Time & sales integration
- [ ] Quick trade entry from chain
- **Priority**: MEDIUM
- **Estimated effort**: 5 days
- **Dependency**: Requires Tradier options chain API

#### 4.6 Options Flow / Unusual Activity 🔴 NOT STARTED
- [ ] Integrate flow data provider (Polygon.io, FlowAlgo)
- [ ] Large block trade detection (>100 contracts)
- [ ] Volume spike alerts
- [ ] Sweep order detection
- [ ] Dark pool print tracking
- [ ] Create `/app/flow/page.tsx`
- **Priority**: LOW
- **Estimated effort**: 6 days
- **Note**: Requires premium data subscription

#### 4.7 Earnings & Events Calendar 🔴 NOT STARTED
- [ ] Add `earnings_calendar` table
- [ ] Integrate Alpha Vantage Earnings API
- [ ] Display upcoming earnings (BMO/AMC)
- [ ] Ex-dividend date tracking
- [ ] FOMC meeting calendar
- [ ] Economic data releases
- [ ] Company-specific events
- [ ] Create `/app/calendar/page.tsx`
- **Priority**: MEDIUM
- **Estimated effort**: 3 days

#### 4.8 Correlation Matrix 🔴 NOT STARTED
- [ ] Calculate stock-to-stock correlations
- [ ] Heat map visualization
- [ ] Portfolio diversification score
- [ ] Use for hedging recommendations
- [ ] Add to risk dashboard
- **Priority**: LOW
- **Estimated effort**: 3 days

#### 4.9 Sentiment Analysis 🔴 NOT STARTED
- [ ] Reddit sentiment integration (WallStreetBets)
- [ ] Twitter/X sentiment tracking
- [ ] News sentiment scoring
- [ ] Insider trading tracking (SEC Form 4)
- [ ] Display on stock detail pages
- **Priority**: LOW
- **Estimated effort**: 5 days
- **Note**: API costs may apply

---

## Technology Stack Improvements

### High Priority
- [x] Tradier API - Real-time market data and options chains
- [ ] Options math library - Black-Scholes, Greeks (`@quantifin/options-toolkit` or custom)
- [ ] Testing framework - Vitest + React Testing Library + Playwright
- [ ] Error tracking - Sentry

### Medium Priority
- [ ] Enhanced charting - lightweight-charts (TradingView library) or D3.js
- [ ] Advanced analytics - simple-statistics for Sharpe ratio, correlation
- [ ] Data export - exceljs for tax reporting
- [ ] React Query - Better data fetching/caching

### Low Priority
- [ ] WebSocket support - Real-time streaming quotes
- [ ] 2FA authentication - speakeasy + qrcode
- [ ] Mobile PWA - Progressive Web App support
- [ ] Background jobs - More Convex cron functions

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add comprehensive test suite (unit, integration, E2E)
- [ ] Add JSDoc comments to key functions
- [ ] Improve error handling across API calls
- [ ] Add loading states to all async operations
- [ ] Standardize error messages

### Performance
- [ ] Optimize large table rendering (virtualization)
- [ ] Add pagination to all list views
- [ ] Implement incremental static regeneration for stock pages
- [ ] Cache strategy for market data
- [ ] Database query optimization

### UX/UI
- [ ] Add keyboard shortcuts for power users
- [ ] Improve mobile responsiveness
- [ ] Add dark mode toggle
- [ ] Onboarding flow for new users
- [ ] Interactive product tour

### DevOps
- [ ] Set up CI/CD pipeline
- [ ] Automated testing on PRs
- [ ] Staging environment
- [ ] Database backup strategy
- [ ] Monitoring and alerting

---

## Future Considerations (6+ months)

### Advanced Features
- [ ] Machine learning trade recommendations
- [ ] Automated trading (algorithmic strategies)
- [ ] Social trading (follow other traders)
- [ ] Portfolio comparison vs benchmarks
- [ ] Custom indicator builder
- [ ] Market replay mode (relive historical trading days)

### Platform Expansion
- [ ] Futures trading support
- [ ] Forex trading support
- [ ] Crypto trading support
- [ ] React Native mobile app
- [ ] Desktop app (Electron)
- [ ] API for third-party integrations

### Business Features
- [ ] Subscription tiers
- [ ] Team/advisor accounts
- [ ] White-label platform
- [ ] Educational content integration
- [ ] Trading challenges/competitions

---

## Release History

### v0.1.0 (Current)
- Initial release
- Stock & options trade tracking
- PDF import with positional parser
- Position monitoring with P&L
- Stock research integration
- Watchlist management
- Basic market data integration

### v0.2.0 (Planned - ETA: 4 weeks)
- Tradier API integration
- Options Greeks dashboard
- Implied volatility tracking
- Real-time alerts
- Performance improvements

### v0.3.0 (Planned - ETA: 8 weeks)
- Strategy builder with P&L diagrams
- Risk dashboard
- Multi-leg strategy tracking
- Tax reporting

### v1.0.0 (Planned - ETA: 6 months)
- Complete analytics suite
- Backtesting engine
- Broker integration (live trading)
- Paper trading mode
- Mobile app

---

## How to Use This Roadmap

1. **Status Indicators**:
   - 🔴 NOT STARTED - Feature not yet begun
   - 🟡 IN PROGRESS - Currently being developed
   - 🟢 COMPLETED - Feature shipped to production
   - ⏸️ PAUSED - On hold, lower priority
   - ❌ CANCELLED - Decided not to implement

2. **Priority Levels**:
   - HIGH - Critical for core functionality
   - MEDIUM - Important but not blocking
   - LOW - Nice to have, can wait

3. **Update Frequency**: Review and update this roadmap bi-weekly

4. **Feature Requests**: Add new ideas to "Future Considerations" section first

---

**Questions or suggestions?** Update this roadmap as the project evolves.
