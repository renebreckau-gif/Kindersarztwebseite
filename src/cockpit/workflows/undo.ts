// Safe undo (Phase 09.5B) — pure planning. No Payload, no React.
//
// Source of truth is the SERVER audit history (previous / next / operation / changeSetId) plus the
// current records — never a snapshot from the browser. An undo works on a whole CHANGE SET:
//   CREATE    → the created record is RETIRED (reason REVERTED); it stays in PostgreSQL
//   UPDATE    → the SAME record gets its previous business content back (new UPDATE, audit REVERT)
//   SUPERSEDE → the replaced record becomes ACTIVE again
// Nothing is deleted. The result runs through the same engine (no new UNKNOWN day).

import type { Closure, OpeningHourException } from "../../domain/content-types.ts";
import { canConfirm, type AuditOperation, type StaffRole } from "../../domain/governance.ts";
import { introducedUnknown } from "../../domain/operations.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { compareDates, type LocalDate } from "../../domain/time.ts";
import { closureFromDoc, closureToDoc, exceptionFromDoc, exceptionToDoc, type ClosureDoc, type ExceptionDoc } from "../../data/payload-mapping.ts";
import { berlinNow } from "../read-model.ts";
import { unknownReason } from "./wording.ts";

export type LifecycleCollection = "openingHourExceptions" | "closures";
export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface HistoryEvent {
  eventId: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: LifecycleCollection;
  entityId: string;
  operation: AuditOperation;
  previous: unknown;
  next: unknown;
  changeSetId?: string;
  revertOf?: string;
}

/** Current stored record (business fields + lifecycle), as the server read it. */
export type StoredRecord = Record<string, unknown> & { recordState?: string | null; retiredReason?: string | null; retiredByChangeSetId?: string | null; endDate?: string };

export type UndoAction =
  | { kind: "RETIRE"; entityType: LifecycleCollection; entityId: string; revertOf: string }
  | { kind: "RESTORE"; entityType: LifecycleCollection; entityId: string; revertOf: string; doc: ExceptionDoc | ClosureDoc }
  | { kind: "REACTIVATE"; entityType: LifecycleCollection; entityId: string; revertOf: string };

export type UndoBlockCode = "NOT_FOUND" | "NOT_UNDOABLE" | "EXPIRED" | "EFFECT_OVER" | "LATER_CHANGE" | "STATE_CHANGED" | "NOT_ALLOWED" | "UNSAFE";

export type UndoPlan =
  | { ok: true; changeSetId: string; actions: UndoAction[]; before: PulsData; after: PulsData }
  | { ok: false; code: UndoBlockCode; message: string };

export const LATER_CHANGE_MESSAGE = "Dieser Stand wurde inzwischen erneut geändert. Bitte prüfen Sie den aktuellen Eintrag.";

const kindOf = (c: LifecycleCollection): "CLOSURE" | "EXCEPTION" => (c === "closures" ? "CLOSURE" : "EXCEPTION");
const keyOf = (e: { entityType: string; entityId: string }) => `${e.entityType}:${e.entityId}`;

/** Business content of a stored/snapshot record (no ids, timestamps, verification or lifecycle). */
export function businessOf(collection: LifecycleCollection, doc: unknown): string {
  if (!doc || typeof doc !== "object") return "null";
  const d = collection === "closures" ? closureFromDoc(doc as ClosureDoc) : exceptionFromDoc(doc as ExceptionDoc);
  const { verification: _v, ...rest } = d as (Closure | OpeningHourException) & { verification?: unknown };
  return JSON.stringify(rest);
}

/**
 * The restored version is re-confirmed NOW by the person undoing (the hook regenerates provenance).
 * Mirrors reviewDueFor: temporary records are due at their end date (a multi-day vacation stays
 * usable for its whole range in the preview, exactly as after the real write).
 */
const restoredVerification = (today: LocalDate, endDate: LocalDate | undefined): FactVerification => ({
  status: "VERIFIED_CURRENT",
  lastVerified: today,
  reviewDue: endDate && compareDates(endDate, today) > 0 ? endDate : today,
  verifiedBy: "Vorschau",
  sourceIds: ["PRACTICE_COCKPIT"],
});

function toDomain(collection: LifecycleCollection, doc: unknown): Closure | OpeningHourException {
  return collection === "closures" ? closureFromDoc(doc as ClosureDoc) : exceptionFromDoc(doc as ExceptionDoc);
}

/** Apply an undo plan to the ACTIVE practice data (what the engine would see afterwards). */
export function applyUndo(data: PulsData, actions: UndoAction[], records: Record<string, StoredRecord | undefined>, today: LocalDate): PulsData {
  let exceptions = [...data.exceptions];
  let closures = [...data.closures];
  const drop = (c: LifecycleCollection, id: string) => {
    if (c === "closures") closures = closures.filter((x) => x.id !== id);
    else exceptions = exceptions.filter((x) => x.id !== id);
  };
  const put = (c: LifecycleCollection, value: Closure | OpeningHourException) => {
    drop(c, value.id);
    if (c === "closures") closures.push(value as Closure);
    else exceptions.push(value as OpeningHourException);
  };
  for (const a of actions) {
    if (a.kind === "RETIRE") drop(a.entityType, a.entityId);
    if (a.kind === "RESTORE") {
      const restored = toDomain(a.entityType, a.doc);
      put(a.entityType, { ...restored, verification: restoredVerification(today, restored.endDate) });
    }
    if (a.kind === "REACTIVATE") put(a.entityType, toDomain(a.entityType, records[keyOf(a)]));
  }
  return { ...data, exceptions, closures };
}

