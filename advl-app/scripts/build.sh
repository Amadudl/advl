#!/bin/bash
# build.sh — Build ADVL for production
# Builds packages in dependency order: shared → core → agent → electron + server
# Prerequisites: pnpm install must have been run first.

set -e

echo "Building ADVL for production..."

echo "[1/5] Building @advl/shared..."
pnpm --filter shared build

echo "[2/5] Building @advl/core..."
pnpm --filter core build

echo "[3/5] Building @advl/agent..."
pnpm --filter agent build

echo "[4/5] Building @advl/electron..."
pnpm --filter electron build

echo "[5/5] Building @advl/server..."
pnpm --filter server build

echo ""
echo "Build complete."
echo "  Desktop:  pnpm --filter electron package"
echo "  Server:   node packages/server/dist/index.js"
