// Phase 09.5E — Akutsprechstunde workflows (pure): physician baseline draft and the today override.
// SYNTHETIC DATA ONLY — no acute times of the practice exist; nothing here is a practice fact.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, OpeningHourException, OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { ACUTE_TODAY_MARKER } from "../../domain/acute.ts";
import { ACUTE_ENDED_TEXT, SPECIAL_EXISTS_TEXT, acuteBaselineDraft, acuteTodayDraft, todayPoints } from "../workflows/acute.ts";
import { acuteBaselineQuery, acuteTodayQuery, fromSearch, parseAcuteBaseline, parseAcuteToday } from "../workflows/form.ts";
import { SAME_DAY_PRIORITY } from "../workflows/today.ts";
import type { Draft, ReadyDraft } from "../workflows/types.ts";
import { describeEvent, describeGroup } from "../history.ts";
import { reviewItems } from "../read-model.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const r = (id: string, d: number, start: string, end: string, type: OpeningHoursRule["consultationType"] = "GENERAL", verification = V): OpeningHoursRule => ({ id, weekday: d as 1, start, end, consultationType: type, verification });
const TODAY = "2026-10-21"; // Wednesday
const THU = "2026-10-22";
/** Every weekday: HEALTHY_ONLY 08–10, GENERAL 10–12, APPOINTMENT 14–16; recurring acute only on Wednesday 10:00–11:00. */
const data = (over: Partial<PulsData> = {}, acuteVerification = V, typeVerification = V): PulsData => ({
  schedule: {
    rules: [1, 2, 3, 4, 5].flatMap((d) => [r(`h${d}`, d, "08:00", "10:00", "HEALTHY_ONLY"), r(`g${d}`, d, "10:00", "12:00"), r(`a${d}`, d, "14:00", "16:00", "APPOINTMENT")]).concat(r("akut-mi", 3, "10:00", "11:00", "ACUTE", acuteVerification)),
    confirmedClosedWeekdays: [6, 7],
    verification: V,
  },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde", verification: V },
    { code: "ACUTE", label: "Akutsprechstunde", verification: typeVerification },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  ...over,
});
const at = (t: string, day = TODAY) => zonedToInstant(day, t);
const ready = (d: Draft): ReadyDraft => {
  assert.equal(d.ok, true, d.ok ? "" : d.blocked.message);
  return d as ReadyDraft;
};
const blocked = (d: Draft, code: string, text?: RegExp | string) => {
  assert.equal(d.ok, false, "expected a block");
  if (d.ok) return;
  assert.equal(d.blocked.code, code, d.blocked.message);
  if (typeof text === "string") assert.equal(d.blocked.message, text);
  else if (text) assert.match(d.blocked.message, text);
};
const intervals = (d: ReadyDraft) => (d.record.value as OpeningHourException).intervals.map((i) => `${i.start}-${i.end} ${i.consultationType}`);

describe("today: no READY physician baseline → every operational role is blocked", () => {
  test("missing / unconfirmed baseline", () => {
    for (const d of [data({ consultationTypes: [] }), data({}, OPEN), data({}, V, OPEN)]) blocked(acuteTodayDraft(d, at("09:00"), { mode: "CHANGE", start: "10:00", end: "10:30" }, "fp"), "BASELINE_NOT_READY", /noch nicht ärztlich bestätigt/);
  });
});

