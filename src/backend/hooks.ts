// Payload hooks — thin wrappers around the tested pure logic (provenance.ts, domain/operations.ts).
// Type-only Payload import: this module carries no Payload runtime code.

import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, GlobalBeforeChangeHook } from "payload";
import type { ConfirmableKind } from "../domain/governance.ts";
import type { Closure, OpeningHourException } from "../domain/content-types.ts";
import { applyChangeSet, introducedUnknown } from "../domain/operations.ts";
import { closureFromDoc, exceptionFromDoc, verificationToDoc, type ClosureDoc, type ExceptionDoc } from "../data/payload-mapping.ts";
import { actorFromUser, auditForWrite, berlinToday, reviewDueFor, verificationForWrite, type StaffUserDoc } from "./provenance.ts";
import { PayloadPracticeRepository, type PayloadReader } from "./payload-repository.ts";

/** Generate verification from the logged-in account; reject writes the role may not confirm. */
export const provenanceHook =
  (kind: ConfirmableKind): CollectionBeforeChangeHook =>
  ({ data, req, originalDoc }) => {
    const today = berlinToday();
    const actor = actorFromUser(req.user as StaffUserDoc | null);
    const merged = { ...(originalDoc ?? {}), ...data };
    const generated = verificationForWrite(actor, kind, reviewDueFor(kind, merged, today), today);
    const out: Record<string, unknown> = { ...data, verification: verificationToDoc(generated) };
    // Nested rule verifications (weekly schedule) are generated too — never taken from the client.
    if (Array.isArray(data.rules)) out.rules = data.rules.map((r: Record<string, unknown>) => ({ ...r, verification: verificationToDoc(generated) }));
    return out;
  };

/** Holiday policy: ADMIN maintains the calendar, but the policy stays unconfirmed until a physician flow exists (09.3). */
export const holidayPolicyHook: GlobalBeforeChangeHook = ({ data }) => ({ ...data, policyVerification: { status: "TO_BE_CONFIRMED", sourceIds: [] } });

/** Publish guard: a change must not introduce a contradiction (new UNKNOWN day) — same engine as the preview. */
export const publishGuardHook =
  (collection: "openingHourExceptions" | "closures"): CollectionBeforeChangeHook =>
  async ({ data, req, originalDoc }) => {
    const merged = { ...(originalDoc ?? {}), ...data };
    const base = await new PayloadPracticeRepository(req.payload as unknown as PayloadReader, req).getPulsData();
    const change =
      collection === "openingHourExceptions"
        ? { upsertExceptions: [exceptionFromDoc(merged as ExceptionDoc) as OpeningHourException] }
        : { upsertClosures: [closureFromDoc(merged as ClosureDoc) as Closure] };
    const conflict = introducedUnknown(base, applyChangeSet(base, change), merged.startDate, merged.endDate);
    if (conflict) throw new Error(`Widersprüchliche Angaben am ${conflict.date}: Diese Änderung würde einer bestehenden Änderung widersprechen.`);
    return data;
  };

/** Append-only audit trail (same transaction via `req`). */
export const auditHook =
  (entityType: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req }) => {
    const actor = actorFromUser(req.user as StaffUserDoc | null);
    if (!actor) return doc;
    const event = auditForWrite({
      id: crypto.randomUUID(),
      now: new Date(),
      actor,
      entityType,
      entityId: String((doc as { recordId?: string }).recordId ?? doc.id),
      operation: operation === "create" ? "CREATE" : "UPDATE",
      previous: operation === "create" ? null : previousDoc,
      next: doc,
    });
    const { id: eventId, ...rest } = event;
    await req.payload.create({ collection: "auditEvents", data: { ...rest, eventId }, overrideAccess: true, req });
    return doc;
  };
