// Feiertagsregel (Phase 09.5H) — physician policy draft + calendar fingerprint. Pure.
// The draft only swaps the policy in the CURRENT database data and runs the real engine on the
// upcoming holidays — no second policy simulator. Holiday dates are never touched here.

import type { PulsData } from "../../domain/practice-status.ts";
import { holidayPolicyStatus, upcomingHolidays, type HolidayPolicyMode, type UpcomingHoliday } from "../../domain/holiday-policy.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { addDays, type LocalDate } from "../../domain/time.ts";
import type { HolidayCalendarDoc } from "../../data/payload-mapping.ts";
import { recordFingerprint } from "./snapshot.ts";

export const POLICY_STALE = "Die Feiertagsangaben wurden inzwischen geändert. Bitte prüfen Sie die Regel erneut.";
export const POLICY_CHECKBOX = "Ich bestätige diese Regel für die Praxis.";
export const OVERRIDE_NOTE = "Einzelne Sonderöffnungszeiten können die allgemeine Regel für einen konkreten Feiertag überschreiben.";
export const BRIDGE_NOTE = "Brückentage sind keine Feiertage: Sie gelten als normale Werktage, solange keine Schließung oder Sonderöffnungszeit eingetragen ist.";
export const PREVIEW_HOLIDAYS = 8;

const MODES: HolidayPolicyMode[] = ["REQUIRE_EXPLICIT_ENTRY", "CLOSED_ON_PUBLIC_HOLIDAYS"];
export const parsePolicyMode = (v: unknown): HolidayPolicyMode | undefined => (MODES.includes(v as HolidayPolicyMode) ? (v as HolidayPolicyMode) : undefined);

/** Concurrency detector: policy + its verification + the holiday list (dates and names). */
export function calendarFingerprint(doc: HolidayCalendarDoc | null): string {
  const v = doc?.policyVerification;
  return recordFingerprint({
    policy: doc?.policy ?? null,
    policyVerification: v ? { status: v.status, lastVerified: v.lastVerified ?? null, reviewDue: v.reviewDue ?? null, verifiedBy: v.verifiedBy ?? null, sourceIds: (v.sourceIds ?? []).map((s) => s.sourceId) } : null,
    holidays: (doc?.holidays ?? []).map((h) => ({ date: h.date, name: h.name ?? null })),
  });
}

export const holidayNames = (doc: HolidayCalendarDoc | null): Record<string, string> =>
  Object.fromEntries((doc?.holidays ?? []).filter((h) => h.name).map((h) => [h.date, String(h.name)]));

/** Provenance the hook will generate — preview only. */
const previewVerification = (today: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: addDays(today, 182), verifiedBy: "Vorschau", sourceIds: ["PRACTICE_COCKPIT"] });

export interface PolicyDraft {
  mode: HolidayPolicyMode;
  /** First physician confirmation (audit VERIFY) vs. a change of a confirmed policy (UPDATE). */
  first: boolean;
  proposed: PulsData;
  rows: { holiday: UpcomingHoliday; after: UpcomingHoliday }[];
  actionLabel: string;
  effect: string;
}

export function policyDraft(data: PulsData, mode: HolidayPolicyMode, today: LocalDate, names: Record<string, string> = {}): PolicyDraft {
  const status = holidayPolicyStatus(data.holidayPolicy, today);
  const proposed: PulsData = { ...data, holidayPolicy: { mode, verification: previewVerification(today) } };
  const before = upcomingHolidays(data, today, names).slice(0, PREVIEW_HOLIDAYS);
  const after = upcomingHolidays(proposed, today, names).slice(0, PREVIEW_HOLIDAYS);
  return {
    mode,
    first: !status.confirmed && status.state !== "EXPIRED",
    proposed,
    rows: before.map((h, i) => ({ holiday: h, after: after[i] })),
    actionLabel: "Feiertagsregel ärztlich bestätigen",
    effect:
      mode === "CLOSED_ON_PUBLIC_HOLIDAYS"
        ? "An gesetzlichen Feiertagen ist die Praxis grundsätzlich geschlossen. Eigene Einträge für einen Feiertag gehen vor."
        : "Für jeden Feiertag ist weiterhin ein eigener Eintrag notwendig. Ohne Eintrag zeigt die Website für diesen Tag keinen festen Status.",
  };
}
