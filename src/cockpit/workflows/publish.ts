// Publish path of the real cockpit workflows (today 09.5A, planned closures 09.5C, announcements 09.5D).
// Server-side only.
//
// INPUT → SERVER DRAFT → PREVIEW → [publish:] SERVER REVALIDATION → ONE DATABASE TRANSACTION
// (business record + generated provenance + audit with changeSetId) → CONFIRMATION.
//
// Nothing from the browser is authoritative: the account comes from the server session, the date
// and time from the server clock (Europe/Berlin), the snapshot is re-read inside the transaction,
// the draft is rebuilt with the same pure functions, and the changeSetId is generated here.
// This is the only cockpit module that uses Payload's runtime (transactions).

import { randomUUID } from "node:crypto";
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from "payload";
import type { PulsData } from "../../domain/practice-status.ts";
import { announcementToDoc, closureToDoc, exceptionToDoc, replacementPracticeFromDoc, verificationToDoc, type ReplacementPracticeDoc, type RuleDoc, type WeeklyScheduleDoc } from "../../data/payload-mapping.ts";
import type { ReplacementInput } from "../../domain/replacement.ts";
import { berlinToday } from "../../backend/provenance.ts";
import { REPLACEMENT_STALE, replacementDraft, replacementFingerprint, replacementRecordId } from "./replacement.ts";
import type { HolidayCalendarDoc } from "../../data/payload-mapping.ts";
import { holidayPolicyStatus, type HolidayPolicyMode } from "../../domain/holiday-policy.ts";
import { holidayPolicyFromDoc } from "../../data/payload-mapping.ts";
import { POLICY_STALE, calendarFingerprint } from "./holiday-policy.ts";
import { ACUTE_LABEL, previewVerification } from "../../domain/acute.ts";
import type { Announcement } from "../../domain/content-types.ts";
import { activeRole, type StaffUserLike } from "../../backend/access.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../../backend/payload-repository.ts";
import { changeSetIdOf, SERVER_CONTEXT } from "../../backend/server-context.ts";
import { planFor } from "../history.ts";
import type { LifecycleCollection, UndoAction, UndoPlan } from "./undo.ts";
import { announcementFingerprint, datasetFingerprint, operationalFingerprint } from "./snapshot.ts";
import { announcementDraft, type AnnouncementInput } from "./announcement.ts";
import { closedTodayDraft, earlyCloseDraft } from "./today.ts";
import { plannedClosureDraft } from "./planned.ts";
import { acuteBaselineDraft, acuteTodayDraft, type AcuteBaselineInput, type AcuteTodayInput, type BaselineDraft } from "./acute.ts";
import { specialDayDraft, type SpecialDayInput } from "./special-day.ts";
import { PLAN_STALE, weeklyPlanDraft, type WeeklyDraft, type WeeklyPlanInput } from "./weekly-plan.ts";
import { newRuleId } from "../../domain/weekly-plan.ts";
import { TYPE_STALE, typeDraft, type TypeDraft, type TypeMode } from "./consultation-type.ts";
import type { ConsultationTypeCode } from "../../domain/content-types.ts";
import type { Blocked, ClosedTodayInput, Draft, EarlyCloseInput, PlannedClosureInput, ReadyDraft, WorkflowKind } from "./types.ts";

export type WorkflowRequest =
  | { kind: "EARLY_CLOSE"; input: EarlyCloseInput }
  | { kind: "CLOSED_TODAY"; input: ClosedTodayInput }
  | { kind: "PLANNED_CLOSURE"; input: PlannedClosureInput }
  | { kind: "ACUTE_TODAY"; input: AcuteTodayInput }
  | { kind: "SPECIAL_DAY"; input: SpecialDayInput };

export type PublishResult =
  | { ok: true; changeSetId: string; mode: "NEW" | "EDIT" | "SUPERSEDE"; recordId: string; kind: WorkflowKind }
  | { ok: false; code: "UNAUTHENTICATED" | "STALE" | "BLOCKED" | "FAILED"; message: string; blocked?: Blocked };

export const STALE_MESSAGE = "Inzwischen wurde etwas geändert. Bitte prüfen Sie die Vorschau erneut.";

export function buildDraft(request: WorkflowRequest, data: PulsData, now: Date, fingerprint: string): Draft {
  if (request.kind === "EARLY_CLOSE") return earlyCloseDraft(data, now, request.input, fingerprint);
  if (request.kind === "CLOSED_TODAY") return closedTodayDraft(data, now, request.input, fingerprint);
  if (request.kind === "ACUTE_TODAY") return acuteTodayDraft(data, now, request.input, fingerprint);
  if (request.kind === "SPECIAL_DAY") return specialDayDraft(data, now, request.input, fingerprint);
  return plannedClosureDraft(data, now, request.input, fingerprint).draft;
}

