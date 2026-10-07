// SYNTHETIC TEST DATA — NOT PRACTICE FACTS.
// Hours, names and numbers below are invented for testing the engine only and
// must never be used as content (see docs/research/fact-status-register.md).

import type { Closure, ConsultationType, OpeningHourException, OpeningHoursRule, ReplacementPractice } from "../content-types.ts";
import type { FactVerification } from "../verification.ts";
import type { PulsData } from "../practice-status.ts";

export const VERIFIED: FactVerification = {
  status: "VERIFIED_CURRENT",
  lastVerified: "2026-01-01",
  verifiedBy: "Testfall",
  reviewDue: "2027-06-30",
  sourceIds: ["test-source"],
};
export const UNCONFIRMED: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
export const OUTDATED: FactVerification = { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: [] };

export function rule(id: string, weekday: OpeningHoursRule["weekday"], start: string, end: string, extra: Partial<OpeningHoursRule> = {}): OpeningHoursRule {
  return { id, weekday, start, end, consultationType: "GENERAL", verification: VERIFIED, ...extra };
}

/** Synthetic week: Mon–Fri 08:00–12:00, Mon additionally 14:00–17:00; weekend confirmed closed. */
export function baseData(over: Partial<PulsData> = {}): PulsData {
  const rules: OpeningHoursRule[] = [
    rule("mon-am", 1, "08:00", "12:00"),
    rule("mon-pm", 1, "14:00", "17:00"),
    rule("tue-am", 2, "08:00", "12:00"),
    rule("wed-am", 3, "08:00", "12:00"),
    rule("thu-am", 4, "08:00", "12:00"),
    rule("fri-am", 5, "08:00", "12:00"),
  ];
  return {
    schedule: { rules, confirmedClosedWeekdays: [6, 7], verification: VERIFIED },
    consultationTypes: [],
    exceptions: [],
    closures: [],
    replacementPractices: [],
    publicHolidays: [],
    holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
    ...over,
  };
}

export const ACUTE_TYPE: ConsultationType = { code: "ACUTE", label: "Akutsprechstunde", verification: VERIFIED };

export function withRules(data: PulsData, extra: OpeningHoursRule[]): PulsData {
  return { ...data, schedule: { ...data.schedule!, rules: [...data.schedule!.rules, ...extra] } };
}

export function exception(id: string, startDate: string, endDate: string, extra: Partial<OpeningHourException> = {}): OpeningHourException {
  return {
    id,
    kind: "SPECIAL_HOURS",
    startDate,
    endDate,
    intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }],
    publicMessage: "Testhinweis",
    priority: 1,
    verification: VERIFIED,
    ...extra,
  };
}

export function closure(id: string, startDate: string, endDate: string, extra: Partial<Closure> = {}): Closure {
  return { id, kind: "VACATION", startDate, endDate, replacements: [], verification: VERIFIED, ...extra };
}

export function replacement(id: string, verification: FactVerification = VERIFIED): ReplacementPractice {
  return {
    id,
    practiceName: `Testpraxis ${id}`,
    contactPersons: ["Test Person"],
    street: "Teststraße 1",
    postalCode: "00000",
    city: "Teststadt",
    phone: "0000 000000",
    verification,
  };
}

/** Local Berlin wall time → instant, written out explicitly for readability of tests. */
export const at = (iso: string) => new Date(iso);
