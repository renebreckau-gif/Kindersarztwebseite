// Phase 09.5H — Feiertagsregel (pure). ARTIFICIAL holiday dates and decisions only — the practice
// has not decided its holiday policy (F49 stays TO_BE_CONFIRMED).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { OpeningHourException, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type HolidayPolicy, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { holidayPolicyStatus, holidayResolution, upcomingHolidays } from "../../domain/holiday-policy.ts";
import { canConfirm } from "../../domain/governance.ts";
import { docsFromPulsData, holidayPolicyFromDoc, pulsDataFromDocs } from "../../data/payload-mapping.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { calendarFingerprint, holidayNames, parsePolicyMode, policyDraft } from "../workflows/holiday-policy.ts";
import { reviewItems } from "../read-model.ts";
import { adminOrDoctorHolidayPolicy } from "../../backend/access.ts";

const TODAY = "2026-10-21"; // Wednesday
const H1 = "2026-11-04"; // Wednesday — artificial holiday
const H2 = "2026-11-12"; // Thursday — artificial holiday
const SAT = "2026-11-07"; // Saturday — artificial holiday on a confirmed closed weekday
const BRIDGE = "2026-11-13"; // Friday after H2 — NOT in the calendar
const V = (reviewDue = "2027-04-21"): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: TODAY, reviewDue, verifiedBy: "Test Ärztin, Ärztin / Arzt (Praxis Cockpit)", sourceIds: ["PRACTICE_COCKPIT"] });
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const r = (d: number): OpeningHoursRule => ({ id: `r${d}`, weekday: d as 1, start: "08:00", end: "16:00", consultationType: "GENERAL", verification: V("2099-01-01") });
const data = (holidayPolicy: HolidayPolicy, over: Partial<PulsData> = {}): PulsData => ({
  schedule: { rules: [1, 2, 3, 4, 5].map(r), confirmedClosedWeekdays: [6, 7], verification: V("2099-01-01") },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V("2099-01-01") }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [H1, SAT, H2],
  holidayPolicy,
  ...over,
});
const at = (d: PulsData, date: string, time = "12:00") => getPracticeStatus(zonedToInstant(date, time), d);
const explicitUnconfirmed: HolidayPolicy = { mode: "REQUIRE_EXPLICIT_ENTRY" };
const explicitConfirmed: HolidayPolicy = { mode: "REQUIRE_EXPLICIT_ENTRY", verification: V() };
const closedConfirmed: HolidayPolicy = { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: V() };
const closedExpired: HolidayPolicy = { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: V("2026-08-01") }; // > 60 days grace ago
const closedDue: HolidayPolicy = { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: V("2026-10-01") }; // within grace
const ex = (date: string, extra: Partial<OpeningHourException>): OpeningHourException => ({ id: `ex-${date}`, kind: "SPECIAL_HOURS", startDate: date, endDate: date, intervals: [], priority: 10, verification: V(date), ...extra });

describe("engine + state: the two policies", () => {
  test("unconfirmed explicit-entry: existing fail-safe (UNKNOWN / HOLIDAY_WITHOUT_RULE), state UNCONFIRMED", () => {
    assert.equal(at(data(explicitUnconfirmed), H1).reason, "HOLIDAY_WITHOUT_RULE");
    assert.equal(holidayPolicyStatus(explicitUnconfirmed, TODAY).state, "UNCONFIRMED");
  });
  test("confirmed explicit-entry: still UNKNOWN without an entry — by design; state EXPLICIT_READY", () => {
    assert.equal(at(data(explicitConfirmed), H1).reason, "HOLIDAY_WITHOUT_RULE");
    assert.deepEqual([holidayPolicyStatus(explicitConfirmed, TODAY).state, holidayPolicyStatus(explicitConfirmed, TODAY).confirmed], ["EXPLICIT_READY", true]);
    assert.equal(holidayResolution(data(explicitConfirmed), H1), "UNRESOLVED");
  });
  test("confirmed closed-on-holidays: CLOSED, resolved by the policy", () => {
    assert.equal(at(data(closedConfirmed), H1).status, "CLOSED");
    assert.equal(holidayResolution(data(closedConfirmed), H1), "POLICY_CLOSED");
    assert.equal(holidayPolicyStatus(closedConfirmed, TODAY).state, "CLOSED_READY");
  });
  test("closed policy in its review-due grace stays usable; EXPIRED fails safe — never auto-closed", () => {
    assert.equal(holidayPolicyStatus(closedDue, TODAY).state, "REVIEW_DUE");
    assert.equal(at(data(closedDue), H1).status, "CLOSED");
    assert.equal(holidayPolicyStatus(closedExpired, TODAY).state, "EXPIRED");
    const e = at(data(closedExpired), H1);
    assert.equal(e.status, "UNKNOWN");
    assert.notEqual(e.status, "CLOSED");
    assert.equal(holidayPolicyStatus({ mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: OPEN }, TODAY).state, "UNCONFIRMED");
  });
});

