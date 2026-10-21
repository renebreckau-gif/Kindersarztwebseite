// Payload hooks — thin wrappers around the tested pure logic (provenance.ts, domain/operations.ts).
// Type-only Payload import: this module carries no Payload runtime code.

import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeOperationHook, GlobalAfterChangeHook, GlobalBeforeChangeHook } from "payload";
import type { ConfirmableKind } from "../domain/governance.ts";
import type { Closure, OpeningHourException } from "../domain/content-types.ts";
import { applyChangeSet, introducedUnknown, SPECIAL_DAY_MARKER } from "../domain/operations.ts";
import { ACUTE_TODAY_MARKER, acuteExceptionProblem } from "../domain/acute.ts";
import { announcementShapeProblems, normalizeText } from "../domain/announcements.ts";
import { closureFromDoc, exceptionFromDoc, scheduleFromDoc, verificationToDoc, type ClosureDoc, type ExceptionDoc, type RuleDoc, type WeeklyScheduleDoc } from "../data/payload-mapping.ts";
import { acuteBoundaryProblems, weeklyScheduleProblems } from "../domain/weekly-plan.ts";
import { activeRole } from "./access.ts";
import { actorFromUser, auditForWrite, berlinToday, ProvenanceRejected, reviewDueFor, verificationForWrite, withdrawnProvenance, type StaffUserDoc } from "./provenance.ts";
import { normalizeReplacement, replacementProblems, STRUCTURAL_FIELDS, structuralKey } from "../domain/replacement.ts";
import { PayloadPracticeRepository, type PayloadReader } from "./payload-repository.ts";
import { auditOperationOf, changeSetIdOf, isAcuteBaselineWrite, isAcuteTodayWrite, isBootstrap, isHolidayPolicyWrite, isLifecycleWrite, isSpecialDayWrite, isTrustedSeed, isWeeklyScheduleWrite, RejectedError, replacementVerifyMode, revertOfIn, systemActor } from "./server-context.ts";

type RuleRow = { ruleId?: string; weekday?: string; start?: string; end?: string; consultationType?: string; validFrom?: string | null; validUntil?: string | null; publicNote?: string | null; verification?: unknown };
const ruleShape = (r: RuleRow) => JSON.stringify([String(r.weekday), r.start, r.end, r.consultationType, r.validFrom ?? null, r.validUntil ?? null, r.publicNote ?? null]);

/**
 * 09.5E acute-baseline write (trusted server context only): ACUTE rules get fresh physician
 * provenance (ACUTE_RULE — DOCTOR only); every non-ACUTE rule must be present and unchanged and
 * keeps its STORED verification; the schedule's own verification and closed weekdays stay as stored.
 * Nothing about the rest of the schedule becomes "newly confirmed".
 */
function acuteBaselineRules(data: Record<string, unknown>, originalDoc: Record<string, unknown>, generated: ReturnType<typeof verificationToDoc>): Record<string, unknown> {
  const original = (originalDoc.rules as RuleRow[] | undefined) ?? [];
  const incoming = (data.rules as RuleRow[] | undefined) ?? [];
  const keep = new Map(original.filter((r) => r.consultationType !== "ACUTE").map((r) => [String(r.ruleId), r]));
  const seen = new Set<string>();
  const rules = incoming.map((r) => {
    if (r.consultationType === "ACUTE") return { ...r, verification: generated };
    const o = keep.get(String(r.ruleId));
    if (!o || ruleShape(o) !== ruleShape(r)) throw new RejectedError("Hier darf nur die Akutsprechstunde geändert werden.", 400);
    seen.add(String(r.ruleId));
    return { ...r, verification: o.verification };
  });
  if (seen.size !== keep.size) throw new RejectedError("Hier darf nur die Akutsprechstunde geändert werden.", 400);
  return { ...data, rules, verification: originalDoc.verification, confirmedClosedWeekdays: originalDoc.confirmedClosedWeekdays };
}

/**
 * 09.5I regular weekly plan (trusted server context only): the NON-ACUTE rules and the closed weekdays
 * are the physician's new standing week — fresh provenance (WEEKLY_SCHEDULE, the same kind the schedule
 * aggregate uses) for every regular rule and the aggregate. Every stored ACUTE rule must be carried
 * over unchanged and keeps its STORED (09.5E) provenance; none may be added, moved or dropped.
 */
