// Regression: the public site uses the LIVE PRAXIS PULS state (LB-00 approved
// 2026-10-07) — without the review parameter `?vorschau=freigabe`.
// The start page calls `resolvePuls({ vorschau, zeit })` with its search params;
// a normal visit passes neither, which is exactly `resolvePuls({}, now)`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePuls } from "../puls.ts";
import { RELEASE } from "../release.ts";
import { zonedToInstant } from "../../domain/time.ts";

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

test("weekend stays UNKNOWN (F40 unconfirmed) — no inferred closed state", () => {
  const p = resolvePuls({}, at("2026-10-10", "10:00")); // Saturday
  assert.equal(p.result.status, "UNKNOWN");
  assert.equal(p.result.indicator, "NONE");
  assert.equal(p.view.chip, "");
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
