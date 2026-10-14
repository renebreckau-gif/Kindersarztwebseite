// Payload hooks — thin wrappers around the tested pure logic (provenance.ts, domain/operations.ts).
// Type-only Payload import: this module carries no Payload runtime code.

import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeOperationHook, GlobalBeforeChangeHook } from "payload";
import type { ConfirmableKind } from "../domain/governance.ts";
import type { Closure, OpeningHourException } from "../domain/content-types.ts";
import { applyChangeSet, introducedUnknown } from "../domain/operations.ts";
import { announcementShapeProblems, normalizeText } from "../domain/announcements.ts";
import { closureFromDoc, exceptionFromDoc, verificationToDoc, type ClosureDoc, type ExceptionDoc } from "../data/payload-mapping.ts";
import { activeRole } from "./access.ts";
import { actorFromUser, auditForWrite, berlinToday, ProvenanceRejected, reviewDueFor, verificationForWrite, type StaffUserDoc } from "./provenance.ts";
import { PayloadPracticeRepository, type PayloadReader } from "./payload-repository.ts";
import { auditOperationOf, changeSetIdOf, isBootstrap, isLifecycleWrite, isTrustedSeed, RejectedError, revertOfIn, systemActor } from "./server-context.ts";

/**
 * Generate verification from the logged-in account; reject writes the role may not confirm.
 * Only the trusted server-side seed (Local API context, never HTTP) keeps the documented
 * provenance of imported documents unchanged.
 */
export const provenanceHook =
  (kind: ConfirmableKind): CollectionBeforeChangeHook =>
  ({ data, req, originalDoc }) => {
    if (!req.user && isTrustedSeed(req.context)) return data;
    // Lifecycle-only writes (retire / reactivate, trusted cockpit path) change no fact: the
    // record keeps its factual provenance; the audit event records who changed the lifecycle.
    if (req.user && isLifecycleWrite(req.context)) return data;
    const today = berlinToday();
    const actor = actorFromUser(req.user as StaffUserDoc | null);
    const merged = { ...(originalDoc ?? {}), ...data };
    let generated;
    try {
      generated = verificationForWrite(actor, kind, reviewDueFor(kind, merged, today), today);
    } catch (e) {
      if (e instanceof ProvenanceRejected) throw new RejectedError(e.message, actor ? 403 : 401);
      throw e;
    }
    const out: Record<string, unknown> = { ...data, verification: verificationToDoc(generated) };
    // Nested rule verifications (weekly schedule) are generated too — never taken from the client.
    if (Array.isArray(data.rules)) out.rules = data.rules.map((r: Record<string, unknown>) => ({ ...r, verification: verificationToDoc(generated) }));
    return out;
  };

/** Holiday policy: ADMIN maintains the calendar, but the policy stays unconfirmed until a physician flow exists. */
export const holidayPolicyHook: GlobalBeforeChangeHook = ({ data }) => ({ ...data, policyVerification: { status: "TO_BE_CONFIRMED", sourceIds: [] } });

/** Publish guard: a change must not introduce a contradiction (new UNKNOWN day) — same engine as the preview. */
export const publishGuardHook =
  (collection: "openingHourExceptions" | "closures"): CollectionBeforeChangeHook =>
  async ({ data, req, originalDoc }) => {
    const merged = { ...(originalDoc ?? {}), ...data };
    // Retiring removes a record from the active set; its domain effect was checked by the cockpit
    // plan before (no new UNKNOWN). Reactivation and every ordinary write run the full guard.
    if (isLifecycleWrite(req.context) && merged.recordState === "RETIRED") return data;
    const base = await new PayloadPracticeRepository(req.payload as unknown as PayloadReader, req).getPulsData();
    const change =
      collection === "openingHourExceptions"
        ? { upsertExceptions: [exceptionFromDoc(merged as ExceptionDoc) as OpeningHourException] }
        : { upsertClosures: [closureFromDoc(merged as ClosureDoc) as Closure] };
    const conflict = introducedUnknown(base, applyChangeSet(base, change), merged.startDate, merged.endDate);
    if (conflict) throw new RejectedError(`Widersprüchliche Angaben am ${conflict.date}: Diese Änderung würde einer bestehenden Änderung widersprechen.`, 409);
    return data;
  };

/**
 * Announcement invariants for EVERY write path (cockpit, REST, admin UI) — the same pure helper the
 * cockpit workflow uses: title / text present and within limits, real dates, finite end not before
 * the start, open-ended without an end date. Lifecycle-only writes (retire / reactivate) change no
 * business field and are not re-validated.
 */
export const announcementShapeHook: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (isLifecycleWrite(req.context)) return data;
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>;
  const problems = announcementShapeProblems(merged as never);
  if (problems.length) throw new RejectedError(problems.map((p) => p.message).join(" "), 400);
  // Stored normalized (no leading/trailing or repeated whitespace).
  const out: Record<string, unknown> = { ...data };
  if (typeof data.title === "string") out.title = normalizeText(data.title);
  if (typeof data.shortText === "string") out.shortText = normalizeText(data.shortText);
  return out;
};

/**
 * Retired records are history: ordinary writes (REST, admin UI, cockpit edits) may not change
 * them. Only the trusted lifecycle path (reactivation by an undo) may touch them.
 */
export const retiredRecordGuard: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if ((originalDoc as { recordState?: string } | undefined)?.recordState === "RETIRED" && !isLifecycleWrite(req.context)) {
    throw new RejectedError("Archivierte Einträge können nicht geändert werden.", 409);
  }
  return data;
};

/**
 * Staff accounts are created only by an active ADMIN — or once, by the bootstrap script.
 * This also closes Payload's built-in first-user registration (which writes with
 * overrideAccess): an anonymous HTTP request never carries the bootstrap context.
 */
export const staffCreateGuard: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== "create") return data;
  if (activeRole(req.user) === "ADMIN" || isBootstrap(req.context)) return data;
  throw new RejectedError("Konten werden nur von der Verwaltung angelegt.");
};

/** No email adapter is configured yet: self-service password reset is closed (ADMIN sets a new password). */
export const staffOperationGuard: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === "forgotPassword" || operation === "resetPassword") throw new RejectedError("Passwort-Zurücksetzen ist noch nicht eingerichtet. Bitte wenden Sie sich an die Verwaltung.");
  return args;
};

/** Append-only audit trail (same transaction via `req`). */
export const auditHook =
  (entityType: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req }) => {
    // Operational writes without an account are already rejected by the provenance hook; any
    // remaining account-less write (Payload-internal) is still recorded, clearly as "System".
    const actor = actorFromUser(req.user as StaffUserDoc | null) ?? systemActor(req.context) ?? { id: "system:internal", name: "Systemvorgang (ohne Konto)", role: "ADMIN" as const };
    const event = auditForWrite({
      id: crypto.randomUUID(),
      now: new Date(),
      actor,
      entityType,
      entityId: String((doc as { recordId?: string }).recordId ?? doc.id),
      // The trusted cockpit path names the semantic operation (SUPERSEDE / REVERT); never inferred from diffs.
      operation: auditOperationOf(req.context) ?? (operation === "create" ? "CREATE" : "UPDATE"),
      revertOf: revertOfIn(req.context),
      previous: operation === "create" ? null : previousDoc,
      next: doc,
      changeSetId: changeSetIdOf(req.context),
    });
    const { id: eventId, ...rest } = event;
    await req.payload.create({ collection: "auditEvents", data: { ...rest, eventId }, overrideAccess: true, req });
    return doc;
  };