function weeklyPlanRules(data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined, generated: ReturnType<typeof verificationToDoc>): Record<string, unknown> {
  const KEEP_ACUTE = "Die Akutsprechstunde wird hier nicht geändert. Bitte ändern Sie diese im Bereich Akutsprechstunde.";
  if (!Array.isArray(data.rules) || !Array.isArray(data.confirmedClosedWeekdays)) throw new RejectedError("Der Wochenplan ist unvollständig.", 400);
  const stored = new Map(((originalDoc?.rules as RuleRow[] | undefined) ?? []).filter((r) => r.consultationType === "ACUTE").map((r) => [String(r.ruleId), r]));
  const seen = new Set<string>();
  const rules = (data.rules as RuleRow[]).map((r) => {
    if (r.consultationType !== "ACUTE") return { ...r, verification: generated };
    const o = stored.get(String(r.ruleId));
    if (!o || seen.has(String(r.ruleId)) || ruleShape(o) !== ruleShape(r)) throw new RejectedError(KEEP_ACUTE, 400);
    seen.add(String(r.ruleId));
    return { ...r, verification: o.verification };
  });
  if (seen.size !== stored.size) throw new RejectedError(KEEP_ACUTE, 400);
  return { ...data, rules, verification: generated };
}

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
    // 09.5G: "Nicht mehr als Vertretung verwenden" — immediately unusable (existing OUTDATED status).
    if (kind === "REPLACEMENT_PRACTICE" && replacementVerifyMode(req.context) === "WITHDRAW") {
      try {
        return { ...data, verification: verificationToDoc(withdrawnProvenance(actor, today)) };
      } catch (e) {
        if (e instanceof ProvenanceRejected) throw new RejectedError(e.message, actor ? 403 : 401);
        throw e;
      }
    }
    // 09.5I: the trusted regular-week workflow replaces the NON-ACUTE subset (ACUTE kept as stored).
    if (isWeeklyScheduleWrite(req.context) && kind === "WEEKLY_SCHEDULE") return weeklyPlanRules(data, originalDoc, verificationToDoc(generated));
    // 09.5E: only the trusted acute-baseline workflow (server context) may change the ACUTE subset alone.
    if (isAcuteBaselineWrite(req.context) && kind === "WEEKLY_SCHEDULE") {
      if (!originalDoc) throw new RejectedError("Die Akutsprechstunde braucht einen bestätigten Wochenplan.", 409);
      let acute;
      try {
        acute = verificationForWrite(actor, "ACUTE_RULE", reviewDueFor("ACUTE_RULE", merged, today), today);
      } catch (e) {
        if (e instanceof ProvenanceRejected) throw new RejectedError(e.message, actor ? 403 : 401);
        throw e;
      }
      return acuteBaselineRules(data, originalDoc, verificationToDoc(acute));
    }
    const out: Record<string, unknown> = { ...data, verification: verificationToDoc(generated) };
    // Nested rule verifications (weekly schedule) are generated too — never taken from the client.
    if (Array.isArray(data.rules)) out.rules = data.rules.map((r: Record<string, unknown>) => ({ ...r, verification: verificationToDoc(generated) }));
    return out;
  };

const UNCONFIRMED_DOC = { status: "TO_BE_CONFIRMED" as const, sourceIds: [] };

/**
 * 09.5I weekly schedule, EVERY write path (cockpit, REST, admin UI): only the two trusted physician
 * workflows may write it — 09.5E acute baseline (ACUTE subset) or 09.5I regular week (NON-ACUTE
 * subset), never both at once, DOCTOR only. The stored-to-be document is checked with the SAME pure
 * validator the cockpit uses: the regular week by `weeklyScheduleProblems` (every weekday resolved,
 * valid non-overlapping intervals, usable consultation types, ACUTE inside the hours), an acute-baseline
 * write by the ACUTE boundary. The trusted seed (no account) imports documented data unchanged.
 */
