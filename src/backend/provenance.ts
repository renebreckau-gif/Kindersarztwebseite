// Provenance + audit logic for the Payload hooks (pure; the hooks are thin wrappers).
// Provenance is generated from the logged-in account, the operation and the Berlin date —
// any client-supplied verifiedBy/lastVerified is ignored.

import { buildAuditEvent, buildProvenance, canConfirm, type Actor, type AuditEventRecord, type AuditOperation, type ConfirmableKind } from "../domain/governance.ts";
import type { FactVerification } from "../domain/verification.ts";
import { addDays, zonedParts, type LocalDate } from "../domain/time.ts";
import { activeRole, type StaffUserLike } from "./access.ts";

export type StaffUserDoc = StaffUserLike & { id: string | number; name?: string | null };

export const berlinToday = (now: Date = new Date()): LocalDate => zonedParts(now).date;

/** Actor from the authenticated user, or null when signed out / disabled. */
export function actorFromUser(user: StaffUserDoc | null | undefined): Actor | null {
  const role = activeRole(user);
  if (!user || !role) return null;
  return { id: String(user.id), name: user.name?.trim() || "Unbenanntes Konto", role };
}

/** reviewDue per record kind: temporary records until their end, standing data ~6 months. */
export function reviewDueFor(kind: ConfirmableKind, data: { endDate?: string | null; validUntil?: string | null; openEnded?: boolean | null }, today: LocalDate): LocalDate {
  if ((kind === "EXCEPTION" || kind === "CLOSURE") && data.endDate) return data.endDate;
  if (kind === "ANNOUNCEMENT") return data.openEnded || !data.validUntil ? addDays(today, 30) : data.validUntil;
  return addDays(today, 182);
}

export class ProvenanceRejected extends Error {}

/**
 * Decide the verification block for a write:
 * - role may confirm this kind → VERIFIED_CURRENT with generated provenance
 * - ADMIN entering replacement-practice data → stays TO_BE_CONFIRMED (a physician confirms later)
 * - otherwise → rejected (e.g. STAFF changing the weekly schedule or medical wording)
 */
export function verificationForWrite(actor: Actor | null, kind: ConfirmableKind, reviewDue: LocalDate, today: LocalDate): FactVerification {
  if (!actor) throw new ProvenanceRejected("Nicht angemeldet.");
  if (canConfirm(actor.role, kind)) return buildProvenance(actor, kind, today, reviewDue);
  if (kind === "REPLACEMENT_PRACTICE" && actor.role === "ADMIN") return { status: "TO_BE_CONFIRMED", sourceIds: [] };
  throw new ProvenanceRejected("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen.");
}

export function auditForWrite(input: {
  id: string;
  now: Date;
  actor: Actor;
  entityType: string;
  entityId: string;
  operation: AuditOperation;
  previous: unknown;
  next: unknown;
  /** Server-generated id of one cockpit publish (trusted context only, never from the browser). */
  changeSetId?: string;
}): AuditEventRecord {
  return buildAuditEvent({ ...input, at: input.now });
}