/** Preview: the current DATABASE snapshot (never the static website data) + the proposed change. */
export async function previewWorkflow(payload: Payload, request: WorkflowRequest, now: Date = new Date()): Promise<{ draft: Draft; data: PulsData }> {
  const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader).getPulsData();
  return { draft: buildDraft(request, data, now, datasetFingerprint(data)), data };
}

/** A new record never reuses the id of an existing (also RETIRED) record: append -2, -3, … */
async function freeRecordId(payload: Payload, req: PayloadRequest, collection: LifecycleCollection | "replacementPractices", wanted: string): Promise<string> {
  for (let n = 1; ; n++) {
    const id = n === 1 ? wanted : `${wanted}-${n}`;
    const hit = await payload.find({ collection, where: { recordId: { equals: id } }, limit: 1, depth: 0, overrideAccess: true, req });
    if (!hit.docs.length) return id;
  }
}

/** Run one write with a temporary trusted context (lifecycle / semantic audit operation / revertOf). */
async function withContext<T>(req: PayloadRequest, extra: Record<string, unknown>, run: () => Promise<T>): Promise<T> {
  const base = req.context;
  req.context = { ...base, ...extra };
  try {
    return await run();
  } finally {
    req.context = base;
  }
}

/**
 * Write one ready draft with the given transactional request. Provenance (beforeChange), the
 * publish guard and the audit event (afterChange, with the context's changeSetId) run as hooks
 * inside the same transaction. SUPERSEDE: the replaced single-day records are RETIRED first
 * (audit SUPERSEDE, same changeSetId), then the new record is created. Exported for the tests.
 */
export async function commitDraft(payload: Payload, req: PayloadRequest, draft: ReadyDraft): Promise<string> {
  // 09.5E: the acute-today record carries the internal marker — only this trusted path may write it.
  if (draft.kind === "ACUTE_TODAY") return withContext(req, { [SERVER_CONTEXT.ACUTE_TODAY]: true }, () => commitRecord(payload, req, draft));
  // 09.5F: the special-day marker likewise — only this trusted path may write it.
  if (draft.kind === "SPECIAL_DAY") return withContext(req, { [SERVER_CONTEXT.SPECIAL_DAY]: true }, () => commitRecord(payload, req, draft));
  return commitRecord(payload, req, draft);
}

