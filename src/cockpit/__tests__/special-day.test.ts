// Phase 09.5F — Sonderöffnungszeiten / Feiertag klären (pure). SYNTHETIC DATA ONLY: hours, holiday
// dates and decisions below are invented for the tests — no practice holiday decision exists.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, ConsultationType, OpeningHourException, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { ACUTE_TODAY_MARKER } from "../../domain/acute.ts";
import {
  SPECIAL_DAY_MARKER,
  SPECIAL_DAY_PRIORITY,
  TODAY_TEXT,
  holidayUnresolved,
  regularTemplate,
  specialDayDraft,
  specialDayMoments,
  typeOptions,
  validateIntervals,
  type SpecialDayInput,
} from "../workflows/special-day.ts";
import { fromSearch, parseSpecialDay, specialDayQuery } from "../workflows/form.ts";
import type { Draft, ReadyDraft } from "../workflows/types.ts";
import { describeEvent, describeGroup } from "../history.ts";
import { reviewItems, upcomingItems } from "../read-model.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const r = (id: string, d: number, start: string, end: string, type: OpeningHoursRule["consultationType"] = "GENERAL", verification = V): OpeningHoursRule => ({ id, weekday: d as 1, start, end, consultationType: type, verification });
const TODAY = "2026-10-21"; // Wednesday
const NOW = zonedToInstant(TODAY, "09:00");
const DAY = "2026-10-29"; // Thursday (ordinary)
const HOLIDAY = "2026-11-03"; // Tuesday — an ARTIFICIAL holiday date for the tests
const TYPES: ConsultationType[] = [
  { code: "GENERAL", label: "Sprechstunde", verification: V },
  { code: "HEALTHY_ONLY", label: "Nur gesunde Kinder (Test)", verification: V },
  { code: "APPOINTMENT", label: "Terminsprechstunde (Test)", verification: V },
  { code: "OTHER", label: "Sonstiges (unbestätigt)", verification: OPEN },
];
const data = (over: Partial<PulsData> = {}): PulsData => ({
  schedule: {
    rules: [1, 2, 3, 4, 5].flatMap((d) => [r(`h${d}`, d, "08:00", "10:00", "HEALTHY_ONLY"), r(`g${d}`, d, "10:00", "12:00"), r(`a${d}`, d, "14:00", "16:00", "APPOINTMENT")]),
    confirmedClosedWeekdays: [6, 7],
    verification: V,
  },
  consultationTypes: TYPES,
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [HOLIDAY],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  ...over,
});
const withAcute = (): PulsData => {
  const d = data({ consultationTypes: [...TYPES, { code: "ACUTE", label: "Akutsprechstunde", verification: V }] });
  return { ...d, schedule: { ...d.schedule!, rules: [...d.schedule!.rules, r("akut", 4, "10:00", "11:00", "ACUTE")] } };
};
const special = (rows: [string, string, string][], over: Partial<SpecialDayInput> = {}): SpecialDayInput => ({ date: DAY, mode: "SPECIAL", rows: rows.map(([start, end, type]) => ({ start, end, type })), ...over });
const ready = (d: Draft): ReadyDraft => {
  assert.equal(d.ok, true, d.ok ? "" : d.blocked.message);
  return d as ReadyDraft;
};
const blocked = (d: Draft, code: string, text?: RegExp | string) => {
  assert.equal(d.ok, false, "expected a block");
  if (d.ok) return d;
  assert.equal(d.blocked.code, code, d.blocked.message);
  if (typeof text === "string") assert.equal(d.blocked.message, text);
  else if (text) assert.match(d.blocked.message, text);
  return d;
};
const rec = (d: ReadyDraft) => d.record.value as OpeningHourException;
const at = (date: string, time: string, d: PulsData) => getPracticeStatus(zonedToInstant(date, time), d);
const applied = (base: PulsData, d: ReadyDraft): PulsData => ({ ...base, exceptions: [...base.exceptions.filter((x) => x.id !== rec(d).id), rec(d)] });

