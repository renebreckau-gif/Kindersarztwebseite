// Roles, confirmation boundary, provenance and audit contract (framework-free).
// Used by the future Payload hooks and by the cockpit; tested in src/domain/__tests__.
// Spec: docs/architecture/praxis-cockpit.md §5 and docs/architecture/backend-foundation.md §8–10.

import type { FactVerification } from "./verification.ts";
import type { LocalDate } from "./time.ts";

export type StaffRole = "STAFF" | "DOCTOR" | "ADMIN";
export const STAFF_ROLES: readonly StaffRole[] = ["STAFF", "DOCTOR", "ADMIN"];

/** What a logged-in account may CONFIRM (i.e. create VERIFIED_CURRENT provenance for). */
export type ConfirmableKind =
  // operational records — the practice team's daily work
  | "EXCEPTION"
  | "CLOSURE"
  | "ANNOUNCEMENT"
  | "REPLACEMENT_ASSIGNMENT"
  // schedule and medical scope — physicians only
  | "WEEKLY_SCHEDULE"
  | "ACUTE_RULE"
  | "CONSULTATION_TYPE"
  | "REPLACEMENT_PRACTICE"
  | "EMERGENCY_INFORMATION"
  | "MEDICAL_CONTENT"
  | "DISCOVERY_MEDICAL";

const OPERATIONAL: ConfirmableKind[] = ["EXCEPTION", "CLOSURE", "ANNOUNCEMENT", "REPLACEMENT_ASSIGNMENT"];
const PHYSICIAN: ConfirmableKind[] = ["WEEKLY_SCHEDULE", "ACUTE_RULE", "CONSULTATION_TYPE", "REPLACEMENT_PRACTICE", "EMERGENCY_INFORMATION", "MEDICAL_CONTENT", "DISCOVERY_MEDICAL"];

/**
 * Confirmation boundary (enforced server-side, not by hiding buttons):
 * STAFF  — operational records only.
 * DOCTOR — operational + schedule / acute / medical / emergency wording / replacement verification.
 * ADMIN  — operational + structural administration; NOT medical confirmation (no bypass).
 * Legal texts are outside the cockpit (legal review) for every role.
 */
export function canConfirm(role: StaffRole, kind: ConfirmableKind): boolean {
  if (OPERATIONAL.includes(kind)) return true;
  if (PHYSICIAN.includes(kind)) return role === "DOCTOR";
  return false;
}

/** Structural administration (accounts, roles, holiday calendar, directory data entry). */
export const canAdministrate = (role: StaffRole) => role === "ADMIN";

export interface Actor {
  id: string;
  name: string;
  role: StaffRole;
}

export const ROLE_LABEL: Record<StaffRole, string> = { STAFF: "Praxisteam", DOCTOR: "Ärztin / Arzt", ADMIN: "Verwaltung" };

export class ConfirmationNotAllowed extends Error {
  readonly role: StaffRole;
  readonly kind: ConfirmableKind;
  constructor(role: StaffRole, kind: ConfirmableKind) {
    super(`Role ${role} may not confirm ${kind}`);
    this.role = role;
    this.kind = kind;
  }
}

/**
 * Provenance is generated from the logged-in account + operation + date — never typed in by
 * an editor. Throws when the role may not confirm this kind of record.
 */
export function buildProvenance(actor: Actor, kind: ConfirmableKind, today: LocalDate, reviewDue: LocalDate): FactVerification {
  if (!canConfirm(actor.role, kind)) throw new ConfirmationNotAllowed(actor.role, kind);
  return {
    status: "VERIFIED_CURRENT",
    lastVerified: today,
    reviewDue,
    verifiedBy: `${actor.name}, ${ROLE_LABEL[actor.role]} (Praxis Cockpit)`,
    sourceIds: ["PRACTICE_COCKPIT"],
  };
}

// ---------------------------------------------------------------- audit (append-only)

export type AuditOperation = "CREATE" | "UPDATE" | "END" | "REVERT" | "VERIFY";
export type PublishState = "PUBLISHED" | "REVERTED" | "SUPERSEDED";

export interface AuditEventRecord {
  id: string;
  /** Instant (ISO, UTC). Display in Europe/Berlin. */
  at: string;
  actorId: string;
  actorName: string;
  actorRole: StaffRole;
  entityType: string;
  entityId: string;
  operation: AuditOperation;
  /** Snapshot before the change (null for CREATE). */
  previous: unknown;
  /** Snapshot after the change (null when ended without successor). */
  next: unknown;
  publishState: PublishState;
  /** Groups the writes of one publish. */
  changeSetId?: string;
  /** For REVERT: the event that is undone (restores its `previous`). */
  revertOf?: string;
}

/** Keys never stored in an audit snapshot (defence in depth; staff secrets live in auth only). */
const SECRET_KEYS = /^(password|hash|salt|token|resetPasswordToken|resetPasswordExpiration|apiKey|enableAPIKey|loginAttempts|lockUntil|sessions)$/i;

export function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => !SECRET_KEYS.test(k)).map(([k, v]) => [k, stripSecrets(v)]));
  }
  return value;
}

export function buildAuditEvent(input: {
  id: string;
  at: Date;
  actor: Actor;
  entityType: string;
  entityId: string;
  operation: AuditOperation;
  previous: unknown;
  next: unknown;
  changeSetId?: string;
  revertOf?: string;
}): AuditEventRecord {
  return {
    id: input.id,
    at: input.at.toISOString(),
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    previous: input.previous === undefined ? null : stripSecrets(input.previous),
    next: input.next === undefined ? null : stripSecrets(input.next),
    publishState: "PUBLISHED",
    changeSetId: input.changeSetId,
    revertOf: input.revertOf,
  };
}

/** Undo = a new event that restores the previous version; history is never deleted. */
export function buildRevertEvent(target: AuditEventRecord, input: { id: string; at: Date; actor: Actor }): AuditEventRecord {
  return buildAuditEvent({
    id: input.id,
    at: input.at,
    actor: input.actor,
    entityType: target.entityType,
    entityId: target.entityId,
    operation: "REVERT",
    previous: target.next,
    next: target.previous,
    revertOf: target.id,
  });
}
