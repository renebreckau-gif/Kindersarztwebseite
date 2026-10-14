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
import { SERVER_CONTEXT } from "../../backend/server-context.ts";
import { datasetFingerprint } from "./snapshot.ts";
import { closedTodayDraft, earlyCloseDraft } from "./today.ts";
import type { Blocked, ClosedTodayInput, Draft, EarlyCloseInput, ReadyDraft, WorkflowKind } from "./types.ts";

export type WorkflowRequest = { kind: "EARLY_CLOSE"; input: EarlyCloseInput } | { kind: "CLOSED_TODAY"; input: ClosedTodayInput };

export type PublishResult =
  | { ok: true; changeSetId: string; mode: "NEW" | "EDIT"; recordId: string; kind: WorkflowKind }
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

/**
 * Write one ready draft with the given transactional request. Provenance (beforeChange), the
 * publish guard and the audit event (afterChange, with the context's changeSetId) run as hooks
 * inside the same transaction. Exported for the transaction tests.
 */
export async function commitDraft(payload: Payload, req: PayloadRequest, draft: ReadyDraft): Promise<string> {
  const { collection, value } = draft.record;
  const data: unknown = collection === "closures" ? closureToDoc(value as never) : exceptionToDoc(value as never);
  const found = await payload.find({ collection, where: { recordId: { equals: value.id } }, limit: 1, depth: 0, overrideAccess: true, req });
  const current = found.docs[0] as { id: number | string } | undefined;
  if (draft.mode === "EDIT" && !current) throw new Error("Der zu bearbeitende Eintrag existiert nicht mehr.");
  if (draft.mode === "NEW" && current) throw new Error("Für heute existiert bereits ein Eintrag.");
  const common = { req, user: req.user, overrideAccess: false as const, context: req.context, depth: 0 };
  if (current) await payload.update({ collection, id: current.id, data: data as never, ...common });
  else await payload.create({ collection, data: data as never, ...common });
  return value.id;
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
