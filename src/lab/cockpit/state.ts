// Pure prototype state transitions (no React) — testable with node:test.
// Every publish adds an audit entry with the data snapshot BEFORE the change, so an edit
// (version 2) can be undone back to version 1; nothing is deleted from the history.

import { initialState, ROLES, type AuditEntry, type CockpitData, type CockpitState, type Role } from "./model.ts";

export type ChangeInput = Omit<AuditEntry, "id" | "date" | "time" | "actor" | "role" | "snapshot">;

export type Action =
  | { type: "role"; role: Role }
  | { type: "clock"; date: string; time: string }
  | { type: "reset" }
  | { type: "apply"; next: CockpitData; entry: ChangeInput; id: string }
  /** Lab scenarios: a change "published earlier" by another (mock) person. */
  | { type: "seed"; next: CockpitData; entry: ChangeInput; id: string; actorRole: Role; time: string }
  | { type: "revert"; id: string; revertId: string };

export function reducer(state: CockpitState, a: Action): CockpitState {
  switch (a.type) {
    case "role":
      return { ...state, role: a.role };
    case "clock":
      return { ...state, clock: { date: a.date, time: a.time } };
    case "reset":
      return { ...initialState(), role: state.role };
    case "apply":
    case "seed": {
      const role = a.type === "seed" ? a.actorRole : state.role;
      const entry: AuditEntry = {
        ...a.entry,
        id: a.id,
        date: state.clock.date,
        time: a.type === "seed" ? a.time : state.clock.time,
        actor: ROLES[role].person,
        role,
        snapshot: state.data,
      };
      return { ...state, seq: state.seq + 1, data: a.next, audit: [entry, ...state.audit] };
    }
    case "revert": {
      const target = state.audit.find((e) => e.id === a.id);
      if (!target?.snapshot || target.revertedBy) return state;
      const who = ROLES[state.role];
      const entry: AuditEntry = {
        id: a.revertId,
        date: state.clock.date,
        time: state.clock.time,
        actor: who.person,
        role: state.role,
        title: "Änderung zurückgenommen",
        detail: target.title,
        before: target.after,
        after: target.before,
        revertOf: target.id,
        entityIds: target.entityIds,
      };
      return {
        ...state,
        seq: state.seq + 1,
        data: target.snapshot,
        audit: [entry, ...state.audit.map((e) => (e.id === target.id ? { ...e, revertedBy: entry.id } : e))],
      };
    }
  }
}

export type UndoCheck = { ok: true } | { ok: false; reason: string };

/** Undo only the newest still-active session change (no silent merge; praxis-cockpit.md §9.2). */
export function canUndo(state: CockpitState, id: string): UndoCheck {
  const e = state.audit.find((x) => x.id === id);
  if (!e) return { ok: false, reason: "Diese Änderung gibt es nicht." };
  if (e.revertedBy) return { ok: false, reason: "Diese Änderung wurde bereits zurückgenommen." };
  if (e.revertOf) return { ok: false, reason: "Eine Rücknahme kann im Prototyp nicht erneut zurückgenommen werden." };
  if (!e.snapshot) return { ok: false, reason: "Im Prototyp lassen sich nur Änderungen aus dieser Testsitzung zurücknehmen." };
  const idx = state.audit.indexOf(e);
  const newer = state.audit.slice(0, idx).filter((x) => !x.revertedBy && !x.revertOf);
  if (newer.length) return { ok: false, reason: "Danach wurde noch etwas geändert. Bitte zuerst die neuere Änderung zurücknehmen." };
  return { ok: true };
}

/** Version number of an audit entry for its record (1 = first publication). Reverts don't count. */
export function versionOf(audit: AuditEntry[], entry: AuditEntry): number {
  const id = entry.entityIds[0];
  const chain = audit.filter((e) => !e.revertOf && !e.revertedBy && e.entityIds[0] === id);
  const older = chain.filter((e) => audit.indexOf(e) >= audit.indexOf(entry));
  return Math.max(1, older.length);
}
