// 09.5E — acute consultation in the engine: weekly acute rules AND acute intervals of changed
// hours (SPECIAL_HOURS) need the same usable ACUTE consultation type. SYNTHETIC DATA ONLY.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { acuteTypeUsable, getPracticeStatus } from "../practice-status.ts";
import { ACUTE_TYPE, UNCONFIRMED, VERIFIED, at, baseData, exception, rule, withRules } from "./fixtures.ts";

const MON = "2026-10-05";
/** Monday wall time (CEST, UTC+2). */
const t = (hhmm: string) => at(`${MON}T${String(Number(hhmm.slice(0, 2)) - 2).padStart(2, "0")}:${hhmm.slice(3)}:00Z`);
const weeklyAcute = rule("mon-acute", 1, "10:00", "11:00", { consultationType: "ACUTE" });
const special = (types: (typeof ACUTE_TYPE)[] = []) =>
  baseData({
    consultationTypes: types,
    exceptions: [
      exception("akut-heute", MON, MON, {
        priority: 100,
        intervals: [
          { start: "08:00", end: "10:00", consultationType: "GENERAL" },
          { start: "10:00", end: "11:00", consultationType: "ACUTE" },
          { start: "11:00", end: "12:00", consultationType: "GENERAL" },
        ],
      }),
    ],
  });
const expired = { ...VERIFIED, lastVerified: "2025-01-01", reviewDue: "2025-06-01" };

describe("acuteTypeUsable — one check for every acute statement", () => {
  test("missing, unconfirmed, expired → false; verified and fresh → true", () => {
    assert.equal(acuteTypeUsable({ consultationTypes: [] }, MON), false);
    assert.equal(acuteTypeUsable({ consultationTypes: [{ ...ACUTE_TYPE, verification: UNCONFIRMED }] }, MON), false);
    assert.equal(acuteTypeUsable({ consultationTypes: [{ ...ACUTE_TYPE, verification: expired }] }, MON), false);
    assert.equal(acuteTypeUsable({ consultationTypes: [ACUTE_TYPE] }, MON), true);
  });
});

describe("09.5E: weekly acute and acute in changed hours", () => {
  test("A: weekly ACUTE + unusable type → acute suppressed, ordinary opening", () => {
    for (const v of [UNCONFIRMED, expired]) {
      const r = getPracticeStatus(t("10:30"), withRules(baseData({ consultationTypes: [{ ...ACUTE_TYPE, verification: v }] }), [weeklyAcute]));
      assert.equal(r.status, "OPEN");
      assert.equal(r.acuteSuppressed, true);
      assert.deepEqual(r.acuteToday, []);
    }
  });

  test("B: weekly ACUTE + usable type → ACUTE_CONSULTATION inside, OPEN before / after", () => {
    const d = withRules(baseData({ consultationTypes: [ACUTE_TYPE] }), [weeklyAcute]);
    const inside = getPracticeStatus(t("10:30"), d);
    assert.equal(inside.status, "ACUTE_CONSULTATION");
    assert.equal(inside.headline, "Akutsprechstunde");
    assert.equal(inside.detail, "Heute bis 11:00 Uhr");
    assert.equal(getPracticeStatus(t("09:59"), d).status, "OPEN");
    assert.equal(getPracticeStatus(t("11:00"), d).status, "OPEN");
    assert.deepEqual(getPracticeStatus(t("09:00"), d).acuteToday, [{ start: "10:00", end: "11:00" }]);
  });

  test("C: SPECIAL_HOURS ACUTE + unusable type → no acute claim, opening kept, suppression signalled", () => {
    for (const types of [[], [{ ...ACUTE_TYPE, verification: UNCONFIRMED }], [{ ...ACUTE_TYPE, verification: expired }]]) {
      const r = getPracticeStatus(t("10:30"), special(types));
      assert.equal(r.status, "SPECIAL_HOURS", "the day is NOT turned UNKNOWN");
      assert.equal(r.headline, "Praxis geöffnet");
      assert.notEqual(r.consultationType, "ACUTE");
      assert.equal(r.currentInterval?.consultationType, "GENERAL");
      assert.equal(r.acuteSuppressed, true);
      assert.deepEqual(r.acuteToday, []);
      assert.deepEqual(r.activeException?.intervals, ["08:00–12:00 Uhr"]);
    }
  });

  test("D: SPECIAL_HOURS ACUTE + usable type → ACUTE_CONSULTATION with the interval's end", () => {
    const r = getPracticeStatus(t("10:30"), special([ACUTE_TYPE]));
    assert.equal(r.status, "ACUTE_CONSULTATION");
    assert.equal(r.indicator, "OPEN");
    assert.equal(r.headline, "Akutsprechstunde");
    assert.equal(r.detail, "Heute bis 11:00 Uhr");
    assert.deepEqual(r.currentInterval, { start: "10:00", end: "11:00", consultationType: "ACUTE" });
    assert.equal(r.activeException?.id, "akut-heute");
    assert.equal(r.acuteSuppressed, false);
  });

  test("D2: outside the acute interval the rest of the changed day behaves normally", () => {
    const d = special([ACUTE_TYPE]);
    const before = getPracticeStatus(t("09:00"), d);
    assert.equal(before.status, "SPECIAL_HOURS");
    assert.equal(before.headline, "Praxis geöffnet");
    assert.equal(before.detail, "Heute bis 12:00 Uhr");
    assert.deepEqual(before.acuteToday, [{ start: "10:00", end: "11:00" }]);
    const after = getPracticeStatus(t("11:30"), d);
    assert.equal(after.status, "SPECIAL_HOURS");
    assert.equal(after.currentInterval?.consultationType, "GENERAL");
    assert.equal(getPracticeStatus(t("12:30"), d).headline, "Heute geschlossen");
  });

  test("E: ordinary SPECIAL_HOURS without ACUTE are unchanged", () => {
    const d = baseData({ exceptions: [exception("x", MON, MON, { intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }] })] });
    const r = getPracticeStatus(t("09:00"), d);
    assert.equal(r.status, "SPECIAL_HOURS");
    assert.equal(r.headline, "Praxis geöffnet");
    assert.equal(r.detail, "Heute bis 10:00 Uhr");
    assert.equal(r.acuteSuppressed, false);
    assert.deepEqual(r.acuteToday, []);
  });
});
