"use client";

import { useState } from "react";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Button, Choice, Glyph } from "../ui";
import { DIRECTORY_SUBTITLE, ROLES, dayMonth, directoryState, entryVerification, type CockpitData } from "../model";
import { addDays, type LocalDate } from "@/domain/time";
import type { ReplacementPractice } from "@/domain/content-types";

/** Re-confirm a stale directory entry (DOCTOR/ADMIN only; operational provenance). */
export function useConfirmReplacement() {
  const { state, apply } = useCockpit();
  const { today } = useClock();
  return (p: ReplacementPractice) => {
    const who = ROLES[state.role];
    const due = addDays(today, 182);
    const next: CockpitData = {
      ...state.data,
      directory: state.data.directory.map((x) => (x.id === p.id ? { ...x, verification: entryVerification(who.person, state.role, due, today) } : x)),
    };
    return apply(next, {
      title: "Vertretung bestätigt",
      detail: `${p.practiceName} (telefonisch)`,
      before: "Bestätigung abgelaufen",
      after: `bestätigt bis ${dayMonth(due)}`,
      undoSentence: `${p.practiceName} wäre wieder nicht auswählbar.`,
      entityIds: [p.id],
    });
  };
}

/** Stale entries: visible, never selectable; clicking explains what is needed. */
export function StaleReplacements({ until }: { until: LocalDate }) {
  const { state } = useCockpit();
  const { today } = useClock();
  const confirm = useConfirmReplacement();
  const [open, setOpen] = useState<string | null>(null);
  const stale = state.data.directory.filter((p) => !directoryState(p, until, today).usable);
  if (!stale.length) return null;
  return (
    <ul className={s.staleList}>
      {stale.map((p) => (
        <li key={p.id}>
          <button type="button" className={s.staleCard} aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
            <span className={s.choiceText}>
              <span className={s.choiceLabel}>{p.practiceName}</span>
              <span className={s.choiceNote}>{DIRECTORY_SUBTITLE[p.id]}</span>
            </span>
            <span className={s.staleBadge}>
              <Glyph name="attention" size={18} />
              Bestätigung abgelaufen
            </span>
          </button>
          {open === p.id ? (
            <div className={s.inlineBlock} role="note">
              <p className={s.inlineBlockTitle}>Diese Vertretung muss zuerst erneut bestätigt werden.</p>
              <p className={s.muted}>{directoryState(p, until, today).note}</p>
              {state.role === "STAFF" ? (
                <p>Eine Ärztin oder ein Arzt muss diese Vertretung bestätigen.</p>
              ) : (
                <>
                  <p>Bitte rufen Sie die Praxis an und klären Sie, ob die Vertretung weiter gilt.</p>
                  <Button variant="secondary" onClick={() => (confirm(p), setOpen(null))}>
                    Vertretung bestätigen
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Choice from the verified directory only (cards with city, phone and confirmation state). */
export function ReplacementPicker({ value, onChange, until, legend = "Vertretung", name, allowNone = true, error }: { value: string; onChange: (id: string) => void; until: LocalDate; legend?: string; name: string; allowNone?: boolean; error?: string }) {
  const { state } = useCockpit();
  const { today } = useClock();
  const usable = state.data.directory.filter((p) => directoryState(p, until, today).usable);
  return (
    <div className={s.stackTight}>
      <Choice
        legend={legend}
        name={name}
        value={value}
        onChange={onChange}
        error={error}
        hint="Nur bestätigte Praxen aus der Vertretungsliste (Testdaten)."
        options={[
          ...usable.map((p) => ({
            value: p.id,
            label: (
              <>
                {p.practiceName}
                <span className={s.optSub}>{DIRECTORY_SUBTITLE[p.id]}</span>
              </>
            ),
            note: (
              <>
                {p.city} · Telefon {p.phone}
                <span className={s.verified}>
                  <Glyph name="check" size={16} />
                  bestätigt
                </span>
              </>
            ),
          })),
          ...(allowNone ? [{ value: "keine", label: "Keine Vertretung", note: "Die Website zeigt dann die Notfall-Hinweise und die Telefonnummer." }] : []),
        ]}
      />
      <StaleReplacements until={until} />
    </div>
  );
}
