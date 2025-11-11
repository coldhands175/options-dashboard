---
description: Deploy the app to production (Convex backend + iOS app guidance)
---

# Deploy to Production

Follow these steps to deploy the Options Dashboard to production:

## Pre-deployment Checklist

Before deploying, verify:
- [ ] All changes are committed and pushed to `dev` branch
- [ ] Development deployment has been tested thoroughly
- [ ] All tests are passing
- [ ] No breaking changes in Convex schema

## Deployment Steps

1. **Merge dev to main**:
   - Ensure you're on the `dev` branch and it's up to date
   - Merge `dev` into `main` branch
   - Push `main` to remote

2. **Deploy Convex Backend**:
   - Switch to `main` branch
   - Run production deployment: `npm run deploy:prod`
   - Verify deployment in Convex dashboard

3. **Update iOS App** (if needed):
   - Ensure ConvexClient.swift uses production URL for Release builds
   - Build app in Release configuration
   - Archive and submit to App Store Connect

## Rules

- **Never deploy directly from dev branch to production**
- **Always merge dev → main first**
- **Always deploy Convex before building iOS app**
- **Test production deployment before submitting to App Store**

## Quick Command

Run this workflow automatically by telling Claude: "Deploy to production"
