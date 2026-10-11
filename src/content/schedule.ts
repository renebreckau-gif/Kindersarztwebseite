// Weekly schedule and PRAXIS PULS data (F35–F49).
// Hours: VERIFIED_CURRENT as working data (S01, 2026-05-18; LB-00 sign-off 2026-10-07).
// Weekend (F40): regularly closed Saturday and Sunday — confirmed by the practice
// (Nadine Probst, 2026-10-11), encoded as confirmedClosedWeekdays [6, 7]. Announced
// weekend openings still win via verified exceptions (precedence: closures → exceptions
// → holidays → weekly rules). Holidays (F49) and acute consultation (F44–F46) remain
// TO_BE_CONFIRMED — NOT encoded, so those resolve to UNKNOWN.

import type { ConsultationType, ConsultationTypeCode, IsoWeekday, OpeningHoursRule } from "../domain/index.ts";
import type { PulsData } from "../domain/practice-status.ts";
import { WORKING, UNCONFIRMED } from "./practice.ts";

const r = (id: string, weekday: IsoWeekday, start: string, end: string, consultationType: ConsultationTypeCode = "GENERAL"): OpeningHoursRule => ({
  id,
  weekday,
  start,
  end,
  consultationType,
  verification: WORKING,
});

// F35–F39 opening hours; F41 Tue–Fri 08–10 "bitte nur gesunde Patienten"; F43 Tue 14–16 "nur Terminsprechstunde".
export const RULES: OpeningHoursRule[] = [
  r("mo-1", 1, "08:00", "11:00"),
  r("mo-2", 1, "14:00", "17:00"),
  r("di-1", 2, "08:00", "10:00", "HEALTHY_ONLY"),
  r("di-2", 2, "10:00", "11:00"),
  r("di-3", 2, "14:00", "16:00", "APPOINTMENT"),
  r("mi-1", 3, "08:00", "10:00", "HEALTHY_ONLY"),
  r("mi-2", 3, "10:00", "12:00"),
  r("do-1", 4, "08:00", "10:00", "HEALTHY_ONLY"),
  r("do-2", 4, "10:00", "11:00"),
  r("do-3", 4, "14:00", "17:00"),
  r("fr-1", 5, "08:00", "10:00", "HEALTHY_ONLY"),
  r("fr-2", 5, "10:00", "12:00"),
];

/**
 * Consultation types. HEALTHY_ONLY uses the fallback wording because its meaning (F42)
 * is unconfirmed (data-confidence-behavior §3). ACUTE is deliberately absent (F44–F46).
 */
export const CONSULTATION_TYPES: ConsultationType[] = [
  { code: "GENERAL", label: "Sprechstunde", verification: WORKING },
  { code: "HEALTHY_ONLY", label: "Bitte nur gesunde Kinder", verification: WORKING },
  { code: "APPOINTMENT", label: "Nur Terminsprechstunde", verification: WORKING },
];
export const ACUTE_STATUS = UNCONFIRMED;

/** Public holidays Sachsen-Anhalt (official calendar). Policy unconfirmed (F49) → these days resolve to UNKNOWN. */
export const PUBLIC_HOLIDAYS_ST = [
  "2026-10-31", "2026-12-25", "2026-12-26",
  "2027-01-01", "2027-01-06", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-06",
  "2027-05-17", "2027-10-03", "2027-10-31", "2027-12-25", "2027-12-26",
];

export const PULS_DATA: PulsData = {
  // F40: Saturday (6) and Sunday (7) regularly closed — practice confirmation 2026-10-11
  schedule: { rules: RULES, confirmedClosedWeekdays: [6, 7], verification: WORKING },
  consultationTypes: CONSULTATION_TYPES,
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: PUBLIC_HOLIDAYS_ST,
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

export const WEEKDAYS: { id: IsoWeekday; name: string; short: string }[] = [
  { id: 1, name: "Montag", short: "Mo" },
  { id: 2, name: "Dienstag", short: "Di" },
  { id: 3, name: "Mittwoch", short: "Mi" },
  { id: 4, name: "Donnerstag", short: "Do" },
  { id: 5, name: "Freitag", short: "Fr" },
];

export interface DaySlot {
  start: string;
  end: string;
  type: ConsultationTypeCode;
  label: string;
}

/** Verified weekly hours for one weekday, with consultation-type labels. */
export function slotsFor(weekday: IsoWeekday): DaySlot[] {
  return RULES.filter((x) => x.weekday === weekday && x.verification.status === "VERIFIED_CURRENT").map((x) => ({
    start: x.start,
    end: x.end,
    type: x.consultationType,
    label: CONSULTATION_TYPES.find((t) => t.code === x.consultationType)?.label ?? "",
  }));
}

/** "Di, Mi, Do, Fr 08:00–10:00" — one line per non-general consultation type, from the data. */
export function typeSummary(type: ConsultationTypeCode): string[] {
  const byTime = new Map<string, string[]>();
  for (const d of WEEKDAYS) {
    for (const x of slotsFor(d.id).filter((s) => s.type === type)) {
      const k = `${x.start}–${x.end}`;
      byTime.set(k, [...(byTime.get(k) ?? []), d.short]);
    }
  }
  return [...byTime.entries()].map(([t, days]) => `${days.join(", ")} ${t} Uhr`);
}

/** Merged opening blocks (e.g. 08:00–10:00 + 10:00–11:00 → 08:00–11:00). */
export function blocksFor(weekday: IsoWeekday): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (const s of slotsFor(weekday)) {
    const last = out.at(-1);
    if (last && last.end === s.start) last.end = s.end;
    else out.push({ start: s.start, end: s.end });
  }
  return out;
}
