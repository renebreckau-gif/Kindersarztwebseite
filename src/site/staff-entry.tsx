// Mitarbeiterbereich (/mitarbeiter): calm entry page for the practice team.
// The offered actions come from staffEntryActions() — no routing logic in the markup.

import Link from "next/link";
import s from "./staff-entry.module.css";
import { PageFrame } from "./chrome";
import { PageIntro, Section } from "./blocks";
import type { PulsView } from "@/content/puls";
import type { StaffEntryAction } from "@/content/staff-entry";

export function StaffEntry({ puls, actions, note, back }: { puls: PulsView; actions: StaffEntryAction[]; note: string | null; back: { href: string; label: string } }) {
  return (
    <PageFrame puls={puls}>
      <PageIntro variant="utility" title="Mitarbeiterbereich" lede="Interner Bereich für das Praxisteam." back={back} />
      <Section id="zugang" tone="paper">
        {note ? <p className={s.note}>{note}</p> : null}
        {actions.length ? (
          <ul className={s.actions} aria-label="Zugänge">
            {actions.map((a, i) => (
              <li key={a.id} className={s.card}>
                <h2 className={s.title}>{a.title}</h2>
                <p className={s.tag}>{a.tag}</p>
                <Link href={a.href} className={i === 0 ? s.primary : s.secondary}>
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.unavailable}>Der Mitarbeiterbereich ist derzeit nicht verfügbar.</p>
        )}
        <p className={s.foot}>Nur für Mitarbeitende der Praxis. Zugang erhalten Sie über die Verwaltung.</p>
      </Section>
    </PageFrame>
  );
}