/**
 * Plan the undo of one change set.
 * @param group     all audit events of the change set (business collections only)
 * @param latest    newest audit event id per entity ("collection:recordId")
 * @param records   current stored record per entity (any lifecycle state)
 * @param data      current ACTIVE practice data (repository)
 * @param role      role of the signed-in account (server session)
 */
export function planUndo(input: {
  group: HistoryEvent[];
  latest: Record<string, string>;
  records: Record<string, StoredRecord | undefined>;
  data: PulsData;
  now: Date;
  role: StaffRole | null;
}): UndoPlan {
  const { group, latest, records, data, now, role } = input;
  const block = (code: UndoBlockCode, message: string): UndoPlan => ({ ok: false, code, message });
  if (!group.length) return block("NOT_FOUND", "Diese Änderung wurde nicht gefunden.");
  const changeSetId = group[0].changeSetId;
  if (!changeSetId || group.some((e) => e.changeSetId !== changeSetId)) return block("NOT_UNDOABLE", "Diese Änderung wurde nicht im Praxis Cockpit veröffentlicht und kann hier nicht zurückgenommen werden.");
  if (group.some((e) => e.operation === "REVERT")) return block("NOT_UNDOABLE", "Eine Rücknahme kann nicht erneut zurückgenommen werden. Bitte die gewünschte Änderung neu eintragen.");
  if (!role) return block("NOT_ALLOWED", "Bitte melden Sie sich erneut an.");
  if (group.some((e) => !canConfirm(role, kindOf(e.entityType)))) return block("NOT_ALLOWED", "Diese Änderung dürfen Sie nicht zurücknehmen.");
  const newest = Math.max(...group.map((e) => Date.parse(e.at)));
  if (now.getTime() - newest > UNDO_WINDOW_MS) {
    return block("EXPIRED", "Diese Änderung liegt mehr als 24 Stunden zurück. Sie bleibt im Verlauf erhalten; schnelles Zurücknehmen ist nicht mehr möglich.");
  }

  const today = berlinNow(now).date;
  const actions: UndoAction[] = [];
  let lastDay: LocalDate = today;
  let stillEffective = false;
  for (const e of group) {
    // Latest-change rule: only the newest change of an entity may be undone directly.
    if (latest[keyOf(e)] !== e.eventId) return block("LATER_CHANGE", LATER_CHANGE_MESSAGE);
    const record = records[keyOf(e)];
    if (!record) return block("STATE_CHANGED", "Der betroffene Eintrag wurde nicht gefunden.");
    const end = (record.endDate as string | undefined) ?? today;
    if (compareDates(end, lastDay) > 0) lastDay = end;

    if (e.operation === "CREATE") {
      if (record.recordState === "RETIRED") return block("STATE_CHANGED", "Dieser Eintrag ist bereits archiviert.");
      if (compareDates(end, today) >= 0) stillEffective = true;
      actions.push({ kind: "RETIRE", entityType: e.entityType, entityId: e.entityId, revertOf: e.eventId });
    } else if (e.operation === "UPDATE") {
      if (record.recordState === "RETIRED") return block("STATE_CHANGED", "Dieser Eintrag ist bereits archiviert.");
      if (businessOf(e.entityType, record) !== businessOf(e.entityType, e.next)) return block("LATER_CHANGE", LATER_CHANGE_MESSAGE);
      if (!e.previous) return block("STATE_CHANGED", "Der vorherige Stand ist nicht vorhanden.");
      const prevEnd = (e.previous as { endDate?: string }).endDate ?? today;
      if (compareDates(end, today) >= 0 || compareDates(prevEnd, today) >= 0) stillEffective = true;
      const previous = toDomain(e.entityType, e.previous);
      const doc = e.entityType === "closures" ? closureToDoc(previous as Closure) : exceptionToDoc(previous as OpeningHourException);
      actions.push({ kind: "RESTORE", entityType: e.entityType, entityId: e.entityId, revertOf: e.eventId, doc });
    } else if (e.operation === "SUPERSEDE") {
      if (record.recordState !== "RETIRED" || record.retiredReason !== "SUPERSEDED" || record.retiredByChangeSetId !== changeSetId) {
        return block("STATE_CHANGED", "Der ersetzte Eintrag hat sich inzwischen verändert.");
      }
      if (compareDates(end, today) >= 0) stillEffective = true;
      actions.push({ kind: "REACTIVATE", entityType: e.entityType, entityId: e.entityId, revertOf: e.eventId });
    } else {
      return block("NOT_UNDOABLE", "Diese Art von Änderung kann hier nicht zurückgenommen werden.");
    }
  }
  if (!stillEffective) return block("EFFECT_OVER", "Diese Änderung wirkt nicht mehr (ihr Zeitraum ist vorbei). Sie bleibt im Verlauf erhalten.");

  // Retire first, then restore / reactivate (the guard of a reactivation must not see the new record).
  const order = { RETIRE: 0, RESTORE: 1, REACTIVATE: 2 } as const;
  actions.sort((a, b) => order[a.kind] - order[b.kind]);
  const after = applyUndo(data, actions, records, today);
  const conflict = introducedUnknown(data, after, today, lastDay);
  if (conflict) return block("UNSAFE", `Das Zurücknehmen würde widersprüchliche Angaben erzeugen (${conflict.date}): ${unknownReason(conflict.reason)}`);
  return { ok: true, changeSetId, actions, before: data, after };
}

export const entityKey = keyOf;