async function commitRecord(payload: Payload, req: PayloadRequest, draft: ReadyDraft): Promise<string> {
  const { collection, value } = draft.record;
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0 };
  const findActive = async (c: "openingHourExceptions" | "closures", recordId: string) =>
    (await payload.find({ collection: c, where: { and: [{ recordId: { equals: recordId } }, { recordState: { not_equals: "RETIRED" } }] }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as { id: number | string } | undefined;

  if (draft.mode === "EDIT") {
    const current = await findActive(collection, value.id);
    if (!current) throw new Error("Der zu bearbeitende Eintrag existiert nicht mehr.");
    const data: unknown = collection === "closures" ? closureToDoc(value as never) : exceptionToDoc(value as never);
    await payload.update({ collection, id: current.id, data: data as never, ...common, context: req.context });
    return value.id;
  }

  const recordId = await freeRecordId(payload, req, collection, value.id);
  for (const s of draft.supersedes ?? []) {
    const old = await findActive(s.collection, s.recordId);
    if (!old) throw new Error("Der zu ersetzende Eintrag ist nicht mehr aktiv.");
    await withContext(req, { [SERVER_CONTEXT.LIFECYCLE]: true, [SERVER_CONTEXT.AUDIT_OPERATION]: "SUPERSEDE" }, () =>
      payload.update({
        collection: s.collection,
        id: old.id,
        data: { recordState: "RETIRED", retiredReason: "SUPERSEDED", retiredAt: new Date().toISOString(), retiredByChangeSetId: changeSetIdOf(req.context) ?? null, supersededByRecordId: recordId } as never,
        ...common,
        context: req.context,
      }),
    );
  }
  const stored = { ...value, id: recordId };
  const data: unknown = collection === "closures" ? closureToDoc(stored as never) : exceptionToDoc(stored as never);
  await payload.create({ collection, data: data as never, ...common, context: req.context });
  return recordId;
}

/**
 * Apply an undo plan inside the given transaction. Every write is audited as REVERT with revertOf
 * = the original audit event (server-loaded) and the NEW changeSetId of the revert.
 * RETIRE / REACTIVATE change lifecycle only (factual provenance kept); RESTORE writes the previous
 * business content to the SAME record (provenance regenerated for the person restoring it now).
 */
export async function applyUndo(payload: Payload, req: PayloadRequest, actions: UndoAction[]): Promise<void> {
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0 };
  for (const a of actions) {
    const found = (await payload.find({ collection: a.entityType, where: { recordId: { equals: a.entityId } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as { id: number | string } | undefined;
    if (!found) throw new Error("Der betroffene Eintrag wurde nicht gefunden.");
    const ctx = { [SERVER_CONTEXT.AUDIT_OPERATION]: "REVERT", [SERVER_CONTEXT.REVERT_OF]: a.revertOf, ...(a.kind === "RESTORE" ? {} : { [SERVER_CONTEXT.LIFECYCLE]: true }) };
    const data =
      a.kind === "RETIRE"
        ? { recordState: "RETIRED", retiredReason: "REVERTED", retiredAt: new Date().toISOString(), retiredByChangeSetId: changeSetIdOf(req.context) ?? null }
        : a.kind === "REACTIVATE"
          ? { recordState: "ACTIVE", retiredReason: null, retiredAt: null, retiredByChangeSetId: null, supersededByRecordId: null }
          : a.doc;
    await withContext(req, ctx, () => payload.update({ collection: a.entityType, id: found.id, data: data as never, ...common, context: req.context }));
  }
}

export type UndoResult =
  | { ok: true; changeSetId: string; revertedChangeSetId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

/** ACTIVE operational state (Praxis Puls data + announcements), optionally inside a transaction. */
async function loadState(payload: Payload, req?: PayloadRequest): Promise<{ data: PulsData; announcements: Announcement[] }> {
  const repo = new PayloadPracticeRepository(payload as unknown as PayloadReader, req);
  const data = await repo.getPulsData();
  const announcements = await repo.getAnnouncements();
  return { data, announcements };
}

/**
 * Preview of an undo: current ACTIVE database state + plan. A change set may hold any operational
 * entity type, so the concurrency detector covers BOTH Puls data and announcements (09.5D).
 */
export async function previewUndo(
  payload: Payload,
  user: StaffUserLike | null | undefined,
  changeSetId: string,
  now: Date = new Date(),
): Promise<{ plan: UndoPlan; data: PulsData; announcements: Announcement[]; fingerprint: string }> {
  const state = await loadState(payload);
  const plan = await planFor(payload as unknown as PayloadReader, changeSetId, state, now, activeRole(user));
  return { plan, ...state, fingerprint: operationalFingerprint(state) };
}

export async function revertChange(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  changeSetId: string,
  previewFingerprint: string,
  now: Date = new Date(),
): Promise<UndoResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  const revertSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: revertSetId } }, payload);
  await initTransaction(req);
  try {
    const reader = payload as unknown as PayloadReader;
    const state = await loadState(payload, req);
    if (operationalFingerprint(state) !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: STALE_MESSAGE };
    }
    // Rebuilt from server history inside the transaction — nothing from the browser but the change-set id.
    const plan = await planFor(reader, changeSetId, state, now, role, req);
    if (!plan.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: plan.message };
    }
    await applyUndo(payload, req, plan.actions);
    await commitTransaction(req);
    return { ok: true, changeSetId: revertSetId, revertedChangeSetId: changeSetId };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    return { ok: false, code: "FAILED", message: err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : "Die Änderung konnte nicht zurückgenommen werden. Es wurde nichts verändert." };
  }
}
export async function publishWorkflow(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  request: WorkflowRequest,
  previewFingerprint: string,
  now: Date = new Date(),
): Promise<PublishResult> {
  if (!user || !activeRole(user)) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };

  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    // Re-read INSIDE the transaction and compare with what the person previewed.
    const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader, req).getPulsData();
    const fingerprint = datasetFingerprint(data);
    if (fingerprint !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: STALE_MESSAGE };
    }
    // Full server-side revalidation with the server clock — the submitted draft is not trusted.
    const draft = buildDraft(request, data, now, fingerprint);
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.blocked.message, blocked: draft.blocked };
    }
    const recordId = await commitDraft(payload, req, draft);
    await commitTransaction(req);
    return { ok: true, changeSetId, mode: draft.mode, recordId, kind: draft.kind };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    const publicMessage = err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : undefined;
    return { ok: false, code: "FAILED", message: publicMessage ?? "Die Änderung konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}


// ---------------------------------------------------------------- Akutsprechstunde: physician baseline (09.5E-1)

export type BaselinePublishResult =
  | { ok: true; changeSetId: string; first: boolean }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_ALLOWED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

export const DOCTOR_ONLY_MESSAGE = "Die Akutsprechstunde kann nur eine Ärztin oder ein Arzt bestätigen.";

/**
 * Write one ready baseline draft inside the given transaction: the ACUTE consultation type (the same
 * logical record, or exactly one new one) and the weekly schedule's ACUTE subset (trusted context:
 * non-ACUTE rules keep their stored content and provenance — enforced by the provenance hook).
 * First confirmation is audited as VERIFY, later changes as UPDATE; both writes share the changeSetId.
 */
export async function commitAcuteBaseline(payload: Payload, req: PayloadRequest, draft: Extract<BaselineDraft, { ok: true }>): Promise<void> {
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0 };
  const op = draft.first ? { [SERVER_CONTEXT.AUDIT_OPERATION]: "VERIFY" } : {};
  const found = (await payload.find({ collection: "consultationTypes", where: { code: { equals: "ACUTE" } }, limit: 2, depth: 0, overrideAccess: true, req })).docs as { id: number | string }[];
  if (found.length > 1) throw new Error("Die Sprechstundenart „Akutsprechstunde“ ist mehrfach angelegt.");
  // 09.5J: the ACUTE type is written under the trusted acute context too (generic DOCTOR writes are closed).
  await withContext(req, { ...op, [SERVER_CONTEXT.ACUTE_BASELINE]: true }, () =>
    found[0]
      ? payload.update({ collection: "consultationTypes", id: found[0].id, data: { label: ACUTE_LABEL } as never, ...common, context: req.context })
      : payload.create({ collection: "consultationTypes", data: { code: "ACUTE", label: ACUTE_LABEL, verification: verificationToDoc(previewVerification(draft.today)) } as never, ...common, context: req.context }),
  );
  const schedule = (await payload.find({ collection: "weeklySchedules", sort: "-updatedAt", limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as (WeeklyScheduleDoc & { id: number | string }) | undefined;
  if (!schedule) throw new Error("Es ist kein Wochenplan hinterlegt.");
  const placeholder = verificationToDoc(previewVerification(draft.today));
  const acuteRows: RuleDoc[] = draft.proposed.schedule!.rules
    .filter((r) => r.consultationType === "ACUTE")
    .map((r) => ({ ruleId: r.id, weekday: String(r.weekday), start: r.start, end: r.end, consultationType: "ACUTE", validFrom: null, validUntil: null, publicNote: null, verification: placeholder }));
  const rules = [...schedule.rules.filter((r) => r.consultationType !== "ACUTE"), ...acuteRows];
  await withContext(req, { ...op, [SERVER_CONTEXT.ACUTE_BASELINE]: true }, () =>
    payload.update({ collection: "weeklySchedules", id: schedule.id, data: { rules } as never, ...common, context: req.context }),
  );
}

/**
 * DOCTOR only (checked here AND by the provenance hook): session account → server changeSetId →
 * transaction → re-read → fingerprint → rebuilt draft (server clock) → write type + ACUTE rules →
 * commit. Nothing from the browser but the editor rows and the confirmation checkbox. No quick undo:
 * correction happens by another physician edit; the audit stays append-only.
 */
export async function publishAcuteBaseline(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  input: AcuteBaselineInput,
  previewFingerprint: string,
  now: Date = new Date(),
): Promise<BaselinePublishResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "DOCTOR") return { ok: false, code: "NOT_ALLOWED", message: DOCTOR_ONLY_MESSAGE };
  if (!input.confirmed) return { ok: false, code: "BLOCKED", message: "Bitte bestätigen Sie, dass die Praxis eine regelmäßige Akutsprechstunde hat." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader, req).getPulsData();
    const fingerprint = datasetFingerprint(data);
    if (fingerprint !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: STALE_MESSAGE };
    }
    const draft = acuteBaselineDraft(data, now, input, fingerprint);
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.message };
    }
    await commitAcuteBaseline(payload, req, draft);
    await commitTransaction(req);
    return { ok: true, changeSetId, first: draft.first };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    const publicMessage = err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : undefined;
    return { ok: false, code: "FAILED", message: publicMessage ?? "Die Akutsprechstunde konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}

// ---------------------------------------------------------------- Vertretungspraxen (09.5G)

export type DirectoryResult =
  | { ok: true; recordId: string; mode: "NEW" | "EDIT" | "VERIFY" | "WITHDRAW"; changeSetId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_ALLOWED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

const failed = (e: unknown, fallback: string): DirectoryResult => {
  const err = e as { isPublic?: boolean; message?: string } | null;
  return { ok: false, code: "FAILED", message: err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : fallback };
};

const findReplacement = async (payload: Payload, req: PayloadRequest, recordId: string) =>
  (await payload.find({ collection: "replacementPractices", where: { recordId: { equals: recordId } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as (ReplacementPracticeDoc & { id: number | string }) | undefined;

/**
 * ADMIN only: create or correct the STRUCTURAL data of one directory entry inside one transaction.
 * The provenance hook makes the record TO_BE_CONFIRMED (ADMIN cannot confirm) — a correction of a
 * verified entry therefore always needs a new physician confirmation. Edit: re-read + fingerprint
 * (no last-write-wins). The record id of a new entry is generated here.
 */
export async function saveReplacement(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  raw: Partial<Record<keyof ReplacementInput, unknown>>,
  target?: { recordId: string; fingerprint: string },
): Promise<DirectoryResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "ADMIN") return { ok: false, code: "NOT_ALLOWED", message: "Vertretungspraxen legt die Verwaltung an und korrigiert sie." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const doc = target ? await findReplacement(payload, req, target.recordId) : undefined;
    if (target && !doc) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: "Diese Vertretungspraxis wurde nicht gefunden." };
    }
    const current = doc ? replacementPracticeFromDoc(doc) : undefined;
    if (current && replacementFingerprint(current) !== target!.fingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: REPLACEMENT_STALE };
    }
    const draft = replacementDraft(current, raw, berlinToday());
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.message };
    }
    const recordId = await commitReplacement(payload, req, draft.input, doc);
    await commitTransaction(req);
    return { ok: true, recordId, mode: draft.mode, changeSetId };
  } catch (e) {
    await killTransaction(req);
    return failed(e, "Die Vertretungspraxis konnte nicht gespeichert werden. Es wurde nichts verändert.");
  }
}

