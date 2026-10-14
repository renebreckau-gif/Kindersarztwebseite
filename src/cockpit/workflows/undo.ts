// Safe undo (Phase 09.5B; announcements since 09.5D) — pure planning. No Payload, no React.
//
// Source of truth is the SERVER audit history (previous / next / operation / changeSetId) plus the
// current records — never a snapshot from the browser. An undo works on a whole CHANGE SET:
//   CREATE    → the created record is RETIRED (reason REVERTED); it stays in PostgreSQL
//   UPDATE    → the SAME record gets its previous business content back (new UPDATE, audit REVERT)
//   SUPERSEDE → the replaced record becomes ACTIVE again
// Nothing is deleted. Praxis Puls records run through the same engine (no new UNKNOWN day);
// announcements are judged by the publication rules on the preview page.

import type { Announcement, Closure, OpeningHourException } from "../../domain/content-types.ts";
import { canConfirm, type AuditOperation, type ConfirmableKind, type StaffRole } from "../../domain/governance.ts";
import { introducedUnknown } from "../../domain/operations.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { compareDates, type LocalDate } from "../../domain/time.ts";
import {
  announcementFromDoc,
  announcementToDoc,
  closureFromDoc,
  closureToDoc,
  exceptionFromDoc,
  exceptionToDoc,
  type AnnouncementDoc,
  type ClosureDoc,
  type ExceptionDoc,
} from "../../data/payload-mapping.ts";
import { reviewDueFor } from "../../backend/provenance.ts";
import { berlinNow } from "../read-model.ts";
import { unknownReason } from "./wording.ts";

export type LifecycleCollection = "openingHourExceptions" | "closures" | "announcements";
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

type AnyDoc = ExceptionDoc | ClosureDoc | AnnouncementDoc;
type AnyRecord = Closure | OpeningHourException | Announcement;

export type UndoAction =
  | { kind: "RETIRE"; entityType: LifecycleCollection; entityId: string; revertOf: string }
  | { kind: "RESTORE"; entityType: LifecycleCollection; entityId: string; revertOf: string; doc: AnyDoc }
  | { kind: "REACTIVATE"; entityType: LifecycleCollection; entityId: string; revertOf: string };

export type UndoBlockCode = "NOT_FOUND" | "NOT_UNDOABLE" | "EXPIRED" | "EFFECT_OVER" | "LATER_CHANGE" | "STATE_CHANGED" | "NOT_ALLOWED" | "UNSAFE";

export type UndoPlan =
  | {
      ok: true;
      changeSetId: string;
      actions: UndoAction[];
      /** Praxis Puls data now / after the undo (unchanged when the change set has no Puls record). */
      before: PulsData;
      after: PulsData;
      /** ACTIVE announcements now / after the undo. */
      announcementsBefore: Announcement[];
      announcementsAfter: Announcement[];
      /** Which kinds of operational data this change set touches (drives the preview). */
      touches: { puls: boolean; announcements: boolean };
    }
  | { ok: false; code: UndoBlockCode; message: string };

export const LATER_CHANGE_MESSAGE = "Dieser Stand wurde inzwischen erneut geändert. Bitte prüfen Sie den aktuellen Eintrag.";

const KIND: Record<LifecycleCollection, ConfirmableKind> = { closures: "CLOSURE", openingHourExceptions: "EXCEPTION", announcements: "ANNOUNCEMENT" };
const keyOf = (e: { entityType: string; entityId: string }) => `${e.entityType}:${e.entityId}`;
/** Open-ended announcements never end by date. */
const NEVER = "9999-12-31";

function toDomain(collection: LifecycleCollection, doc: unknown): AnyRecord {
  if (collection === "closures") return closureFromDoc(doc as ClosureDoc);
  if (collection === "announcements") return announcementFromDoc(doc as AnnouncementDoc);
  return exceptionFromDoc(doc as ExceptionDoc);
}

function toDoc(collection: LifecycleCollection, value: AnyRecord): AnyDoc {
  if (collection === "closures") return closureToDoc(value as Closure);
  if (collection === "announcements") return announcementToDoc(value as Announcement);
  return exceptionToDoc(value as OpeningHourException);
}

