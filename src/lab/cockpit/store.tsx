"use client";

// In-memory prototype state. Nothing is persisted: a reload or "Prototyp zurücksetzen"
// returns to the same starting situation for the next usability session.

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { initialState, readSession, writeSession, MOCK_NOW, MOCK_TODAY, ROLES, type AuditEntry, type CockpitData, type CockpitState, type Role } from "./model";

type ChangeInput = Omit<AuditEntry, "id" | "date" | "time" | "actor" | "role" | "snapshot">;

type Action =
  | { type: "role"; role: Role }
  | { type: "reset" }
  | { type: "apply"; next: CockpitData; entry: ChangeInput; id: string }
  | { type: "revert"; id: string; revertId: string };

function reducer(state: CockpitState, a: Action): CockpitState {
  switch (a.type) {
    case "role":
      return { ...state, role: a.role };
    case "reset":
      return { ...initialState(), role: state.role };
    case "apply": {
      const who = ROLES[state.role];
      const entry: AuditEntry = { ...a.entry, id: a.id, date: MOCK_TODAY, time: MOCK_NOW, actor: who.person, role: state.role, snapshot: state.data };
      return { ...state, seq: state.seq + 1, data: a.next, audit: [entry, ...state.audit] };
    }
    case "revert": {
      const target = state.audit.find((e) => e.id === a.id);
      if (!target?.snapshot || target.revertedBy) return state;
      const who = ROLES[state.role];
      const entry: AuditEntry = {
        id: a.revertId,
        date: MOCK_TODAY,
        time: MOCK_NOW,
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

interface Store {
  state: CockpitState;
  /** null = not yet read from the prototype session (first client render). */
  signedIn: boolean | null;
  signIn: (r: Role) => void;
  signOut: () => void;
  setRole: (r: Role) => void;
  reset: () => void;
  /** Returns the id of the new audit entry. */
  apply: (next: CockpitData, entry: ChangeInput) => string;
  revert: (id: string) => string;
}

const Ctx = createContext<Store | null>(null);

let counter = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function CockpitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const storage = () => (typeof window === "undefined" ? undefined : window.sessionStorage);
  useEffect(() => {
    const role = readSession(storage());
    if (role) dispatch({ type: "role", role });
    setSignedIn(Boolean(role));
  }, []);
  const store = useMemo<Store>(
    () => ({
      state,
      signedIn,
      signIn: (role) => {
        writeSession(storage(), role);
        dispatch({ type: "role", role });
        setSignedIn(true);
      },
      signOut: () => {
        writeSession(storage(), null);
        setSignedIn(false);
      },
      setRole: (role) => {
        writeSession(storage(), role);
        dispatch({ type: "role", role });
      },
      reset: () => dispatch({ type: "reset" }),
      apply: (next, entry) => {
        const id = newId("c");
        dispatch({ type: "apply", next, entry, id });
        return id;
      },
      revert: (id) => {
        const revertId = newId("r");
        dispatch({ type: "revert", id, revertId });
        return revertId;
      },
    }),
    [state, signedIn],
  );
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCockpit(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useCockpit outside CockpitProvider");
  return s;
}
