// Phase 09.5C — 7.5 Urlaub / geplante Schließzeit (pure; synthetic data; no database):
// create, validation, edit, replacement coverage, preview dates, period actions, facts diff,
// history wording, undo compatibility.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, OpeningHourException, OpeningHoursRule, ReplacementPractice } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { applyChangeSet } from "../../domain/operations.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { isLocalDate, zonedToInstant } from "../../domain/time.ts";
import { closureToDoc } from "../../data/payload-mapping.ts";
import { applyPeriodAction, defaultAnnounceFrom, directoryOptions, inputFromClosure, plannedClosureDraft, prepareFormInput, type PlannedResult } from "../workflows/planned.ts";
import { parsePeriodAction, parsePlannedClosure, plannedQuery, fromSearch } from "../workflows/form.ts";
import type { PlannedClosureInput, ReadyDraft } from "../workflows/types.ts";
import { NO_REPLACEMENT_EFFECT, shortRange } from "../workflows/wording.ts";
import { planUndo, type HistoryEvent } from "../workflows/undo.ts";
import { describeGroup } from "../history.ts";
import { affectedDates, dayDiffs, dayFacts } from "../facts.ts";
import { closureReplacementText, upcomingItems } from "../read-model.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const practice = (id: string, name: string, verification: FactVerification): ReplacementPractice => ({ id, practiceName: name, contactPersons: [], street: "Teststraße 1", postalCode: "06000", city: "Teststadt", phone: "0000 000000", verification });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [
    practice("a", "Praxis A", V),
    practice("b", "Praxis B", V),
    practice("c", "Praxis C", { status: "TO_BE_CONFIRMED", sourceIds: [] }),
    practice("d", "Praxis D", { ...V, reviewDue: "2026-10-21" }),
  ],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const TODAY = "2026-10-13"; // Tuesday
const NOW = zonedToInstant(TODAY, "09:30");
const FP = "fp";
const base = (p: Partial<PlannedClosureInput> = {}): PlannedClosureInput => ({ kind: "VACATION", from: "2026-10-19", to: "2026-10-23", announceFrom: "", mode: "KEINE", periods: [], gapsAccepted: false, ...p });
const run = (p: Partial<PlannedClosureInput> = {}, data: PulsData = DATA, now = NOW): PlannedResult => plannedClosureDraft(data, now, base(p), FP);
const ready = (r: PlannedResult) => {
  assert.equal(r.draft.ok, true, JSON.stringify(r.details.problems));
  return r.draft as ReadyDraft & { record: { value: Closure } };
};
const codes = (r: PlannedResult) => r.details.problems.map((p) => p.code);
const at9 = (d: string) => zonedToInstant(d, "09:00");
const vacation = (id: string, from: string, to: string, extra: Partial<Closure> = {}): Closure => ({ id, kind: "VACATION", startDate: from, endDate: to, announceFrom: from, replacements: [], verification: { ...V, reviewDue: to }, ...extra });

