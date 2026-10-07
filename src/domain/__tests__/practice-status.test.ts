// PRAXIS PULS engine tests. Run: npm test
// All instants are UTC; comments give the Europe/Berlin wall time.
// October 5–23 2026 = CEST (UTC+2); from October 25 2026 = CET (UTC+1).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getPracticeStatus, PRACTICE_STATUSES, type PracticeStatusResult } from "../practice-status.ts";
import {
  ACUTE_TYPE,
  OUTDATED,
  UNCONFIRMED,
  VERIFIED,
  at,
  baseData,
  closure,
  exception,
  replacement,
  rule,
  withRules,
} from "./fixtures.ts";

const MON_0900 = at("2026-10-05T07:00:00Z"); // Mon 09:00

function assertSafeUnknown(r: PracticeStatusResult, reason?: string) {
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.indicator, "NONE", "UNKNOWN must never carry a status colour");
  assert.equal(r.nextOpening, null, "UNKNOWN must not invent a next opening");
  assert.equal(r.headline, "Aktuelle Sprechzeiten");
  assert.equal(r.detail, "Bitte aktuelle Informationen prüfen.");
  assert.deepEqual([r.primaryAction.id, ...r.secondaryActions.map((a) => a.id)], ["HOURS", "CALL"]);
  assert.equal(r.dataConfidence, "UNKNOWN");
  assert.notEqual(r.consultationType, "ACUTE");
  if (reason) assert.equal(r.reason, reason);
}

describe("regular hours", () => {
  test("normal open state", () => {
    const r = getPracticeStatus(MON_0900, baseData());
    assert.equal(r.status, "OPEN");
    assert.equal(r.indicator, "OPEN");
    assert.equal(r.headline, "Praxis geöffnet");
    assert.equal(r.detail, "Heute bis 12:00 Uhr");
    assert.equal(r.primaryAction.id, "CALL");
    assert.deepEqual(r.currentInterval, { start: "08:00", end: "12:00", consultationType: "GENERAL" });
    assert.equal(r.dataConfidence, "VERIFIED");
    assert.equal(r.evaluatedAt.localTime, "09:00");
    assert.equal(r.evaluatedAt.timeZone, "Europe/Berlin");
  });

  test("normal closed state after hours → next opening tomorrow", () => {
    const r = getPracticeStatus(at("2026-10-05T16:00:00Z"), baseData()); // Mon 18:00
    assert.equal(r.status, "CLOSED");
    assert.equal(r.indicator, "NEUTRAL");
    assert.equal(r.nextOpening?.label, "morgen um 08:00 Uhr");
    assert.equal(r.nextOpening?.instant, "2026-10-06T06:00:00.000Z");
    assert.equal(r.detail, "Öffnet morgen um 08:00 Uhr");
  });

  test("before opening without a soon-threshold → CLOSED with next opening today", () => {
    const r = getPracticeStatus(at("2026-10-06T05:00:00Z"), baseData()); // Tue 07:00
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.label, "heute um 08:00 Uhr");
  });

  test("opening soon (threshold 30 min)", () => {
    const r = getPracticeStatus(at("2026-10-06T05:45:00Z"), baseData(), { soonThresholdMinutes: 30 }); // Tue 07:45
    assert.equal(r.status, "OPENING_SOON");
    assert.equal(r.detail, "Heute ab 08:00 Uhr");
    assert.equal(r.indicator, "NEUTRAL");
  });

  test("near closing (threshold 30 min)", () => {
    const r = getPracticeStatus(at("2026-10-06T09:40:00Z"), baseData(), { soonThresholdMinutes: 30 }); // Tue 11:40
    assert.equal(r.status, "CLOSING_SOON");
    assert.equal(r.detail, "Schließt um 12:00 Uhr");
  });

  test("soon states are disabled when no threshold is agreed", () => {
    const r = getPracticeStatus(at("2026-10-06T09:40:00Z"), baseData()); // Tue 11:40
    assert.equal(r.status, "OPEN");
  });

  test("midday gap → closed, reopens today", () => {
    const r = getPracticeStatus(at("2026-10-05T11:00:00Z"), baseData()); // Mon 13:00
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.label, "heute um 14:00 Uhr");
  });

  test("weekend (confirmed closed) → next opening Monday with German date", () => {
    const r = getPracticeStatus(at("2026-10-10T10:00:00Z"), baseData()); // Sat 12:00
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.label, "am Montag, 12. Oktober um 08:00 Uhr");
  });

  test("contiguous intervals form one block; current type is reported", () => {
    const data = baseData();
    data.schedule!.rules = data.schedule!.rules.filter((r) => r.id !== "tue-am");
    const d = withRules(data, [
      rule("tue-healthy", 2, "08:00", "10:00", { consultationType: "HEALTHY_ONLY" }),
      rule("tue-general", 2, "10:00", "12:00"),
    ]);
    const r = getPracticeStatus(at("2026-10-06T07:00:00Z"), d); // Tue 09:00
    assert.equal(r.status, "OPEN");
    assert.equal(r.detail, "Heute bis 12:00 Uhr");
    assert.equal(r.consultationType, "HEALTHY_ONLY");
  });
});

