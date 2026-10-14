// Shared write protection for the cockpit's form posts (publish 09.5A, undo 09.5B).
//
// The Origin header must name this host; requests without Origin are refused. The session cookie
// is additionally SameSite=Lax.
// OPERATIONS NOTE (before production): this compares the Origin host with the request Host
// header. Behind custom domains / reverse proxies, verify how Host, X-Forwarded-Host and Origin
// arrive in the actual hosting topology before go-live — do not weaken the check speculatively.

import type { NextRequest } from "next/server";

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