describe("7.5 create: kinds, dates, announcement, message, replacements", () => {
  test("single-day vacation without replacement: ACTIVE draft, preview at announcement / day / day after", () => {
    const r = run({ from: "2026-10-20", to: "2026-10-20" });
    const d = ready(r);
    assert.equal(d.mode, "NEW");
    assert.equal(d.kind, "PLANNED_CLOSURE");
    const rec = d.record.value;
    assert.deepEqual([rec.id, rec.kind, rec.startDate, rec.endDate, rec.announceFrom], ["urlaub-2026-10-20", "VACATION", "2026-10-20", "2026-10-20", "2026-10-13"]);
    assert.equal(rec.verification.reviewDue, "2026-10-20", "preview mirrors the hook: reviewDue = end date");
    assert.deepEqual(rec.replacements, []);
    assert.deepEqual(r.details.moments.map((m) => m.kind), ["ANNOUNCE", "FIRST", "AFTER"]);
    const [announce, first, after] = r.details.moments;
    assert.equal(announce.after.upcomingClosure?.id, rec.id, "announcement uses the engine's upcomingClosure");
    assert.equal(first.after.status, "VACATION");
    assert.equal(first.after.replacementFallback, true);
    assert.equal(after.after.activeClosure, undefined);
    assert.match(d.effect, new RegExp(NO_REPLACEMENT_EFFECT.replace(/\./g, "\\.")));
  });

  test("announce-from default: 14 days before, or today when that has passed; an explicit date wins", () => {
    assert.equal(defaultAnnounceFrom("2026-11-30", TODAY), "2026-11-16");
    assert.equal(defaultAnnounceFrom("2026-10-19", TODAY), TODAY);
    const r = ready(run({ announceFrom: "2026-10-15" }));
    assert.equal(r.record.value.announceFrom, "2026-10-15");
    const data = applyChangeSet(DATA, r.changeSet);
    assert.equal(getPracticeStatus(at9("2026-10-14"), data).upcomingClosure, undefined, "not yet announced");
    assert.equal(getPracticeStatus(at9("2026-10-15"), data).upcomingClosure?.startDate, "2026-10-19");
    assert.equal(ready(run({ announceFrom: "2026-10-19" })).record.value.announceFrom, "2026-10-19", "equal to the start is allowed");
  });

  test("multi-day vacation, training and other closures map to the domain kinds (never SHORT_NOTICE)", () => {
    const v = ready(run());
    assert.equal(getPracticeStatus(at9("2026-10-21"), applyChangeSet(DATA, v.changeSet)).status, "VACATION");
    const t = ready(run({ kind: "TRAINING", from: "2026-10-20", to: "2026-10-21" }));
    assert.deepEqual([t.record.value.kind, t.record.value.id], ["TRAINING", "fortbildung-2026-10-20"]);
    assert.equal(getPracticeStatus(at9("2026-10-20"), applyChangeSet(DATA, t.changeSet)).status, "TEMPORARILY_CLOSED");
    const o = ready(run({ kind: "OTHER", from: "2026-10-20", to: "2026-10-20" }));
    assert.deepEqual([o.record.value.kind, o.record.value.id], ["OTHER", "schliessung-2026-10-20"]);
  });

  test("public message: stored trimmed; more than 280 characters is refused in its section", () => {
    assert.equal(ready(run({ message: "  Rezepte bitte   vorher abholen. " })).record.value.publicMessage, "Rezepte bitte vorher abholen.");
    const long = run({ message: "x".repeat(281) });
    assert.equal(long.draft.ok, false);
    assert.equal(long.details.problems.find((p) => p.section === "hinweis")?.code, "INVALID_INPUT");
    assert.ok(ready(run({ message: "x".repeat(280) })));
  });

  test("one replacement for the whole range", () => {
    const r = run({ mode: "GANZ", practice: "a" });
    const d = ready(r);
    assert.deepEqual(d.record.value.replacements, [{ replacementPracticeId: "a", from: "2026-10-19", until: "2026-10-23" }]);
    const day = getPracticeStatus(at9("2026-10-21"), applyChangeSet(DATA, d.changeSet));
    assert.deepEqual(day.replacementPractices.map((p) => p.practiceName), ["Praxis A"]);
    assert.match(d.effect, /Vertretung: Praxis A \(19\.–23\. Oktober\)/);
  });

  test("two replacement periods: one Closure, both assignments, a preview date inside each period", () => {
    const r = run({ mode: "TEILEN", periods: [{ from: "2026-10-19", to: "2026-10-21", practice: "a" }, { from: "2026-10-22", to: "2026-10-23", practice: "b" }] });
    const d = ready(r);
    assert.deepEqual(d.changeSet.upsertClosures?.length, 1);
    assert.deepEqual(d.record.value.replacements.map((x) => [x.replacementPracticeId, x.from, x.until]), [["a", "2026-10-19", "2026-10-21"], ["b", "2026-10-22", "2026-10-23"]]);
    assert.deepEqual(r.details.gaps, []);
    const periods = r.details.moments.filter((m) => m.kind === "PERIOD" || m.kind === "FIRST");
    assert.deepEqual(periods.map((m) => [m.date, m.after.replacementPractices.map((p) => p.id).join()]), [["2026-10-19", "a"], ["2026-10-22", "b"]]);
  });

  test("intentional gap: refused until confirmed, then published as entered — never stretched", () => {
    const input = { mode: "TEILEN" as const, periods: [{ from: "2026-10-19", to: "2026-10-21", practice: "a" }, { from: "2026-10-23", to: "2026-10-23", practice: "b" }] };
    const open = run(input);
    assert.equal(!open.draft.ok && open.draft.blocked.code, "GAP_NOT_CONFIRMED");
    assert.match(!open.draft.ok ? open.draft.blocked.message : "", /Ohne Vertretung: 22\. Oktober/);
    const r = run({ ...input, gapsAccepted: true });
    const d = ready(r);
    assert.deepEqual(r.details.gaps, [{ from: "2026-10-22", to: "2026-10-22" }]);
    assert.deepEqual(d.record.value.replacements.map((x) => [x.from, x.until]), [["2026-10-19", "2026-10-21"], ["2026-10-23", "2026-10-23"]]);
    assert.match(d.effect, /Ohne Vertretung: 22\. Oktober\. Die Website zeigt in diesem Zeitraum Telefon und Notfall-Hinweise\./);
    const gap = r.details.moments.find((m) => m.kind === "GAP")!;
    assert.equal(gap.date, "2026-10-22");
    assert.deepEqual([gap.after.replacementPractices.length, gap.after.replacementFallback], [0, true]);
  });

  test("every preview status is the engine's own result", () => {
    const r = run({ mode: "GANZ", practice: "a" });
    const after = applyChangeSet(DATA, ready(r).changeSet);
    for (const m of r.details.moments) assert.deepEqual(m.after, getPracticeStatus(at9(m.date), after));
    for (const m of r.details.moments) assert.deepEqual(m.before, getPracticeStatus(at9(m.date), DATA));
  });
});

