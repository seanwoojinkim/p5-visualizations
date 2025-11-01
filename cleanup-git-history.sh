#!/bin/bash

# ============================================
# Git History Cleanup Script
# ============================================
# Removes files that are now in .gitignore but were previously tracked
#
# IMPORTANT: Only run this if you're comfortable rewriting git history
# This will affect collaborators if they've already pulled these commits
# ============================================

set -e

echo "🧹 Git History Cleanup"
echo "====================="
echo ""
echo "This script will remove the following tracked files that are now in .gitignore:"
echo ""
echo "  • .DS_Store files"
echo "  • .claude/settings.local.json"
echo "  • thoughts/.DS_Store"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Removing files from git index (keeping local copies)..."
echo ""

# Remove from git but keep local files
git rm --cached .DS_Store 2>/dev/null || true
git rm --cached .claude/settings.local.json 2>/dev/null || true
git rm --cached thoughts/.DS_Store 2>/dev/null || true

# Find and remove any other .DS_Store files that might be tracked
git ls-files | grep "\.DS_Store$" | xargs -I {} git rm --cached {} 2>/dev/null || true

echo ""
echo "✓ Files removed from git index"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit removal: git commit -m 'chore: Remove tracked files now in .gitignore'"
echo "  3. Push to remote: git push"
echo ""
echo "Note: Local files are preserved, just no longer tracked by git"
