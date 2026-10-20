// 09.5E — physician baseline (state, slot editor, proposal, 28-day engine window), collection guard
// and the today overlay. SYNTHETIC DATA ONLY — no practice acute times exist in the project.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ACUTE_TODAY_MARKER,
  OUTSIDE_MESSAGE,
  acuteBaselineStatus,
  acuteExceptionProblem,
  baselineWindowProblems,
  nonAcuteSegments,
  proposeBaseline,
  recurringAcute,
  slotChecks,
  validateSlots,
  withAcuteForDay,
  type AcuteSlot,
} from "../acute.ts";
import { getPracticeStatus, type PulsData } from "../practice-status.ts";
import { addDays, weekdayOf, zonedToInstant } from "../time.ts";
import { ACUTE_TYPE, UNCONFIRMED, VERIFIED, baseData, exception, rule, withRules } from "./fixtures.ts";

const TODAY = "2026-10-05"; // Monday
const expired = { ...VERIFIED, lastVerified: "2025-01-01", reviewDue: "2025-06-01" };
const acute = (id: string, weekday: 1 | 2 | 3 | 4 | 5, start: string, end: string, verification = VERIFIED) => rule(id, weekday, start, end, { consultationType: "ACUTE", verification });
/** Mixed types so preservation is visible: Tue HEALTHY_ONLY 08–10 + GENERAL 10–12. */
const mixed = () =>
  baseData({
    schedule: {
      rules: [rule("mon-am", 1, "08:00", "12:00"), rule("tue-1", 2, "08:00", "10:00", { consultationType: "HEALTHY_ONLY" }), rule("tue-2", 2, "10:00", "12:00"), rule("wed-am", 3, "08:00", "12:00")],
      confirmedClosedWeekdays: [4, 5, 6, 7],
      verification: VERIFIED,
    },
  });

