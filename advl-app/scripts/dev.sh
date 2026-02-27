#!/bin/bash
# dev.sh — Start ADVL in development mode (Electron + Agent + Core)
# Starts all packages concurrently. Use this for desktop development.
# Prerequisites: pnpm install must have been run first.

set -e

echo "Starting ADVL in development mode (Electron + Core + Agent)..."

concurrently \
  --names "agent,core,electron" \
  --prefix-colors "cyan,green,blue" \
  "pnpm --filter agent dev" \
  "pnpm --filter core dev" \
  "pnpm --filter electron dev"