describe("precedence: more specific entries win over the general rule", () => {
  test("explicit SPECIAL_HOURS over global closed: OPEN in the slot, closed outside", () => {
    const d = data(closedConfirmed, { exceptions: [ex(H1, { intervals: [{ start: "08:00", end: "12:00", consultationType: "GENERAL" }] })] });
    assert.equal(at(d, H1, "10:00").indicator, "OPEN");
    assert.equal(at(d, H1, "13:00").headline, "Heute geschlossen");
    assert.equal(holidayResolution(d, H1), "EXPLICIT_SPECIAL");
  });
  test("explicit CLOSED over the rule → closed (own entry); closure wins too", () => {
    assert.equal(holidayResolution(data(explicitConfirmed, { exceptions: [ex(H1, { kind: "CLOSED" })] }), H1), "EXPLICIT_CLOSED");
    const cl = data(closedConfirmed, { closures: [{ id: "u", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-06", replacements: [], verification: V("2026-11-06") }] });
    assert.equal(at(cl, H1).status, "VACATION");
    assert.equal(holidayResolution(cl, H1), "CLOSURE");
  });
  test("weekend holiday on a confirmed closed weekday stays CLOSED under either policy; no Prüfen item", () => {
    for (const p of [explicitUnconfirmed, explicitConfirmed, closedConfirmed]) {
      assert.equal(at(data(p), SAT).status, "CLOSED");
      assert.equal(holidayResolution(data(p), SAT), "REGULAR_CLOSED");
    }
    assert.ok(!reviewItems(data(explicitUnconfirmed), TODAY).some((i) => i.id === `holiday-${SAT}`));
  });
  test("bridge days are NOT holidays: an ordinary weekday under the closed policy", () => {
    assert.equal(at(data(closedConfirmed), BRIDGE).status, "OPEN");
  });
});

describe("mapping and static backward compatibility", () => {
  test("a stored explicit-entry policy keeps its verification; the static public data is unchanged", () => {
    assert.deepEqual(holidayPolicyFromDoc({ policy: "REQUIRE_EXPLICIT_ENTRY", policyVerification: { status: "VERIFIED_CURRENT", lastVerified: TODAY, reviewDue: "2027-04-21", verifiedBy: "X", sourceIds: [{ sourceId: "PRACTICE_COCKPIT" }] } }).verification?.status, "VERIFIED_CURRENT");
    assert.deepEqual(holidayPolicyFromDoc({ policy: "REQUIRE_EXPLICIT_ENTRY" }), { mode: "REQUIRE_EXPLICIT_ENTRY" });
    assert.deepEqual(PULS_DATA.holidayPolicy, { mode: "REQUIRE_EXPLICIT_ENTRY" }, "F49 unconfirmed: no verification");
    assert.equal(holidayPolicyStatus(PULS_DATA.holidayPolicy, TODAY).state, "UNCONFIRMED");
    for (const p of [explicitUnconfirmed, explicitConfirmed, closedConfirmed]) assert.deepEqual(pulsDataFromDocs(docsFromPulsData(data(p))).holidayPolicy, p, "round trip");
  });
});

describe("physician draft, fingerprint, Prüfen, authority", () => {
  test("draft: real engine before / after on the upcoming holidays; no date touched", () => {
    const d = policyDraft(data(explicitUnconfirmed), "CLOSED_ON_PUBLIC_HOLIDAYS", TODAY, { [H1]: "Testfeiertag" });
    assert.equal(d.first, true);
    assert.deepEqual(d.rows.map((x) => [x.holiday.date, x.holiday.resolution, x.after.resolution]), [[H1, "UNRESOLVED", "POLICY_CLOSED"], [SAT, "REGULAR_CLOSED", "REGULAR_CLOSED"], [H2, "UNRESOLVED", "POLICY_CLOSED"]]);
    assert.equal(d.rows[0].holiday.name, "Testfeiertag");
    assert.deepEqual(d.proposed.publicHolidays, data(explicitUnconfirmed).publicHolidays);
    const e = policyDraft(data(closedConfirmed), "REQUIRE_EXPLICIT_ENTRY", TODAY);
    assert.equal(e.first, false);
    assert.deepEqual(e.rows.map((x) => x.after.resolution), ["UNRESOLVED", "REGULAR_CLOSED", "UNRESOLVED"]);
    assert.deepEqual(upcomingHolidays(data(closedConfirmed), TODAY).map((h) => h.name), [undefined, undefined, undefined], "no invented names");
  });
  test("calendar fingerprint sees policy, verification, dates and names; parsing only the two modes", () => {
    const doc = { policy: "CLOSED_ON_PUBLIC_HOLIDAYS" as const, holidays: [{ date: H1, name: "A" }], policyVerification: { status: "VERIFIED_CURRENT" as const, sourceIds: [] } };
    const base = calendarFingerprint(doc);
    assert.notEqual(base, calendarFingerprint({ ...doc, policy: "REQUIRE_EXPLICIT_ENTRY" }));
    assert.notEqual(base, calendarFingerprint({ ...doc, holidays: [{ date: H2, name: "A" }] }));
    assert.notEqual(base, calendarFingerprint({ ...doc, holidays: [{ date: H1, name: "B" }] }));
    assert.notEqual(base, calendarFingerprint({ ...doc, policyVerification: { status: "TO_BE_CONFIRMED", sourceIds: [] } }));
    assert.deepEqual(holidayNames(doc), { [H1]: "A" });
    assert.deepEqual([parsePolicyMode("CLOSED_ON_PUBLIC_HOLIDAYS"), parsePolicyMode("IMMER_OFFEN"), parsePolicyMode(undefined)], ["CLOSED_ON_PUBLIC_HOLIDAYS", undefined, undefined]);
  });
  test("Prüfen: explicit policy keeps per-holiday items; closed policy resolves them; expired → ONE policy item", () => {
    const ids = (p: HolidayPolicy) => reviewItems(data(p), TODAY).map((i) => i.id).filter((id) => id.startsWith("holiday"));
    assert.deepEqual(ids(explicitUnconfirmed), [`holiday-${H1}`, `holiday-${H2}`], "unconfirmed: no extra policy warning");
    assert.deepEqual(ids(explicitConfirmed), [`holiday-${H1}`, `holiday-${H2}`]);
    assert.deepEqual(ids(closedConfirmed), []);
    const expired = reviewItems(data(closedExpired), TODAY).filter((i) => i.id.startsWith("holiday"));
    assert.deepEqual(expired.map((i) => [i.id, i.action?.href]), [["holiday-policy-expired", "/intern/feiertage"]]);
  });
  test("authority: only DOCTOR confirms HOLIDAY_POLICY; global update = ADMIN or DOCTOR inside the trusted context", () => {
    assert.deepEqual((["STAFF", "ADMIN", "DOCTOR"] as const).map((role) => canConfirm(role, "HOLIDAY_POLICY")), [false, false, true]);
    const req = (role: string | null, ctx?: Record<string, unknown>) => ({ req: { user: role ? { id: 1, role, active: true } : null, context: ctx } });
    assert.deepEqual(["STAFF", "DOCTOR", "ADMIN", null].map((x) => adminOrDoctorHolidayPolicy(req(x))), [false, false, true, false]);
    assert.equal(adminOrDoctorHolidayPolicy(req("DOCTOR", { praxisHolidayPolicyWrite: true })), true);
    assert.equal(adminOrDoctorHolidayPolicy(req("STAFF", { praxisHolidayPolicyWrite: true })), false);
    assert.equal(adminOrDoctorHolidayPolicy(req("DOCTOR", { praxisHolidayPolicyWrite: "true" })), false);
  });
});