describe("7.5 validation (nothing publishable, nothing written)", () => {
  const invalid = (p: Partial<PlannedClosureInput>, section: string, re?: RegExp, data = DATA) => {
    const r = run(p, data);
    assert.equal(r.draft.ok, false);
    const hit = r.details.problems.find((x) => x.section === section);
    assert.ok(hit, `expected a ${section} problem, got ${JSON.stringify(r.details.problems)}`);
    if (re) assert.match(hit.message, re);
    return r;
  };
  test("dates: missing, invalid format, impossible day, end before start, in the past, too long", () => {
    invalid({ from: "" }, "zeitraum", /ersten Tag angeben/);
    invalid({ to: "19.10.2026" }, "zeitraum", /kein gültiges Datum/);
    invalid({ from: "2026-02-30", to: "2026-03-02" }, "zeitraum", /kein gültiges Datum/);
    invalid({ from: "2026-10-23", to: "2026-10-19" }, "zeitraum", /vor dem ersten Tag/);
    invalid({ from: "2026-10-01", to: "2026-10-05" }, "zeitraum", /bereits vorbei/);
    invalid({ from: "2026-10-12", to: "2026-10-20" }, "zeitraum", /Vergangenheit/);
    invalid({ from: "2026-10-19", to: "2027-12-31" }, "zeitraum", /höchstens 366 Tage/);
    assert.ok(ready(run({ from: TODAY, to: TODAY })), "today is allowed");
    assert.equal(isLocalDate("2026-02-30"), false);
    assert.equal(isLocalDate("2028-02-29"), true);
  });

  test("announcement date: invalid, after the end", () => {
    invalid({ announceFrom: "2026-13-01" }, "ankuendigung", /kein gültiges Datum/);
    invalid({ announceFrom: "2026-10-24" }, "ankuendigung", /spätestens am letzten Tag/);
    assert.ok(ready(run({ announceFrom: "2026-10-23" })));
  });

  test("replacement periods: outside, beyond (explicit fix offered), overlap, missing practice", () => {
    const outside = invalid({ mode: "TEILEN", periods: [{ from: "2026-10-25", to: "2026-10-26", practice: "a" }] }, "vertretung");
    assert.match(outside.details.periodProblems[0].message, /außerhalb/);
    const beyond = invalid({ mode: "TEILEN", periods: [{ from: "2026-10-19", to: "2026-10-25", practice: "a" }] }, "vertretung");
    assert.deepEqual(beyond.details.periodProblems[0].fix, { from: "2026-10-19", to: "2026-10-23" });
    assert.equal(beyond.details.record?.replacements.length, 0, "never clamped silently");
    const overlap = invalid({ mode: "TEILEN", periods: [{ from: "2026-10-19", to: "2026-10-21", practice: "a" }, { from: "2026-10-21", to: "2026-10-23", practice: "b" }] }, "vertretung");
    assert.match(overlap.details.periodProblems[0].message, /überschneidet/);
    invalid({ mode: "GANZ" }, "vertretung", /Vertretungspraxis wählen/);
    invalid({ mode: undefined }, "vertretung", /Keine Vertretung/);
    invalid({ mode: "TEILEN", periods: [] }, "vertretung", /mindestens einen/);
  });

  test("replacement verification: unverified not selectable; expiry inside the period blocks with a clear warning", () => {
    const opts = directoryOptions(DATA, TODAY);
    assert.equal(opts.find((o) => o.id === "c")?.usable, false);
    assert.equal(opts.find((o) => o.id === "c")?.note, "nicht ärztlich bestätigt");
    assert.equal(opts.find((o) => o.id === "d")?.usableUntil, "2026-10-21");
    invalid({ mode: "GANZ", practice: "c" }, "vertretung", /nicht ärztlich bestätigt/);
    const exp = invalid({ mode: "GANZ", practice: "d" }, "vertretung", /Die Bestätigung der Vertretungspraxis Praxis D läuft am 21\. Oktober ab\. Danach kann sie auf der Website nicht mehr angezeigt werden\./);
    assert.equal(exp.details.problems.find((p) => p.section === "vertretung")?.code, "REPLACEMENT_EXPIRES");
    // usable for the WHOLE sub-period → fine
    assert.ok(ready(run({ mode: "TEILEN", gapsAccepted: true, periods: [{ from: "2026-10-19", to: "2026-10-21", practice: "d" }] })));
    invalid({ mode: "TEILEN", periods: [{ from: "2026-10-19", to: "2026-10-23", practice: "zzz" }] }, "vertretung");
  });

  test("overlap with another ACTIVE closure is refused (no merge); a planned one offers its edit page", () => {
    const data = { ...DATA, closures: [vacation("urlaub-x", "2026-10-22", "2026-10-26"), { ...vacation("kurz", "2026-10-30", "2026-10-30"), kind: "SHORT_NOTICE" as const }] };
    const r = invalid({}, "zeitraum", /Für 22\.–23\. Oktober ist bereits „Urlaub 22\.–26\. Oktober“ eingetragen/, data);
    assert.deepEqual(r.details.problems.find((p) => p.code === "OVERLAP_CLOSURE")?.suggestion, { label: "Urlaub 22.–26. Oktober bearbeiten", href: "/intern/urlaub/urlaub-x" });
    const s = invalid({ from: "2026-10-29", to: "2026-10-30" }, "zeitraum", /Kurzfristige Schließung/, data);
    assert.equal(s.details.problems.find((p) => p.code === "OVERLAP_CLOSURE")?.suggestion, undefined);
  });

  test("overlap with ACTIVE special hours is refused (no automatic supersede); a CLOSED day is compatible", () => {
    const sp: OpeningHourException = { id: "sp", kind: "SPECIAL_HOURS", startDate: "2026-10-20", endDate: "2026-10-20", intervals: [{ start: "08:00", end: "11:00", consultationType: "GENERAL" }], priority: 10, verification: V };
    const r = invalid({}, "zeitraum", /Für 20\. Oktober sind geänderte Sprechzeiten eingetragen \(08:00–11:00 Uhr\)/, { ...DATA, exceptions: [sp] });
    assert.equal(r.details.problems[0].code, "OVERLAP_SPECIAL_HOURS");
    const cl: OpeningHourException = { ...sp, id: "zu", kind: "CLOSED", intervals: [] };
    assert.ok(ready(run({}, { ...DATA, exceptions: [cl] })));
  });
});