describe("acuteBaselineStatus", () => {
  test("no ACUTE type, no rules → NOT_CONFIGURED", () => assert.equal(acuteBaselineStatus(baseData(), TODAY).state, "NOT_CONFIGURED"));
  test("unverified type → NEEDS_CONFIRMATION", () => {
    const s = acuteBaselineStatus(withRules(baseData({ consultationTypes: [{ ...ACUTE_TYPE, verification: UNCONFIRMED }] }), [acute("a", 1, "10:00", "11:00")]), TODAY);
    assert.equal(s.state, "NEEDS_CONFIRMATION");
  });
  test("verified type + no rules → not READY", () => {
    const s = acuteBaselineStatus(baseData({ consultationTypes: [ACUTE_TYPE] }), TODAY);
    assert.equal(s.state, "NEEDS_CONFIRMATION");
    assert.match(s.reasons.join(), /keine regelmäßige Akutsprechstunde/);
  });
  test("verified type + unverified rules → NEEDS_CONFIRMATION", () => {
    const s = acuteBaselineStatus(withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00", UNCONFIRMED)]), TODAY);
    assert.equal(s.state, "NEEDS_CONFIRMATION");
  });
  test("verified type + usable rules → READY", () => {
    const s = acuteBaselineStatus(withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00"), acute("b", 3, "09:00", "09:30")]), TODAY);
    assert.equal(s.state, "READY");
    assert.deepEqual(s.slots, [{ weekday: 1, start: "10:00", end: "11:00" }, { weekday: 3, start: "09:00", end: "09:30" }]);
  });
  test("rule outside regular hours → INVALID", () => {
    const s = acuteBaselineStatus(withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "11:30", "13:00")]), TODAY);
    assert.equal(s.state, "INVALID");
  });
  test("overlapping acute rules → INVALID", () => {
    assert.equal(acuteBaselineStatus(withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00"), acute("b", 1, "10:30", "11:30")]), TODAY).state, "INVALID");
  });
  test("expired verification (type or rule) → not READY", () => {
    assert.equal(acuteBaselineStatus(withRules(baseData({ consultationTypes: [{ ...ACUTE_TYPE, verification: expired }] }), [acute("a", 1, "10:00", "11:00")]), TODAY).state, "NEEDS_CONFIRMATION");
    assert.equal(acuteBaselineStatus(withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00", expired)]), TODAY).state, "NEEDS_CONFIRMATION");
  });
  test("unconfirmed regular hours → NEEDS_CONFIRMATION, never READY", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00")]);
    assert.equal(acuteBaselineStatus({ ...d, schedule: { ...d.schedule!, verification: UNCONFIRMED } }, TODAY).state, "NEEDS_CONFIRMATION");
  });
});

describe("validateSlots — the weekly slot editor", () => {
  const v = (rows: { weekday: string; start: string; end: string }[]) => validateSlots(rows, mixed(), TODAY);
  test("several slots per weekday allowed; empty rows ignored; sorted", () => {
    const r = v([
      { weekday: "2", start: "10:30", end: "11:00" },
      { weekday: "", start: "", end: "" },
      { weekday: "2", start: "09:00", end: "09:30" },
    ]);
    assert.deepEqual(r.problems, []);
    assert.deepEqual(r.slots, [{ weekday: 2, start: "09:00", end: "09:30" }, { weekday: 2, start: "10:30", end: "11:00" }]);
  });
  test("acute across a type boundary inside one opening block is valid (08–10 + 10–12)", () => assert.deepEqual(v([{ weekday: "2", start: "09:30", end: "10:30" }]).problems, []));
  test("invalid weekday, time, order, duplicate, overlap, outside", () => {
    const r = v([
      { weekday: "9", start: "10:00", end: "11:00" },
      { weekday: "1", start: "10", end: "11:00" },
      { weekday: "1", start: "11:00", end: "10:00" },
      { weekday: "1", start: "10:00", end: "11:00" },
      { weekday: "1", start: "10:00", end: "11:00" },
      { weekday: "1", start: "10:30", end: "11:30" },
      { weekday: "1", start: "11:30", end: "13:00" },
    ]);
    assert.deepEqual(r.problems.map((p) => [p.index, p.kind]), [[0, "WEEKDAY"], [1, "TIME"], [2, "ORDER"], [4, "DUPLICATE"], [5, "OVERLAP"], [6, "OUTSIDE"]]);
    assert.equal(r.problems.find((p) => p.kind === "OUTSIDE")!.message, OUTSIDE_MESSAGE);
  });
  test("ACUTE may not extend regular hours: regular 08–12, acute 10–11 valid, 11:30–13:00 invalid", () => {
    assert.deepEqual(v([{ weekday: "1", start: "10:00", end: "11:00" }]).problems, []);
    assert.equal(v([{ weekday: "1", start: "11:30", end: "13:00" }]).problems[0].message, "Die Akutsprechstunde muss vollständig innerhalb der bestätigten Sprechzeit liegen.");
    assert.equal(v([{ weekday: "4", start: "10:00", end: "11:00" }]).problems[0].kind, "OUTSIDE", "a closed weekday has no opening to fit into");
  });
});

describe("proposeBaseline — only the ACUTE subset changes", () => {
  test("non-ACUTE rules are the SAME objects (id, fields, verification); ACUTE replaced; one ACUTE type", () => {
    const base = withRules(mixed(), [acute("old-acute", 3, "09:00", "10:00", UNCONFIRMED)]);
    base.consultationTypes = [{ ...ACUTE_TYPE, explanation: "Testerklärung", verification: UNCONFIRMED }];
    const p = proposeBaseline(base, [{ weekday: 2, start: "09:30", end: "10:30" }, { weekday: 3, start: "09:00", end: "10:00" }], TODAY);
    for (const r of base.schedule!.rules.filter((x) => x.consultationType !== "ACUTE")) assert.ok(p.schedule!.rules.includes(r), r.id);
    const acuteRules = p.schedule!.rules.filter((r) => r.consultationType === "ACUTE");
    assert.deepEqual(acuteRules.map((r) => r.id), ["akut-2-0930-1030", "old-acute"], "an unchanged slot keeps its rule id");
    assert.equal(p.schedule!.verification, base.schedule!.verification);
    assert.equal(p.consultationTypes.filter((t) => t.code === "ACUTE").length, 1);
    assert.equal(p.consultationTypes[0].explanation, "Testerklärung", "same logical record");
    assert.equal(acuteBaselineStatus(p, TODAY).state, "READY");
  });
});

describe("28-day engine window with an artificial confirmed baseline", () => {
  const slots: AcuteSlot[] = [{ weekday: 1, start: "10:00", end: "11:00" }, { weekday: 2, start: "09:30", end: "10:30" }, { weekday: 3, start: "11:00", end: "11:30" }];
  const base = mixed();
  const proposed = proposeBaseline(base, slots, TODAY);
  test("no newly introduced UNKNOWN / conflict", () => assert.deepEqual(baselineWindowProblems(base, proposed, slots, TODAY), []));
  test("every slot occurrence in 28 days: inside ACUTE_CONSULTATION, before / after the normal state", () => {
    let checked = 0;
    for (let i = 0; i < 28; i++) {
      const date = addDays(TODAY, i);
      for (const s of slots.filter((x) => x.weekday === weekdayOf(date))) {
        assert.equal(getPracticeStatus(zonedToInstant(date, s.start), proposed).status, "ACUTE_CONSULTATION", `${date} ${s.start}`);
        const before = getPracticeStatus(zonedToInstant(date, "08:30"), proposed).status;
        assert.ok(before === "OPEN", `${date} before`);
        assert.equal(getPracticeStatus(zonedToInstant(date, s.end), proposed).status, s.end === "12:00" ? "CLOSED" : "OPEN");
        checked++;
      }
    }
    assert.equal(checked, 12);
  });
  test("slotChecks: next ordinary occurrence, ok inside, skip days with an exception", () => {
    const withEx = { ...proposed, exceptions: [exception("x", TODAY, TODAY)] };
    const c = slotChecks(withEx, slots, TODAY);
    assert.ok(c.every((x) => x.ok));
    assert.equal(c[0].date, "2026-10-12", "today has an exception → next Monday");
    assert.deepEqual(c[0].points.map((p) => p.status), ["OPEN", "ACUTE_CONSULTATION", "OPEN"]);
  });
  test("a proposal that would conflict is reported", () => {
    // Inconsistent on purpose: an acute rule outside the opening (bypassing validateSlots).
    const bad: PulsData = { ...proposed, schedule: { ...proposed.schedule!, rules: [...proposed.schedule!.rules, { ...proposed.schedule!.rules.at(-1)!, id: "bad", weekday: 1, start: "12:30", end: "13:00" }] } };
    const p = baselineWindowProblems(base, bad, [...slots, { weekday: 1, start: "12:30", end: "13:00" }], TODAY);
    assert.equal(p[0]?.reason, "ACUTE_CONFLICT");
  });
});

describe("acuteExceptionProblem — the collection guard", () => {
  const ex = exception(`akut-heute-${TODAY}`, TODAY, TODAY, { reason: ACUTE_TODAY_MARKER, intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }, { start: "10:00", end: "11:00", consultationType: "ACUTE" }, { start: "11:00", end: "12:00", consultationType: "GENERAL" }] });
  test("no baseline → refused; ordinary special hours always pass", () => {
    assert.match(acuteExceptionProblem(baseData(), ex, TODAY) ?? "", /noch nicht ärztlich bestätigt/);
    assert.equal(acuteExceptionProblem(baseData(), exception("plain", TODAY, TODAY), TODAY), null);
    assert.equal(acuteExceptionProblem(baseData(), { ...ex, kind: "CLOSED", intervals: [] }, TODAY), null);
  });
  test("READY baseline → accepted; type expiring inside a multi-day range → refused", () => {
    const ready = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acute("a", 1, "10:00", "11:00")]);
    assert.equal(acuteExceptionProblem(ready, ex, TODAY), null);
    const shortType = { ...ready, consultationTypes: [{ ...ACUTE_TYPE, verification: { ...VERIFIED, reviewDue: "2026-10-06" } }] };
    assert.match(acuteExceptionProblem(shortType, { ...ex, endDate: "2027-01-31" }, TODAY) ?? "", /gilt nicht mehr/);
  });
});

