#!/bin/bash

set -e

echo "===== Setting up Husky + Commitlint + Prettier + ESLint checks ====="

# Install node dependencies
echo "Installing npm dependencies..."
pnpm install

# Initialize Husky if not already
if [ ! -d ".husky" ]; then
  echo "Initializing Husky..."
  pnpx husky install
fi

# Add pre-commit hook for lint + prettier checks
echo "Adding pre-commit hook..."
pnpx husky add .husky/pre-commit "npm run lint:check && npm run format:check"

# Add commit-msg hook for commitlint
echo "Adding commit-msg hook..."
pnpx husky add .husky/commit-msg 'pnpx --no -- commitlint --edit ${1}'
echo "===== Husky hooks setup complete! ====="
echo "Pre-commit will now check ESLint + Prettier formatting."
echo "Commit-msg will validate commit messages using Commitlint."
