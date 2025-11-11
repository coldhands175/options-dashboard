# Tradier API Setup Guide

This guide will help you set up Tradier API for real-time market data in Scott Capital.

---

## Why Tradier?

Tradier provides professional-grade market data with several advantages:
- Real-time stock quotes with bid/ask spreads
- Complete options chains with Greeks (on paid plans)
- Reliable uptime and fast response times
- Free sandbox environment for testing
- Affordable pricing ($0-10/mo for market data)

---

## Step 1: Create Tradier Developer Account

1. Go to **https://developer.tradier.com/**
2. Click "Sign Up" in the top right
3. Fill out the registration form:
   - Email address
   - Username
   - Password
4. Verify your email address
5. Log in to the Tradier Developer Portal

---

## Step 2: Get Your API Key

### Sandbox API Key (Free - Recommended for Development)

1. After logging in, go to **https://developer.tradier.com/user/apps**
2. You should see a "Sandbox Account" section
3. Click "Show" next to "Access Token" to reveal your sandbox API key
4. Copy the key (it will look like: `ABC123xyz456...`)

### Production API Key (Requires Account Approval)

For production use, you'll need to:
1. Apply for a brokerage account at **https://brokerage.tradier.com/**
2. Once approved, generate production API keys in your account dashboard
3. Note: Production keys provide real-time data and live trading capabilities

---

## Step 3: Add API Key to Convex

### Local Development

1. Open your terminal in the project directory
2. Run the following command to set your Tradier API key:

```bash
npx convex env set TRADIER_API_KEY your_actual_api_key_here
```

3. Set the sandbox flag (for development):

```bash
npx convex env set TRADIER_SANDBOX true
```

4. Verify the environment variables are set:

```bash
npx convex env list
```

You should see:
```
TRADIER_API_KEY=ABC123...
TRADIER_SANDBOX=true
```

### Production Deployment

When you're ready to go to production:

1. Get your production API key from Tradier
2. Update environment variables in your Convex dashboard:
   - Go to **https://dashboard.convex.dev/**
   - Select your project
   - Go to "Settings" → "Environment Variables"
   - Update `TRADIER_API_KEY` with production key
   - Set `TRADIER_SANDBOX` to `false` (or remove it)

---

## Step 4: Test the Integration

### Using the Convex Dashboard

1. Go to your Convex dashboard: **https://dashboard.convex.dev/**
2. Select your project
3. Go to the "Functions" tab
4. Find `tradier:getStockQuote`
5. Click to open it
6. Test with a symbol:
   ```json
   {
     "symbol": "AAPL"
   }
   ```
7. Click "Run" - you should see real-time quote data returned

### Using the App

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the dashboard or watchlist
3. Add a stock symbol (e.g., "AAPL", "MSFT", "SPY")
4. You should see real-time quotes powered by Tradier

---

## API Endpoints Available

### Stock Quotes
```typescript
// Get multiple stock quotes
const quotes = await ctx.runAction(api.tradier.getStockQuotes, {
  symbols: ["AAPL", "MSFT", "SPY"]
});

// Get single stock quote
const quote = await ctx.runAction(api.tradier.getStockQuote, {
  symbol: "AAPL"
});
```

### Options Data (Coming Soon)
```typescript
// Get options expirations
const expirations = await ctx.runAction(api.tradier.getOptionsExpirations, {
  underlying: "AAPL"
});

// Get options chain
const chain = await ctx.runAction(api.tradier.getOptionsChain, {
  underlying: "AAPL",
  expiration: "2024-01-19",
  greeks: true
});
```

---

## Rate Limits

### Sandbox (Free)
- **120 requests per minute**
- Delayed data (15-minute delay)
- Perfect for development and testing

### Production Plans

| Plan | Price/mo | Rate Limit | Data Delay |
|------|----------|------------|------------|
| Starter (Market Data) | $0 | 120 req/min | 15 min |
| Market Data | $10 | Unlimited | Real-time |
| Developer | $85 | Unlimited | Real-time + streaming |

**Recommendation**: Start with free sandbox, then upgrade to $10/mo Market Data plan for production.

---

## Sandbox vs Production Data

### Sandbox Limitations
- Data is delayed by 15 minutes
- Limited to ~1000 symbols
- Some corporate actions may not be reflected
- Options Greeks may not be accurate

### Production Benefits
- Real-time data (sub-second latency)
- Full market coverage
- Accurate Greeks and IV calculations
- Streaming quotes via WebSocket (on Developer plan)

---

## Troubleshooting

### Error: "TRADIER_API_KEY not set"

**Solution**:
```bash
npx convex env set TRADIER_API_KEY your_key_here
npx convex dev  # Restart dev server
```

### Error: 401 Unauthorized

**Possible causes**:
1. Invalid API key - double-check you copied it correctly
2. Using production endpoint with sandbox key (or vice versa)
3. API key expired or revoked

**Solution**: Regenerate your API key in the Tradier developer portal

### Error: 429 Rate Limit Exceeded

**Solution**:
1. Reduce the frequency of quote requests
2. Implement caching in your app
3. Upgrade to a higher tier plan ($10/mo for unlimited)

### Sandbox returns "Symbol not found"

**Possible causes**:
1. Symbol not available in sandbox environment
2. Incorrect symbol format (must be uppercase)

**Solution**: Try common symbols like "SPY", "AAPL", "MSFT" first

---

## Next Steps

Once Tradier is set up:

1. **Migrate from Yahoo Finance**: Update existing quote fetching to use Tradier
2. **Add Options Chains**: Implement options chain display in your app
3. **Calculate Greeks**: Use Tradier's options data for Greek calculations
4. **IV Tracking**: Track implied volatility metrics using Tradier data
5. **Real-time Alerts**: Set up price alerts using Tradier's reliable data

---

## Useful Links

- **Tradier Developer Portal**: https://developer.tradier.com/
- **API Documentation**: https://documentation.tradier.com/brokerage-api
- **API Status Page**: https://status.tradier.com/
- **Support**: https://developer.tradier.com/support

---

## Cost Estimate

For a typical options trading app:

**Development** (Sandbox): **$0/month**
- Unlimited during development
- 120 requests/minute sufficient for testing

**Production** (Market Data Plan): **$10/month**
- Unlimited requests
- Real-time data
- ~$0.50 per day

**Total annual cost**: ~$120/year for reliable, professional market data.

---

## Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** (Convex env)
3. **Rotate keys periodically** (every 90 days)
4. **Monitor API usage** in Tradier dashboard
5. **Use sandbox for all non-production environments**

---

Happy trading! 📈
