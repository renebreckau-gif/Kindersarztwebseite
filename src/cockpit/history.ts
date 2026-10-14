// Small cockpit history read model (Phase 09.5B) — only what "Letzte Änderung", undo eligibility,
// the undo preview and relationship labels need. Not the full audit browser (09.7).
// Reads auditEvents through a minimal reader; React never sees raw audit documents.

import type { StaffRole } from "../domain/governance.ts";
import type { PulsData } from "../domain/practice-status.ts";
import { formatGermanDate, zonedParts, type LocalDate } from "../domain/time.ts";
import { blocks } from "../domain/operations.ts";
import type { PayloadReader } from "../backend/payload-repository.ts";
import { entityKey, planUndo, type HistoryEvent, type LifecycleCollection, type StoredRecord, type UndoPlan } from "./workflows/undo.ts";

const COLLECTIONS: LifecycleCollection[] = ["openingHourExceptions", "closures"];

export interface ChangeGroup {
  key: string;
  changeSetId?: string;
  events: HistoryEvent[];
  at: string;
  actorName: string;
  /** Plain German, e.g. "Heute um 13:00 Uhr schließen" / "Änderung zurückgenommen". */
  title: string;
}

function toEvent(d: Record<string, unknown>): HistoryEvent {
  return {
    eventId: String(d.eventId),
    at: String(d.at),
    actorId: String(d.actorId),
    actorName: String(d.actorName),
    actorRole: String(d.actorRole),
    entityType: d.entityType as LifecycleCollection,
    entityId: String(d.entityId),
    operation: d.operation as HistoryEvent["operation"],
    previous: d.previous ?? null,
    next: d.next ?? null,
    changeSetId: (d.changeSetId as string | null) ?? undefined,
    revertOf: (d.revertOf as string | null) ?? undefined,
  };
}

const berlinDate = (iso: string) => zonedParts(new Date(iso)).date;

/** Plain-German description of one business event (from its server snapshot). */
export function describeEvent(e: HistoryEvent, today: LocalDate): string {
  const snap = (e.next ?? e.previous ?? {}) as { kind?: string; startDate?: string; endDate?: string; intervals?: { start: string; end: string; consultationType: string }[] };
  const day = snap.startDate === today && snap.endDate === today ? "Heute" : snap.startDate ? formatGermanDate(snap.startDate) : "";
  if (e.entityType === "openingHourExceptions") {
    if (snap.kind === "CLOSED") return `${day}: Praxis geschlossen`;
    const b = blocks((snap.intervals ?? []).map((i) => ({ start: i.start, end: i.end, type: i.consultationType as never })));
    const end = b.at(-1)?.end;
    return end ? `${day} um ${end} Uhr schließen` : `${day}: geänderte Sprechzeiten`;
  }
  if (snap.kind === "SHORT_NOTICE") return day === "Heute" ? "Praxis heute geschlossen" : `${day}: Praxis geschlossen`;
  return `${day}: Schließung`;
}

export function describeGroup(events: HistoryEvent[], today: LocalDate): string {
  if (events.some((e) => e.operation === "REVERT")) return "Änderung zurückgenommen";
  const main = events.find((e) => e.operation !== "SUPERSEDE") ?? events[0];
  const text = describeEvent(main, today);
  return events.some((e) => e.operation === "SUPERSEDE") ? `Bestehende Änderung ersetzt: ${text}` : text;
}

/** Recent business events, newest first (insertion order = audit id). */
export async function recentEvents(reader: PayloadReader, limit = 100, req?: unknown): Promise<HistoryEvent[]> {
  const res = await reader.find({ collection: "auditEvents", where: { entityType: { in: COLLECTIONS } }, sort: "-id", limit, pagination: true, depth: 0, overrideAccess: true, req });
  return res.docs.map((d) => toEvent(d as Record<string, unknown>));
}

export function groupChanges(events: HistoryEvent[], today: LocalDate): ChangeGroup[] {
  const groups = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const key = e.changeSetId ?? `event-${e.eventId}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()].map(([key, evs]) => ({
    key,
    changeSetId: evs[0].changeSetId,
    events: evs,
    at: evs.reduce((m, e) => (e.at > m ? e.at : m), evs[0].at),
    actorName: evs[0].actorName,
    title: describeGroup(evs, today),
  }));
}

/** Everything the undo planner needs for one change set, read on the server (optionally in a transaction). */
export async function loadUndoInputs(reader: PayloadReader, changeSetId: string, req?: unknown): Promise<{ group: HistoryEvent[]; latest: Record<string, string>; records: Record<string, StoredRecord | undefined> }> {
  const res = await reader.find({ collection: "auditEvents", where: { and: [{ changeSetId: { equals: changeSetId } }, { entityType: { in: COLLECTIONS } }] }, sort: "id", pagination: false, depth: 0, overrideAccess: true, req });
  const group = res.docs.map((d) => toEvent(d as Record<string, unknown>));
  const latest: Record<string, string> = {};
  const records: Record<string, StoredRecord | undefined> = {};
  for (const e of group) {
    const k = entityKey(e);
    const newest = await reader.find({ collection: "auditEvents", where: { and: [{ entityType: { equals: e.entityType } }, { entityId: { equals: e.entityId } }] }, sort: "-id", limit: 1, depth: 0, overrideAccess: true, req });
    latest[k] = String((newest.docs[0] as { eventId?: string } | undefined)?.eventId ?? "");
    const rec = await reader.find({ collection: e.entityType, where: { recordId: { equals: e.entityId } }, limit: 1, depth: 0, overrideAccess: true, req });
    records[k] = rec.docs[0] as StoredRecord | undefined;
  }
  return { group, latest, records };
}

export interface LatestChange {
  group: ChangeGroup;
  /** Undo currently possible (safe, latest, within 24 h, effect still present). */
  undoable: boolean;
  reason?: string;
}

/** "Letzte Änderung" for the home page (latest cockpit change set and whether it can be undone now). */
export async function latestChange(reader: PayloadReader, data: PulsData, now: Date, role: StaffRole | null): Promise<LatestChange | null> {
  const today = zonedParts(now).date;
  const groups = groupChanges(await recentEvents(reader, 30), today);
  const group = groups.find((g) => g.changeSetId) ?? groups[0];
  if (!group) return null;
  if (!group.changeSetId) return { group, undoable: false };
  const plan = await planFor(reader, group.changeSetId, data, now, role);
  return { group, undoable: plan.ok, reason: plan.ok ? undefined : plan.message };
}

export async function planFor(reader: PayloadReader, changeSetId: string, data: PulsData, now: Date, role: StaffRole | null, req?: unknown): Promise<UndoPlan> {
  const inputs = await loadUndoInputs(reader, changeSetId, req);
  return planUndo({ ...inputs, data, now, role });
}

/** "vor 4 Minuten" — relative time for the home card. */
export function relativeTime(iso: string, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60000));
  if (min < 1) return "gerade eben";
  if (min === 1) return "vor 1 Minute";
  if (min < 60) return `vor ${min} Minuten`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "vor 1 Stunde" : `vor ${h} Stunden`;
  return `am ${formatGermanDate(berlinDate(iso))}`;
}
