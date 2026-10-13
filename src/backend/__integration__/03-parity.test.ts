// Step 3 of the clean-database proof: STATIC → PostgreSQL → PayloadPracticeRepository parity.
// Persists the current static Praxis-Puls dataset (and an artificial dataset with special hours,
// vacation, replacements) through the defined mapping, reads it back through the repository and
// compares domain data and engine results. Drops and re-migrates the test database per dataset.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Payload } from "payload";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { initialState, pulsDataOf } from "../../lab/cockpit/model.ts";
import { SCENARIOS } from "../../lab/cockpit/scenarios.ts";
import { skipDb, testPayload } from "./helpers.ts";

let payload: Payload;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const at = (date: string, time: string) => zonedToInstant(date, time);

/** Trusted seed path: documented provenance is stored unchanged (no account, Local API only). */
async function persist(data: PulsData) {
  await payload.db.migrateFresh({ forceAcceptWarning: true });
  const docs = docsFromPulsData(data);
  if (docs.schedule) await payload.create({ collection: "weeklySchedules", data: docs.schedule, ...seed });
  for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
  for (const p of docs.replacementPractices) await payload.create({ collection: "replacementPractices", data: p, ...seed });
  for (const x of docs.exceptions) await payload.create({ collection: "openingHourExceptions", data: x, ...seed });
  for (const c of docs.closures) await payload.create({ collection: "closures", data: c, ...seed });
  await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
  return new PayloadPracticeRepository(payload as unknown as PayloadReader).getPulsData();
}

// Representative Europe/Berlin instants (2026-10-13 is a Tuesday; DST ends 2026-10-25, starts 2027-03-28).
const CASES: [string, string, string][] = [
  ["Werktag vor Öffnung", "2026-10-13", "07:30"],
  ["Vormittagssprechzeit", "2026-10-13", "09:30"],
  ["Mittagspause", "2026-10-13", "12:45"],
  ["Nachmittagssprechzeit", "2026-10-13", "15:00"],
  ["nach Praxisschluss", "2026-10-13", "19:00"],
  ["Samstag", "2026-10-17", "10:00"],
  ["Sonntag", "2026-10-18", "10:00"],
  ["ungeklärter Feiertag an einem Werktag", "2026-12-25", "10:00"],
  ["Sonderzeit", "2026-10-14", "10:00"],
  ["Sonderzeit (entfallene Nachmittagszeit)", "2026-10-14", "15:00"],
  ["ausdrückliche Schließung / Urlaub", "2026-10-21", "10:00"],
  ["Vertretungsfall", "2026-10-22", "09:00"],
  ["Ablaufgrenze: letzter Urlaubstag 23:59", "2026-10-23", "23:59"],
  ["Ablaufgrenze: erster Werktag danach", "2026-10-26", "09:00"],
  ["Sommerzeit-Ende (Sonntag 02:30)", "2026-10-25", "02:30"],
  ["Montag nach Zeitumstellung", "2026-10-26", "08:00"],
  ["Montag nach Zeitumstellung Frühjahr", "2027-03-29", "08:30"],
];

function compare(source: PulsData, fromDb: PulsData, label: string): Set<string> {
  assert.deepEqual(fromDb, source, `${label}: domain data equality`);
  const statuses = new Set<string>();
  for (const [name, date, time] of CASES) {
    const a = getPracticeStatus(at(date, time), source);
    const b = getPracticeStatus(at(date, time), fromDb);
    assert.deepEqual(b, a, `${label}: ${name}`);
    statuses.add(a.status);
  }
  // plus every full hour over four weeks
  for (let d = 0; d < 28; d++) {
    for (let h = 0; h < 24; h++) {
      const i = at(addDays("2026-10-12", d), `${String(h).padStart(2, "0")}:00`);
      assert.deepEqual(getPracticeStatus(i, fromDb), getPracticeStatus(i, source), `${label}: ${i.toISOString()}`);
    }
  }
  return statuses;
}

describe("parity: static → PostgreSQL → PayloadPracticeRepository", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
  });
  after(async () => {
    await payload?.destroy();
  });

  test("current static site data: identical PulsData and identical engine results", async () => {
    const statuses = compare(PULS_DATA, await persist(PULS_DATA), "static");
    assert.ok(statuses.has("UNKNOWN"), "unresolved weekday holiday stays UNKNOWN (fail-safe)");
    assert.ok(statuses.has("CLOSED"));
    assert.ok([...statuses].some((s) => ["OPEN", "CLOSING_SOON", "OPENING_SOON", "ACUTE_CONSULTATION"].includes(s)), "an opening case is covered");
  });

  test("artificial dataset (special hours, vacation with replacement, expiry): identical results", async () => {
    let d = initialState().data;
    for (const s of SCENARIOS.filter((x) => x.key !== "D")) d = s.build(d, "2026-10-13").next;
    const source = pulsDataOf(d);
    const fromDb = await persist(source);
    const statuses = compare(source, fromDb, "artificial");
    for (const expected of ["SPECIAL_HOURS", "VACATION", "CLOSED"]) assert.ok(statuses.has(expected), expected);
    const vacation = getPracticeStatus(at("2026-10-22", "09:00"), fromDb);
    assert.ok(vacation.replacementPractices.length > 0, "replacement practice resolved from the database");
    assert.notEqual(getPracticeStatus(at("2026-10-26", "09:00"), fromDb).status, "VACATION", "vacation expired after its end date");
  });
});