describe("7.5 edit: same record, range changes, explicit corrections", () => {
  const existing = vacation("urlaub-2026-10-19", "2026-10-19", "2026-10-23", { announceFrom: "2026-10-13", replacements: [{ replacementPracticeId: "a", from: "2026-10-19", until: "2026-10-23" }] });
  const data = { ...DATA, closures: [existing] };
  const edit = (p: Partial<PlannedClosureInput>) => plannedClosureDraft(data, NOW, { ...inputFromClosure(existing), ...p }, FP);

  test("form starts from the record with EXPLICIT replacement periods", () => {
    const i = inputFromClosure(existing);
    assert.deepEqual([i.recordId, i.mode, i.periods], ["urlaub-2026-10-19", "TEILEN", [{ from: "2026-10-19", to: "2026-10-23", practice: "a" }]]);
    const same = edit({});
    assert.equal(!same.draft.ok && same.draft.blocked.code, "NO_CHANGE");
  });

  test("extend: same record id, new uncovered day shown, replacement NOT extended automatically", () => {
    const r = edit({ to: "2026-10-24" });
    assert.deepEqual(r.details.newGaps, [{ from: "2026-10-24", to: "2026-10-24" }]);
    assert.equal(!r.draft.ok && r.draft.blocked.code, "GAP_NOT_CONFIRMED");
    const d = ready(edit({ to: "2026-10-24", gapsAccepted: true }));
    assert.deepEqual([d.mode, d.record.value.id], ["EDIT", "urlaub-2026-10-19"]);
    assert.deepEqual(d.record.value.replacements, existing.replacements);
    assert.match(d.effect, /^Bisher: Urlaub 19\.–23\. Oktober\. Neu: Urlaub 19\.–24\. Oktober\./);
  });

  test("shorten: a period beyond the new range needs the explicit correction; then a preview of the freed day", () => {
    const r = edit({ to: "2026-10-22" });
    assert.equal(!r.draft.ok && r.draft.blocked.code, "REPLACEMENT_PERIODS");
    assert.deepEqual(r.details.periodProblems[0].fix, { from: "2026-10-19", to: "2026-10-22" });
    const fixed = applyPeriodAction({ ...inputFromClosure(existing), to: "2026-10-22" }, { kind: "FIX", index: 0 });
    const ok = plannedClosureDraft(data, NOW, fixed, FP);
    const d = ready(ok);
    assert.deepEqual(d.record.value.replacements, [{ replacementPracticeId: "a", from: "2026-10-19", until: "2026-10-22" }]);
    assert.ok(ok.details.moments.some((m) => m.date === "2026-10-23" && m.after.status !== "VACATION"));
  });

  test("change replacements, announcement date and message on the same record", () => {
    const d = ready(edit({ periods: [{ from: "2026-10-19", to: "2026-10-20", practice: "a" }, { from: "2026-10-21", to: "2026-10-23", practice: "b" }], announceFrom: "2026-10-16", message: "Rezepte vorher abholen." }));
    assert.equal(d.record.value.id, existing.id);
    assert.deepEqual([d.record.value.announceFrom, d.record.value.publicMessage, d.record.value.replacements.length], ["2026-10-16", "Rezepte vorher abholen.", 2]);
  });

  test("not editable here: unknown id, short-notice closure, ended closure", () => {
    const sn: Closure = { ...vacation("heute-geschlossen-x", TODAY, TODAY), kind: "SHORT_NOTICE" };
    const old = vacation("alt", "2026-10-01", "2026-10-05");
    const d2 = { ...DATA, closures: [sn, old] };
    for (const id of ["gibt-es-nicht", sn.id, old.id]) {
      const r = plannedClosureDraft(d2, NOW, base({ recordId: id }), FP);
      assert.equal(!r.draft.ok && r.draft.blocked.code, "NOT_EDITABLE", id);
    }
  });

  test("a running closure keeps its past start; moving the start into the past is refused", () => {
    const running = vacation("laeuft", "2026-10-10", "2026-10-16");
    const d2 = { ...DATA, closures: [running] };
    const ok = plannedClosureDraft(d2, NOW, { ...inputFromClosure(running), to: "2026-10-17" }, FP);
    assert.equal(ready(ok).record.value.startDate, "2026-10-10");
    const bad = plannedClosureDraft(d2, NOW, { ...inputFromClosure(running), from: "2026-10-11" }, FP);
    assert.match(bad.details.problems[0].message, /Vergangenheit/);
  });
});