describe("acute consultation", () => {
  const acuteRule = rule("mon-acute", 1, "10:00", "11:00", { consultationType: "ACUTE" });

  test("verified acute window and verified acute type → ACUTE_CONSULTATION", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [acuteRule]);
    const r = getPracticeStatus(at("2026-10-05T08:30:00Z"), d); // Mon 10:30
    assert.equal(r.status, "ACUTE_CONSULTATION");
    assert.equal(r.headline, "Akutsprechstunde");
    assert.equal(r.detail, "Heute bis 11:00 Uhr");
  });

  test("verified general hours + unverified acute rule → OPEN, acute suppressed", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [{ ...acuteRule, verification: UNCONFIRMED }]);
    const r = getPracticeStatus(at("2026-10-05T08:30:00Z"), d);
    assert.equal(r.status, "OPEN");
    assert.equal(r.acuteSuppressed, true);
    assert.notEqual(r.consultationType, "ACUTE");
  });

  test("acute rule verified but ACUTE consultation type missing/unverified → suppressed", () => {
    const d = withRules(baseData({ consultationTypes: [{ ...ACUTE_TYPE, verification: UNCONFIRMED }] }), [acuteRule]);
    const r = getPracticeStatus(at("2026-10-05T08:30:00Z"), d);
    assert.equal(r.status, "OPEN");
    assert.equal(r.acuteSuppressed, true);
  });

  test("verified acute window outside opening hours → UNKNOWN (contradiction)", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [rule("bad-acute", 1, "12:30", "13:30", { consultationType: "ACUTE" })]);
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "ACUTE_CONFLICT");
  });
});

