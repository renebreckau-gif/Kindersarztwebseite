// Regression: the public site uses the LIVE PRAXIS PULS state (LB-00 approved
// 2026-10-07) — without the review parameter `?vorschau=freigabe`.
// The start page calls `resolvePuls({ vorschau, zeit })` with its search params;
// a normal visit passes neither, which is exactly `resolvePuls({}, now)`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePuls } from "../puls.ts";
import { RELEASE } from "../release.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { getPracticeStatus } from "../../domain/practice-status.ts";
import { PULS_DATA } from "../schedule.ts";

const at = (date: string, time: string) => zonedToInstant(date, time); // Europe/Berlin

test("LB-00 sign-off gate is open", () => {
  assert.equal(RELEASE.pulsPracticeSignOff, true);
});

test("normal visit (no ?vorschau) during verified hours → LIVE open state", () => {
  // Tuesday 06.10.2026, 09:30 — F36: 08:00–11:00 (08:00–10:00 healthy children only)
  const p = resolvePuls({}, at("2026-10-06", "09:30"));
  assert.equal(p.mode, "LIVE");
  assert.equal(p.result.status, "OPEN");
  assert.equal(p.result.indicator, "OPEN");
  assert.equal(p.view.headline, "Praxis geöffnet");
  assert.equal(p.view.detail, "Heute bis 11:00 Uhr");
  assert.equal(p.view.reason, "Jetzt bis 10:00 Uhr: Bitte nur gesunde Kinder");
});

test("normal visit outside hours → LIVE closed state with next opening", () => {
  const p = resolvePuls({}, at("2026-10-06", "19:30"));
  assert.equal(p.mode, "LIVE");
  assert.equal(p.result.status, "CLOSED");
  assert.equal(p.view.headline, "Praxis geschlossen");
  assert.match(p.view.detail, /^Öffnet morgen um 08:00 Uhr$/);
});

test("Monday afternoon block is used (F35: 14:00–17:00)", () => {
  const p = resolvePuls({}, at("2026-10-12", "15:00"));
  assert.equal(p.result.status, "OPEN");
  assert.equal(p.view.detail, "Heute bis 17:00 Uhr");
});

// F40 — regular weekend closure confirmed by the practice (2026-10-11): explicit
// confirmedClosedWeekdays [6, 7], not inferred from missing rules.
test("F40: weekend closure comes from explicit confirmed data", () => {
  assert.deepEqual([...(PULS_DATA.schedule?.confirmedClosedWeekdays ?? [])].sort(), [6, 7]);
});

test("Saturday: CLOSED, neutral, next verified opening (Monday 08:00)", () => {
  const p = resolvePuls({}, at("2026-10-10", "10:00"));
  assert.equal(p.result.status, "CLOSED");
  assert.equal(p.result.indicator, "NEUTRAL");
  assert.equal(p.view.headline, "Praxis geschlossen");
  assert.equal(p.view.detail, "Öffnet am Montag, 12. Oktober um 08:00 Uhr");
});

test("Sunday: CLOSED, neutral, next opening tomorrow 08:00", () => {
  const p = resolvePuls({}, at("2026-10-11", "10:00"));
  assert.equal(p.result.status, "CLOSED");
  assert.equal(p.result.indicator, "NEUTRAL");
  assert.equal(p.view.detail, "Öffnet morgen um 08:00 Uhr");
});

test("Friday after the last opening: next opening crosses the closed weekend", () => {
  const p = resolvePuls({}, at("2026-10-09", "13:00"));
  assert.equal(p.result.status, "CLOSED");
  assert.equal(p.view.detail, "Öffnet am Montag, 12. Oktober um 08:00 Uhr");
});

test("a verified, announced weekend opening still overrides the regular closure", () => {
  const r = getPracticeStatus(at("2026-10-10", "09:00"), {
    ...PULS_DATA,
    exceptions: [
      {
        id: "sa-sonder",
        kind: "SPECIAL_HOURS",
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }],
        publicMessage: "Sondersprechstunde",
        priority: 1,
        verification: { status: "VERIFIED_CURRENT", lastVerified: "2026-10-09", reviewDue: "2026-10-31", sourceIds: [] },
      },
    ],
  });
  assert.notEqual(r.status, "CLOSED");
  assert.notEqual(r.status, "UNKNOWN");
});

test("holiday on a confirmed closed weekend day → CLOSED (31.10.2026 is a Saturday)", () => {
  const p = resolvePuls({}, at("2026-10-31", "10:00"));
  assert.equal(p.result.status, "CLOSED");
  assert.equal(p.view.detail, "Öffnet am Montag, 2. November um 08:00 Uhr");
  // Friday before: the weekend holiday no longer hides the next opening
  assert.equal(resolvePuls({}, at("2026-10-30", "13:00")).view.detail, "Öffnet am Montag, 2. November um 08:00 Uhr");
});

test("special-hours day on the live data: headline says open/closed, special note subordinate", () => {
  const data = {
    ...PULS_DATA,
    exceptions: [
      {
        id: "mi-kurz",
        kind: "SPECIAL_HOURS" as const,
        startDate: "2026-10-14",
        endDate: "2026-10-14",
        intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" as const }],
        priority: 1,
        verification: { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-13", reviewDue: "2026-10-14", sourceIds: [] },
      },
    ],
  };
  const open = getPracticeStatus(at("2026-10-14", "09:00"), data);
  assert.equal(open.indicator, "OPEN");
  assert.equal(open.headline, "Praxis geöffnet");
  const after = getPracticeStatus(at("2026-10-14", "11:00"), data);
  assert.equal(after.indicator, "NEUTRAL");
  assert.equal(after.headline, "Heute geschlossen");
});

test("public holiday stays UNKNOWN (F49 unconfirmed)", () => {
  const p = resolvePuls({}, at("2026-12-25", "09:00")); // Friday, 1. Weihnachtstag
  assert.equal(p.result.status, "UNKNOWN");
});

test("acute consultation is never inferred (F44–F46 unconfirmed)", () => {
  for (const time of ["08:30", "10:30"]) {
    const p = resolvePuls({}, at("2026-10-12", time)); // Monday
    assert.notEqual(p.result.status, "ACUTE_CONSULTATION");
  }
});

test("live result equals the review preview at the same time (no separate logic)", () => {
  const now = at("2026-10-07", "10:15");
  const live = resolvePuls({}, now);
  const preview = resolvePuls({ vorschau: "freigabe", zeit: "2026-10-07T10:15" });
  assert.equal(live.result.status, preview.result.status);
  assert.equal(live.view.detail, preview.view.detail);
  assert.equal(live.mode, "LIVE");
  assert.equal(preview.mode, "PREVIEW");
});
