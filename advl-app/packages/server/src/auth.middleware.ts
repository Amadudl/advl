/**
 * auth.middleware.ts — Optional authentication middleware for server mode
 *
 * Used when ADVL is self-hosted and ADVL_SERVER_AUTH_ENABLED=true.
 * When disabled (default), all requests pass through with a log message.
 *
 * TODO: Implement actual auth when ADVL_SERVER_AUTH_ENABLED=true
 * TODO: Choose auth strategy (basic auth, bearer token, or session-based)
 * Foundation observation: auth system is not yet defined for server mode.
 * No changes to this stub without explicit user instruction.
 */
import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authEnabled = process.env['ADVL_SERVER_AUTH_ENABLED'] === 'true'

  if (!authEnabled) {
    // Auth disabled — allow all requests through
    // This is the expected behavior for local/trusted network deployments
    next()
    return
  }

  // TODO: Implement authentication when ADVL_SERVER_AUTH_ENABLED=true
  // TODO: Validate bearer token or session against ADVL_SERVER_AUTH_SECRET
  // TODO: Return 401 if not authenticated

  console.log(`[AuthMiddleware] Auth enabled — TODO: implement for path ${req.path}`)
  next()
}
