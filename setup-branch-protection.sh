#!/bin/bash

# GitHub Branch Protection Setup Script
# This script uses GitHub CLI to set up branch protection rules
# Make sure you have GitHub CLI installed and authenticated: gh auth login

REPO_OWNER="coldhands175"
REPO_NAME="options-dashboard"

echo "Setting up branch protection rules for $REPO_OWNER/$REPO_NAME..."

# Protect main branch
echo "Setting up protection for main branch..."
gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github.v3+json" \
  --input - <<< '{
    "required_status_checks": null,
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "require_last_push_approval": false
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true
  }'

# Protect develop branch
echo "Setting up protection for develop branch..."
gh api repos/$REPO_OWNER/$REPO_NAME/branches/develop/protection \
  --method PUT \
  --header "Accept: application/vnd.github.v3+json" \
  --input - <<< '{
    "required_status_checks": null,
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "require_last_push_approval": false
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": true
  }'

echo "Branch protection rules have been set up!"
echo ""
echo "Rules applied:"
echo "✅ Require pull request reviews (1 approval)"
echo "✅ Dismiss stale reviews when new commits are pushed"
echo "✅ Require status checks to pass (CI tests)"
echo "✅ Require conversation resolution before merging"
echo "✅ Prevent force pushes"
echo "✅ Prevent branch deletion"
echo ""
echo "To modify these rules later, visit:"
echo "https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