/** Last day a stored / snapshot record still has an effect ("still effective or future"). */
function effectEnd(collection: LifecycleCollection, doc: unknown, today: LocalDate): LocalDate {
  const d = (doc ?? {}) as { endDate?: string | null; validUntil?: string | null; openEnded?: boolean | null };
  if (collection === "announcements") return d.openEnded ? NEVER : (d.validUntil ?? today);
  return d.endDate ?? today;
}

/** Business content of a stored/snapshot record (no ids, timestamps, verification or lifecycle). */
export function businessOf(collection: LifecycleCollection, doc: unknown): string {
  if (!doc || typeof doc !== "object") return "null";
  const { verification: _v, ...rest } = toDomain(collection, doc) as AnyRecord & { verification?: unknown };
  return JSON.stringify(rest);
}

/**
 * The restored version is re-confirmed NOW by the person undoing (the hook regenerates provenance).
 * Mirrors reviewDueFor: temporary records are due at their end date (a multi-day vacation stays
 * usable for its whole range in the preview, exactly as after the real write); announcements at
 * their end, open-ended ones after 30 days.
 */
function restoredVerification(collection: LifecycleCollection, value: AnyRecord, today: LocalDate): FactVerification {
  let reviewDue: LocalDate;
  if (collection === "announcements") {
    const a = value as Announcement;
    reviewDue = reviewDueFor("ANNOUNCEMENT", { validUntil: a.validUntil === "OPEN_ENDED" ? null : a.validUntil, openEnded: a.validUntil === "OPEN_ENDED" }, today);
  } else {
    const end = (value as Closure | OpeningHourException).endDate;
    reviewDue = end && compareDates(end, today) > 0 ? end : today;
  }
  return { status: "VERIFIED_CURRENT", lastVerified: today, reviewDue, verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] };
}

export interface OperationalState {
  data: PulsData;
  announcements: Announcement[];
}

/** Apply an undo plan to the ACTIVE operational state (what the engine / publication rules see afterwards). */
export function applyUndoState(state: OperationalState, actions: UndoAction[], records: Record<string, StoredRecord | undefined>, today: LocalDate): OperationalState {
  const lists: Record<LifecycleCollection, AnyRecord[]> = {
    openingHourExceptions: [...state.data.exceptions],
    closures: [...state.data.closures],
    announcements: [...state.announcements],
  };
  const drop = (c: LifecycleCollection, id: string) => (lists[c] = lists[c].filter((x) => x.id !== id));
  const put = (c: LifecycleCollection, value: AnyRecord) => {
    drop(c, value.id);
    lists[c].push(value);
  };
  for (const a of actions) {
    if (a.kind === "RETIRE") drop(a.entityType, a.entityId);
    if (a.kind === "RESTORE") {
      const restored = toDomain(a.entityType, a.doc);
      put(a.entityType, { ...restored, verification: restoredVerification(a.entityType, restored, today) } as AnyRecord);
    }
    if (a.kind === "REACTIVATE") put(a.entityType, toDomain(a.entityType, records[keyOf(a)]));
  }
  return {
    data: { ...state.data, exceptions: lists.openingHourExceptions as OpeningHourException[], closures: lists.closures as Closure[] },
    announcements: lists.announcements as Announcement[],
  };
}

/** Puls-only view of applyUndoState (09.5B signature). */
export function applyUndo(data: PulsData, actions: UndoAction[], records: Record<string, StoredRecord | undefined>, today: LocalDate): PulsData {
  return applyUndoState({ data, announcements: [] }, actions, records, today).data;
}

/**
 * Plan the undo of one change set.
 * @param group          all audit events of the change set (business collections only)
 * @param latest         newest audit event id per entity ("collection:recordId")
 * @param records        current stored record per entity (any lifecycle state)
 * @param data           current ACTIVE practice data (repository)
 * @param announcements  current ACTIVE announcements (repository); defaults to none
 * @param role           role of the signed-in account (server session)
 */
