---
description: Create and deploy an emergency hotfix to production
---

# Emergency Hotfix

Create and deploy an emergency hotfix for critical production issues.

## When to Use

Use hotfix workflow for:
- Critical bugs in production
- Security vulnerabilities
- Data loss prevention
- App-breaking issues

**Do NOT use for**:
- Regular features
- Non-critical bugs
- UI improvements
- Performance optimizations

## Steps

1. **Create hotfix branch from main**:
   - Switch to `main` branch
   - Pull latest changes
   - Create branch named `hotfix/[issue-description]`

2. **Make the fix**:
   - Fix the critical issue
   - Test thoroughly
   - Keep changes minimal

3. **Deploy hotfix**:
   - Merge hotfix into `main`
   - Deploy Convex: `npm run deploy:prod`
   - Build and submit iOS app if needed

4. **Backport to dev**:
   - Merge `main` back into `dev` to keep branches in sync
   - This ensures the fix is in the development branch

## Rules

- **Only for critical production issues**
- **Branch from `main`, not `dev`**
- **Merge to both `main` AND `dev`**
- **Keep changes minimal and focused**
- **Test before deploying**

## Quick Command

Tell Claude: "Create hotfix for [issue]" or "Emergency fix for [problem]"
