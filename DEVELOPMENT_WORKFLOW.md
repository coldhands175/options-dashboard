# Development Workflow

This document outlines the development workflow for the Options Dashboard project.

## Branch Structure

- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for ongoing development  
- **`feature/*`** - Individual feature branches
- **`bugfix/*`** - Bug fix branches
- **`hotfix/*`** - Emergency fixes for production

## Development Process

### 1. Starting New Work

```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

### 2. Making Changes

```bash
# Make your changes
# Stage and commit regularly
git add .
git commit -m "Clear, descriptive commit message"

# Push feature branch
git push origin feature/your-feature-name
```

### 3. Pull Request Process

1. **Create PR** from `feature/your-feature-name` → `develop`
2. **Fill out PR template** completely
3. **Wait for automated checks** to pass:
   - ✅ Tests (Node.js 18.x, 20.x)
   - ✅ Linting
   - ✅ Security scan
   - ✅ Build verification
4. **Request review** from team members
5. **Address feedback** if any
6. **Merge** once approved and checks pass

### 4. Release Process

```bash
# When ready to release to production
# Create PR from develop → main
git checkout main
git pull origin main
git checkout develop
git pull origin develop

# Create release PR
# This triggers production deployment after merge
```

## Automated Checks

All PRs automatically run:

- **Unit Tests** - Vitest with React Testing Library
- **Linting** - ESLint with TypeScript support  
- **Type Checking** - TypeScript compiler
- **Security Audit** - npm audit for vulnerabilities
- **Build Verification** - Ensure production build works

## Branch Protection Rules

### Main Branch
- ✅ Require PR reviews (1 approval required)
- ✅ Require status checks to pass
- ✅ Dismiss stale reviews on new commits
- ✅ Require conversation resolution
- ✅ No force pushes allowed
- ✅ No deletions allowed
- ✅ Admins must follow rules

### Develop Branch  
- ✅ Require PR reviews (1 approval required)
- ✅ Require status checks to pass
- ✅ Dismiss stale reviews on new commits
- ✅ Require conversation resolution
- ✅ No force pushes allowed
- ✅ No deletions allowed

## Commands Reference

### Testing
```bash
npm test              # Run tests
npm run test:coverage # Run tests with coverage
npm run test:ui       # Run tests with UI
```

### Linting
```bash
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
```

### Building
```bash
npm run build         # Production build
npm run type-check    # TypeScript type checking
```

### Branch Management
```bash
# List all branches
git branch -a

# Switch branches  
git checkout branch-name

# Delete feature branch after merge
git branch -d feature/branch-name
git push origin --delete feature/branch-name

# Update feature branch with latest develop
git checkout feature/branch-name
git merge develop
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Install GitHub CLI (for branch protection)
```bash
# macOS
brew install gh

# Login to GitHub
gh auth login
```

### 3. Set Up Branch Protection (One-time setup)
```bash
./setup-branch-protection.sh
```

## Best Practices

### Commit Messages
- Use clear, descriptive messages
- Start with a verb (Add, Fix, Update, Remove)
- Keep first line under 50 characters
- Add details in body if needed

### Code Quality  
- Write tests for new features
- Keep functions small and focused
- Use TypeScript types properly
- Follow existing code patterns

### Pull Requests
- Fill out the PR template completely
- Include screenshots for UI changes
- Test your changes thoroughly
- Respond to review feedback promptly

## Troubleshooting

### Tests Failing
```bash
# Run tests locally first
npm test

# Check for type errors
npm run type-check

# Fix linting issues
npm run lint:fix
```

### Branch Protection Issues
- Ensure all required checks are passing
- Make sure you have the required approvals
- Check that conversations are resolved

### Merge Conflicts
```bash
# Update your feature branch
git checkout feature/your-branch
git fetch origin
git merge origin/develop

# Resolve conflicts manually
# Then commit the resolution
git add .
git commit -m "Resolve merge conflicts"
git push origin feature/your-branch
```
