// Shared parts of the "Regelmäßige Sprechzeiten" pages (Phase 09.5I). One weekday per card (never a
// wide seven-column calendar); status in words; every time shown comes from the cockpit database.

import Link from "next/link";
import type { PulsData } from "@/domain/practice-status";
import type { OpeningHoursRule } from "@/domain/content-types";
import { DAY_NAME, PLAN_STATE_TEXT, WEEKDAYS_ALL, acuteRulesOf, regularRules, regularTypeUsable, sortRules, type PlanStatus } from "@/domain/weekly-plan";
import { formatDayMonth, formatGermanDate, type LocalDate } from "@/domain/time";
import { ACUTE_SEPARATE, typeLabel } from "@/cockpit/workflows/weekly-plan";

export const ruleLine = (data: PulsData, r: OpeningHoursRule) => `${r.start}–${r.end} Uhr · ${typeLabel(data, r.consultationType)}`;

/** Status line of the weekly plan: "Ärztlich bestätigt bis …", "Bestätigung fällig", … */
export function PlanStatusLine({ status }: { status: PlanStatus }) {
  const ok = status.state === "CURRENT";
  const text = ok && status.reviewDue ? `Ärztlich bestätigt bis ${formatDayMonth(status.reviewDue, true)}` : PLAN_STATE_TEXT[status.state];
  return (
    <>
      <p className={ok ? "cp-ok cp-dir-status" : "cp-dir-status cp-dir-attention"}>{text}</p>
      {status.lastVerified && status.state !== "UNCONFIRMED" ? (
        <p className="cp-muted">
          Zuletzt ärztlich bestätigt{status.verifiedBy ? ` von ${status.verifiedBy.split(",")[0]}` : ""} am {formatDayMonth(status.lastVerified, true)}
          {status.reviewDue && !ok ? ` · erneut prüfen bis ${formatDayMonth(status.reviewDue, true)}` : ""}
        </p>
      ) : null}
    </>
  );
}

/** The stored week, read-only: seven cards; ACUTE shown as separately managed; problems in words. */
export function WeekView({ data, today }: { data: PulsData; today: LocalDate }) {
  const s = data.schedule;
  if (!s) return <p className="cp-muted">In der Cockpit-Datenbank ist kein Wochenplan hinterlegt.</p>;
  return (
    <ul className="cp-dir-list cp-week" aria-label="Regelmäßiger Wochenplan">
      {WEEKDAYS_ALL.map((wd) => {
        const rules = sortRules(regularRules(s, wd));
        const acute = sortRules(acuteRulesOf(s, wd));
        const closed = s.confirmedClosedWeekdays.includes(wd);
        return (
          <li key={wd} className="cp-panel cp-dir-card cp-week-day">
            <h3 className="cp-h3">{DAY_NAME[wd]}</h3>
            {closed && !rules.length ? <p className="cp-dir-status">Geschlossen</p> : null}
            {!closed && !rules.length ? <p className="cp-dir-status cp-dir-attention">Nicht festgelegt</p> : null}
            {closed && rules.length ? <p className="cp-dir-status cp-dir-attention">Widersprüchlich: zugleich geöffnet und geschlossen</p> : null}
            {rules.length ? (
              <ul className="cp-hours">
                {rules.map((r) => (
                  <li key={r.id}>
                    {ruleLine(data, r)}
                    {!regularTypeUsable(data.consultationTypes, r.consultationType, today) ? <span className="cp-dir-attention cp-week-flag"> Sprechstundenart nicht bestätigt</span> : null}
                    {r.publicNote ? <span className="cp-muted">{` · Hinweis: ${r.publicNote}`}</span> : null}
                    {r.validFrom || r.validUntil ? <span className="cp-muted"> · gilt {r.validFrom ? `ab ${formatGermanDate(r.validFrom)}` : ""}{r.validUntil ? ` bis ${formatGermanDate(r.validUntil)}` : ""}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {acute.length ? (
              <p className="cp-muted">{`Akutsprechstunde ${acute.map((a) => `${a.start}–${a.end}`).join(", ")} Uhr (separat verwaltet)`}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function AcuteNote({ data }: { data: PulsData }) {
  if (!data.schedule?.rules.some((r) => r.consultationType === "ACUTE") && !data.consultationTypes.some((t) => t.code === "ACUTE")) return null;
  return (
    <p className="cp-note" role="note">
      <span>{ACUTE_SEPARATE} </span>
      <Link href="/intern/akutsprechstunde" className="cp-text-link">
        Zur Akutsprechstunde
      </Link>
    </p>
  );
}
