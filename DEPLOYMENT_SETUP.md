# Deployment Setup

## ✅ Current Status

### Production Environment
- **URL**: https://options-dashboard-eta.vercel.app
- **Branch**: `main`
- **Status**: ✅ Deployed successfully

### Development Environment  
- **URL**: https://options-dashboard-n7gsa37rt-coldhands175s-projects.vercel.app
- **Branch**: `develop`
- **Status**: ✅ Deployed successfully

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
