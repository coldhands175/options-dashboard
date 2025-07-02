# Security Guidelines

## 🔐 Environment Variables

### Current Setup
- ✅ `.env` files are excluded from version control via `.gitignore`
- ✅ `.env.example` template provided for team members
- ✅ Sensitive tokens moved out of codebase

### For Developers

1. **Never commit secrets**: Always use `.env.example` as a template
2. **Rotate tokens regularly**: Xano auth tokens should be rotated periodically
3. **Use different tokens for different environments**: Development, staging, and production should have separate credentials

### Environment Variables Used

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_XANO_AUTH_TOKEN` | Xano API authentication | ✅ Yes |

### Getting Your Xano Token

1. Log into your Xano dashboard
2. Navigate to Settings → Authentication
3. Generate or copy your API token
4. Add it to your local `.env` file

## 🚨 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No hardcoded secrets in source code
- [ ] Team members use `.env.example` as template
- [ ] Tokens are rotated regularly
- [ ] Different credentials for different environments

## 📞 Reporting Security Issues

If you discover a security vulnerability, please report it to the project maintainer immediately.