export const weeklyScheduleGuardHook: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  if (!req.user && isTrustedSeed(req.context)) return data;
  const weekly = isWeeklyScheduleWrite(req.context);
  const acute = isAcuteBaselineWrite(req.context);
  if (weekly && acute) throw new RejectedError("Akutsprechstunde und regelmäßige Sprechzeiten werden getrennt bestätigt.", 400);
  if (!weekly && !acute) throw new RejectedError("Der Wochenplan wird im Praxis Cockpit unter „Sprechzeiten“ ärztlich bestätigt.", 403);
  if (activeRole(req.user) !== "DOCTOR") throw new RejectedError("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen.", 403);
  const merged = { ...(originalDoc ?? {}), ...data } as Partial<WeeklyScheduleDoc>;
  const schedule = scheduleFromDoc({
    rules: ((merged.rules ?? []) as RuleDoc[]).map((r) => ({ ...r, verification: r.verification ?? UNCONFIRMED_DOC })),
    confirmedClosedWeekdays: (merged.confirmedClosedWeekdays ?? []).map(String),
    verification: merged.verification ?? UNCONFIRMED_DOC,
  });
  const types = weekly ? (await new PayloadPracticeRepository(req.payload as unknown as PayloadReader, req).getPulsData()).consultationTypes : [];
  const problems = weekly ? weeklyScheduleProblems(schedule, types, berlinToday()) : acuteBoundaryProblems(schedule);
  if (problems.length) throw new RejectedError(problems[0].message, 409);
  return data;
};

type HolidayRow = { date?: string; name?: string | null };
const holidayKey = (list: unknown) => JSON.stringify(((list as HolidayRow[] | undefined) ?? []).map((h) => [h.date ?? null, h.name ?? null]));
const POLICIES = ["REQUIRE_EXPLICIT_ENTRY", "CLOSED_ON_PUBLIC_HOLIDAYS"];

/**
 * Holiday calendar (09.5H), every write path:
 * A. physician policy workflow (trusted context, DOCTOR only): ONLY `policy` may change — the stored
 *    holiday dates / names must stay identical (a differing list is refused; the stored one is written
 *    back); the verification is GENERATED from the session (kind HOLIDAY_POLICY, ~6 months).
 * B. any other write (ADMIN structural maintenance): dates may change; a changed policy value always
 *    becomes TO_BE_CONFIRMED; an unchanged policy keeps its stored verification. Client-sent
 *    policyVerification is never trusted.
 * The trusted seed (no account) keeps its documented provenance.
 */
export const holidayPolicyHook: GlobalBeforeChangeHook = ({ data, req, originalDoc }) => {
  if (!req.user && isTrustedSeed(req.context)) return data;
  const stored = (originalDoc ?? {}) as { holidays?: unknown; policy?: string; policyVerification?: unknown };
  const policy = data.policy ?? stored.policy ?? "REQUIRE_EXPLICIT_ENTRY";
  if (!POLICIES.includes(policy)) throw new RejectedError("Unbekannte Feiertagsregel.", 400);
  if (isHolidayPolicyWrite(req.context)) {
    const actor = actorFromUser(req.user as StaffUserDoc | null);
    if (!actor || actor.role !== "DOCTOR") throw new RejectedError("Die Feiertagsregel kann nur eine Ärztin oder ein Arzt bestätigen.", 403);
    if (data.holidays !== undefined && holidayKey(data.holidays) !== holidayKey(stored.holidays)) throw new RejectedError("Bei der ärztlichen Bestätigung der Feiertagsregel können die Feiertage nicht geändert werden.", 400);
    const today = berlinToday();
    const v = verificationForWrite(actor, "HOLIDAY_POLICY", reviewDueFor("HOLIDAY_POLICY", {}, today), today);
    return { ...data, holidays: stored.holidays ?? [], policy, policyVerification: verificationToDoc(v) };
  }
  const keep = policy === stored.policy && stored.policyVerification;
  return { ...data, policy, policyVerification: keep ? stored.policyVerification : { status: "TO_BE_CONFIRMED", sourceIds: [] } };
};

/**
 * Append-only audit for the holiday-calendar GLOBAL (globals have no collection audit hook): same
 * transaction via `req`. A physician policy write is entity "holidayPolicy"; structural maintenance
 * "holidayCalendar".
 */
