#!/bin/bash
# dev-server.sh — Start ADVL in server mode (no Electron)
# Starts Agent + Server concurrently. Access via browser at http://localhost:3000
# Prerequisites: pnpm install must have been run first.

set -e

echo "Starting ADVL in server mode (Agent + Server)..."
echo "Open http://localhost:${ADVL_SERVER_PORT:-3000} in your browser."

concurrently \
  --names "agent,server" \
  --prefix-colors "cyan,yellow" \
  "pnpm --filter agent dev" \
  "pnpm --filter server dev"