describe("7.5 form structure (GET only, explicit actions)", () => {
  test("Zeitraum teilen: whole-range practice becomes period 1, period 2 is empty; again splits the last period", () => {
    const one = applyPeriodAction(base({ mode: "GANZ", practice: "a" }), { kind: "SPLIT" });
    assert.deepEqual([one.mode, one.periods], ["TEILEN", [{ from: "2026-10-19", to: "2026-10-21", practice: "a" }, { from: "2026-10-22", to: "2026-10-23", practice: "" }]]);
    const two = applyPeriodAction(one, { kind: "SPLIT" });
    assert.deepEqual(two.periods.map((p) => [p.from, p.to]), [["2026-10-19", "2026-10-21"], ["2026-10-22", "2026-10-22"], ["2026-10-23", "2026-10-23"]]);
    assert.deepEqual(applyPeriodAction(two, { kind: "REMOVE", index: 1 }).periods.length, 2);
    assert.deepEqual(prepareFormInput(base({ mode: "TEILEN", practice: "b" })).periods, [{ from: "2026-10-19", to: "2026-10-23", practice: "b" }]);
  });

  test("form parsing reads only person-chosen fields and round-trips", () => {
    const input = base({ announceFrom: "2026-10-15", mode: "TEILEN", message: "Hinweis", periods: [{ from: "2026-10-19", to: "2026-10-21", practice: "a" }], gapsAccepted: true });
    const q = Object.fromEntries(new URLSearchParams(plannedQuery(input)));
    const parsed = parsePlannedClosure(fromSearch({ ...q, changeSetId: "x", verifiedBy: "Fake", recordState: "RETIRED", rolle: "ADMIN" }));
    assert.deepEqual(parsed, { ...input, practice: undefined });
    assert.equal(parsePlannedClosure(fromSearch({ eintrag: "../../etc" })).recordId, "", "a malformed record id never names a record");
    assert.deepEqual(parsePeriodAction(fromSearch({ aktion: "anpassen-2" })), { kind: "FIX", index: 2 });
    assert.equal(parsePeriodAction(fromSearch({ aktion: "loeschen" })), undefined);
  });
});