describe("exceptions", () => {
  test("special hours today: inside the changed interval", () => {
    const r = getPracticeStatus(MON_0900, baseData({ exceptions: [exception("ex1", "2026-10-05", "2026-10-05")] }));
    assert.equal(r.status, "SPECIAL_HOURS");
    assert.equal(r.indicator, "ATTENTION");
    assert.equal(r.headline, "Geänderte Sprechzeit heute");
    assert.equal(r.detail, "08:00–10:00 Uhr");
    assert.equal(r.currentInterval?.end, "10:00");
  });

  test("special hours today: after the changed interval → next opening from regular week", () => {
    const r = getPracticeStatus(at("2026-10-05T09:00:00Z"), baseData({ exceptions: [exception("ex1", "2026-10-05", "2026-10-05")] })); // Mon 11:00
    assert.equal(r.status, "SPECIAL_HOURS");
    assert.equal(r.currentInterval, undefined);
    assert.equal(r.nextOpening?.label, "morgen um 08:00 Uhr");
  });

  test("one-day closure exception (CLOSED) → CLOSED with next opening", () => {
    const r = getPracticeStatus(MON_0900, baseData({ exceptions: [exception("ex-closed", "2026-10-05", "2026-10-05", { kind: "CLOSED", intervals: [] })] }));
    assert.equal(r.status, "CLOSED");
    assert.equal(r.headline, "Heute geschlossen");
    assert.equal(r.nextOpening?.label, "morgen um 08:00 Uhr");
  });

  test("conflicting exceptions with equal priority → UNKNOWN", () => {
    const d = baseData({
      exceptions: [
        exception("a", "2026-10-05", "2026-10-05"),
        exception("b", "2026-10-05", "2026-10-05", { intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }] }),
      ],
    });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "EXCEPTION_CONFLICT");
  });

  test("overlapping exceptions with different priority → higher priority wins", () => {
    const d = baseData({
      exceptions: [
        exception("low", "2026-10-05", "2026-10-05"),
        exception("high", "2026-10-05", "2026-10-05", { priority: 5, intervals: [{ start: "08:00", end: "09:30", consultationType: "GENERAL" }] }),
      ],
    });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "SPECIAL_HOURS");
    assert.equal(r.activeException?.id, "high");
    assert.equal(r.detail, "08:00–09:30 Uhr");
  });

  test("unverified exception covering today → UNKNOWN", () => {
    const d = baseData({ exceptions: [exception("ex", "2026-10-05", "2026-10-05", { verification: UNCONFIRMED })] });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "EXCEPTION_UNVERIFIED");
  });

  test("outdated exception is ignored entirely", () => {
    const d = baseData({ exceptions: [exception("old", "2026-10-05", "2026-10-05", { verification: OUTDATED })] });
    assert.equal(getPracticeStatus(MON_0900, d).status, "OPEN");
  });

  test("exception with invalid interval → UNKNOWN", () => {
    const d = baseData({ exceptions: [exception("bad", "2026-10-05", "2026-10-05", { intervals: [{ start: "12:00", end: "08:00", consultationType: "GENERAL" }] })] });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "INVALID_DATA");
  });
});

