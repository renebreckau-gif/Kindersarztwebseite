// 09.5E — PRAXIS PULS mapping: consultation labels come from the SAME source the engine evaluated
// (static snapshot publicly; the database in the cockpit preview). Acute wording is data-driven.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePuls } from "../puls.ts";
import { staticPulsData } from "../../data/static-repository.ts";
import { zonedToInstant } from "../../domain/time.ts";
import type { PulsData } from "../../domain/practice-status.ts";

const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const DAY = "2026-10-21"; // Wednesday
const db = (): PulsData => ({
  schedule: {
    rules: [
      { id: "w-1", weekday: 3, start: "08:00", end: "10:00", consultationType: "HEALTHY_ONLY", verification: V },
      { id: "w-2", weekday: 3, start: "10:00", end: "12:00", consultationType: "GENERAL", verification: V },
      { id: "w-acute", weekday: 3, start: "10:30", end: "11:00", consultationType: "ACUTE", verification: V },
    ],
    confirmedClosedWeekdays: [],
    verification: V,
  },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde", verification: V },
    { code: "HEALTHY_ONLY", label: "Nur Vorsorge (Testdaten)", verification: V },
    { code: "ACUTE", label: "Akutsprechstunde (Testdaten)", verification: V },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
});

test("F: labels come from source.consultationTypes, not the static constant", () => {
  const p = resolvePuls({}, zonedToInstant(DAY, "09:00"), db());
  assert.match(p.view.reason ?? "", /Jetzt bis 10:00 Uhr: Nur Vorsorge \(Testdaten\)/);
  assert.match(p.view.reason ?? "", /Akutsprechstunde \(Testdaten\) heute 10:30–11:00 Uhr/, "later acute interval worded from the data");
});

test("during the acute interval the headline carries it; no duplicate type line", () => {
  const p = resolvePuls({}, zonedToInstant(DAY, "10:40"), db());
  assert.equal(p.result.status, "ACUTE_CONSULTATION");
  assert.equal(p.view.headline, "Akutsprechstunde");
  assert.equal(p.view.reason, undefined);
});

test("public static source is visually unchanged: same output, static labels, no acute wording", () => {
  for (const time of ["08:30", "10:30", "15:00"]) {
    const now = zonedToInstant(DAY, time);
    const a = resolvePuls({}, now);
    assert.deepEqual(a, resolvePuls({}, now, staticPulsData()));
    assert.doesNotMatch(JSON.stringify(a.view), /Akut/);
  }
  assert.match(resolvePuls({}, zonedToInstant(DAY, "08:30")).view.reason ?? "", /Jetzt bis 10:00 Uhr: Bitte nur gesunde Kinder/);
});