describe("withAcuteForDay — the complete day with one acute interval", () => {
  const seg = (start: string, end: string, type: "GENERAL" | "HEALTHY_ONLY" | "APPOINTMENT" | "ACUTE" = "GENERAL") => ({ start, end, type });
  test("crossing a consultation-type boundary keeps both types", () => {
    assert.deepEqual(withAcuteForDay([seg("08:00", "10:00", "HEALTHY_ONLY"), seg("10:00", "12:00")], { start: "09:30", end: "10:30" }), [
      seg("08:00", "09:30", "HEALTHY_ONLY"),
      seg("09:30", "10:30", "ACUTE"),
      seg("10:30", "12:00"),
    ]);
  });
  test("the whole day is kept (not just the acute interval); other blocks untouched", () => {
    assert.deepEqual(withAcuteForDay([seg("08:00", "12:00"), seg("14:00", "16:00", "APPOINTMENT")], { start: "10:00", end: "11:00" }), [
      seg("08:00", "10:00"),
      seg("10:00", "11:00", "ACUTE"),
      seg("11:00", "12:00"),
      seg("14:00", "16:00", "APPOINTMENT"),
    ]);
  });
  test("recurring ACUTE in the base is removed first; cancel returns the non-ACUTE day; same-type neighbours merge", () => {
    const withRecurring = [seg("08:00", "10:00"), seg("10:00", "11:00", "ACUTE"), seg("11:00", "12:00")];
    assert.deepEqual(withAcuteForDay(withRecurring, null), [seg("08:00", "10:00"), seg("11:00", "12:00")], "a gap stays a gap");
    assert.deepEqual(withAcuteForDay([seg("08:00", "10:00"), seg("10:00", "12:00")], null), [seg("08:00", "12:00")]);
    assert.deepEqual(withAcuteForDay([seg("08:00", "12:00")], { start: "08:00", end: "12:00" }), [seg("08:00", "12:00", "ACUTE")]);
  });
  test("outside the opening or reversed → refused", () => {
    assert.throws(() => withAcuteForDay([seg("08:00", "12:00")], { start: "11:30", end: "13:00" }), /vollständig innerhalb/);
    assert.throws(() => withAcuteForDay([seg("08:00", "12:00"), seg("14:00", "16:00")], { start: "11:00", end: "15:00" }), /vollständig innerhalb/);
    assert.throws(() => withAcuteForDay([seg("08:00", "12:00")], { start: "11:00", end: "10:00" }));
  });
  test("nonAcuteSegments / recurringAcute read the weekly plan of a date", () => {
    const d = withRules(mixed(), [acute("a", 2, "10:00", "11:00")]);
    assert.deepEqual(nonAcuteSegments(d.schedule!.rules, "2026-10-06").map((s) => s.type), ["HEALTHY_ONLY", "GENERAL"]);
    assert.deepEqual(recurringAcute(d.schedule!.rules, "2026-10-06"), [{ start: "10:00", end: "11:00" }]);
  });
});