describe("closures and replacement practices", () => {
  test("vacation with verified replacement → VACATION, replacement shown, next opening after end", () => {
    const d = baseData({
      closures: [closure("v1", "2026-10-05", "2026-10-09", { replacements: [{ replacementPracticeId: "rp1", from: "2026-10-05", until: "2026-10-09" }] })],
      replacementPractices: [replacement("rp1")],
    });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "VACATION");
    assert.equal(r.indicator, "CLOSURE");
    assert.equal(r.headline, "Praxisurlaub");
    assert.equal(r.detail, "Bis Freitag, 9. Oktober");
    assert.equal(r.primaryAction.id, "REPLACEMENT");
    assert.equal(r.replacementPractices.length, 1);
    assert.equal(r.replacementPractices[0].address, "Teststraße 1, 00000 Teststadt");
    assert.equal(r.replacementFallback, false);
    assert.equal(r.nextOpening?.label, "am Montag, 12. Oktober um 08:00 Uhr");
  });

  test("vacation with stale replacement → replacement hidden, safe fallback", () => {
    const stale = { ...VERIFIED, lastVerified: "2025-01-01", reviewDue: "2025-07-01" };
    const d = baseData({
      closures: [closure("v1", "2026-10-05", "2026-10-09", { replacements: [{ replacementPracticeId: "rp1", from: "2026-10-05", until: "2026-10-09" }] })],
      replacementPractices: [replacement("rp1", stale)],
    });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "VACATION");
    assert.equal(r.replacementPractices.length, 0);
    assert.equal(r.replacementFallback, true);
    assert.equal(r.primaryAction.id, "EMERGENCY");
  });

  test("unverified replacement practice is never shown", () => {
    const d = baseData({
      closures: [closure("v1", "2026-10-05", "2026-10-09", { replacements: [{ replacementPracticeId: "rp1", from: "2026-10-05", until: "2026-10-09" }] })],
      replacementPractices: [replacement("rp1", UNCONFIRMED)],
    });
    assert.equal(getPracticeStatus(MON_0900, d).replacementPractices.length, 0);
  });

  test("replacement assigned to another week is not shown today", () => {
    const d = baseData({
      closures: [closure("v1", "2026-10-05", "2026-10-16", { replacements: [{ replacementPracticeId: "rp1", from: "2026-10-12", until: "2026-10-16" }] })],
      replacementPractices: [replacement("rp1")],
    });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.replacementPractices.length, 0);
    assert.equal(r.replacementFallback, true);
  });

  test("temporary closure (short notice) → TEMPORARILY_CLOSED with message", () => {
    const d = baseData({ closures: [closure("t1", "2026-10-05", "2026-10-05", { kind: "SHORT_NOTICE", publicMessage: "Heute leider geschlossen." })] });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "TEMPORARILY_CLOSED");
    assert.equal(r.indicator, "ATTENTION");
    assert.equal(r.detail, "Heute leider geschlossen.");
  });

  test("one-day training closure → TEMPORARILY_CLOSED", () => {
    const r = getPracticeStatus(MON_0900, baseData({ closures: [closure("tr", "2026-10-05", "2026-10-05", { kind: "TRAINING" })] }));
    assert.equal(r.status, "TEMPORARILY_CLOSED");
  });

  test("short-notice closure overlapping a vacation wins (more specific)", () => {
    const d = baseData({ closures: [closure("v", "2026-10-01", "2026-10-09"), closure("t", "2026-10-05", "2026-10-05", { kind: "SHORT_NOTICE" })] });
    assert.equal(getPracticeStatus(MON_0900, d).status, "TEMPORARILY_CLOSED");
  });

  test("future vacation inside announcement window → normal status + upcoming closure", () => {
    const d = baseData({ closures: [closure("v", "2026-10-19", "2026-10-23", { announceFrom: "2026-10-01" })] });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "OPEN");
    assert.equal(r.upcomingClosure?.id, "v");
  });

  test("future vacation before its announcement window → not announced", () => {
    const d = baseData({ closures: [closure("v", "2026-10-19", "2026-10-23", { announceFrom: "2026-10-12" })] });
    assert.equal(getPracticeStatus(MON_0900, d).upcomingClosure, undefined);
  });

  test("unverified future vacation is not announced", () => {
    const d = baseData({ closures: [closure("v", "2026-10-19", "2026-10-23", { announceFrom: "2026-10-01", verification: UNCONFIRMED })] });
    assert.equal(getPracticeStatus(MON_0900, d).upcomingClosure, undefined);
  });

  test("expired vacation disappears automatically", () => {
    const d = baseData({ closures: [closure("old", "2026-09-21", "2026-10-02", { announceFrom: "2026-09-01" })] });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "OPEN");
    assert.equal(r.activeClosure, undefined);
    assert.equal(r.upcomingClosure, undefined);
  });

  test("unverified vacation covering today → UNKNOWN (cannot say open or closed)", () => {
    const d = baseData({ closures: [closure("v", "2026-10-05", "2026-10-09", { verification: UNCONFIRMED })] });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "CLOSURE_UNVERIFIED");
  });

  test("vacation overlapping special (open) hours → UNKNOWN (contradiction)", () => {
    const d = baseData({ closures: [closure("v", "2026-10-05", "2026-10-09")], exceptions: [exception("ex", "2026-10-05", "2026-10-05")] });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "CLOSURE_EXCEPTION_CONFLICT");
  });

  test("vacation overlapping a CLOSED exception → VACATION (both say closed)", () => {
    const d = baseData({
      closures: [closure("v", "2026-10-05", "2026-10-09")],
      exceptions: [exception("ex", "2026-10-05", "2026-10-05", { kind: "CLOSED", intervals: [] })],
    });
    assert.equal(getPracticeStatus(MON_0900, d).status, "VACATION");
  });
});

