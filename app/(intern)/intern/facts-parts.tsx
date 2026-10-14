// Shared presentation of operational facts (Phase 09.5C): what the website would show on a day,
// and which facts differ between two states. Values come from src/cockpit/facts.ts (engine based);
// parent-facing parts show only what the public engine exposes (no internal verification data).

import type { PracticeStatusResult } from "@/domain/practice-status";
import type { DayDiff, FactRow } from "@/cockpit/facts";
import { CLOSURE_KIND_TITLE, shortRange } from "@/cockpit/workflows/wording";

/** Before → after rows, only facts that differ. */
export function ChangeRows({ rows, beforeLabel = "Bisher", afterLabel = "Neu", caption }: { rows: FactRow[]; beforeLabel?: string; afterLabel?: string; caption?: string }) {
  if (!rows.length) return null;
  return (
    <table className="cp-changes">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          <th scope="col">Angabe</th>
          <th scope="col">{beforeLabel}</th>
          <th scope="col">{afterLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.label}</th>
            <td data-label={beforeLabel}>{r.before}</td>
            <td data-label={afterLabel}>{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Undo preview: per affected day, what changes when the change is taken back. */
export function DayDiffList({ diffs }: { diffs: DayDiff[] }) {
  return (
    <section className="cp-panel" aria-labelledby="unterschiede-title">
      <h2 id="unterschiede-title" className="cp-h2">
        Was sich ändert
      </h2>
      {diffs.length ? (
        diffs.map((d) => <ChangeRows key={d.date} rows={d.rows} caption={d.label} beforeLabel="Aktuell" afterLabel="Nach dem Zurücknehmen" />)
      ) : (
        <p className="cp-muted">An den betroffenen Tagen ändert sich für die Website nichts Sichtbares.</p>
      )}
    </section>
  );
}

/** Parent-facing extras the engine exposes for a day: announcement, public message, replacements or fallback. */
export function PublicDayInfo({ result }: { result: PracticeStatusResult }) {
  const closure = result.activeClosure;
  const upcoming = !closure ? result.upcomingClosure : undefined;
  return (
    <div className="cp-public">
      {upcoming ? (
        <p className="cp-public-note">
          Hinweis für Eltern: {CLOSURE_KIND_TITLE[upcoming.kind]} {shortRange(upcoming.startDate, upcoming.endDate)} – die Praxis ist in dieser Zeit geschlossen.
        </p>
      ) : null}
      {(closure ?? upcoming)?.message ? <p className="cp-public-note">„{(closure ?? upcoming)!.message}“</p> : null}
      {closure && result.replacementPractices.length ? (
        <ul className="cp-public-list" aria-label="Vertretung">
          {result.replacementPractices.map((p) => (
            <li key={`${p.id}-${p.from}`}>
              <strong>{p.practiceName}</strong>
              <span>{p.address}</span>
              <span>Telefon {p.phone}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {closure && result.replacementFallback ? <p className="cp-public-note">Ohne Vertretung: Die Website zeigt Telefon und Notfall-Hinweise.</p> : null}
    </div>
  );
}
