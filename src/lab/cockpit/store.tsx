"use client";

// In-memory prototype state. Nothing is persisted: a reload or "Prototyp zurücksetzen"
// returns to the same starting situation for the next usability session.

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { initialState, readSession, writeSession, type CockpitData, type CockpitState, type Role } from "./model";
import { reducer, type ChangeInput } from "./state";

export { canUndo, type UndoCheck } from "./state";

interface Store {
  state: CockpitState;
  /** null = not yet read from the prototype session (first client render). */
  signedIn: boolean | null;
  signIn: (r: Role) => void;
  signOut: () => void;
  setRole: (r: Role) => void;
  /** Lab-only test clock. */
  setClock: (date: string, time: string) => void;
  reset: () => void;
  /** Returns the id of the new audit entry. */
  apply: (next: CockpitData, entry: ChangeInput) => string;
  revert: (id: string) => string;
  /** Lab scenario: publish "earlier" as another mock person. */
  seed: (next: CockpitData, entry: ChangeInput, actorRole: Role, time: string) => string;
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
      setClock: (date, time) => dispatch({ type: "clock", date, time }),
      apply: (next, entry) => {
        const id = newId("c");
        dispatch({ type: "apply", next, entry, id });
        return id;
      },
      seed: (next, entry, actorRole, time) => {
        const id = newId("s");
        dispatch({ type: "seed", next, entry, id, actorRole, time });
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

/** Current prototype time (Europe/Berlin wall clock of the lab test clock). */
export function useClock(): { today: string; now: string } {
  const { state } = useCockpit();
  return { today: state.clock.date, now: state.clock.time };
}
