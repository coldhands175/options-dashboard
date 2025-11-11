# Deployment Strategy

This document outlines the deployment strategy for the Options Dashboard monorepo.

## Repository Structure

```
options-dashboard/                  # Monorepo
├── mobile/                         # iOS app
│   ├── optionsdashboard/          # Swift source
│   └── optionsdashboard.xcodeproj/ # Xcode project
├── web/                            # Next.js web app
│   ├── app/                        # Pages (App Router)
│   ├── components/                 # React components
│   └── package.json                # @options-dashboard/web
├── convex/                         # Shared Convex backend
├── package.json                    # Root: options-dashboard
├── .env.local                      # Development deployment config
└── .env.production                 # Production deployment config (gitignored)
```

## Git Branching Strategy

### Branches

- **`main`**: Production-ready code
  - Protected branch
  - Deploys to production Convex deployment
  - Used for App Store releases
  - All code must be tested and reviewed before merging

- **`dev`**: Development and testing
  - Integration branch for new features
  - Deploys to development Convex deployment
  - Used for TestFlight builds and testing
  - Features are developed in feature branches and merged here first

- **Feature Branches**: `feature/feature-name`
  - Created from `dev`
  - Merged back to `dev` via PR
  - Deleted after merge

### Workflow

1. **Development**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-new-feature
   # ... make changes ...
   git commit -m "Add new feature"
   git push origin feature/my-new-feature
   # Create PR to merge into dev
   ```

2. **Testing** (on `dev` branch):
   - Test with dev Convex deployment
   - Run iOS app builds
   - Run web app (when added)
   - Fix any bugs

3. **Production Release** (merge `dev` → `main`):
   ```bash
   git checkout main
   git pull origin main
   git merge dev
   git push origin main
   ```

## Convex Deployments

### Development Deployment
- **Branch**: `dev`
- **Deployment**: `dev:clever-poodle-30`
- **URL**: `https://clever-poodle-30.convex.cloud`
- **Config File**: `.env.local`
- **Usage**: Daily development and testing

**Start dev servers**:
```bash
# Backend only
npm run dev:backend

# Web app only
npm run dev:web

# Both web + backend
npm run dev
```

### Production Deployment
- **Branch**: `main`
- **Deployment**: `prod:clever-poodle-30` (to be created)
- **URL**: `https://clever-poodle-30.convex.cloud`
- **Config File**: `.env.production` (gitignored, set locally)
- **Usage**: Live app in production

**Deploy to production**:
```bash
# Make sure you're on main branch
git checkout main
git pull origin main

# Deploy to production
npx convex deploy --prod

# This will create/update the production deployment
```

### First-Time Production Setup

1. **Create production deployment**:
   ```bash
   npx convex deploy --prod
   ```

2. **Update `.env.production`** with the generated values:
   ```
   CONVEX_DEPLOYMENT=prod:clever-poodle-30
   CONVEX_URL=https://clever-poodle-30.convex.cloud
   ```

3. **Add `.env.production` to `.gitignore`** (already done)

4. **Update iOS app** to use production URL when building for release

## iOS App Deployment

### Development Builds (from `dev` branch)
- Use development Convex deployment URL
- Build configuration: Debug
- Distribution: TestFlight (internal testing)

```swift
// In optionsdashboard/ConvexClient.swift
#if DEBUG
let baseURL = "https://clever-poodle-30.convex.cloud" // dev deployment
#else
let baseURL = "https://clever-poodle-30.convex.cloud" // prod deployment (same URL, different deployment)
#endif
```

### Production Builds (from `main` branch)
- Use production Convex deployment URL
- Build configuration: Release
- Distribution: App Store

**Steps**:
1. Merge `dev` → `main`
2. Deploy Convex to production: `npx convex deploy --prod`
3. Open Xcode on `main` branch
4. Archive and upload to App Store Connect

## Web App Deployment

### Vercel Configuration
- **Project name**: `options-dashboard-web`
- **Framework**: Next.js
- **Root directory**: `web/`
- **Build command**: `npm run build`
- **Environment variables**:
  - `CONVEX_URL`: Convex deployment URL
  - `NEXT_PUBLIC_CONVEX_URL`: Client-side Convex URL

### Development (from `dev` branch)
- Preview deployments on every PR
- Uses development Convex deployment
- URL: `options-dashboard-web-<branch>.vercel.app`

### Production (from `main` branch)
- Auto-deploy on push to `main`
- Uses production Convex deployment
- URL: `options-dashboard-web.vercel.app` (or custom domain)

**Manual deploy**:
```bash
# Build web app
npm run build:web

# Deploy via Vercel CLI
cd web && vercel --prod
```

## Environment Variables

### iOS App
Update the Convex URL based on build configuration:
- **Debug**: Development deployment URL
- **Release**: Production deployment URL

### Web App
The web app reads Convex URL from environment variables (set in Vercel):
- **Development**: Uses dev Convex deployment
- **Production**: Uses prod Convex deployment

## Checklist Before Production Deploy

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] `dev` branch fully tested
- [ ] Merge `dev` → `main`
- [ ] Deploy Convex: `npx convex deploy --prod`
- [ ] Build iOS app from `main` branch
- [ ] Test production build
- [ ] Submit to App Store (if iOS changes)

## Rollback Strategy

If production has issues:

1. **Convex Backend**:
   ```bash
   # Convex maintains deployment history
   # Contact Convex support or redeploy from last known good commit
   git checkout main
   git revert HEAD  # or git reset --hard <good-commit>
   npx convex deploy --prod
   ```

2. **iOS App**:
   - Submit hotfix build to App Store
   - Or remove problematic version from App Store Connect

3. **Quick Fix**:
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug
   # ... fix bug ...
   git commit -m "Fix critical bug"
   git push origin hotfix/critical-bug
   # Merge to main immediately
   git checkout main
   git merge hotfix/critical-bug
   npx convex deploy --prod
   ```

## Monitoring

- Monitor Convex dashboard: https://dashboard.convex.dev
- Watch for errors in production deployment
- Set up alerts for critical functions (future enhancement)

## Notes

- Never commit `.env.local` or `.env.production` with actual secrets
- Always test on `dev` deployment before pushing to production
- Keep `dev` and `main` in sync - regularly merge `dev` → `main`
- Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`