describe("special day: closed and changed hours", () => {
  test("valid CLOSED date → one-date CLOSED exception, server marker, planned priority", () => {
    const d = ready(specialDayDraft(data(), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"));
    assert.deepEqual([rec(d).id, rec(d).kind, rec(d).startDate, rec(d).endDate, rec(d).intervals, rec(d).reason, rec(d).priority], [`sonderzeit-${DAY}`, "CLOSED", DAY, DAY, [], SPECIAL_DAY_MARKER, SPECIAL_DAY_PRIORITY]);
    assert.equal(d.mode, "NEW");
    assert.equal(at(DAY, "10:00", applied(data(), d)).status, "CLOSED");
    assert.equal(d.actionLabel, "29. Oktober als geschlossen eintragen");
  });
  test("valid SPECIAL_HOURS: sorted, same-type touching rows merged, different types kept", () => {
    const d = ready(specialDayDraft(data(), NOW, special([["10:00", "11:00", "GENERAL"], ["08:00", "09:00", "HEALTHY_ONLY"], ["09:00", "10:00", "GENERAL"]]), "fp"));
    assert.deepEqual(rec(d).intervals, [
      { start: "08:00", end: "09:00", consultationType: "HEALTHY_ONLY" },
      { start: "09:00", end: "11:00", consultationType: "GENERAL" },
    ]);
    assert.equal(rec(d).kind, "SPECIAL_HOURS");
  });
  test("complete-day replacement: an omitted afternoon is closed; nothing is added back", () => {
    const d = ready(specialDayDraft(data(), NOW, special([["08:00", "12:00", "GENERAL"]]), "fp"));
    assert.match(d.effect, /Alle anderen Zeiten dieses Tages sind geschlossen/);
    const after = applied(data(), d);
    assert.equal(at(DAY, "15:00", data()).headline, "Praxis geöffnet");
    assert.equal(at(DAY, "15:00", after).headline, "Heute geschlossen");
    assert.equal(at(DAY, "10:30", after).headline, "Praxis geöffnet");
    const m = specialDayMoments(data(), d);
    assert.deepEqual(m.map((x) => x.label), ["vor Beginn", "während 08:00–12:00", "nach Ende"]);
  });
  test("moments cover every interval and the gap", () => {
    const d = ready(specialDayDraft(data(), NOW, special([["08:00", "10:00", "HEALTHY_ONLY"], ["10:00", "12:00", "GENERAL"], ["15:00", "17:00", "APPOINTMENT"]]), "fp"));
    const m = specialDayMoments(data(), d);
    assert.deepEqual(m.map((x) => x.label), ["vor Beginn", "während 08:00–10:00", "während 10:00–12:00", "Pause 12:00–15:00", "während 15:00–17:00", "nach Ende"]);
    assert.deepEqual(m.map((x) => x.after.indicator), ["NEUTRAL", "OPEN", "OPEN", "NEUTRAL", "OPEN", "NEUTRAL"]);
    assert.equal(m[4].after.currentInterval?.consultationType, "APPOINTMENT", "type preserved");
  });
});

describe("special day: date and interval rules", () => {
  test("invalid date, past date, today → blocked (today goes to the quick actions)", () => {
    blocked(specialDayDraft(data(), NOW, { date: "2026-02-30", mode: "CLOSED", rows: [] }, "fp"), "INVALID_INPUT", /gültiges Datum/);
    blocked(specialDayDraft(data(), NOW, { date: "2026-10-20", mode: "CLOSED", rows: [] }, "fp"), "INVALID_INPUT", /Vergangenheit/);
    blocked(specialDayDraft(data(), NOW, { date: TODAY, mode: "CLOSED", rows: [] }, "fp"), "INVALID_INPUT", TODAY_TEXT);
    blocked(specialDayDraft(data(), NOW, { date: DAY, rows: [] }, "fp"), "INVALID_INPUT", /was an diesem Tag gilt/);
  });
  test("overlap, invalid time, duplicate, reversed, no type → row problems", () => {
    const options = typeOptions(data(), DAY, TODAY);
    const v = validateIntervals(
      [
        { start: "08:00", end: "10:00", type: "GENERAL" },
        { start: "09:00", end: "11:00", type: "GENERAL" },
        { start: "8", end: "10:00", type: "GENERAL" },
        { start: "08:00", end: "10:00", type: "GENERAL" },
        { start: "12:00", end: "11:00", type: "GENERAL" },
        { start: "13:00", end: "14:00", type: "" },
      ],
      options,
    );
    assert.deepEqual(v.problems.map((p) => p.index), [1, 2, 3, 4, 5]);
    assert.match(v.problems[0].message, /überschneidet/);
    assert.match(v.problems[2].message, /doppelt/);
    blocked(specialDayDraft(data(), NOW, special([["08:00", "10:00", "GENERAL"], ["09:00", "11:00", "GENERAL"]]), "fp"), "INVALID_INPUT", /markierten Zeilen/);
    blocked(specialDayDraft(data(), NOW, special([]), "fp"), "INVALID_INPUT", /mindestens eine/);
  });
  test("only usable types from the data; an unverified type is rejected", () => {
    const o = typeOptions(data(), DAY, TODAY);
    assert.deepEqual(o.map((x) => [x.code, x.usable]), [["GENERAL", true], ["HEALTHY_ONLY", true], ["APPOINTMENT", true], ["OTHER", false]]);
    blocked(specialDayDraft(data(), NOW, special([["08:00", "10:00", "OTHER"]]), "fp"), "INVALID_INPUT");
    assert.deepEqual(typeOptions(data({ consultationTypes: [] }), DAY, TODAY), [], "no static fallback list");
  });
  test("ACUTE: without a READY physician baseline rejected (also for the server guard); with it accepted", () => {
    const noBaseline = data({ consultationTypes: [...TYPES, { code: "ACUTE", label: "Akutsprechstunde", verification: OPEN }] });
    assert.equal(typeOptions(noBaseline, DAY, TODAY).find((x) => x.code === "ACUTE")!.usable, false);
    blocked(specialDayDraft(noBaseline, NOW, special([["08:00", "10:00", "ACUTE"]]), "fp"), "INVALID_INPUT");
    assert.equal(typeOptions(withAcute(), DAY, TODAY).find((x) => x.code === "ACUTE")!.usable, true);
    const d = ready(specialDayDraft(withAcute(), NOW, special([["08:00", "10:00", "GENERAL"], ["10:00", "10:30", "ACUTE"]]), "fp"));
    assert.equal(at(DAY, "10:15", applied(withAcute(), d)).status, "ACUTE_CONSULTATION");
  });
  test("regular template = confirmed weekly plan of the weekday (editor only); public message length", () => {
    assert.deepEqual(regularTemplate(data(), DAY, typeOptions(data(), DAY, TODAY)).map((s) => `${s.start}-${s.end} ${s.type}`), ["08:00-10:00 HEALTHY_ONLY", "10:00-12:00 GENERAL", "14:00-16:00 APPOINTMENT"]);
    blocked(specialDayDraft(data(), NOW, { date: DAY, mode: "CLOSED", rows: [], message: "x".repeat(281) }, "fp"), "INVALID_INPUT", /280/);
  });
});

describe("holiday resolution (artificial holiday)", () => {
  test("before: UNKNOWN / HOLIDAY_WITHOUT_RULE", () => {
    assert.equal(at(HOLIDAY, "10:00", data()).reason, "HOLIDAY_WITHOUT_RULE");
    assert.equal(holidayUnresolved(data(), HOLIDAY), true);
    assert.equal(holidayUnresolved(data(), DAY), false);
  });
  test("CLOSED → CLOSED; record id names the holiday; policy untouched", () => {
    const d = ready(specialDayDraft(data(), NOW, { date: HOLIDAY, mode: "CLOSED", rows: [] }, "fp"));
    assert.equal(rec(d).id, `feiertag-${HOLIDAY}`);
    const after = applied(data(), d);
    assert.equal(at(HOLIDAY, "10:00", after).status, "CLOSED");
    assert.equal(holidayUnresolved(after, HOLIDAY), false);
    assert.deepEqual(after.holidayPolicy, { mode: "REQUIRE_EXPLICIT_ENTRY" });
  });
  test("SPECIAL_HOURS → open during the interval, closed outside", () => {
    const d = ready(specialDayDraft(data(), NOW, { date: HOLIDAY, mode: "SPECIAL", rows: [{ start: "09:00", end: "11:00", type: "GENERAL" }] }, "fp"));
    const after = applied(data(), d);
    assert.equal(at(HOLIDAY, "10:00", after).indicator, "OPEN");
    assert.equal(at(HOLIDAY, "08:00", after).indicator, "NEUTRAL");
    assert.equal(at(HOLIDAY, "12:00", after).headline, "Heute geschlossen");
  });
  test("Prüfen: unresolved holiday has 'Feiertag klären'; disappears once resolved; confirmed closed weekend never listed", () => {
    const item = reviewItems(data(), TODAY).find((i) => i.id === `holiday-${HOLIDAY}`)!;
    assert.deepEqual(item.action, { label: "Feiertag klären", href: `/intern/sonderzeiten?datum=${HOLIDAY}` });
    assert.doesNotMatch(item.title, /Reformation|Allerheiligen/, "no invented holiday name");
    const d = ready(specialDayDraft(data(), NOW, { date: HOLIDAY, mode: "CLOSED", rows: [] }, "fp"));
    assert.equal(reviewItems(applied(data(), d), TODAY).some((i) => i.id === `holiday-${HOLIDAY}`), false);
    assert.equal(reviewItems(data({ publicHolidays: ["2026-10-31"] }), TODAY).some((i) => i.id.startsWith("holiday-")), false, "Saturday = confirmed closed");
  });
});

describe("conflicts — never merged, never superseded", () => {
  const ex = (id: string, extra: Partial<OpeningHourException> = {}): OpeningHourException => ({ id, kind: "SPECIAL_HOURS", startDate: DAY, endDate: DAY, intervals: [{ start: "08:00", end: "11:00", consultationType: "GENERAL" }], priority: 10, verification: V, ...extra });
  test("a closure covering the date → blocked with its edit link", () => {
    const c: Closure = { id: "urlaub-x", kind: "VACATION", startDate: "2026-10-28", endDate: "2026-10-30", replacements: [], verification: V };
    const b = blocked(specialDayDraft(data({ closures: [c] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "CLOSURE_EXISTS");
    assert.ok(!b.ok && b.blocked.suggestion?.href === "/intern/urlaub/urlaub-x");
  });
  test("acute-today, early-close, unrelated and multi-day exceptions → blocked", () => {
    blocked(specialDayDraft(data({ exceptions: [ex("a", { reason: ACUTE_TODAY_MARKER })] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "SPECIAL_HOURS_EXISTS", /Akutsprechstunde/);
    blocked(specialDayDraft(data({ exceptions: [ex(`heute-frueher-${DAY}`)] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "SPECIAL_HOURS_EXISTS", /früher schließen/);
    blocked(specialDayDraft(data({ exceptions: [ex("fremd")] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "SPECIAL_HOURS_EXISTS", /andere Änderung/);
    blocked(specialDayDraft(data({ exceptions: [ex("mehrtaegig", { startDate: "2026-10-28", endDate: "2026-10-30" })] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "SPECIAL_HOURS_EXISTS");
  });
  test("own record: a new entry is routed to edit; editing keeps the id and may switch CLOSED ↔ SPECIAL", () => {
    const own = ex(`sonderzeit-${DAY}`, { reason: SPECIAL_DAY_MARKER, kind: "CLOSED", intervals: [] });
    const b = blocked(specialDayDraft(data({ exceptions: [own] }), NOW, { date: DAY, mode: "CLOSED", rows: [] }, "fp"), "SPECIAL_HOURS_EXISTS");
    assert.ok(!b.ok && b.blocked.suggestion?.href === `/intern/sonderzeiten/sonderzeit-${DAY}`);
    const e = ready(specialDayDraft(data({ exceptions: [own] }), NOW, special([["09:00", "12:00", "GENERAL"]], { recordId: own.id }), "fp"));
    assert.deepEqual([e.mode, rec(e).id, rec(e).kind], ["EDIT", own.id, "SPECIAL_HOURS"]);
    blocked(specialDayDraft(data({ exceptions: [own] }), NOW, { recordId: own.id, date: DAY, mode: "CLOSED", rows: [] }, "fp"), "NO_CHANGE");
    blocked(specialDayDraft(data({ exceptions: [own] }), NOW, { recordId: own.id, date: "2026-10-30", mode: "CLOSED", rows: [] }, "fp"), "NOT_EDITABLE", /nicht verschoben/);
    blocked(specialDayDraft(data({ exceptions: [ex("fremd")] }), NOW, { recordId: "fremd", date: DAY, mode: "CLOSED", rows: [] }, "fp"), "NOT_EDITABLE");
  });
});

describe("forms, history, Nächste Termine", () => {
  test("parse: only date, mode, rows, note; the record id only as an edit target", () => {
    const i = parseSpecialDay(fromSearch({ datum: DAY, art: "geaendert", z0_von: "08:00", z0_bis: "10:00", z0_art: "GENERAL", reason: "x", priority: "999", recordId: "evil", verifiedBy: "Dr. X", rolle: "ADMIN" }));
    assert.deepEqual(i, { date: DAY, mode: "SPECIAL", rows: [{ start: "08:00", end: "10:00", type: "GENERAL" }], message: undefined });
    assert.equal(parseSpecialDay(fromSearch({ eintrag: "../x", datum: DAY })).recordId, "");
    assert.equal(specialDayQuery({ date: DAY, mode: "CLOSED", rows: [] }), `datum=${DAY}&art=geschlossen`);
  });
  test("history wording, never the marker", () => {
    const ev = (next: unknown, operation = "CREATE") => ({ eventId: "e", at: "2026-10-21T08:00:00Z", actorId: "1", actorName: "T", actorRole: "STAFF", entityType: "openingHourExceptions" as const, entityId: "x", operation: operation as "CREATE", previous: null, next });
    const sp = { kind: "SPECIAL_HOURS", startDate: "2026-10-31", endDate: "2026-10-31", reason: SPECIAL_DAY_MARKER, intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }] };
    assert.equal(describeEvent(ev(sp), TODAY), "Sonderöffnungszeit für 31. Oktober eingetragen");
    assert.equal(describeEvent(ev(sp, "UPDATE"), TODAY), "Sonderöffnungszeit für 31. Oktober geändert");
    assert.equal(describeEvent(ev({ ...sp, kind: "CLOSED", intervals: [] }), TODAY), "31. Oktober als geschlossen eingetragen");
    assert.equal(describeGroup([ev({ ...sp, recordState: "RETIRED" }, "REVERT")], TODAY), "Änderung am 31. Oktober zurückgenommen");
  });
  test("edit links only for future single-date records of this workflow", () => {
    const own: OpeningHourException = { id: `sonderzeit-${DAY}`, kind: "CLOSED", startDate: DAY, endDate: DAY, intervals: [], reason: SPECIAL_DAY_MARKER, priority: 10, verification: V };
    const other: OpeningHourException = { ...own, id: "fremd", reason: undefined };
    const items = upcomingItems(data({ exceptions: [own, other] }), [], TODAY);
    assert.equal(items.find((i) => i.id === own.id)!.editHref, `/intern/sonderzeiten/sonderzeit-${DAY}`);
    assert.equal(items.find((i) => i.id === "fremd")!.editHref, undefined);
  });
});
