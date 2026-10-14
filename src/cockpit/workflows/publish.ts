// Publish path of the today workflows (Phase 09.5A). Server-side only.
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
import { closureToDoc, exceptionToDoc } from "../../data/payload-mapping.ts";
import { activeRole, type StaffUserLike } from "../../backend/access.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../../backend/payload-repository.ts";
import { changeSetIdOf, SERVER_CONTEXT } from "../../backend/server-context.ts";
import { planFor } from "../history.ts";
import type { UndoAction, UndoPlan } from "./undo.ts";
import { datasetFingerprint } from "./snapshot.ts";
import { closedTodayDraft, earlyCloseDraft } from "./today.ts";
import type { Blocked, ClosedTodayInput, Draft, EarlyCloseInput, ReadyDraft, WorkflowKind } from "./types.ts";

export type WorkflowRequest = { kind: "EARLY_CLOSE"; input: EarlyCloseInput } | { kind: "CLOSED_TODAY"; input: ClosedTodayInput };

export type PublishResult =
  | { ok: true; changeSetId: string; mode: "NEW" | "EDIT" | "SUPERSEDE"; recordId: string; kind: WorkflowKind }
  | { ok: false; code: "UNAUTHENTICATED" | "STALE" | "BLOCKED" | "FAILED"; message: string; blocked?: Blocked };

export const STALE_MESSAGE = "Inzwischen wurde etwas geändert. Bitte prüfen Sie die Vorschau erneut.";

export function buildDraft(request: WorkflowRequest, data: PulsData, now: Date, fingerprint: string): Draft {
  return request.kind === "EARLY_CLOSE" ? earlyCloseDraft(data, now, request.input, fingerprint) : closedTodayDraft(data, now, request.input, fingerprint);
}

/** Preview: the current DATABASE snapshot (never the static website data) + the proposed change. */
export async function previewWorkflow(payload: Payload, request: WorkflowRequest, now: Date = new Date()): Promise<{ draft: Draft; data: PulsData }> {
  const data = await new PayloadPracticeRepository(payload as unknown as PayloadReader).getPulsData();
  return { draft: buildDraft(request, data, now, datasetFingerprint(data)), data };
}

/** A new record never reuses the id of an existing (also RETIRED) record: append -2, -3, … */
async function freeRecordId(payload: Payload, req: PayloadRequest, collection: "openingHourExceptions" | "closures", wanted: string): Promise<string> {
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

/** Preview of an undo: current ACTIVE database data + plan (both through the engine on the page). */
export async function previewUndo(payload: Payload, user: StaffUserLike | null | undefined, changeSetId: string, now: Date = new Date()): Promise<{ plan: UndoPlan; data: PulsData; fingerprint: string }> {
  const reader = payload as unknown as PayloadReader;
  const data = await new PayloadPracticeRepository(reader).getPulsData();
  const plan = await planFor(reader, changeSetId, data, now, activeRole(user));
  return { plan, data, fingerprint: datasetFingerprint(data) };
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
    const data = await new PayloadPracticeRepository(reader, req).getPulsData();
    if (datasetFingerprint(data) !== previewFingerprint) {
      await killTransaction(req);
      return { ok: false, code: "STALE", message: STALE_MESSAGE };
    }
    // Rebuilt from server history inside the transaction — nothing from the browser but the change-set id.
    const plan = await planFor(reader, changeSetId, data, now, role, req);
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
