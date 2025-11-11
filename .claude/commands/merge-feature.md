---
description: Merge a completed feature back into dev branch
---

# Merge Feature to Dev

Merge a completed feature branch back into the `dev` branch.

## Steps

1. **Ensure feature is ready**:
   - All changes committed
   - Feature tested locally
   - Convex dev deployment working

2. **Switch to dev branch**:
   - Switch to `dev` branch
   - Pull latest changes to ensure it's up to date

3. **Merge feature branch**:
   - Merge your feature branch into `dev`
   - Resolve any conflicts if they exist
   - Test the merged code

4. **Push to remote**:
   - Push `dev` branch to remote
   - Delete feature branch locally and remotely (if desired)

5. **Verify**:
   - Ensure Convex dev deployment still works
   - Test the app with merged changes

## Rules

- **Always merge features into `dev`, never directly into `main`**
- **Test after merging**
- **Delete feature branches after successful merge**
- **Never force push to `dev` or `main`**

## Quick Command

Tell Claude: "Merge feature [feature-name] to dev" or "Finish feature [feature-name]"
