// Trusted server-side operation contexts.
//
// Payload's `req.context` can only be set by server code through the Local API — never by an
// HTTP client. These flags mark the two controlled server-side paths that run without a
// signed-in account:
//   BOOTSTRAP — creating the very first ADMIN (scripts/bootstrap-admin.ts)
//   SEED      — importing documents with their documented provenance (dev/test seed, parity)
// Everything else needs an authenticated, active account.

import type { Actor } from "../domain/governance.ts";

export const SERVER_CONTEXT = {
  BOOTSTRAP: "praxisBootstrapAdmin",
  SEED: "praxisTrustedSeed",
} as const;

type Ctx = Record<string, unknown> | undefined | null;

export const isBootstrap = (ctx: Ctx) => ctx?.[SERVER_CONTEXT.BOOTSTRAP] === true;
export const isTrustedSeed = (ctx: Ctx) => ctx?.[SERVER_CONTEXT.SEED] === true;

/** Audit actor for the trusted server paths (never a person, clearly named). */
export function systemActor(ctx: Ctx): Actor | null {
  if (isBootstrap(ctx)) return { id: "system:bootstrap", name: "Einrichtungsskript (erstes Verwaltungskonto)", role: "ADMIN" };
  if (isTrustedSeed(ctx)) return { id: "system:seed", name: "Datenimport-Skript (Entwicklung/Test)", role: "ADMIN" };
  return null;
}

/** An error Payload reports with this status instead of a 500 (message is safe to show). */
export class RejectedError extends Error {
  status: number;
  isPublic = true;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