/** Write the structural data inside the given transaction (exported for the rollback tests). */
export async function commitReplacement(payload: Payload, req: PayloadRequest, input: ReplacementInput, doc?: { id: number | string }): Promise<string> {
  const fields = { practiceName: input.practiceName, street: input.street, postalCode: input.postalCode, city: input.city, phone: input.phone, email: input.email ?? null, website: input.website ?? null, publicNote: input.publicNote ?? null };
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0, context: req.context };
  if (doc) {
    const updated = (await payload.update({ collection: "replacementPractices", id: doc.id, data: fields as never, ...common })) as unknown as { recordId: string };
    return updated.recordId;
  }
  const recordId = await freeRecordId(payload, req, "replacementPractices", replacementRecordId(input.practiceName));
  await payload.create({ collection: "replacementPractices", data: { ...fields, recordId, contactPersons: [], verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } } as never, ...common });
  return recordId;
}

/**
 * DOCTOR only: confirm exactly the STORED data ("VERIFY", audit VERIFY) or make it immediately
 * unusable ("WITHDRAW", audit END). Re-read + record fingerprint inside the transaction — a physician
 * never confirms data they did not see. Provenance is generated by the hook (DOCTOR, Berlin date,
 * reviewDue by the standing-data policy). No quick undo: standing reference data.
 */