describe("missing, unverified, stale and conflicting data → safe UNKNOWN", () => {
  test("missing opening hours", () => {
    assertSafeUnknown(getPracticeStatus(MON_0900, baseData({ schedule: undefined })), "NO_SCHEDULE");
  });

  test("unverified schedule", () => {
    const d = baseData();
    d.schedule = { ...d.schedule!, verification: UNCONFIRMED };
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "SCHEDULE_UNVERIFIED");
  });

  test("unverified rule for today", () => {
    const d = baseData();
    d.schedule!.rules = d.schedule!.rules.map((r) => (r.id === "mon-am" ? { ...r, verification: UNCONFIRMED } : r));
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "RULE_UNVERIFIED");
  });

  test("weekday without rules that is not confirmed closed (absence ≠ closed)", () => {
    const d = baseData();
    d.schedule!.confirmedClosedWeekdays = [7];
    assertSafeUnknown(getPracticeStatus(at("2026-10-10T08:00:00Z"), d), "NO_RULES_FOR_DAY"); // Sat
  });

  test("overlapping weekly rules → UNKNOWN", () => {
    const d = withRules(baseData(), [rule("overlap", 1, "11:00", "13:00", { consultationType: "APPOINTMENT" })]);
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "RULE_CONFLICT");
  });

  test("rules on a confirmed closed weekday → UNKNOWN", () => {
    const d = withRules(baseData(), [rule("sat", 6, "09:00", "11:00")]);
    assertSafeUnknown(getPracticeStatus(at("2026-10-10T08:00:00Z"), d), "RULE_CONFLICT");
  });

  test("cross-midnight / inverted interval → UNKNOWN", () => {
    const d = withRules(baseData(), [rule("night", 2, "22:00", "02:00", { validFrom: "2026-10-06", validUntil: "2026-10-06" })]);
    assertSafeUnknown(getPracticeStatus(at("2026-10-06T07:00:00Z"), d), "INVALID_DATA");
  });

  test("schedule review due but within grace → OPEN with REVIEW_DUE confidence", () => {
    const d = baseData();
    d.schedule = { ...d.schedule!, verification: { ...VERIFIED, reviewDue: "2026-09-15" } };
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "OPEN");
    assert.equal(r.dataConfidence, "REVIEW_DUE");
  });

  test("schedule review expired beyond grace → UNKNOWN", () => {
    const d = baseData();
    d.schedule = { ...d.schedule!, verification: { ...VERIFIED, reviewDue: "2026-06-01" } };
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "SCHEDULE_REVIEW_EXPIRED");
  });

  test("verified status without review dates counts as unverified for high-risk data", () => {
    const d = baseData();
    d.schedule = { ...d.schedule!, verification: { status: "VERIFIED_CURRENT", sourceIds: [] } };
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "SCHEDULE_UNVERIFIED");
  });

  test("next opening blocked by an unknown day → null, never invented", () => {
    const d = baseData({ publicHolidays: ["2026-10-06"] }); // synthetic holiday on Tue
    const r = getPracticeStatus(at("2026-10-05T16:00:00Z"), d); // Mon 18:00
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening, null);
    assert.equal(r.detail, "Nächste Sprechzeit ansehen");
  });

  test("invalid 'now' → UNKNOWN", () => {
    assertSafeUnknown(getPracticeStatus(new Date("invalid"), baseData()), "INVALID_NOW");
  });

  test("UNKNOWN is never visually OPEN for any reason", () => {
    const cases = [
      baseData({ schedule: undefined }),
      baseData({ exceptions: [exception("x", "2026-10-05", "2026-10-05", { verification: UNCONFIRMED })] }),
      baseData({ closures: [closure("x", "2026-10-05", "2026-10-05", { verification: UNCONFIRMED })] }),
    ];
    for (const c of cases) {
      const r = getPracticeStatus(MON_0900, c);
      assert.equal(r.status, "UNKNOWN");
      assert.equal(r.indicator, "NONE");
    }
    assert.ok(PRACTICE_STATUSES.includes("UNKNOWN"));
  });
});

