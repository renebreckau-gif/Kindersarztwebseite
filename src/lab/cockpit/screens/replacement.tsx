"use client";

import Link from "next/link";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { Choice } from "../ui";
import { directoryState } from "../model";
import type { LocalDate } from "@/domain/time";

/**
 * Replacement choice from the verified directory only. Stale entries are visible but cannot
 * be chosen ("Vertretung muss bestätigt werden"); only Ärztin/Arzt can re-confirm them.
 */
export function ReplacementPicker({ value, onChange, until, legend = "Vertretung", name, allowNone = true, error }: { value: string; onChange: (id: string) => void; until: LocalDate; legend?: string; name: string; allowNone?: boolean; error?: string }) {
  const { state } = useCockpit();
  const blocked = state.data.directory.filter((p) => !directoryState(p, until).usable);
  return (
    <div className={s.stackTight}>
      <Choice
        legend={legend}
        name={name}
        value={value}
        onChange={onChange}
        error={error}
        hint="Nur Praxen aus der geprüften Vertretungsliste (Testdaten)."
        options={[
          ...(allowNone ? [{ value: "keine", label: "Keine Vertretung", note: "Die Website zeigt dann die Notfall-Hinweise und die Telefonnummer." }] : []),
          ...state.data.directory.map((p) => {
            const st = directoryState(p, until);
            return {
              value: p.id,
              label: p.practiceName,
              note: st.usable ? `${p.street}, ${p.city} · ${st.note}` : st.note,
              disabled: !st.usable,
            };
          }),
        ]}
      />
      {blocked.length ? (
        <div className={s.inlineBlock} role="note">
          <p className={s.inlineBlockTitle}>Vertretung muss bestätigt werden</p>
          <p>
            {blocked.map((p) => p.practiceName).join(", ")}: Diese Vertretung wurde länger nicht geprüft und kann deshalb noch nicht veröffentlicht werden.
          </p>
          {state.role === "STAFF" ? (
            <p className={s.muted}>Bestätigen kann nur eine Ärztin oder ein Arzt der Praxis.</p>
          ) : (
            <p>
              <Link href={`/lab/praxis-cockpit/vertretung-pruefen?id=${blocked[0].id}`} className={s.textLink}>
                {blocked[0].practiceName} jetzt prüfen
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
