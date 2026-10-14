// Phase 09.5A — today workflows (pure): early close, closed today, fingerprint, input parsing,
// production staff-portal release gate. Synthetic data; no database.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Closure, OpeningHourException, OpeningHoursRule, ReplacementPractice } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { closedTodayDraft, defaultEarlyCloseTime, earlyCloseDraft, replacementOptions, SAME_DAY_PRIORITY } from "../workflows/today.ts";
import { datasetFingerprint } from "../workflows/snapshot.ts";
import { closedTodayQuery, fromSearch, parseClosedToday, parseEarlyClose } from "../workflows/form.ts";
import type { Draft, ReadyDraft } from "../workflows/types.ts";
import { RELEASE, SITE_STAGE, stageAllowsReview, staffPortalAvailable } from "../../content/release.ts";
import { staffEntryActions } from "../../content/staff-entry.ts";
import { internAvailable } from "../../backend/gate.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const TODAY = "2026-10-13"; // Tuesday
const at = (t: string) => zonedToInstant(TODAY, t);
const FP = "fp";
const ready = (d: Draft): ReadyDraft => {
  assert.equal(d.ok, true, d.ok ? "" : d.blocked.message);
  return d as ReadyDraft;
};
const blocked = (d: Draft, code: string) => {
  assert.equal(d.ok, false, "expected a block");
  if (!d.ok) assert.equal(d.blocked.code, code, d.blocked.message);
  return d;
};
const practice = (id: string, verification: FactVerification): ReplacementPractice => ({ id, practiceName: `Praxis ${id}`, contactPersons: [], street: "x", postalCode: "0", city: "x", phone: "0", verification });
const sameDay = (id: string, intervals: [string, string][], priority = 5): OpeningHourException => ({
  id,
  kind: "SPECIAL_HOURS",
  startDate: TODAY,
  endDate: TODAY,
  intervals: intervals.map(([start, end]) => ({ start, end, consultationType: "GENERAL" })),
  priority,
  verification: V,
});
const closure = (id: string, kind: Closure["kind"], from = TODAY, to = TODAY): Closure => ({ id, kind, startDate: from, endDate: to, replacements: [], verification: V });