describe("public holidays", () => {
  test("holiday without explicit rule → UNKNOWN (never assumed closed)", () => {
    assertSafeUnknown(getPracticeStatus(MON_0900, baseData({ publicHolidays: ["2026-10-05"] })), "HOLIDAY_WITHOUT_RULE");
  });

  test("holiday with verified 'closed on public holidays' policy → CLOSED", () => {
    const d = baseData({ publicHolidays: ["2026-10-05"], holidayPolicy: { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: VERIFIED } });
    const r = getPracticeStatus(MON_0900, d);
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.label, "morgen um 08:00 Uhr");
  });

  test("holiday with unverified policy → UNKNOWN", () => {
    const d = baseData({ publicHolidays: ["2026-10-05"], holidayPolicy: { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: UNCONFIRMED } });
    assertSafeUnknown(getPracticeStatus(MON_0900, d), "HOLIDAY_POLICY_UNVERIFIED");
  });

  test("holiday with explicit special-hours exception → SPECIAL_HOURS", () => {
    const d = baseData({ publicHolidays: ["2026-10-05"], exceptions: [exception("h", "2026-10-05", "2026-10-05")] });
    assert.equal(getPracticeStatus(MON_0900, d).status, "SPECIAL_HOURS");
  });
});

describe("time zone, DST and day boundaries (Europe/Berlin)", () => {
  test("spring DST: Friday evening → next opening Monday 08:00 CEST = 06:00 UTC", () => {
    const r = getPracticeStatus(at("2026-03-27T17:00:00Z"), baseData()); // Fri 18:00 CET
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.date, "2026-03-30");
    assert.equal(r.nextOpening?.instant, "2026-03-30T06:00:00.000Z");
  });

  test("spring DST: Monday 08:30 CEST is open (06:30 UTC)", () => {
    const r = getPracticeStatus(at("2026-03-30T06:30:00Z"), baseData());
    assert.equal(r.status, "OPEN");
    assert.equal(r.evaluatedAt.localTime, "08:30");
  });

  test("autumn DST: Monday 08:30 CET is open (07:30 UTC), 06:30 UTC is still closed", () => {
    assert.equal(getPracticeStatus(at("2026-10-26T07:30:00Z"), baseData()).status, "OPEN");
    const early = getPracticeStatus(at("2026-10-26T06:30:00Z"), baseData()); // 07:30 CET
    assert.equal(early.status, "CLOSED");
    assert.equal(early.nextOpening?.instant, "2026-10-26T07:00:00.000Z");
  });

  test("autumn DST: Friday evening → next opening instant uses the new offset", () => {
    const r = getPracticeStatus(at("2026-10-23T16:00:00Z"), baseData()); // Fri 18:00 CEST
    assert.equal(r.nextOpening?.date, "2026-10-26");
    assert.equal(r.nextOpening?.instant, "2026-10-26T07:00:00.000Z");
  });

  test("midnight boundary: 23:59 Monday vs. 00:00 Tuesday", () => {
    const mon = getPracticeStatus(at("2026-10-05T21:59:00Z"), baseData()); // Mon 23:59
    assert.equal(mon.evaluatedAt.localDate, "2026-10-05");
    assert.equal(mon.nextOpening?.label, "morgen um 08:00 Uhr");
    const tue = getPracticeStatus(at("2026-10-05T22:00:00Z"), baseData()); // Tue 00:00
    assert.equal(tue.evaluatedAt.localDate, "2026-10-06");
    assert.equal(tue.nextOpening?.label, "heute um 08:00 Uhr");
  });

  test("weekday transition uses Berlin date, not UTC date", () => {
    // Sunday 23:30 UTC = Monday 01:30 CEST (Berlin) — must be treated as Monday.
    const r = getPracticeStatus(at("2026-10-04T23:30:00Z"), baseData());
    assert.equal(r.evaluatedAt.localDate, "2026-10-05");
    assert.equal(r.nextOpening?.label, "heute um 08:00 Uhr");
  });

  test("validity periods of rules apply on the Berlin date", () => {
    const d = baseData();
    d.schedule!.rules = d.schedule!.rules.map((r) => (r.id === "mon-am" ? { ...r, validUntil: "2026-10-04" } : r));
    d.schedule!.rules.push(rule("mon-am-new", 1, "09:00", "12:00", { validFrom: "2026-10-05" }));
    const r = getPracticeStatus(at("2026-10-05T06:30:00Z"), d); // Mon 08:30
    assert.equal(r.status, "CLOSED");
    assert.equal(r.nextOpening?.label, "heute um 09:00 Uhr");
  });
});