export async function verifyReplacement(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  recordId: string,
  fingerprint: string,
  confirmed: boolean,
  mode: "VERIFY" | "WITHDRAW" = "VERIFY",
): Promise<DirectoryResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "DOCTOR") return { ok: false, code: "NOT_ALLOWED", message: "Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen." };
  if (!confirmed) return { ok: false, code: "BLOCKED", message: mode === "VERIFY" ? "Bitte bestätigen Sie, dass die Vertretung abgestimmt und die Kontaktdaten geprüft sind." : "Bitte bestätigen Sie, dass diese Praxis nicht mehr als Vertretung ausgewählt werden soll." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const doc = await findReplacement(payload, req, recordId);
    if (!doc) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: "Diese Vertretungspraxis wurde nicht gefunden." };
    }
    if (replacementFingerprint(replacementPracticeFromDoc(doc)) !== fingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: REPLACEMENT_STALE };
    }
    await commitVerification(payload, req, doc.id, mode);
    await commitTransaction(req);
    return { ok: true, recordId, mode, changeSetId };
  } catch (e) {
    await killTransaction(req);
    return failed(e, "Die Bestätigung konnte nicht gespeichert werden. Es wurde nichts verändert.");
  }
}

/** The physician write inside the given transaction (exported for the rollback tests). */
export async function commitVerification(payload: Payload, req: PayloadRequest, id: number | string, mode: "VERIFY" | "WITHDRAW"): Promise<void> {
  await withContext(req, { [SERVER_CONTEXT.REPLACEMENT_VERIFY]: mode, [SERVER_CONTEXT.AUDIT_OPERATION]: mode === "VERIFY" ? "VERIFY" : "END" }, () =>
    payload.update({ collection: "replacementPractices", id, data: {} as never, req, user: req.user, overrideAccess: false, depth: 0, context: req.context }),
  );
}