describe("7.1 Heute früher schließen", () => {
  test("normal morning close (inside a block): later blocks removed", () => {
    const d = ready(earlyCloseDraft(DATA, at("09:30"), { time: "11:00" }, FP));
    assert.equal(d.mode, "NEW");
    assert.deepEqual(d.record.value.id, `heute-frueher-${TODAY}`);
    assert.deepEqual((d.record.value as OpeningHourException).intervals, [{ start: "08:00", end: "11:00", consultationType: "GENERAL" }]);
    assert.equal(d.actionLabel, "Heute um 11:00 Uhr schließen");
    assert.match(d.effect, /14:00–16:00 Uhr entfällt/);
    assert.match(d.after.detail, /11:00/);
    assert.equal((d.record.value as OpeningHourException).priority, SAME_DAY_PRIORITY);
  });

  test("close inside the afternoon block", () => {
    const d = ready(earlyCloseDraft(DATA, at("09:30"), { time: "15:00" }, FP));
    assert.deepEqual((d.record.value as OpeningHourException).intervals.map((i) => `${i.start}-${i.end}`), ["08:00-12:00", "14:00-15:00"]);
    assert.equal(d.actionLabel, "Heute um 15:00 Uhr schließen");
  });

  test("lunch gap: never 'close at 13:00' — the afternoon session is dropped", () => {
    const d = ready(earlyCloseDraft(DATA, at("09:30"), { time: "13:00" }, FP));
    assert.equal(d.actionLabel, "Nachmittagssprechzeit heute entfallen lassen");
    assert.match(d.effect, /Um 13:00 Uhr ist die Praxis regulär bereits geschlossen/);
    assert.deepEqual((d.record.value as OpeningHourException).intervals.map((i) => `${i.start}-${i.end}`), ["08:00-12:00"]);
  });

  test("time before/at now → no fake early close; offers 'Heute geschlossen'", () => {
    const d = blocked(earlyCloseDraft(DATA, at("09:30"), { time: "09:00" }, FP), "TIME_NOT_AFTER_NOW");
    assert.equal(!d.ok && d.blocked.suggestion?.href, "/intern/heute/geschlossen");
    blocked(earlyCloseDraft(DATA, at("09:30"), { time: "09:30" }, FP), "TIME_NOT_AFTER_NOW");
  });

  test("time at/after the regular end → no change, nothing published", () => {
    blocked(earlyCloseDraft(DATA, at("09:30"), { time: "16:00" }, FP), "NO_CHANGE");
    blocked(earlyCloseDraft(DATA, at("09:30"), { time: "18:00" }, FP), "NO_CHANGE");
  });

  test("existing same-day SPECIAL_HOURS → EDIT the same record (no duplicate), priority kept", () => {
    const data = { ...DATA, exceptions: [sameDay("heute-alt", [["08:00", "12:00"], ["14:00", "15:00"]])] };
    const d = ready(earlyCloseDraft(data, at("09:30"), { time: "11:00" }, FP));
    assert.equal(d.mode, "EDIT");
    assert.equal(d.record.value.id, "heute-alt");
    assert.equal((d.record.value as OpeningHourException).priority, 5);
    assert.equal(d.effect, "Heute ist bis 11:00 Uhr geöffnet (08:00–11:00 Uhr). Bisher eingetragen: 08:00–12:00 und 14:00–15:00 Uhr.", "edit effect relative to the current change");
    assert.equal(d.changeSet.upsertExceptions!.length, 1);
    blocked(earlyCloseDraft({ ...DATA, exceptions: [sameDay("heute-alt", [["08:00", "11:00"]])] }, at("09:30"), { time: "11:00" }, FP), "NO_CHANGE");
  });

  test("a closure covering today blocks early close (no SPECIAL_HOURS + CLOSURE conflict)", () => {
    blocked(earlyCloseDraft({ ...DATA, closures: [closure("u", "VACATION", "2026-10-12", "2026-10-16")] }, at("09:30"), { time: "11:00" }, FP), "CLOSURE_EXISTS");
  });

  test("an already UNKNOWN day blocks publication and names the reason", () => {
    const d = blocked(earlyCloseDraft({ ...DATA, publicHolidays: [TODAY] }, at("09:30"), { time: "11:00" }, FP), "DAY_UNKNOWN");
    assert.match(!d.ok ? d.blocked.message : "", /Feiertag/);
  });

  test("input validation: time format and text length (140)", () => {
    blocked(earlyCloseDraft(DATA, at("09:30"), { time: "11" }, FP), "INVALID_INPUT");
    blocked(earlyCloseDraft(DATA, at("09:30"), { time: "11:00", message: "x".repeat(141) }, FP), "INVALID_INPUT");
    const d = ready(earlyCloseDraft(DATA, at("09:30"), { time: "11:00", message: "  Heute   nur vormittags.  " }, FP));
    assert.equal((d.record.value as OpeningHourException).publicMessage, "Heute nur vormittags.");
  });

  test("default time: next half hour, only if it shortens today", () => {
    assert.equal(defaultEarlyCloseTime(DATA, at("09:10")), "09:30");
    assert.equal(defaultEarlyCloseTime(DATA, at("12:40")), "13:00");
    assert.equal(defaultEarlyCloseTime(DATA, at("15:50")), undefined);
  });
});

