// Phase 09.5I — Regelmäßige Sprechzeiten (pure). ARTIFICIAL weekly plans only — the real practice
// hours stay governed by the static source of truth and their fact statuses (F35–F43).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ConsultationType, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant, type IsoWeekday } from "../../domain/time.ts";
import { ACUTE_ON_CLOSED_DAY, ACUTE_OUTSIDE_HOURS, acuteBoundaryProblems, newRuleId, ruleSignature, weeklyPlanStatus, weeklyScheduleProblems } from "../../domain/weekly-plan.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { inputFromSchedule, introducedProblems, regularTypeOptions, weeklyPlanDraft, type WeeklyPlanInput } from "../workflows/weekly-plan.ts";
import { fromSearch, parseWeeklyPlan, weeklyPlanQuery } from "../workflows/form.ts";
import { reviewItems } from "../read-model.ts";

const TODAY = "2026-10-21"; // Wednesday
const MON = "2026-10-26";
const V = (reviewDue = "2027-04-21", lastVerified = TODAY): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified, reviewDue, verifiedBy: "Test Ärztin, Ärztin / Arzt (Praxis Cockpit)", sourceIds: ["PRACTICE_COCKPIT"] });
const ACUTE_V = V("2027-03-01", "2026-09-01");
const r = (id: string, weekday: number, start: string, end: string, consultationType: OpeningHoursRule["consultationType"] = "GENERAL", extra: Partial<OpeningHoursRule> = {}): OpeningHoursRule => ({ id, weekday: weekday as IsoWeekday, start, end, consultationType, verification: V(), ...extra });
const TYPES: ConsultationType[] = [
  { code: "GENERAL", label: "Sprechstunde (Test)", verification: V() },
  { code: "HEALTHY_ONLY", label: "Nur gesunde Kinder (Test)", verification: V() },
  { code: "APPOINTMENT", label: "Terminsprechstunde (Test)", verification: V() },
  { code: "OTHER", label: "Erfundene Art (Test)", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
  { code: "ACUTE", label: "Akutsprechstunde", verification: ACUTE_V },
];
const ACUTE_MON = r("akut-1-1000-1100", 1, "10:00", "11:00", "ACUTE", { verification: ACUTE_V });
const BASE_RULES = [r("mo-1", 1, "08:00", "12:00"), r("di-1", 2, "08:00", "10:00", "HEALTHY_ONLY"), r("di-2", 2, "10:00", "12:00"), r("mi-1", 3, "08:00", "12:00"), r("do-1", 4, "14:00", "16:00", "APPOINTMENT"), r("fr-1", 5, "08:00", "12:00")];
const data = (over: Partial<PulsData> = {}, rules: OpeningHoursRule[] = [...BASE_RULES, ACUTE_MON], verification: FactVerification = V()): PulsData => ({
  schedule: { rules, confirmedClosedWeekdays: [6, 7], verification },
  consultationTypes: TYPES,
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  ...over,
});
const edit = (d: PulsData, change: (i: WeeklyPlanInput) => void) => {
  const input = inputFromSchedule(d.schedule);
  change(input);
  return weeklyPlanDraft(d, TODAY, input, "fp");
};
const ok = <T extends { ok: boolean }>(x: T) => {
  assert.ok(x.ok, JSON.stringify(x));
  return x as Extract<T, { ok: true }>;
};

describe("invariant validator (shared by workflow and hook)", () => {
  test("a complete week passes; every weekday must be resolved, never both", () => {
    const s = data().schedule!;
    assert.deepEqual(weeklyScheduleProblems(s, TYPES, TODAY), []);
    assert.deepEqual(weeklyScheduleProblems({ ...s, confirmedClosedWeekdays: [6] }, TYPES, TODAY).map((p) => [p.kind, p.weekday]), [["UNRESOLVED", 7]]);
    assert.deepEqual(weeklyScheduleProblems({ ...s, confirmedClosedWeekdays: [5, 6, 7] }, TYPES, TODAY).map((p) => p.kind), ["BOTH"]);
    assert.deepEqual(weeklyScheduleProblems({ ...s, confirmedClosedWeekdays: [6, 6, 7] }, TYPES, TODAY).map((p) => p.kind), ["CLOSED_WEEKDAYS"]);
  });
  test("intervals: valid, no overlap; unique ids; usable, non-ACUTE types only", () => {
    const s = data().schedule!;
    const kinds = (rules: OpeningHoursRule[]) => weeklyScheduleProblems({ ...s, rules: [...s.rules, ...rules] }, TYPES, TODAY).map((p) => p.kind);
    assert.deepEqual(kinds([r("x", 1, "11:00", "13:00")]), ["OVERLAP"]);
    assert.deepEqual(kinds([r("x", 3, "13:00", "12:30")]), ["TIME"]);
    assert.deepEqual(kinds([r("x", 3, "14:00", "15:00", "OTHER")]), ["TYPE"], "unverified type");
    assert.deepEqual(kinds([r("mo-1", 3, "14:00", "15:00")]), ["DUPLICATE_ID"]);
    assert.deepEqual(kinds([r("x", 4, "08:00", "12:00")]), [], "adjacent / separate intervals are fine");
  });
  test("ACUTE boundary: never on a closed weekday, always inside the regular hours", () => {
    const s = data().schedule!;
    assert.deepEqual(acuteBoundaryProblems(s), []);
    assert.equal(acuteBoundaryProblems({ ...s, rules: [...s.rules.filter((x) => x.id !== "mo-1"), r("mo-1", 1, "08:00", "10:30")] })[0].message, ACUTE_OUTSIDE_HOURS);
    assert.equal(acuteBoundaryProblems({ ...s, rules: s.rules.filter((x) => x.id !== "mo-1"), confirmedClosedWeekdays: [1, 6, 7] })[0].message, ACUTE_ON_CLOSED_DAY);
  });
  test("the current static week is a valid regular week (no fact status is changed by this check)", () => {
    assert.deepEqual(weeklyScheduleProblems(PULS_DATA.schedule!, PULS_DATA.consultationTypes, TODAY), []);
  });
});

describe("weekly-plan draft", () => {
  test("every weekday must be chosen; an open day needs an interval; row problems name day + row", () => {
    const d = data();
    let x = edit(d, (i) => (i[3] = { rows: [] }));
    assert.ok(!x.ok && x.code === "INVALID" && x.dayProblems[3] === "Bitte „Geöffnet“ oder „Geschlossen“ wählen.");
    x = edit(d, (i) => (i[3] = { state: "OPEN", rows: [{ start: "", end: "", type: "" }] }));
    assert.ok(!x.ok && /mindestens eine Sprechzeit/.test(x.dayProblems[3]!));
    x = edit(d, (i) => i[1].rows.push({ start: "11:00", end: "13:00", type: "GENERAL" }));
    assert.ok(!x.ok && x.rowProblems.some((p) => p.weekday === 1 && p.index === 1 && /überschneidet/.test(p.message)));
  });

  test("rule ids: exact unchanged rows keep id + object; changed / new rows get new ids; removed rows vanish; ACUTE untouched", () => {
    const d = data();
    const x = ok(
      edit(d, (i) => {
        i[3].rows = [{ start: "08:00", end: "11:00", type: "GENERAL" }]; // changed time
        i[5].rows.push({ start: "14:00", end: "16:00", type: "APPOINTMENT" }); // new
        i[4].rows = [{ start: "14:00", end: "16:00", type: "HEALTHY_ONLY" }]; // changed type
      }),
    );
    const ids = x.regular.map((y) => [y.rule.id, y.keep]);
    for (const kept of ["mo-1", "di-1", "di-2", "fr-1"]) assert.ok(ids.some(([id, k]) => id === kept && k), kept);
    for (const gone of ["mi-1", "do-1"]) assert.ok(!x.proposed.schedule!.rules.some((y) => y.id === gone), gone);
    assert.equal(x.regular.filter((y) => !y.keep).length, 3);
    assert.strictEqual(x.proposed.schedule!.rules.find((y) => y.consultationType === "ACUTE"), ACUTE_MON, "ACUTE rule is the SAME object (id, times, provenance)");
    assert.deepEqual([x.mode, x.audit], ["CHANGE", "UPDATE"]);
  });

  test("ACUTE containment: shortening Monday below the acute slot blocks; widening is valid; closing Monday blocks", () => {
    const d = data();
    let x = edit(d, (i) => (i[1].rows = [{ start: "08:00", end: "10:30", type: "GENERAL" }]));
    assert.ok(!x.ok && x.code === "ACUTE" && x.message === ACUTE_OUTSIDE_HOURS);
    x = edit(d, (i) => (i[1].rows = [{ start: "08:00", end: "12:30", type: "GENERAL" }]));
    assert.ok(x.ok);
    x = edit(d, (i) => (i[1] = { state: "CLOSED", rows: [] }));
    assert.ok(!x.ok && x.code === "ACUTE" && x.message === ACUTE_ON_CLOSED_DAY && x.dayProblems[1] === ACUTE_ON_CLOSED_DAY);
  });

  test("consultation types: from the data, verified only, never ACUTE; an unusable stored type blocks publication", () => {
    const opts = regularTypeOptions(data(), TODAY);
    assert.deepEqual(opts.map((o) => [o.code, o.usable]), [["GENERAL", true], ["HEALTHY_ONLY", true], ["APPOINTMENT", true], ["OTHER", false]]);
    const bad = data({}, [...BASE_RULES, r("x", 3, "14:00", "15:00", "OTHER"), ACUTE_MON]);
    assert.ok(weeklyScheduleProblems(bad.schedule!, TYPES, TODAY).some((p) => p.kind === "TYPE"));
    const x = weeklyPlanDraft(bad, TODAY, inputFromSchedule(bad.schedule), "fp");
    assert.ok(!x.ok && x.rowProblems.some((p) => p.weekday === 3 && /nicht bestätigt/.test(p.message)), "never silently converted to GENERAL");
    assert.ok(!edit(data(), (i) => i[3].rows.push({ start: "14:00", end: "15:00", type: "ACUTE" })).ok, "ACUTE is not selectable here");
  });

  test("closing / reopening a weekday is spelled out; adjacent same-type rows merge, different types stay separate", () => {
    const d = data();
    const x = ok(
      edit(d, (i) => {
        i[3] = { state: "CLOSED", rows: [] };
        i[6] = { state: "OPEN", rows: [{ start: "09:00", end: "10:00", type: "GENERAL" }, { start: "10:00", end: "11:00", type: "GENERAL" }, { start: "11:00", end: "12:00", type: "APPOINTMENT" }] };
      }),
    );
    assert.ok(x.effect.includes("Mittwoch: künftig regelmäßig geschlossen."));
    assert.ok(x.effect.includes("Samstag: künftig regelmäßig geöffnet (09:00–11:00, 11:00–12:00 Uhr)."));
    assert.deepEqual(x.closed, [3, 7]);
    const sat = getPracticeStatus(zonedToInstant("2026-10-24", "10:30"), x.proposed);
    assert.equal(sat.status === "OPEN" || sat.status === "CLOSING_SOON", true);
    assert.equal(getPracticeStatus(zonedToInstant("2026-10-28", "10:00"), x.proposed).status, "CLOSED");
    assert.ok(x.checks.find((c) => c.weekday === 3)!.points.every((p) => p.status === "CLOSED"));
  });

  test("no change: CURRENT → 'Es wurde nichts geändert.'; due / expired / unconfirmed → reconfirmation (VERIFY), same ids", () => {
    const same = weeklyPlanDraft(data(), TODAY, inputFromSchedule(data().schedule), "fp");
    assert.ok(!same.ok && same.code === "NO_CHANGE" && same.message === "Es wurde nichts geändert.");
    const expired = data({}, undefined, V("2026-06-01", "2025-12-01"));
    assert.equal(weeklyPlanStatus(expired.schedule, TODAY).state, "EXPIRED");
    const x = ok(weeklyPlanDraft(expired, TODAY, inputFromSchedule(expired.schedule), "fp"));
    assert.deepEqual([x.mode, x.audit, x.actionLabel], ["RECONFIRM", "VERIFY", "Wochenplan erneut bestätigen"]);
    assert.ok(x.regular.every((y) => y.keep));
    const unconfirmed = data({}, undefined, { status: "TO_BE_CONFIRMED", sourceIds: [] });
    const first = ok(edit(unconfirmed, (i) => (i[3].rows = [{ start: "08:00", end: "13:00", type: "GENERAL" }])));
    assert.deepEqual([first.mode, first.audit], ["FIRST", "VERIFY"]);
    assert.equal(weeklyPlanStatus(data({}, undefined, V("2026-11-10")).schedule, TODAY).state, "DUE");
  });

  test("validity window / public note: preserved when unchanged, never dropped silently", () => {
    const d = data({}, [...BASE_RULES.filter((x) => x.id !== "fr-1"), r("fr-1", 5, "08:00", "12:00", "GENERAL", { publicNote: "Test-Hinweis", validFrom: "2026-01-01" }), ACUTE_MON]);
    const kept = ok(edit(d, (i) => i[3].rows.push({ start: "14:00", end: "15:00", type: "GENERAL" })));
    assert.equal(kept.proposed.schedule!.rules.find((x) => x.id === "fr-1")!.publicNote, "Test-Hinweis");
    const lost = edit(d, (i) => (i[5].rows = [{ start: "08:00", end: "11:00", type: "GENERAL" }]));
    assert.ok(!lost.ok && lost.code === "PRESERVE" && /öffentlichen Hinweis/.test(lost.message));
  });

  test("holidays, single-date exceptions and closures keep precedence over the new week", () => {
    const d = data({ publicHolidays: [MON], holidayPolicy: { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: V() }, exceptions: [{ id: "ex", kind: "SPECIAL_HOURS", startDate: "2026-10-27", endDate: "2026-10-27", intervals: [{ start: "09:00", end: "10:00", consultationType: "GENERAL" }], priority: 10, verification: V("2026-10-27") }] });
    const x = ok(edit(d, (i) => (i[1].rows = [{ start: "08:00", end: "13:00", type: "GENERAL" }])));
    assert.equal(getPracticeStatus(zonedToInstant(MON, "10:30"), x.proposed).status, "CLOSED", "holiday policy wins");
    const tue = getPracticeStatus(zonedToInstant("2026-10-27", "11:00"), x.proposed);
    assert.deepEqual([tue.activeException?.id, tue.headline], ["ex", "Heute geschlossen"], "the exception wins (no false conflict)");
    assert.notEqual(x.checks.find((c) => c.weekday === 1)!.date, MON, "engine checks use an ordinary date");
  });

  test("introduced unknown: a proposal may not make the window less certain than the current data", () => {
    const d = data();
    const worse: PulsData = { ...d, schedule: { ...d.schedule!, verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } } };
    assert.equal(introducedProblems(d, worse, TODAY)?.reason, "SCHEDULE_UNVERIFIED");
    assert.equal(introducedProblems(worse, d, TODAY), null);
  });
});

