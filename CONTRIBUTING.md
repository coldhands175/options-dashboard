# Contributing to Options Dashboard

Thank you for your interest in contributing to the Options Dashboard! This document provides guidelines and workflows for contributing to the project.

## Git Workflow

### Branch Strategy

We use a **Git Flow** approach with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical fixes for production

### Setting Up Your Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/options-dashboard.git
   cd options-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, concise code
   - Follow TypeScript best practices
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat(scope): add new feature description"
   ```

   **Commit Message Format:**
   ```
   <type>(<scope>): <subject>
   
   <body>
   
   <footer>
   ```

   **Types:**
   - `feat` - New feature
   - `fix` - Bug fix
   - `docs` - Documentation changes
   - `style` - Code style changes (formatting, etc.)
   - `refactor` - Code refactoring
   - `test` - Adding or modifying tests
   - `chore` - Build process or auxiliary tool changes

4. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Useful Git Commands for Rollbacks

#### Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

#### Undo Last Commit (Discard Changes)
```bash
git reset --hard HEAD~1
```

#### Revert a Specific Commit
```bash
git revert <commit-hash>
```

#### Reset to Specific Commit
```bash
git reset --hard <commit-hash>
```

#### View Commit History
```bash
git log --oneline --graph
```

#### Create and Switch to New Branch
```bash
git checkout -b feature/new-feature
```

#### Switch Between Branches
```bash
git checkout main
git checkout feature/your-feature
```

#### Update Your Branch with Latest Main
```bash
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main
```

#### Stash Changes Temporarily
```bash
git stash
git stash pop  # To restore
```

## Testing

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

### Testing Guidelines
- Write unit tests for all new functions
- Test components with React Testing Library
- Include integration tests for complex features
- Test with sample trading data

## Code Style

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define proper interfaces for all data structures
- Use type guards for API responses
- Avoid `any` types

### React Guidelines
- Use functional components with hooks
- Follow React best practices
- Use proper prop typing
- Implement error boundaries

### Naming Conventions
- Components: `PascalCase` (e.g., `TradingViewWidget`)
- Functions: `camelCase` (e.g., `calculateProfit`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_POSITIONS`)
- Files: `PascalCase` for components, `camelCase` for utilities

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Steps
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release branch: `git checkout -b release/v1.2.0`
4. Run tests and build
5. Merge to main and tag: `git tag v1.2.0`
6. Deploy to production

## Emergency Rollback Procedures

### Production Rollback
If you need to quickly rollback production:

1. **Identify the Last Good Commit**
   ```bash
   git log --oneline
   ```

2. **Create Emergency Branch**
   ```bash
   git checkout -b hotfix/emergency-rollback
   git reset --hard <last-good-commit>
   ```

3. **Deploy Immediately**
   ```bash
   npm run build:deploy
   vercel --prod
   ```

4. **Create Post-Incident Review**
   - Document what went wrong
   - Create issue to fix the root cause
   - Update monitoring/testing to prevent recurrence

### Database Rollback (if applicable)
If data migration issues occur:
1. Stop the application
2. Restore from the most recent backup
3. Apply only the migrations up to the known good state
4. Restart the application

## Getting Help

### Documentation
- [README.md](./README.md) - Project overview and setup
- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Development roadmap
- [API Documentation](./docs/api.md) - API reference

### Communication
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and general discussion
- Pull Request Reviews - Code review feedback

### Code Review Process
1. All changes require pull request
2. At least one reviewer approval required
3. All tests must pass
4. No merge conflicts
5. Documentation updated if needed

## Security

### Environment Variables
- Never commit `.env` files
- Use `.env.example` for templates
- Rotate API keys regularly
- Use least-privilege access

### Trading Data
- Treat all trading data as sensitive
- Never log actual P&L values in production
- Anonymize data in development/testing
- Follow data retention policies

## Performance Guidelines

### Code Performance
- Minimize re-renders with React.memo
- Use useCallback for event handlers
- Implement virtual scrolling for large lists
- Optimize bundle size

### Data Performance
- Implement pagination for large datasets
- Use efficient data structures
- Cache API responses appropriately
- Monitor memory usage

---

Thank you for contributing to Options Dashboard! Your contributions help make this a better tool for the trading community.
