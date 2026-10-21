// Feiertagsregel (Phase 09.5H) — pure helpers. No Payload, no React, no practice decision.
//
// Two physician-confirmable choices for dates in the holiday calendar (never bridge days):
//   REQUIRE_EXPLICIT_ENTRY     "Jeder Feiertag wird einzeln geklärt" — a weekday holiday without an
//                              entry stays UNKNOWN by design (not a configuration error)
//   CLOSED_ON_PUBLIC_HOLIDAYS  "An gesetzlichen Feiertagen grundsätzlich geschlossen" — unless a more
//                              specific entry (closure, single-date exception) says otherwise
// State and resolution come from evaluateFreshness / getPracticeStatus — no second simulator.

import { getPracticeStatus, type HolidayPolicy, type PulsData } from "./practice-status.ts";
import { evaluateFreshness } from "./verification.ts";
import { addDays, compareDates, weekdayOf, zonedToInstant, type LocalDate } from "./time.ts";

export type HolidayPolicyMode = HolidayPolicy["mode"];
export const POLICY_LABEL: Record<HolidayPolicyMode, string> = {
  REQUIRE_EXPLICIT_ENTRY: "Jeder Feiertag wird einzeln geklärt",
  CLOSED_ON_PUBLIC_HOLIDAYS: "An gesetzlichen Feiertagen grundsätzlich geschlossen",
};
export const POLICY_CHOICE: Record<HolidayPolicyMode, string> = {
  REQUIRE_EXPLICIT_ENTRY: "Jeden Feiertag einzeln klären",
  CLOSED_ON_PUBLIC_HOLIDAYS: "An gesetzlichen Feiertagen grundsätzlich geschlossen",
};
/** The policy is standing opening-hours data: same freshness category as the engine uses for it. */
export const POLICY_FRESHNESS = "openingHours" as const;

export type HolidayPolicyState = "UNCONFIRMED" | "EXPLICIT_READY" | "CLOSED_READY" | "REVIEW_DUE" | "EXPIRED" | "INVALID";

export interface HolidayPolicyStatus {
  state: HolidayPolicyState;
  mode: HolidayPolicyMode;
  /** Physician-confirmed (CURRENT or REVIEW_DUE). */
  confirmed: boolean;
  verifiedBy?: string;
  lastVerified?: LocalDate;
  reviewDue?: LocalDate;
}

export function holidayPolicyStatus(policy: HolidayPolicy, today: LocalDate): HolidayPolicyStatus {
  const v = policy.verification;
  const f = evaluateFreshness(v, today, POLICY_FRESHNESS);
  const base = { mode: policy.mode, verifiedBy: v?.verifiedBy, lastVerified: v?.lastVerified, reviewDue: v?.reviewDue };
  if (f === "CURRENT") return { ...base, state: policy.mode === "CLOSED_ON_PUBLIC_HOLIDAYS" ? "CLOSED_READY" : "EXPLICIT_READY", confirmed: true };
  if (f === "REVIEW_DUE") return { ...base, state: "REVIEW_DUE", confirmed: true };
  if (f === "REVIEW_EXPIRED") return { ...base, state: "EXPIRED", confirmed: false };
  if (f === "OUTDATED") return { ...base, state: "INVALID", confirmed: false };
  return { ...base, state: "UNCONFIRMED", confirmed: false };
}

export function policyStateText(s: HolidayPolicyStatus): string {
  if (s.state === "UNCONFIRMED") return "Noch nicht ärztlich bestätigt";
  if (s.state === "EXPIRED") return "Ärztliche Bestätigung abgelaufen";
  if (s.state === "INVALID") return "Nicht mehr gültig";
  return POLICY_LABEL[s.mode];
}

// ---------------------------------------------------------------- upcoming holidays

export type HolidayResolution = "EXPLICIT_CLOSED" | "EXPLICIT_SPECIAL" | "CLOSURE" | "POLICY_CLOSED" | "REGULAR_CLOSED" | "UNRESOLVED";

export const RESOLUTION_TEXT: Record<HolidayResolution, string> = {
  EXPLICIT_CLOSED: "Geschlossen (eigener Eintrag)",
  EXPLICIT_SPECIAL: "Geänderte Sprechzeiten (eigener Eintrag)",
  CLOSURE: "Schließung eingetragen",
  POLICY_CLOSED: "Geschlossen (allgemeine Feiertagsregel)",
  REGULAR_CLOSED: "Regulär geschlossener Wochentag",
  UNRESOLVED: "Für diesen Feiertag fehlt noch ein Eintrag.",
};

export interface UpcomingHoliday {
  date: LocalDate;
  name?: string;
  resolution: HolidayResolution;
}

/** How the ENGINE resolves a holiday date (representative instant: noon). */
export function holidayResolution(data: PulsData, date: LocalDate): HolidayResolution {
  const r = getPracticeStatus(zonedToInstant(date, "12:00"), data);
  if (r.activeClosure) return "CLOSURE";
  if (r.activeException) return r.activeException.kind === "CLOSED" ? "EXPLICIT_CLOSED" : "EXPLICIT_SPECIAL";
  if (r.sourceRecordIds.includes("holiday-policy")) return "POLICY_CLOSED";
  if (r.status === "UNKNOWN") return "UNRESOLVED";
  if (data.schedule?.confirmedClosedWeekdays.includes(weekdayOf(date))) return "REGULAR_CLOSED";
  return "UNRESOLVED";
}

/** Upcoming holidays from the calendar (today … horizon), with stored names only. */
export function upcomingHolidays(data: PulsData, today: LocalDate, names: Record<string, string> = {}, days = 365): UpcomingHoliday[] {
  const until = addDays(today, days);
  return [...data.publicHolidays]
    .filter((d) => compareDates(d, today) >= 0 && compareDates(d, until) <= 0)
    .sort(compareDates)
    .map((date) => ({ date, ...(names[date] ? { name: names[date] } : {}), resolution: holidayResolution(data, date) }));
}