describe("facts diff (undo preview clarity) and read model", () => {
  test("identical headline, different hours: the facts show the difference", () => {
    const early: OpeningHourException = { id: "e", kind: "SPECIAL_HOURS", startDate: TODAY, endDate: TODAY, intervals: [{ start: "08:00", end: "12:00", consultationType: "GENERAL" }, { start: "14:00", end: "15:00", consultationType: "GENERAL" }], priority: 100, verification: { ...V, reviewDue: TODAY } };
    const before = { ...DATA, exceptions: [early] };
    assert.equal(getPracticeStatus(NOW, before).headline, getPracticeStatus(NOW, DATA).headline, "the big headline alone is identical");
    const diffs = dayDiffs(before, DATA, TODAY);
    assert.deepEqual(diffs.map((d) => d.label), ["Heute (13. Oktober)"]);
    assert.deepEqual(diffs[0].rows.find((r) => r.key === "hours"), { key: "hours", label: "Sprechzeiten", before: "08:00–12:00 und 14:00–15:00 Uhr", after: "08:00–12:00 und 14:00–16:00 Uhr" });
  });

  test("vacation undo: closure, replacement and announcement facts per affected day", () => {
    const v = vacation("u", "2026-10-19", "2026-10-23", { announceFrom: TODAY, replacements: [{ replacementPracticeId: "a", from: "2026-10-19", until: "2026-10-23" }] });
    const before = { ...DATA, closures: [v] };
    assert.deepEqual(affectedDates(before, DATA, TODAY), ["2026-10-19", "2026-10-24"]);
    const rows = dayDiffs(before, DATA, TODAY)[0].rows;
    assert.deepEqual(rows.map((r) => r.key), ["hours", "closure", "replacement", "next"]);
    assert.equal(rows.find((r) => r.key === "closure")?.before, "Urlaub 19.–23. Oktober");
    assert.equal(dayFacts(before, TODAY).announcement, "Urlaub 19.–23. Oktober");
  });

  test("Nächste Termine: replacement periods with gaps, confirmation state, edit link only for planned closures", () => {
    const v = vacation("u", "2026-10-19", "2026-10-23", { replacements: [{ replacementPracticeId: "a", from: "2026-10-19", until: "2026-10-21" }, { replacementPracticeId: "b", from: "2026-10-23", until: "2026-10-23" }] });
    const sn: Closure = { ...vacation("kurz", TODAY, TODAY), kind: "SHORT_NOTICE" };
    const items = upcomingItems({ ...DATA, closures: [v, sn] }, [], TODAY);
    const u = items.find((i) => i.id === "u")!;
    assert.equal(u.detail, "Vertretung: Praxis A (19.–21. Oktober), Praxis B (23. Oktober) · ohne Vertretung: 22. Oktober");
    assert.equal(u.editHref, "/intern/urlaub/u");
    assert.equal(u.confirmation, "Bestätigt von Test");
    assert.equal(items.find((i) => i.id === "kurz")!.editHref, undefined);
    assert.equal(closureReplacementText({ ...v, replacements: [] }, () => ""), "Keine Vertretung eingetragen");
    assert.equal(shortRange("2026-10-30", "2026-11-02"), "30. Oktober – 2. November");
    assert.equal(shortRange("2026-12-30", "2027-01-02"), "30. Dezember 2026 – 2. Januar 2027");
  });
});