describe("7.2 Heute geschlossen", () => {
  const usable = practice("A", V);
  const stale = practice("B", OPEN);
  const withPractices = { ...DATA, replacementPractices: [usable, stale] };

  test("ab sofort: whole-day SHORT_NOTICE closure for today", () => {
    const d = ready(closedTodayDraft(DATA, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: [] }, FP));
    const c = d.record.value as Closure;
    assert.deepEqual([c.kind, c.startDate, c.endDate, c.id], ["SHORT_NOTICE", TODAY, TODAY, `heute-geschlossen-${TODAY}`]);
    assert.equal(d.actionLabel, "Heute geschlossen melden");
    assert.equal(d.after.activeClosure?.kind, "SHORT_NOTICE");
    assert.notEqual(d.after.indicator, "OPEN");
    assert.equal(c.publicMessage, undefined, "no public reason required");
  });

  test("ab einer Uhrzeit delegates to the early-close representation", () => {
    const d = ready(closedTodayDraft(DATA, at("09:30"), { mode: "FROM_TIME", time: "11:00", reason: "FORTBILDUNG", replacementIds: [] }, FP));
    assert.equal(d.kind, "EARLY_CLOSE");
    assert.equal(d.record.collection, "openingHourExceptions");
    assert.match((d.record.value as OpeningHourException).publicMessage ?? "", /Fortbildung/);
  });

  test("public reasons: predefined, none, custom (max 140)", () => {
    const krank = ready(closedTodayDraft(DATA, at("09:30"), { mode: "NOW", reason: "KRANKHEIT", replacementIds: [] }, FP));
    assert.equal((krank.record.value as Closure).publicMessage, "Die Praxis ist heute wegen Krankheit geschlossen.");
    const own = ready(closedTodayDraft(DATA, at("09:30"), { mode: "NOW", reason: "SONSTIGES", otherText: "Heute wegen Umbau geschlossen.", replacementIds: [] }, FP));
    assert.equal((own.record.value as Closure).publicMessage, "Heute wegen Umbau geschlossen.");
    blocked(closedTodayDraft(DATA, at("09:30"), { mode: "NOW", reason: "SONSTIGES", otherText: "x".repeat(141), replacementIds: [] }, FP), "INVALID_INPUT");
  });

  test("verified replacement selectable and shown; none → engine fallback", () => {
    const d = ready(closedTodayDraft(withPractices, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: ["A"] }, FP));
    assert.deepEqual((d.record.value as Closure).replacements, [{ replacementPracticeId: "A", from: TODAY, until: TODAY }]);
    assert.deepEqual(d.after.replacementPractices.map((p) => p.id), ["A"]);
    const none = ready(closedTodayDraft(withPractices, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: [] }, FP));
    assert.equal(none.after.replacementFallback, true);
  });

  test("unverified/stale replacement cannot be selected (offered disabled)", () => {
    blocked(closedTodayDraft(withPractices, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: ["B"] }, FP), "REPLACEMENT_NOT_USABLE");
    blocked(closedTodayDraft(withPractices, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: ["gibt-es-nicht"] }, FP), "REPLACEMENT_NOT_USABLE");
    assert.deepEqual(replacementOptions(withPractices, TODAY).map((o) => [o.id, o.usable]), [["A", true], ["B", false]]);
  });

  test("existing same closure → EDIT; a different closure → blocked (never silently overwritten)", () => {
    const own = { ...DATA, closures: [closure("heute-x", "SHORT_NOTICE")] };
    const d = ready(closedTodayDraft(own, at("09:30"), { mode: "NOW", reason: "TECHNIK", replacementIds: [] }, FP));
    assert.deepEqual([d.mode, d.record.value.id, d.actionLabel], ["EDIT", "heute-x", "Meldung für heute aktualisieren"]);
    blocked(closedTodayDraft({ ...DATA, closures: [closure("u", "VACATION", "2026-10-12", "2026-10-16")] }, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: [] }, FP), "CLOSURE_EXISTS");
  });

  test("existing special hours today → blocked (no general supersede in 09.5A)", () => {
    const d = blocked(closedTodayDraft({ ...DATA, exceptions: [sameDay("s", [["08:00", "11:00"]])] }, at("09:30"), { mode: "NOW", reason: "KEINER", replacementIds: [] }, FP), "SPECIAL_HOURS_EXISTS");
    assert.match(!d.ok ? d.blocked.message : "", /08:00–11:00/);
  });
});

