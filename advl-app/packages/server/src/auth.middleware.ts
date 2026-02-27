/**
 * auth.middleware.ts — Optional authentication middleware for server mode
 *
 * Used when ADVL is self-hosted and ADVL_SERVER_AUTH_ENABLED=true.
 * When disabled (default), all requests pass through (expected for local/LAN use).
 *
 * Foundation observation: auth strategy for server mode has not been decided.
 * When ADVL_SERVER_AUTH_ENABLED=true, this middleware currently allows all requests
 * through — a deliberate safe-open default until an ADR selects the auth strategy
 * (bearer token, basic auth, or session-based). Implementation requires explicit
 * user instruction and an ADR entry before any auth logic is added here.
 */
import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authEnabled = process.env['ADVL_SERVER_AUTH_ENABLED'] === 'true'

  if (!authEnabled) {
    next()
    return
  }

  // Auth is enabled but no strategy has been selected via ADR.
  // Until an auth ADR is accepted, requests pass through with a warning.
  console.warn(`[AuthMiddleware] ADVL_SERVER_AUTH_ENABLED=true but no auth strategy configured. Path: ${req.path}`)
  next()
}