describe("history wording and undo compatibility", () => {
  const CS = "11111111-1111-4111-8111-111111111111";
  const ev = (p: Partial<HistoryEvent> & Pick<HistoryEvent, "eventId" | "operation">): HistoryEvent => ({
    at: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
    actorId: "1",
    actorName: "Test Team",
    actorRole: "STAFF",
    entityType: "closures",
    entityId: "urlaub-2026-10-19",
    previous: null,
    next: null,
    changeSetId: CS,
    ...p,
  });
  const v1 = vacation("urlaub-2026-10-19", "2026-10-19", "2026-10-23");
  const v2 = { ...v1, endDate: "2026-10-24", verification: { ...V, reviewDue: "2026-10-24" } };

  test("plain German labels (no raw Closure / UPDATE / recordState)", () => {
    assert.equal(describeGroup([ev({ eventId: "c", operation: "CREATE", next: closureToDoc(v1) })], TODAY), "Urlaub 19.–23. Oktober eingetragen");
    assert.equal(describeGroup([ev({ eventId: "u", operation: "UPDATE", previous: closureToDoc(v1), next: closureToDoc(v2) })], TODAY), "Urlaub 19.–24. Oktober geändert");
    assert.equal(describeGroup([ev({ eventId: "r", operation: "REVERT", next: { ...closureToDoc(v1), recordState: "RETIRED" } })], TODAY), "Urlaub 19.–23. Oktober zurückgenommen");
    assert.equal(describeGroup([ev({ eventId: "r", operation: "REVERT", next: { ...closureToDoc({ ...v1, kind: "TRAINING" }), recordState: "ACTIVE" } })], TODAY), "Änderung an der Fortbildung zurückgenommen");
  });

  test("EDIT undo of a vacation restores the previous range and is not UNSAFE (restored reviewDue = end date)", () => {
    const plan = planUndo({
      group: [ev({ eventId: "u", operation: "UPDATE", previous: closureToDoc(v1), next: closureToDoc(v2) })],
      latest: { "closures:urlaub-2026-10-19": "u" },
      records: { "closures:urlaub-2026-10-19": { ...closureToDoc(v2), recordState: "ACTIVE" } },
      data: { ...DATA, closures: [v2] },
      now: NOW,
      role: "STAFF",
    });
    assert.ok(plan.ok, !plan.ok ? plan.message : "");
    assert.deepEqual(plan.ok && plan.actions.map((a) => a.kind), ["RESTORE"]);
    const restored = plan.ok ? plan.after.closures[0] : undefined;
    assert.deepEqual([restored?.endDate, restored?.verification.reviewDue], ["2026-10-23", "2026-10-23"]);
  });

  test("CREATE undo plans a retire; a closure that has ended offers no quick undo", () => {
    const created = planUndo({
      group: [ev({ eventId: "c", operation: "CREATE", next: closureToDoc(v1) })],
      latest: { "closures:urlaub-2026-10-19": "c" },
      records: { "closures:urlaub-2026-10-19": { ...closureToDoc(v1), recordState: "ACTIVE" } },
      data: { ...DATA, closures: [v1] },
      now: NOW,
      role: "DOCTOR",
    });
    assert.deepEqual(created.ok && created.actions.map((a) => a.kind), ["RETIRE"]);
    const oneDay = vacation("urlaub-2026-10-13", TODAY, TODAY);
    const ended = planUndo({
      group: [ev({ eventId: "c", entityId: oneDay.id, operation: "CREATE", next: closureToDoc(oneDay) })],
      latest: { [`closures:${oneDay.id}`]: "c" },
      records: { [`closures:${oneDay.id}`]: { ...closureToDoc(oneDay), recordState: "ACTIVE" } },
      data: { ...DATA, closures: [oneDay] },
      now: zonedToInstant("2026-10-14", "08:00"),
      role: "STAFF",
    });
    assert.equal(!ended.ok && ended.code, "EFFECT_OVER");
  });
});
