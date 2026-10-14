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
  /** Server-generated change-set id of one cockpit publish (crypto.randomUUID on the server). */
  CHANGE_SET: "praxisChangeSetId",
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The trusted change-set id, if the server set one (only UUIDs are accepted). */
export function changeSetIdOf(ctx: Record<string, unknown> | undefined | null): string | undefined {
  const v = ctx?.[SERVER_CONTEXT.CHANGE_SET];
  return typeof v === "string" && UUID.test(v) ? v : undefined;
}

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