describe("today: change / cancel / add on a READY baseline", () => {
  test("change the recurring slot: NEW record with the COMPLETE day, marker, same-day priority", () => {
    const d = ready(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "10:30", end: "11:30" }, "fp"));
    assert.equal(d.mode, "NEW");
    const rec = d.record.value as OpeningHourException;
    assert.deepEqual([rec.id, rec.kind, rec.startDate, rec.endDate, rec.reason, rec.priority], [`akut-heute-${TODAY}`, "SPECIAL_HOURS", TODAY, TODAY, ACUTE_TODAY_MARKER, SAME_DAY_PRIORITY]);
    assert.deepEqual(intervals(d), ["08:00-10:00 HEALTHY_ONLY", "10:00-10:30 GENERAL", "10:30-11:30 ACUTE", "11:30-12:00 GENERAL", "14:00-16:00 APPOINTMENT"]);
    assert.equal(d.actionLabel, "Akutsprechstunde heute 10:30–11:30 Uhr");
    assert.match(d.effect, /Regulär: 10:00–11:00 Uhr/);
    assert.equal(d.after.status, "SPECIAL_HOURS");
  });
  test("crossing a consultation-type boundary keeps both types", () => {
    const d = ready(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "09:30", end: "10:30" }, "fp"));
    assert.deepEqual(intervals(d).slice(0, 3), ["08:00-09:30 HEALTHY_ONLY", "09:30-10:30 ACUTE", "10:30-12:00 GENERAL"]);
  });
  test("cancel: only the non-ACUTE day remains (practice stays open)", () => {
    const d = ready(acuteTodayDraft(data(), at("09:00"), { mode: "CANCEL" }, "fp"));
    assert.deepEqual(intervals(d), ["08:00-10:00 HEALTHY_ONLY", "10:00-12:00 GENERAL", "14:00-16:00 APPOINTMENT"]);
    assert.equal(d.actionLabel, "Akutsprechstunde heute entfallen lassen");
    const p = todayPoints(data(), d);
    assert.equal(p.find((x) => x.label === "während")!.before.status, "ACUTE_CONSULTATION");
    assert.equal(p.find((x) => x.label === "während")!.after.status, "SPECIAL_HOURS");
  });
  test("add a one-day acute on a day without recurring acute", () => {
    const d = ready(acuteTodayDraft(data(), at("09:00", THU), { mode: "CHANGE", start: "10:00", end: "10:45" }, "fp"));
    assert.equal(d.actionLabel, "Akutsprechstunde heute eintragen: 10:00–10:45 Uhr");
    const p = todayPoints(data(), d);
    assert.deepEqual(p.map((x) => [x.label, x.after.status]), [["vor der Akutsprechstunde", "SPECIAL_HOURS"], ["während", "ACUTE_CONSULTATION"], ["danach", "SPECIAL_HOURS"]]);
    blocked(acuteTodayDraft(data(), at("09:00", THU), { mode: "CANCEL" }, "fp"), "NO_CHANGE", /keine Akutsprechstunde eingetragen/);
  });
  test("a currently active interval may be changed (start already passed)", () => {
    ready(acuteTodayDraft(data(), at("10:30"), { mode: "CHANGE", start: "10:00", end: "11:30" }, "fp"));
    ready(acuteTodayDraft(data(), at("10:30"), { mode: "CANCEL" }, "fp"));
  });
  test("fully past interval → rejected; cancel after the end → already finished", () => {
    blocked(acuteTodayDraft(data(), at("11:30"), { mode: "CHANGE", start: "10:00", end: "11:00" }, "fp"), "TIME_NOT_AFTER_NOW", /bereits vorbei/);
    blocked(acuteTodayDraft(data(), at("11:30"), { mode: "CANCEL" }, "fp"), "TIME_NOT_AFTER_NOW", ACUTE_ENDED_TEXT);
  });
  test("outside regular hours, invalid times, unchanged → rejected", () => {
    blocked(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "11:30", end: "13:00" }, "fp"), "INVALID_INPUT", /vollständig innerhalb der heutigen Sprechzeit/);
    blocked(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "10", end: "11:00" }, "fp"), "INVALID_INPUT");
    blocked(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "11:00", end: "10:00" }, "fp"), "INVALID_INPUT", /nach dem Beginn/);
    blocked(acuteTodayDraft(data(), at("09:00"), { mode: "CHANGE", start: "10:00", end: "11:00" }, "fp"), "NO_CHANGE", /gilt heute bereits/);
  });
  test("closure today → rejected with the closure explained", () => {
    const c: Closure = { id: "u", kind: "VACATION", startDate: TODAY, endDate: "2026-10-23", replacements: [], verification: V };
    blocked(acuteTodayDraft(data({ closures: [c] }), at("09:00"), { mode: "CANCEL" }, "fp"), "CLOSURE_EXISTS", /Schließung eingetragen/);
  });
  test("unsafe / unknown day (unconfirmed holiday) → rejected with the real reason", () => {
    blocked(acuteTodayDraft(data({ publicHolidays: [TODAY] }), at("09:00"), { mode: "CANCEL" }, "fp"), "DAY_UNKNOWN", /Feiertag/);
  });
});