export const globalAuditHook: GlobalAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const actor = actorFromUser(req.user as StaffUserDoc | null) ?? systemActor(req.context) ?? { id: "system:internal", name: "Systemvorgang (ohne Konto)", role: "ADMIN" as const };
  const event = auditForWrite({
    id: crypto.randomUUID(),
    now: new Date(),
    actor,
    entityType: "holidayCalendar",
    entityId: isHolidayPolicyWrite(req.context) ? "holidayPolicy" : "holidayCalendar",
    operation: auditOperationOf(req.context) ?? "UPDATE",
    previous: previousDoc ?? null,
    next: doc,
    changeSetId: changeSetIdOf(req.context),
  });
  const { id: eventId, ...rest } = event;
  await req.payload.create({ collection: "auditEvents", data: { ...rest, eventId }, overrideAccess: true, req });
  return doc;
};

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
 * 09.5E collection guard for EVERY exception write (cockpit, REST, admin UI): SPECIAL_HOURS with an
 * ACUTE interval needs a READY physician baseline (same pure helper as the cockpit workflow). The
 * internal markers (acute-today 09.5E, special-day 09.5F) may be written only by their trusted
 * workflow (or by the server's undo). Retiring a record (lifecycle) is not re-checked.
 */
export const acuteExceptionHook: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  const merged = { ...(originalDoc ?? {}), ...data } as ExceptionDoc & { recordState?: string };
  if (isLifecycleWrite(req.context) && merged.recordState === "RETIRED") return data;
  const serverPath = isLifecycleWrite(req.context) || auditOperationOf(req.context) === "REVERT";
  if (merged.reason === ACUTE_TODAY_MARKER && !(serverPath || isAcuteTodayWrite(req.context))) throw new RejectedError("Diese geänderte Sprechzeit wird über „Akutsprechstunde“ im Praxis Cockpit verwaltet.", 403);
  if (merged.reason === SPECIAL_DAY_MARKER && !(serverPath || isSpecialDayWrite(req.context))) throw new RejectedError("Diese Sonderöffnungszeit wird über „Sonderöffnungszeiten“ im Praxis Cockpit verwaltet.", 403);
  if (!(merged.intervals ?? []).some((i) => i.consultationType === "ACUTE")) return data;
  const base = await new PayloadPracticeRepository(req.payload as unknown as PayloadReader, req).getPulsData();
  const problem = acuteExceptionProblem(base, exceptionFromDoc(merged as ExceptionDoc), berlinToday());
  if (problem) throw new RejectedError(problem, 409);
  return data;
};

/**
 * 09.5G replacement directory, EVERY write path (cockpit, REST, admin UI):
 * - physician workflow (trusted context): DOCTOR only, on an existing record, and NOTHING structural
 *   may change — the confirmation applies to exactly the stored data (incoming structural fields are
 *   dropped; a differing value is refused);
 * - any other write (ADMIN): server validation + normalisation; the provenance hook then makes the
 *   record TO_BE_CONFIRMED (ADMIN cannot confirm), so a structural correction always needs a new
 *   physician confirmation.
 */
export const replacementGuardHook: CollectionBeforeChangeHook = ({ data, req, originalDoc, operation }) => {
  if (!req.user && isTrustedSeed(req.context)) return data;
  const mode = replacementVerifyMode(req.context);
  if (mode) {
    if (activeRole(req.user) !== "DOCTOR" || operation !== "update" || !originalDoc) throw new RejectedError("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen.", 403);
    if (structuralKey({ ...originalDoc, ...data }) !== structuralKey(originalDoc)) throw new RejectedError("Bei der ärztlichen Bestätigung können die Angaben nicht geändert werden.", 400);
    // Exactly the STORED values are written back (Payload validates the hook's output); the provenance
    // hook then adds the physician's verification.
    const stored = originalDoc as Record<string, unknown>;
    return Object.fromEntries(["recordId", ...STRUCTURAL_FIELDS].map((f) => [f, stored[f]]));
  }
  const merged = normalizeReplacement({ ...(originalDoc ?? {}), ...data });
  const problems = replacementProblems(merged);
  if (problems.length) throw new RejectedError(problems.map((p) => p.message).join(" "), 400);
  return { ...data, ...merged, email: merged.email ?? null, website: merged.website ?? null, publicNote: merged.publicNote ?? null };
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
