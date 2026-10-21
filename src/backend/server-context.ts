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
  /** Phase 09.5B: the trusted cockpit lifecycle path may write lifecycle fields (retire / reactivate). */
  LIFECYCLE: "praxisLifecycleWrite",
  /** Phase 09.5B: semantic audit operation for this write ("SUPERSEDE" | "REVERT"); otherwise CREATE/UPDATE. */
  AUDIT_OPERATION: "praxisAuditOperation",
  /** Phase 09.5B: id of the audit event a REVERT undoes (server-loaded, never from the browser). */
  REVERT_OF: "praxisRevertOf",
  /**
   * Phase 09.5E: the physician acute-baseline workflow. The weekly-schedule write may change ONLY
   * the ACUTE rules; non-ACUTE rules, the schedule's own verification and the closed weekdays keep
   * their stored values and provenance. Set by the server workflow only — never by HTTP input.
   */
  ACUTE_BASELINE: "praxisAcuteBaselineWrite",
  /** Phase 09.5E: the acute-today workflow may write the internal acute-today marker. */
  ACUTE_TODAY: "praxisAcuteTodayWrite",
  /** Phase 09.5F: the special-day workflow may write the internal special-day marker. */
  SPECIAL_DAY: "praxisSpecialDayWrite",
  /**
   * Phase 09.5G: the physician replacement-practice workflow ("VERIFY" confirms the STORED data,
   * "WITHDRAW" = "Nicht mehr als Vertretung verwenden"). Server code only — never HTTP input.
   */
  REPLACEMENT_VERIFY: "praxisReplacementVerify",
  /** Phase 09.5H: the physician holiday-policy workflow (policy only — never the holiday dates). */
  HOLIDAY_POLICY: "praxisHolidayPolicyWrite",
} as const;

export const isLifecycleWrite = (ctx: Record<string, unknown> | undefined | null) => ctx?.[SERVER_CONTEXT.LIFECYCLE] === true;
export const isAcuteBaselineWrite = (ctx: Record<string, unknown> | undefined | null) => ctx?.[SERVER_CONTEXT.ACUTE_BASELINE] === true;
export const isAcuteTodayWrite = (ctx: Record<string, unknown> | undefined | null) => ctx?.[SERVER_CONTEXT.ACUTE_TODAY] === true;
export const isSpecialDayWrite = (ctx: Record<string, unknown> | undefined | null) => ctx?.[SERVER_CONTEXT.SPECIAL_DAY] === true;
export const isHolidayPolicyWrite = (ctx: Record<string, unknown> | undefined | null) => ctx?.[SERVER_CONTEXT.HOLIDAY_POLICY] === true;
/** The physician replacement action of this write, if the trusted server workflow set one. */
export function replacementVerifyMode(ctx: Record<string, unknown> | undefined | null): "VERIFY" | "WITHDRAW" | undefined {
  const v = ctx?.[SERVER_CONTEXT.REPLACEMENT_VERIFY];
  return v === "VERIFY" || v === "WITHDRAW" ? v : undefined;
}

/** Semantic audit operation set by the trusted server path (validated). VERIFY: physician confirmation (09.5E/G); END: withdrawn (09.5G). */
export function auditOperationOf(ctx: Record<string, unknown> | undefined | null): "SUPERSEDE" | "REVERT" | "VERIFY" | "END" | undefined {
  const v = ctx?.[SERVER_CONTEXT.AUDIT_OPERATION];
  return v === "SUPERSEDE" || v === "REVERT" || v === "VERIFY" || v === "END" ? v : undefined;
}

export function revertOfIn(ctx: Record<string, unknown> | undefined | null): string | undefined {
  const v = ctx?.[SERVER_CONTEXT.REVERT_OF];
  return typeof v === "string" && UUID.test(v) ? v : undefined;
}

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