describe("today: other special hours of the day are never merged or superseded", () => {
  const ex = (id: string, extra: Partial<OpeningHourException>): OpeningHourException => ({ id, kind: "SPECIAL_HOURS", startDate: TODAY, endDate: TODAY, intervals: [{ start: "08:00", end: "11:00", consultationType: "GENERAL" }], priority: 100, verification: V, ...extra });
  test("A: an existing acute-today record of this workflow → EDIT the same record", () => {
    const own = ex(`akut-heute-${TODAY}`, { reason: ACUTE_TODAY_MARKER, intervals: [{ start: "08:00", end: "10:00", consultationType: "HEALTHY_ONLY" }, { start: "10:00", end: "12:00", consultationType: "GENERAL" }, { start: "14:00", end: "16:00", consultationType: "APPOINTMENT" }] });
    const d = ready(acuteTodayDraft(data({ exceptions: [own] }), at("09:00"), { mode: "CHANGE", start: "10:00", end: "11:00" }, "fp"));
    assert.equal(d.mode, "EDIT");
    assert.equal(d.record.value.id, own.id);
    blocked(acuteTodayDraft(data({ exceptions: [own] }), at("09:00"), { mode: "CANCEL" }, "fp"), "NO_CHANGE");
  });
  test("B / C: earlier close or any unrelated same-day special hours → blocked", () => {
    for (const other of [ex(`heute-frueher-${TODAY}`, {}), ex("x", { reason: "Sonstiges", intervals: [{ start: "09:00", end: "12:00", consultationType: "GENERAL" }] })]) {
      blocked(acuteTodayDraft(data({ exceptions: [other] }), at("09:00"), { mode: "CANCEL" }, "fp"), "SPECIAL_HOURS_EXISTS", SPECIAL_EXISTS_TEXT);
    }
  });
  test("D: a multi-day special hours entry → blocked; a CLOSED exception → blocked", () => {
    blocked(acuteTodayDraft(data({ exceptions: [ex("multi", { startDate: "2026-10-19", endDate: "2026-10-23", priority: 10 })] }), at("09:00"), { mode: "CANCEL" }, "fp"), "SPECIAL_HOURS_EXISTS", SPECIAL_EXISTS_TEXT);
    blocked(acuteTodayDraft(data({ exceptions: [ex("zu", { kind: "CLOSED", intervals: [] })] }), at("09:00"), { mode: "CANCEL" }, "fp"), "CLOSURE_EXISTS");
  });
});

describe("baseline draft (physician)", () => {
  const rows = (...x: [string, string, string][]) => x.map(([weekday, start, end]) => ({ weekday, start, end }));
  const base = data({ consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }] });
  const noAcute: PulsData = { ...base, schedule: { ...base.schedule!, rules: base.schedule!.rules.filter((x) => x.consultationType !== "ACUTE") } };
  test("first confirmation: proposal checked by the engine for every slot", () => {
    const d = acuteBaselineDraft(noAcute, at("09:00"), { confirmed: false, rows: rows(["1", "10:00", "11:00"], ["3", "09:30", "10:30"]) }, "fp");
    assert.ok(d.ok, d.ok ? "" : d.message);
    if (!d.ok) return;
    assert.equal(d.first, true);
    assert.equal(d.actionLabel, "Akutsprechstunde ärztlich bestätigen");
    assert.ok(d.checks.every((c) => c.ok && c.points[1].status === "ACUTE_CONSULTATION"));
    assert.ok(noAcute.schedule!.rules.every((x) => d.proposed.schedule!.rules.includes(x)), "non-ACUTE rules untouched");
  });
  test("later change and re-confirmation", () => {
    const d1 = acuteBaselineDraft(data(), at("09:00"), { confirmed: true, rows: rows(["3", "10:30", "11:30"]) }, "fp");
    assert.ok(d1.ok && !d1.first && d1.actionLabel === "Regelmäßige Akutsprechstunde ändern");
    const d2 = acuteBaselineDraft(data(), at("09:00"), { confirmed: true, rows: rows(["3", "10:00", "11:00"]) }, "fp");
    assert.ok(d2.ok && d2.actionLabel === "Akutsprechstunde erneut ärztlich bestätigen");
  });
  test("no rows, problems, unconfirmed regular hours → blocked", () => {
    const empty = acuteBaselineDraft(noAcute, at("09:00"), { confirmed: true, rows: [] }, "fp");
    assert.ok(!empty.ok && /mindestens eine/.test(empty.message));
    const outside = acuteBaselineDraft(noAcute, at("09:00"), { confirmed: true, rows: rows(["1", "11:30", "13:00"]) }, "fp");
    assert.ok(!outside.ok && outside.problems[0].message === "Die Akutsprechstunde muss vollständig innerhalb der bestätigten Sprechzeit liegen.");
    const unconfirmed = acuteBaselineDraft({ ...noAcute, schedule: { ...noAcute.schedule!, verification: OPEN } }, at("09:00"), { confirmed: true, rows: rows(["1", "10:00", "11:00"]) }, "fp");
    assert.ok(!unconfirmed.ok && /regulären Sprechzeiten/.test(unconfirmed.message));
  });
});