describe("dataset fingerprint (concurrency detector)", () => {
  test("deterministic and independent of storage order", () => {
    const a = { ...DATA, closures: [closure("a", "VACATION", "2026-11-01", "2026-11-02"), closure("b", "TRAINING", "2026-12-01", "2026-12-01")] };
    const b = { ...a, closures: [...a.closures].reverse() };
    assert.equal(datasetFingerprint(a), datasetFingerprint(b));
    assert.match(datasetFingerprint(a), /^[0-9a-f]{64}$/);
  });
  test("any operational change changes the fingerprint", () => {
    const base = datasetFingerprint(DATA);
    assert.notEqual(datasetFingerprint({ ...DATA, closures: [closure("x", "SHORT_NOTICE")] }), base);
    assert.notEqual(datasetFingerprint({ ...DATA, exceptions: [sameDay("s", [["08:00", "11:00"]])] }), base);
  });
});

describe("input parsing: only what a person chooses", () => {
  test("date, role, provenance and change-set id from the client are never read", () => {
    const q = fromSearch({ zeit: "11:00", hinweis: "x", datum: "2030-01-01", rolle: "ADMIN", verifiedBy: "Fake", changeSetId: "evil" });
    assert.deepEqual(parseEarlyClose(q), { time: "11:00", message: "x" });
    const c = parseClosedToday(fromSearch({ modus: "sofort", grund: "HACK", vertretung: ["A", "B"], datum: "2030-01-01" }));
    assert.deepEqual(c, { mode: "NOW", time: undefined, reason: "KEINER", otherText: undefined, replacementIds: ["A", "B"] });
    assert.match(closedTodayQuery(c), /modus=sofort&grund=KEINER&vertretung=A&vertretung=B/);
  });
});

describe("production staff-portal release gate", () => {
  const off = { staffPortalProductionEnabled: false };
  const on = { staffPortalProductionEnabled: true };
  const DB = { DATABASE_URI: "postgresql://x@127.0.0.1:5433/db", PAYLOAD_SECRET: "s" };

  test("1: STAGING + backend → /intern allowed", () => assert.equal(internAvailable("STAGING", DB, off), true));
  test("2: PRODUCTION + backend + flag off → blocked", () => assert.equal(internAvailable("PRODUCTION", DB, off), false));
  test("3: PRODUCTION + backend + flag on → allowed", () => assert.equal(internAvailable("PRODUCTION", DB, on), true));
  test("4: /mitarbeiter offers the real login under exactly the same rule (never a 404 link)", () => {
    for (const stage of ["STAGING", "PRODUCTION"] as const) {
      for (const backend of [true, false]) {
        for (const release of [on, off]) {
          const offersLogin = staffEntryActions(stage, backend, release).some((a) => a.href.startsWith("/intern"));
          const gateOpen = internAvailable(stage, backend ? DB : {}, release);
          assert.equal(offersLogin, gateOpen, `${stage} backend=${backend} flag=${release.staffPortalProductionEnabled}`);
          assert.equal(staffPortalAvailable(stage, backend, release), gateOpen);
        }
      }
    }
  });
  test("5: PRODUCTION never exposes the lab prototype", () => {
    for (const backend of [true, false]) for (const release of [on, off]) assert.ok(staffEntryActions("PRODUCTION", backend, release).every((a) => !a.href.startsWith("/lab")));
  });
  test("6: /review stays production-disabled independently of the staff portal flag", () => {
    assert.equal(stageAllowsReview("PRODUCTION"), false);
    assert.equal(stageAllowsReview("STAGING"), true);
  });
  test("current decision: flag off, SITE_STAGE STAGING, gate source uses the shared decision", () => {
    assert.equal(RELEASE.staffPortalProductionEnabled, false);
    assert.equal(SITE_STAGE, "STAGING");
    const gate = readFileSync(join(import.meta.dirname, "..", "..", "backend", "gate.ts"), "utf8");
    assert.match(gate, /staffPortalAvailable\(stage, backendConfigured\(env\), release\)/);
    assert.doesNotMatch(gate.split("export const internAvailable")[1] ?? "", /stageAllowsReview/);
  });
});
