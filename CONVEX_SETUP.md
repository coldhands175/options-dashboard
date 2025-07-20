# Convex Integration Setup Guide

This guide will walk you through setting up Convex as your new backend for the Options Trading Dashboard, replacing Xano API calls with real-time Convex queries and mutations.

## Prerequisites

1. **Node.js** (v18 or later)
2. **npm** or **yarn**
3. **Existing Xano data** (for migration)
4. **Convex account** (free at https://convex.dev)

## Step 1: Install Convex

First, install the Convex CLI globally:

```bash
npm install -g convex
```

## Step 2: Set up Convex Project

1. **Initialize Convex in your project:**
   ```bash
   npx convex dev --configure
   ```

2. **Follow the prompts:**
   - Create a new Convex account or log in
   - Create a new project (e.g., "options-dashboard")
   - Choose your deployment name

3. **This will create:**
   - `convex/` directory with your backend functions
   - `.env.local` with your Convex URL
   - Update your `.env` file with the Convex URL

## Step 3: Deploy Convex Schema and Functions

Your Convex backend files are already set up in this project:

- `convex/_generated/` - Generated types (auto-created)
- `convex/schema.ts` - Database schema for trades, positions, and users
- `convex/functions.ts` - Backend mutations and queries

Deploy these to Convex:

```bash
npx convex dev
```

This command will:
- Deploy your schema and functions
- Start a development server
- Watch for changes and redeploy automatically

## Step 4: Update Environment Configuration

Update your `.env` file with your actual Convex URL:

```env
# Replace with your actual Convex deployment URL
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
```

You can find this URL in:
- Convex dashboard
- The output of `npx convex dev`
- The `.env.local` file created by Convex

## Step 5: Install Required Dependencies

The following dependencies should already be installed, but verify:

```bash
npm install convex @convex-dev/react
```

## Step 6: Update User Authentication

The current integration uses a placeholder `getCurrentUserId()` function. You'll need to implement proper user authentication:

### Option A: Integrate with existing auth system
Update `src/lib/convexUtils.ts` to get the actual user ID from your auth context:

```typescript
export function getCurrentUserId(): string {
  // Replace with your actual user ID logic
  const userData = localStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    return user.id || user.userId || 'default-user';
  }
  return 'default-user';
}
```

### Option B: Use Convex Auth (Recommended)
Consider implementing Convex's built-in authentication system for better integration.

## Step 7: Data Migration

Once Convex is set up and running:

1. **Add the migration component to your app temporarily:**
   
   In a development route or component, add:
   ```tsx
   import DataMigration from './src/components/DataMigration';
   
   // In your component
   <DataMigration />
   ```

2. **Run the migration:**
   - Navigate to the migration component
   - Click "Start Migration"
   - Wait for completion
   - Verify the data in Convex dashboard

3. **Remove the migration component** after successful migration.

## Step 8: Testing the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Check the following pages:**
   - **Trades page** - Should load trades from Convex
   - **Positions page** - Should calculate positions from Convex trades
   - **Dashboard** - Should show statistics from Convex data

3. **Verify in Convex Dashboard:**
   - Go to https://dashboard.convex.dev
   - Check your database tables for data
   - Monitor function calls in real-time

## Step 9: Production Deployment

1. **Create a production deployment:**
   ```bash
   npx convex deploy --prod
   ```

2. **Update your production environment variables:**
   ```env
   VITE_CONVEX_URL=https://your-prod-deployment.convex.cloud
   ```

3. **Run production migration** if needed.

## Features Enabled by Convex

✅ **Real-time updates** - Data syncs automatically across all connected clients
✅ **Automatic position calculation** - Server-side aggregation of trades into positions
✅ **Type safety** - Full TypeScript support with generated types
✅ **Offline support** - Built-in caching and sync when online
✅ **Optimistic updates** - UI updates immediately, syncs in background
✅ **Automatic scaling** - No server management required

## Troubleshooting

### Common Issues:

1. **"Cannot find Convex URL"**
   - Check your `.env` file has the correct `VITE_CONVEX_URL`
   - Restart your development server after updating .env

2. **"Function not found"**
   - Ensure `npx convex dev` is running
   - Check function names match between frontend and backend

3. **Migration fails**
   - Verify Xano API is still accessible
   - Check user authentication is working
   - Review error messages in console

4. **Data not syncing**
   - Check network tab for failed requests
   - Verify user ID is consistent
   - Check Convex dashboard for function logs

### Getting Help:

- **Convex Documentation:** https://docs.convex.dev
- **Convex Discord:** https://convex.dev/community
- **GitHub Issues:** Create issues in this repository

## Next Steps

After successful setup:

1. **Remove Xano dependencies** (if no longer needed)
2. **Implement user authentication with Convex Auth**
3. **Add real-time features** (live trade updates, collaborative features)
4. **Optimize queries** based on your usage patterns
5. **Add more backend logic** (portfolio analysis, alerts, etc.)

## File Structure

```
src/
├── lib/
│   ├── convex.ts           # Convex client setup
│   └── convexUtils.ts      # Utility functions and type conversions
├── components/
│   └── DataMigration.tsx   # Migration component (remove after use)
├── utils/
│   └── migrateData.ts      # Migration logic
└── options/
    ├── pages/
    │   ├── Trades.tsx      # Updated to use Convex
    │   └── Positions.tsx   # Updated to use Convex
    └── components/
        └── OptionsMainDashboard.tsx  # Updated to use Convex

convex/
├── _generated/             # Auto-generated (don't edit)
├── schema.ts              # Database schema
└── functions.ts           # Backend functions
```

---

🎉 **You're now ready to use Convex with real-time data syncing for your Options Trading Dashboard!**