describe("forms, history wording, Prüfen", () => {
  test("parse / query round trips; browser cannot set a marker, role or date", () => {
    const b = parseAcuteBaseline(fromSearch({ z0_tag: "1", z0_von: "10:00", z0_bis: "11:00", z3_tag: "", bestaetigt: "1", rolle: "DOCTOR", verifiedBy: "x" }));
    assert.deepEqual(b, { confirmed: true, rows: [{ weekday: "1", start: "10:00", end: "11:00" }, { weekday: "", start: "", end: "" }] });
    assert.equal(acuteBaselineQuery(b), "z0_tag=1&z0_von=10%3A00&z0_bis=11%3A00&z1_tag=&z1_von=&z1_bis=");
    assert.deepEqual(parseAcuteToday(fromSearch({ modus: "aendern", von: "10:00", bis: "11:00", grund: ACUTE_TODAY_MARKER })), { mode: "CHANGE", start: "10:00", end: "11:00" });
    assert.deepEqual(parseAcuteToday(fromSearch({ modus: "entfaellt" })), { mode: "CANCEL" });
    assert.equal(acuteTodayQuery({ mode: "CHANGE", start: "10:00", end: "11:00" }), "modus=aendern&von=10%3A00&bis=11%3A00");
  });
  test("history: human wording, never the internal marker", () => {
    const ev = (next: unknown, operation = "CREATE") => ({ eventId: "e", at: "2026-10-21T08:00:00Z", actorId: "1", actorName: "T", actorRole: "STAFF", entityType: "openingHourExceptions" as const, entityId: "akut", operation: operation as "CREATE", previous: null, next });
    const changed = { kind: "SPECIAL_HOURS", startDate: TODAY, endDate: TODAY, reason: ACUTE_TODAY_MARKER, intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }, { start: "10:00", end: "11:00", consultationType: "ACUTE" }] };
    assert.equal(describeEvent(ev(changed), TODAY), "Akutsprechstunde heute 10:00–11:00 Uhr geändert");
    assert.equal(describeEvent(ev({ ...changed, intervals: changed.intervals.slice(0, 1) }), TODAY), "Akutsprechstunde heute entfällt");
    assert.equal(describeGroup([ev({ ...changed, recordState: "RETIRED" }, "REVERT")], TODAY), "Änderung an der Akutsprechstunde zurückgenommen");
    assert.doesNotMatch(describeEvent(ev(changed), TODAY), new RegExp(ACUTE_TODAY_MARKER));
  });
  test("Prüfen: nothing merely because no baseline exists; expired / invalid acute data is actionable", () => {
    const none = data({ consultationTypes: [] });
    const noRules: PulsData = { ...none, schedule: { ...none.schedule!, rules: none.schedule!.rules.filter((x) => x.consultationType !== "ACUTE") } };
    assert.deepEqual(reviewItems(noRules, TODAY).filter((i) => i.id.startsWith("acute")), []);
    const expired = { ...V, lastVerified: "2025-01-01", reviewDue: "2025-06-01" };
    assert.deepEqual(reviewItems(data({}, V, expired), TODAY).map((i) => i.id).filter((id) => id.startsWith("acute")), ["acute-review-expired"]);
    const outside: PulsData = { ...data(), schedule: { ...data().schedule!, rules: [...noRules.schedule!.rules, r("bad", 3, "12:30", "13:00", "ACUTE")] } };
    assert.deepEqual(reviewItems(outside, TODAY).map((i) => i.id).filter((id) => id.startsWith("acute")), ["acute-invalid"]);
  });
});
