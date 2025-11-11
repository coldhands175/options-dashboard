# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Options Dashboard is a **monorepo** containing:
- **Mobile**: Native iOS app (SwiftUI) for tracking options trading positions
- **Web**: Next.js web app with authentication, PDF imports, and advanced features
- **Backend**: Shared Convex backend (https://clever-poodle-30.convex.cloud) used by both clients

## Build and Run Commands

### Monorepo Structure
```
options-dashboard/
├── mobile/              # iOS app (SwiftUI)
├── web/                 # Web app (Next.js)
├── convex/              # Shared Convex backend
└── package.json         # Root package.json
```

### Backend (Convex)
```bash
# Start Convex dev server (watches for changes)
npm run dev:backend

# Full monorepo dev (web + backend)
npm run dev
```

### Web App
```bash
# Run web app dev server
npm run dev:web

# Build web app for production
npm run build:web
```

### iOS App
```bash
# Build for iOS Simulator (use list_sims to find available simulators)
mcp__XcodeBuildMCP__build_sim --projectPath "mobile/optionsdashboard.xcodeproj" --scheme "optionsdashboard" --simulatorName "iPhone 16"

# Build and run in one step
mcp__XcodeBuildMCP__build_run_sim --projectPath "mobile/optionsdashboard.xcodeproj" --scheme "optionsdashboard" --simulatorName "iPhone 16"
```

### Running Tests
```bash
# Run iOS unit and UI tests
mcp__XcodeBuildMCP__test_sim --projectPath "mobile/optionsdashboard.xcodeproj" --scheme "optionsdashboard" --simulatorName "iPhone 16"
```

### Simulator Management
```bash
# List available simulators
mcp__XcodeBuildMCP__list_sims

# Open Simulator app
mcp__XcodeBuildMCP__open_sim

# Boot a specific simulator
mcp__XcodeBuildMCP__boot_sim --simulatorUuid "UUID_HERE"
```

## Architecture

### Data Flow
1. **Views** (ContentView, AddTradeView, TradeHistoryView) → Observe changes from **PortfolioViewModel**
2. **PortfolioViewModel** → Manages state and orchestrates data operations
3. **ConvexClient** → Handles HTTP communication with Convex backend
4. **Models** → Define data structures (ActiveOptionPosition, OptionTrade, etc.)

### Trade-Based Architecture
The app uses a **trade-based** architecture where positions are aggregated from individual trades:
- **Individual Trades** (`option_trades` table): Each BTO/BTC/STO/STC transaction is stored separately
- **Positions** (computed): Aggregated view of trades grouped by contract specification (underlying, type, strike, expiration)
- **Trade Actions**: BTO (Buy to Open), BTC (Buy to Close), STO (Sell to Open), STC (Sell to Close)

### Key Components

#### ConvexClient (optionsdashboard/ConvexClient.swift)
- Actor-based client for thread-safe Convex API calls
- Handles both queries (read) and mutations (write) operations
- Base URL: `https://clever-poodle-30.convex.cloud`
- Convex functions are called with format: `"namespace:functionName"` (e.g., `"trades:listActiveOptionPositions"`)
- Responses are wrapped in a `{ value: T }` structure
- All network calls include detailed logging (🔵 for queries, 🟢 for mutations)

#### PortfolioViewModel (optionsdashboard/PortfolioViewModel.swift)
- Uses `@Observable` macro for SwiftUI state management
- All state properties are `@MainActor` isolated
- Manages two primary data collections:
  - `positions: [ActiveOptionPosition]` - Aggregated positions from trades
  - `trades: [OptionTrade]` - Individual trade history
- Convex function endpoints:
  - `trades:listActiveOptionPositions` - Fetches aggregated open positions (query)
  - `trades:listUserTransactions` - Fetches chronological trade history (query)
  - `trades:createOptionTrade` - Creates a new trade (mutation)
- Date handling: Converts Swift `Date` to Unix milliseconds for Convex (`timeIntervalSince1970 * 1000`)

#### Models (optionsdashboard/Models.swift)
- `ActiveOptionPosition`: Aggregated position view with `Sendable` conformance
  - Represents net position from multiple trades
  - Fields: `underlying`, `optionType`, `strike`, `expiration`, `netContracts`, `side` (Long/Short)
  - ID is computed from contract specs for deduplication
  - Uses `nonisolated` Codable methods to avoid actor isolation issues
- `OptionTrade`: Individual trade transaction record
  - Fields: `action` (BTO/BTC/STO/STC), `quantityContracts`, `premiumPerContract`, `notional`, `tradeTime`
  - Supports optional `notes`, `accountTag`, `brokerTradeNumber`
- `OptionType`: Enum for CALL/PUT options (uppercase to match Convex schema)
- `TradeAction`: Enum for BTO/BTC/STO/STC with helpers for opening/closing
- `PositionSide`: Enum for Long/Short positions
- `PortfolioSummary`: Aggregated portfolio statistics

### Concurrency Model
- ConvexClient is an `actor` for thread-safe network operations
- All models conform to `Sendable` for safe concurrent access
- ViewModel uses `@MainActor` for UI state management
- Codable implementations use `nonisolated` to avoid actor isolation warnings

### UI Structure
- **ContentView**: Main portfolio view with aggregated positions list, summary header, and toolbar actions
- **PositionRow**: Displays aggregated position (underlying, strike, expiration, net contracts, side)
- **AddTradeView**: Form for entering individual trades with action picker (BTO/BTC/STO/STC)
- **TradeHistoryView**: View trade history chronologically or grouped by position
- Uses modern SwiftUI patterns: `@Observable`, `@State`, `NavigationStack`, `ContentUnavailableView`

## Important Conventions

### Trade Actions and Signed Quantities
When creating trades:
- **BTO/BTC**: Quantity is positive (buying contracts)
- **STO/STC**: Quantity is negative (selling contracts)
- The `quantity_contracts` field stores absolute value
- The `quantity_signed_contracts` field stores signed value for aggregation

### Date Handling
When working with dates for Convex:
- Convert Swift `Date` to milliseconds: `date.timeIntervalSince1970 * 1000`
- Convex returns milliseconds, convert to Date: `Date(timeIntervalSince1970: ms / 1000)`
- Convex stores dates as Unix timestamps in milliseconds

### Convex Function Naming
- Use colon-separated format: `"namespace:functionName"`
- Examples: `"trades:listActiveOptionPositions"`, `"trades:createOptionTrade"`, `"trades:listUserTransactions"`

### Error Handling
- ViewModel surfaces errors through `errorMessage` property
- ConvexClient throws typed `ConvexError` enum
- All async operations include try/catch with user-friendly error messages

### State Management
- Use `@MainActor.run` when updating state from async contexts
- All ViewModel state updates must happen on main thread
- ConvexClient operations are isolated in actor context

## Project File Structure
```
options-dashboard/                       # Monorepo root
├── mobile/                              # iOS App
│   ├── optionsdashboard/
│   │   ├── optionsdashboardApp.swift   # App entry point
│   │   ├── ContentView.swift            # Main portfolio view
│   │   ├── AddTradeView.swift           # Add trade form
│   │   ├── TradeHistoryView.swift       # Trade history view
│   │   ├── PortfolioViewModel.swift     # Business logic & state
│   │   ├── ConvexClient.swift           # Convex API client
│   │   └── Models.swift                 # Data models
│   ├── optionsdashboard.xcodeproj/      # Xcode project
│   ├── optionsdashboardTests/           # Unit tests
│   └── optionsdashboardUITests/         # UI tests
├── web/                                 # Web App
│   ├── app/                             # Next.js pages (App Router)
│   ├── components/                      # React components
│   ├── lib/                             # Utilities
│   ├── package.json                     # Web app dependencies
│   └── next.config.ts                   # Next.js config
├── convex/                              # Shared Backend
│   ├── schema.ts                        # Database schema
│   ├── trades.ts                        # Trade functions
│   ├── auth.ts                          # Authentication
│   ├── pdf.ts                           # PDF import functions
│   ├── quotes.ts                        # Market data
│   └── ...                              # Other backend functions
├── package.json                         # Root package.json
├── .env.local                           # Dev Convex deployment
├── .env.production                      # Prod Convex deployment
├── DEPLOYMENT.md                        # Deployment guide
└── CLAUDE.md                            # This file
```

## Convex Backend
- The app connects to a Convex backend at `https://clever-poodle-30.convex.cloud`
- Backend uses the `option_trades` table to store individual trades
- Positions are computed by aggregating trades with the same contract specification
- To inspect or modify the backend schema, use Convex MCP tools or the Convex Dashboard
- Key Convex functions used:
  - `trades:listActiveOptionPositions` - Aggregates trades into positions
  - `trades:listUserTransactions` - Returns chronological trade history
  - `trades:createOptionTrade` - Inserts new trade records
  - `trades:getOptionContractDetails` - Gets all trades for a specific contract

## Future Enhancements (Noted)
- **Position Detail View**: Tap a position to see all related trades, add closing trades with pre-filled details
- **Market Data Integration**: Fetch real-time prices to calculate P&L
- **Greeks Display**: Show delta, gamma, theta, vega for positions
- **Charts**: Visualize P&L over time, position distribution