export function planUndo(input: {
  group: HistoryEvent[];
  latest: Record<string, string>;
  records: Record<string, StoredRecord | undefined>;
  data: PulsData;
  announcements?: Announcement[];
  now: Date;
  role: StaffRole | null;
}): UndoPlan {
  const { group, latest, records, data, now, role } = input;
  const announcements = input.announcements ?? [];
  const block = (code: UndoBlockCode, message: string): UndoPlan => ({ ok: false, code, message });
  if (!group.length) return block("NOT_FOUND", "Diese Änderung wurde nicht gefunden.");
  const changeSetId = group[0].changeSetId;
  if (!changeSetId || group.some((e) => e.changeSetId !== changeSetId)) return block("NOT_UNDOABLE", "Diese Änderung wurde nicht im Praxis Cockpit veröffentlicht und kann hier nicht zurückgenommen werden.");
  if (group.some((e) => e.operation === "REVERT")) return block("NOT_UNDOABLE", "Eine Rücknahme kann nicht erneut zurückgenommen werden. Bitte die gewünschte Änderung neu eintragen.");
  if (!role) return block("NOT_ALLOWED", "Bitte melden Sie sich erneut an.");
  if (group.some((e) => !canConfirm(role, KIND[e.entityType]))) return block("NOT_ALLOWED", "Diese Änderung dürfen Sie nicht zurücknehmen.");
  const newest = Math.max(...group.map((e) => Date.parse(e.at)));
  if (now.getTime() - newest > UNDO_WINDOW_MS) {
    return block("EXPIRED", "Diese Änderung liegt mehr als 24 Stunden zurück. Sie bleibt im Verlauf erhalten; schnelles Zurücknehmen ist nicht mehr möglich.");
  }

  const today = berlinNow(now).date;
  const actions: UndoAction[] = [];
  let lastPulsDay: LocalDate = today;
  let stillEffective = false;
  for (const e of group) {
    // Latest-change rule: only the newest change of an entity may be undone directly.
    if (latest[keyOf(e)] !== e.eventId) return block("LATER_CHANGE", LATER_CHANGE_MESSAGE);
    const record = records[keyOf(e)];
    if (!record) return block("STATE_CHANGED", "Der betroffene Eintrag wurde nicht gefunden.");
    const end = effectEnd(e.entityType, record, today);
    if (e.entityType !== "announcements" && compareDates(end, lastPulsDay) > 0) lastPulsDay = end;

    if (e.operation === "CREATE") {
      if (record.recordState === "RETIRED") return block("STATE_CHANGED", "Dieser Eintrag ist bereits archiviert.");
      if (compareDates(end, today) >= 0) stillEffective = true;
      actions.push({ kind: "RETIRE", entityType: e.entityType, entityId: e.entityId, revertOf: e.eventId });
    } else if (e.operation === "UPDATE") {
      if (record.recordState === "RETIRED") return block("STATE_CHANGED", "Dieser Eintrag ist bereits archiviert.");
      if (businessOf(e.entityType, record) !== businessOf(e.entityType, e.next)) return block("LATER_CHANGE", LATER_CHANGE_MESSAGE);
      if (!e.previous) return block("STATE_CHANGED", "Der vorherige Stand ist nicht vorhanden.");
      const prevEnd = effectEnd(e.entityType, e.previous, today);
      if (compareDates(end, today) >= 0 || compareDates(prevEnd, today) >= 0) stillEffective = true;
      if (e.entityType !== "announcements" && compareDates(prevEnd, lastPulsDay) > 0) lastPulsDay = prevEnd;
      actions.push({ kind: "RESTORE", entityType: e.entityType, entityId: e.entityId, revertOf: e.eventId, doc: toDoc(e.entityType, toDomain(e.entityType, e.previous)) });
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
  const touches = { puls: group.some((e) => e.entityType !== "announcements"), announcements: group.some((e) => e.entityType === "announcements") };
  const after = applyUndoState({ data, announcements }, actions, records, today);
  if (touches.puls) {
    const conflict = introducedUnknown(data, after.data, today, lastPulsDay === NEVER ? today : lastPulsDay);
    if (conflict) return block("UNSAFE", `Das Zurücknehmen würde widersprüchliche Angaben erzeugen (${conflict.date}): ${unknownReason(conflict.reason)}`);
  }
  return { ok: true, changeSetId, actions, before: data, after: after.data, announcementsBefore: announcements, announcementsAfter: after.announcements, touches };
}

export const entityKey = keyOf;