describe("form, ids, cockpit", () => {
  test("form round trip; only weekday states and rows are read (no ids, provenance, context)", () => {
    const input = inputFromSchedule(data().schedule);
    const q = Object.fromEntries([...weeklyPlanQuery(input), ["ruleId", "evil"], ["praxisWeeklyScheduleWrite", "true"], ["verifiedBy", "Dr. Erfunden"]]);
    const back = parseWeeklyPlan(fromSearch(q));
    assert.deepEqual(back, input);
    assert.deepEqual(Object.keys(back), ["1", "2", "3", "4", "5", "6", "7"]);
  });
  test("server rule ids: weekly-<weekday>-<suffix>, collision-safe", () => {
    const taken = new Set(["weekly-1-aaaa"]);
    const seq = ["aaaa", "aaaa", "bbbb"];
    assert.equal(newRuleId(1, taken, () => seq.shift()!), "weekly-1-bbbb");
    assert.ok(taken.has("weekly-1-bbbb"));
    assert.equal(ruleSignature(r("a", 1, "08:00", "09:00")), ruleSignature(r("b", 1, "08:00", "09:00")), "signature ignores id + provenance");
  });
  test("Prüfen: ONE actionable item for a due / expired week (never per weekday)", () => {
    const items = reviewItems(data({}, undefined, V("2026-06-01", "2025-12-01")), TODAY);
    const week = items.filter((i) => i.id.startsWith("schedule"));
    assert.equal(week.length, 1);
    assert.deepEqual([week[0].title, week[0].action?.href], ["Regelmäßige Sprechzeiten erneut ärztlich bestätigen", "/intern/sprechzeiten"]);
  });
});
