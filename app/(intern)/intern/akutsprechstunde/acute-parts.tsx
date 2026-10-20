// Shared parts of the Akutsprechstunde pages (Phase 09.5E). Status always in words; every time
// shown comes from the cockpit database (a physician entered it) — never a suggested practice fact.

import type { AcuteBaselineStatus, AcuteSlot, SlotCheck } from "@/domain/acute";
import { WEEKDAY_NAME } from "@/domain/acute";
import { formatGermanDate } from "@/domain/time";

export const slotLine = (s: AcuteSlot) => `${WEEKDAY_NAME[s.weekday]} ${s.start}–${s.end} Uhr`;

export function SlotList({ slots, label }: { slots: AcuteSlot[]; label: string }) {
  if (!slots.length) return <p className="cp-muted">Keine regelmäßige Akutsprechstunde eingetragen.</p>;
  return (
    <ul className="cp-hours" aria-label={label}>
      {slots.map((s) => (
        <li key={`${s.weekday}-${s.start}`}>{slotLine(s)}</li>
      ))}
    </ul>
  );
}

/** "Ärztlich bestätigt von … am …" — from the stored provenance of the ACUTE type. */
export function ConfirmedBy({ status }: { status: AcuteBaselineStatus }) {
  const v = status.type?.verification;
  if (!v || v.status !== "VERIFIED_CURRENT" || !v.lastVerified) return null;
  return (
    <p className="cp-source">
      Ärztlich bestätigt{v.verifiedBy ? ` von ${v.verifiedBy.split(",")[0]}` : ""} am {formatGermanDate(v.lastVerified)}
      {v.reviewDue ? ` · erneut prüfen bis ${formatGermanDate(v.reviewDue)}` : ""}
    </p>
  );
}

const STATUS_WORD: Record<string, string> = {
  ACUTE_CONSULTATION: "Akutsprechstunde",
  OPEN: "geöffnet",
  CLOSING_SOON: "geöffnet",
  SPECIAL_HOURS: "geänderte Sprechzeit",
  CLOSED: "geschlossen",
  OPENING_SOON: "geschlossen",
  VACATION: "Urlaub",
  TEMPORARILY_CLOSED: "geschlossen",
  UNKNOWN: "nicht sicher bestimmbar",
};
export const statusWord = (s: string) => STATUS_WORD[s] ?? s;

/** Engine checks of the proposed baseline: next ordinary occurrence of each slot, before / during / after. */
export function SlotChecks({ checks }: { checks: SlotCheck[] }) {
  return (
    <ul className="cp-moments" aria-label="Prüfung mit der Statuslogik">
      {checks.map((c) => (
        <li key={`${c.slot.weekday}-${c.slot.start}`} className="cp-moment">
          <h3 className="cp-h3">{slotLine(c.slot)}</h3>
          {c.date ? (
            <>
              <p className="cp-muted">Geprüft am {formatGermanDate(c.date)}</p>
              <dl className="cp-acute-points">
                {c.points.map((p) => (
                  <div key={p.label}>
                    <dt>
                      {p.label} ({p.time} Uhr)
                    </dt>
                    <dd>{statusWord(p.status)}</dd>
                  </div>
                ))}
              </dl>
              <p className={c.ok ? "cp-ok" : "cp-field-error"}>{c.ok ? "Während der Zeit: Akutsprechstunde" : "Keine Akutsprechstunde während der Zeit"}</p>
            </>
          ) : (
            <p className="cp-muted">In den nächsten 28 Tagen ohne regulären Termin (Schließung oder geänderte Sprechzeit) – nicht geprüft.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