// ---------------------------------------------------------------- Feiertagsregel (09.5H)

export type PolicyResult =
  | { ok: true; changeSetId: string; first: boolean; mode: HolidayPolicyMode }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_ALLOWED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

/**
 * DOCTOR only: confirm one holiday policy for the practice. Session account → server changeSetId →
 * transaction → re-read the global → calendar fingerprint (policy + verification + dates) → write
 * the policy through the trusted context (the hook keeps the stored dates and generates the
 * verification) → audit (global hook, same transaction) → commit. First confirmation VERIFY, later
 * UPDATE. No quick undo: correction = another physician confirmation.
 */
export async function confirmHolidayPolicy(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  mode: HolidayPolicyMode | undefined,
  fingerprint: string,
  confirmed: boolean,
): Promise<PolicyResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "DOCTOR") return { ok: false, code: "NOT_ALLOWED", message: "Die Feiertagsregel kann nur eine Ärztin oder ein Arzt bestätigen." };
  if (!mode) return { ok: false, code: "BLOCKED", message: "Bitte wählen Sie eine Regel." };
  if (!confirmed) return { ok: false, code: "BLOCKED", message: "Bitte bestätigen Sie die Regel ausdrücklich." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const doc = (await payload.findGlobal({ slug: "holidayCalendar", depth: 0, overrideAccess: true, req })) as unknown as HolidayCalendarDoc | null;
    if (calendarFingerprint(doc) !== fingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: POLICY_STALE };
    }
    const status = holidayPolicyStatus(holidayPolicyFromDoc(doc), berlinToday());
    const first = !status.confirmed && status.state !== "EXPIRED";
    await commitHolidayPolicy(payload, req, mode, first);
    await commitTransaction(req);
    return { ok: true, changeSetId, first, mode };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    return { ok: false, code: "FAILED", message: err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : "Die Feiertagsregel konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}

/** The physician policy write inside the given transaction (exported for the rollback tests). */
export async function commitHolidayPolicy(payload: Payload, req: PayloadRequest, mode: HolidayPolicyMode, first: boolean): Promise<void> {
  await withContext(req, { [SERVER_CONTEXT.HOLIDAY_POLICY]: true, ...(first ? { [SERVER_CONTEXT.AUDIT_OPERATION]: "VERIFY" } : {}) }, () =>
    payload.updateGlobal({ slug: "holidayCalendar", data: { policy: mode } as never, req, user: req.user, overrideAccess: false, depth: 0, context: req.context }),
  );
}

// ---------------------------------------------------------------- Regelmäßige Sprechzeiten (09.5I)

export type WeeklyPlanResult =
  | { ok: true; changeSetId: string; mode: Extract<WeeklyDraft, { ok: true }>["mode"] }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_ALLOWED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

export const WEEKLY_DOCTOR_ONLY = "Regelmäßige Sprechzeiten können nur ärztlich geändert werden.";

/**
 * DOCTOR only (checked here, by the collection access AND by the guard hook): session account →
 * server changeSetId → transaction → re-read the COMPLETE dataset → dataset fingerprint (schedule,
 * consultation types, holidays + policy, exceptions, closures — the ACUTE baseline is part of the
 * schedule) → rebuilt draft (server date) → one schedule write through the trusted context → audit
 * (same transaction) → commit. First / renewed confirmation VERIFY, change of a confirmed week UPDATE.
 * No quick undo: correction = another physician edit; the audit stays append-only.
 */
export async function confirmWeeklyPlan(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  input: WeeklyPlanInput,
  previewFingerprint: string,
  confirmed: boolean,
  now: Date = new Date(),
): Promise<WeeklyPlanResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "DOCTOR") return { ok: false, code: "NOT_ALLOWED", message: WEEKLY_DOCTOR_ONLY };
  if (!confirmed) return { ok: false, code: "BLOCKED", message: "Bitte bestätigen Sie den Wochenplan ausdrücklich." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader, req).getPulsData();
    const fingerprint = datasetFingerprint(data);
    if (fingerprint !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: PLAN_STALE };
    }
    const draft = weeklyPlanDraft(data, berlinToday(now), input, fingerprint);
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.message };
    }
    await commitWeeklyPlan(payload, req, draft);
    await commitTransaction(req);
    return { ok: true, changeSetId, mode: draft.mode };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    return { ok: false, code: "FAILED", message: err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : "Der Wochenplan konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}

/**
 * The physician weekly-plan write inside the given transaction (exported for the rollback tests).
 * Stored rows are carried over EXACTLY (ACUTE rows and unchanged regular rows, by rule id); new or
 * changed regular rows get a server-generated id (weekly-<weekday>-<random>), never one in use.
 */
export async function commitWeeklyPlan(payload: Payload, req: PayloadRequest, draft: Extract<WeeklyDraft, { ok: true }>): Promise<void> {
  const schedule = (await payload.find({ collection: "weeklySchedules", sort: "-updatedAt", limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as (WeeklyScheduleDoc & { id: number | string }) | undefined;
  if (!schedule) throw new Error("Es ist kein Wochenplan hinterlegt.");
  const byId = new Map(schedule.rules.map((r) => [r.ruleId, r]));
  const taken = new Set(schedule.rules.map((r) => r.ruleId));
  const placeholder = verificationToDoc(previewVerification(draft.today));
  const regular: RuleDoc[] = draft.regular.map(({ rule, keep }) =>
    keep
      ? byId.get(rule.id)!
      : { ruleId: newRuleId(rule.weekday, taken, () => randomUUID().slice(0, 8)), weekday: String(rule.weekday), start: rule.start, end: rule.end, consultationType: rule.consultationType, validFrom: null, validUntil: null, publicNote: null, verification: placeholder },
  );
  const rules = [...regular, ...schedule.rules.filter((r) => r.consultationType === "ACUTE")];
  const context = { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true, ...(draft.audit === "VERIFY" ? { [SERVER_CONTEXT.AUDIT_OPERATION]: "VERIFY" } : {}) };
  await withContext(req, context, () =>
    payload.update({ collection: "weeklySchedules", id: schedule.id, data: { rules, confirmedClosedWeekdays: draft.closed.map(String) } as never, req, user: req.user, overrideAccess: false, depth: 0, context: req.context }),
  );
}

// ---------------------------------------------------------------- Sprechstundenarten (09.5J)

export type TypeResult =
  | { ok: true; changeSetId: string; mode: TypeMode; code: ConsultationTypeCode }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_ALLOWED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

export const TYPE_DOCTOR_ONLY = "Sprechstundenarten können nur ärztlich geändert und bestätigt werden.";

/**
 * DOCTOR only (checked here, by the collection access AND by the guard hook): session account → server
 * changeSetId → transaction → re-read the type of this code (duplicates refused) → fingerprint → rebuilt
 * draft (server date) → one write through the trusted CONSULTATION_TYPE context → audit (same transaction)
 * → commit. Creation re-checks inside the transaction that the code still does not exist (stale otherwise).
 * VERIFY for creation / first or renewed confirmation, UPDATE for a change of a confirmed type. No quick
 * undo: correction = another physician edit.
 */
export async function confirmConsultationType(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  code: ConsultationTypeCode | undefined,
  input: { label?: string; explanation?: string },
  previewFingerprint: string,
  confirmed: boolean,
  now: Date = new Date(),
): Promise<TypeResult> {
  const role = activeRole(user);
  if (!user || !role) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  if (role !== "DOCTOR") return { ok: false, code: "NOT_ALLOWED", message: TYPE_DOCTOR_ONLY };
  if (!confirmed) return { ok: false, code: "BLOCKED", message: "Bitte bestätigen Sie die Sprechstundenart ausdrücklich." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader, req).getPulsData();
    const draft = typeDraft(data, code, input, berlinToday(now));
    if (draft.fingerprint !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: TYPE_STALE };
    }
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.message };
    }
    await commitConsultationType(payload, req, draft);
    await commitTransaction(req);
    return { ok: true, changeSetId, mode: draft.mode, code: draft.code };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    return { ok: false, code: "FAILED", message: err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : "Die Sprechstundenart konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}

/** The physician type write inside the given transaction (exported for the rollback tests). */
export async function commitConsultationType(payload: Payload, req: PayloadRequest, draft: Extract<TypeDraft, { ok: true }>): Promise<void> {
  const found = (await payload.find({ collection: "consultationTypes", where: { code: { equals: draft.code } }, limit: 2, depth: 0, overrideAccess: true, req })).docs as { id: number | string }[];
  if (found.length > 1) throw new Error(`Sprechstundenart ${draft.code} ist mehrfach vorhanden.`);
  const context = { [SERVER_CONTEXT.CONSULTATION_TYPE]: true, ...(draft.audit === "VERIFY" ? { [SERVER_CONTEXT.AUDIT_OPERATION]: "VERIFY" } : {}) };
  const wording = { label: draft.next.label, explanation: draft.next.explanation ?? null };
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0 };
  await withContext(req, context, () =>
    found[0]
      ? payload.update({ collection: "consultationTypes", id: found[0].id, data: wording as never, ...common, context: req.context })
      : payload.create({ collection: "consultationTypes", data: { code: draft.code, ...wording, verification: verificationToDoc(previewVerification(berlinToday())) } as never, ...common, context: req.context }),
  );
}

// ---------------------------------------------------------------- "Hinweis veröffentlichen" (09.5D)

export type AnnouncementPublishResult =
  | { ok: true; changeSetId: string; mode: "NEW" | "EDIT"; recordId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "STALE" | "BLOCKED" | "FAILED"; message: string };

/**
 * Same pipeline as publishWorkflow: session account → new server changeSetId → transaction →
 * re-read ACTIVE announcements → fingerprint → full revalidation (pure draft) → write (provenance
 * hook, shape hook, audit hook) → commit. published / category / priority / highlight come from
 * the draft (server rules), never from the browser.
 */
export async function publishAnnouncement(
  payload: Payload,
  user: (StaffUserLike & Record<string, unknown>) | null | undefined,
  input: AnnouncementInput,
  previewFingerprint: string,
  now: Date = new Date(),
): Promise<AnnouncementPublishResult> {
  if (!user || !activeRole(user)) return { ok: false, code: "UNAUTHENTICATED", message: "Bitte melden Sie sich erneut an." };
  const changeSetId = randomUUID();
  const req = await createLocalReq({ user: user as never, context: { [SERVER_CONTEXT.CHANGE_SET]: changeSetId } }, payload);
  await initTransaction(req);
  try {
    const announcements = await new PayloadPracticeRepository(payload as unknown as PayloadReader, req).getAnnouncements();
    const fingerprint = announcementFingerprint(announcements);
    if (fingerprint !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: STALE_MESSAGE };
    }
    const { draft } = announcementDraft(announcements, now, input, fingerprint);
    if (!draft.ok) {
      await killTransaction(req);
      return { ok: false, code: "BLOCKED", message: draft.blocked.message };
    }
    const recordId = await commitAnnouncement(payload, req, draft.mode, draft.record);
    await commitTransaction(req);
    return { ok: true, changeSetId, mode: draft.mode, recordId };
  } catch (e) {
    await killTransaction(req);
    const err = e as { isPublic?: boolean; message?: string } | null;
    const publicMessage = err && typeof err === "object" && err.isPublic && typeof err.message === "string" ? err.message : undefined;
    return { ok: false, code: "FAILED", message: publicMessage ?? "Der Hinweis konnte nicht gespeichert werden. Es wurde nichts verändert." };
  }
}

/** Write one announcement inside the given transaction (exported for the rollback tests). */
export async function commitAnnouncement(payload: Payload, req: PayloadRequest, mode: "NEW" | "EDIT", record: Announcement): Promise<string> {
  const common = { req, user: req.user, overrideAccess: false as const, depth: 0, context: req.context };
  if (mode === "EDIT") {
    const current = (await payload.find({ collection: "announcements", where: { and: [{ recordId: { equals: record.id } }, { recordState: { not_equals: "RETIRED" } }] }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as { id: number | string } | undefined;
    if (!current) throw new Error("Der zu bearbeitende Hinweis existiert nicht mehr.");
    await payload.update({ collection: "announcements", id: current.id, data: announcementToDoc(record) as never, ...common });
    return record.id;
  }
  // A new record never reuses the id of an existing (also RETIRED) record: -2, -3, …
  const recordId = await freeRecordId(payload, req, "announcements", record.id);
  await payload.create({ collection: "announcements", data: announcementToDoc({ ...record, id: recordId }) as never, ...common });
  return recordId;
}
