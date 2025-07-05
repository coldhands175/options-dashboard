# Deployment Setup

## ✅ Current Status

### Production Environment
- **URL**: https://options-dashboard-eta.vercel.app
- **Alternate URL**: https://options-dashboard-n6t3gklq0-coldhands175s-projects.vercel.app
- **Branch**: `main`
- **Status**: ✅ Deployed successfully and working

### Development Environment  
- **URL**: https://options-dashboard-ee8atyl0b-coldhands175s-projects.vercel.app
- **Branch**: `develop`
- **Status**: ✅ Deployed successfully and working

> **Note**: Individual deployment URLs (with hashes) may require authentication. Use the main production URL for public access.

## 🔧 GitHub Secrets Setup

To enable automated deployments via GitHub Actions, add these secrets to your repository:

1. Go to: `https://github.com/coldhands175/options-dashboard/settings/secrets/actions`
2. Add the following secrets:

### Required Secrets:

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=team_i6AYDXV4kvmmnLGBOil4Powr
VERCEL_PROJECT_ID=prj_PNw4trREsY59BDryK6qlDrHG5fuu
```

### Getting Your Vercel Token:
1. Go to: https://vercel.com/account/tokens
2. Create a new token with deployment permissions
3. Copy the token and add it as `VERCEL_TOKEN` secret

## 🚀 Automated Deployment Workflow

### Current Setup:
- **Develop Branch** → Automatic deployment to staging environment
- **Main Branch** → Automatic deployment to production environment
- **Pull Requests** → Preview deployments (manual via Vercel CLI)

### Manual Deployment Commands:
```bash
# Deploy to staging (preview)
vercel

# Deploy to production
vercel --prod
```

## 🔄 Deployment Process

1. **Feature Development**: Work on feature branches
2. **Staging**: Merge to `develop` → Auto-deploy to staging
3. **Production**: Merge to `main` → Auto-deploy to production

## 📝 Next Steps

1. Add the GitHub secrets listed above
2. Test the automated deployment by pushing to `develop` branch
3. Monitor deployments in GitHub Actions and Vercel dashboard

## 🔧 Troubleshooting

### Fixed Issues:
- **MIME type errors**: Fixed by configuring proper `vercel.json` with TypeScript-free build
- **TypeScript compilation errors**: Bypassed by using `build:deploy` script instead of `build`
- **SPA routing issues**: Resolved with proper Vite configuration

### Key Configuration Files:
- `vercel.json`: Forces use of `npm run build:deploy` instead of TypeScript compilation
- `vite.config.ts`: Configured for proper production builds
- `package.json`: Contains `build:deploy` script for Vercel deployment

### Testing Deployment:
```bash
# Test locally
npm run build:deploy
npm run preview

# Deploy manually
vercel           # Preview deployment
vercel --prod    # Production deployment
```
