#!/bin/bash
# package-electron.sh — Package ADVL as a desktop application
# Builds everything first, then uses electron-builder to create platform installers.
# Output goes to packages/electron/release/
# Prerequisites: pnpm install and a full build must have been run first.

set -e

echo "Packaging ADVL desktop application..."
echo "Platform: $(uname -s)"

# Ensure core is built first (electron serves core/dist)
echo "[1/2] Building @advl/core..."
pnpm --filter core build

echo "[2/2] Packaging Electron app..."
pnpm --filter electron package

echo ""
echo "Package complete. Output in packages/electron/release/"
