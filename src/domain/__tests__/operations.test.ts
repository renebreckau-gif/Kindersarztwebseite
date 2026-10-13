// Phase 09.2 — shared operational logic (domain/operations.ts) and governance (domain/governance.ts).
// Synthetic data only; no practice facts, no lab mocks.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, OpeningHourException, OpeningHoursRule } from "../content-types.ts";
import type { PulsData } from "../practice-status.ts";
import type { FactVerification } from "../verification.ts";
import {
  applyChangeSet,
  blocks,
  classifyChange,
  cutAt,
  earlyCloseEffect,
  expired,
  findOverlappingVacation,
  introducedUnknown,
  notExpired,
  announcementExpired,
  rulesSegments,
  uncoveredDays,
  validateReplacementPeriods,
} from "../operations.ts";
import {
  buildAuditEvent,
  buildProvenance,
  buildRevertEvent,
  canAdministrate,
  canConfirm,
  ConfirmationNotAllowed,
  stripSecrets,
  type Actor,
  type ConfirmableKind,
} from "../governance.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const rule = (id: string, weekday: 1 | 2 | 3 | 4 | 5, start: string, end: string, consultationType: OpeningHoursRule["consultationType"] = "GENERAL", extra: Partial<OpeningHoursRule> = {}): OpeningHoursRule => ({
  id,
  weekday,
  start,
  end,
  consultationType,
  verification: V,
  ...extra,
});
const RULES: OpeningHoursRule[] = [1, 2, 3, 4, 5].flatMap((d) => [rule(`am-${d}`, d as 1, "08:00", "12:00"), rule(`pm-${d}`, d as 1, "14:00", "16:00")]);
const DATA: PulsData = {
  schedule: { rules: RULES, confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const special = (id: string, date: string, end: string): OpeningHourException => ({ id, kind: "SPECIAL_HOURS", startDate: date, endDate: date, intervals: [{ start: "08:00", end, consultationType: "GENERAL" }], priority: 1, verification: V });
const vacation = (id: string, startDate: string, endDate: string): Closure => ({ id, kind: "VACATION", startDate, endDate, replacements: [], verification: V });

// 2026-10-13 is a Tuesday.
describe("schedule derivation", () => {
  test("rulesSegments respects weekday and validity window", () => {
    assert.deepEqual(rulesSegments(RULES, "2026-10-13").map((s) => `${s.start}-${s.end}`), ["08:00-12:00", "14:00-16:00"]);
    assert.deepEqual(rulesSegments(RULES, "2026-10-17"), []); // Saturday
    const limited = [rule("x", 2, "08:00", "10:00", "GENERAL", { validFrom: "2026-11-01" })];
    assert.deepEqual(rulesSegments(limited, "2026-10-13"), []);
    assert.equal(rulesSegments(limited, "2026-11-03").length, 1);
  });

  test("acute windows are cut out of their block", () => {
    const r = [rule("g", 2, "08:00", "12:00"), rule("a", 2, "09:00", "10:00", "ACUTE")];
    assert.deepEqual(rulesSegments(r, "2026-10-13").map((s) => `${s.start}-${s.end}:${s.type}`), ["08:00-09:00:GENERAL", "09:00-10:00:ACUTE", "10:00-12:00:GENERAL"]);
    assert.deepEqual(blocks(rulesSegments(r, "2026-10-13")), [{ start: "08:00", end: "12:00" }]);
  });

  test("early close: inside, lunch gap, too late, too early — never snapped silently", () => {
    const segs = rulesSegments(RULES, "2026-10-13");
    assert.equal(earlyCloseEffect(segs, "15:00").kind, "INSIDE");
    assert.equal(earlyCloseEffect(segs, "15:00").lastEnd, "15:00");
    const gap = earlyCloseEffect(segs, "13:00");
    assert.equal(gap.kind, "GAP");
    assert.deepEqual(gap.removed, [{ start: "14:00", end: "16:00" }]);
    assert.equal(earlyCloseEffect(segs, "17:00").kind, "TOO_LATE");
    assert.equal(earlyCloseEffect(segs, "07:00").kind, "TOO_EARLY");
    assert.deepEqual(cutAt(segs, "10:00"), [{ start: "08:00", end: "10:00", type: "GENERAL" }]);
  });
});

describe("change sets", () => {
  test("edit = upsert with the same id (never a second active record)", () => {
    const base = applyChangeSet(DATA, { upsertExceptions: [special("t", "2026-10-13", "15:00")] });
    const edited = applyChangeSet(base, { upsertExceptions: [special("t", "2026-10-13", "13:00")] });
    assert.equal(edited.exceptions.length, 1);
    assert.equal(edited.exceptions[0].intervals[0].end, "13:00");
    assert.equal(classifyChange(base, { upsertExceptions: [special("t", "2026-10-13", "13:00")] }, "2026-10-13").kind, "EDIT");
  });

  test("a second contradicting record is a CONFLICT (engine-based, blocked)", () => {
    const base = applyChangeSet(DATA, { upsertExceptions: [special("t", "2026-10-13", "15:00")] });
    const change = { upsertExceptions: [special("other", "2026-10-13", "13:00")] };
    const r = classifyChange(base, change, "2026-10-13");
    assert.equal(r.kind, "CONFLICT");
    assert.equal(r.conflict?.date, "2026-10-13");
    assert.deepEqual(r.conflict?.relatedIds, ["t"]); // only existing records, not the change's own
  });

  test("vacation over a special-hours day conflicts; superseding it is allowed", () => {
    const base = applyChangeSet(DATA, { upsertExceptions: [special("sonder", "2026-10-21", "11:00")] });
    const plain = { upsertClosures: [vacation("urlaub", "2026-10-19", "2026-10-23")] };
    assert.equal(classifyChange(base, plain, "2026-10-19", "2026-10-23").kind, "CONFLICT");
    assert.equal(classifyChange(base, { ...plain, removeExceptionIds: ["sonder"] }, "2026-10-19", "2026-10-23").kind, "SUPERSEDE");
  });

  test("an independent change is NEW; introducedUnknown is null when nothing breaks", () => {
    const change = { upsertClosures: [vacation("urlaub", "2026-10-19", "2026-10-23")] };
    assert.equal(classifyChange(DATA, change, "2026-10-19", "2026-10-23").kind, "NEW");
    assert.equal(introducedUnknown(DATA, applyChangeSet(DATA, change), "2026-10-19", "2026-10-23"), null);
  });

  test("findOverlappingVacation ignores expired and excluded vacations", () => {
    const closures = [vacation("alt", "2026-09-01", "2026-09-05"), vacation("neu", "2026-10-19", "2026-10-23")];
    assert.equal(findOverlappingVacation(closures, "2026-10-22", "2026-10-26", "2026-10-13")?.id, "neu");
    assert.equal(findOverlappingVacation(closures, "2026-10-22", "2026-10-26", "2026-10-13", "neu"), undefined);
    assert.equal(findOverlappingVacation(closures, "2026-09-02", "2026-09-03", "2026-10-13"), undefined);
  });
});

describe("expiry (records are kept, not deleted)", () => {
  const recs = [vacation("a", "2026-10-01", "2026-10-12"), vacation("b", "2026-10-10", "2026-10-13"), vacation("c", "2026-10-20", "2026-10-21")];
  test("end date is inclusive in Europe/Berlin calendar days", () => {
    assert.deepEqual(notExpired(recs, "2026-10-13").map((r) => r.id), ["b", "c"]);
    assert.deepEqual(expired(recs, "2026-10-13").map((r) => r.id), ["a"]);
    assert.equal(recs.length, 3); // nothing removed from the source
  });
  test("announcements: open-ended never expire", () => {
    const a = { validUntil: "2026-10-12" } as Parameters<typeof announcementExpired>[0];
    assert.equal(announcementExpired(a, "2026-10-13"), true);
    assert.equal(announcementExpired({ ...a, validUntil: "OPEN_ENDED" }, "2030-01-01"), false);
  });
});

describe("replacement periods", () => {
  test("inside keeps, beyond needs a correction, overlap blocks, gaps reported", () => {
    const r = validateReplacementPeriods("2026-10-19", "2026-10-23", [
      { from: "2026-10-19", to: "2026-10-21", practice: "A" },
      { from: "2026-10-22", to: "2026-10-26", practice: "B" },
    ]);
    assert.deepEqual(r.issues, [{ index: 1, kind: "beyond", side: "end", fix: { from: "2026-10-22", to: "2026-10-23" } }]);
    assert.deepEqual(r.gaps, [{ from: "2026-10-22", to: "2026-10-23" }]);
    const o = validateReplacementPeriods("2026-10-19", "2026-10-23", [
      { from: "2026-10-19", to: "2026-10-21", practice: "A" },
      { from: "2026-10-21", to: "2026-10-23", practice: "B" },
    ]);
    assert.deepEqual(o.issues.map((i) => i.kind), ["overlap", "overlap"]);
  });
  test("extension: only the new days count as new gaps; outside and invalid are flagged", () => {
    const r = validateReplacementPeriods("2026-10-19", "2026-10-26", [{ from: "2026-10-19", to: "2026-10-23", practice: "A" }], { from: "2026-10-19", to: "2026-10-23" });
    assert.deepEqual(r.newGaps, [{ from: "2026-10-24", to: "2026-10-26" }]);
    const bad = validateReplacementPeriods("2026-10-19", "2026-10-23", [
      { from: "2026-11-01", to: "2026-11-02", practice: "A" },
      { from: "2026-10-22", to: "2026-10-20", practice: "B" },
    ]);
    assert.deepEqual(bad.issues.map((i) => i.kind), ["outside", "invalid"]);
    assert.deepEqual(uncoveredDays("2026-10-19", "2026-10-20", []), [{ from: "2026-10-19", to: "2026-10-20" }]);
  });
  test("domain returns no German sentences (wording stays in the UI layer)", () => {
    const r = validateReplacementPeriods("2026-10-19", "2026-10-23", [{ from: "2026-11-01", to: "2026-11-02", practice: "A" }]);
    assert.equal("text" in r.issues[0], false);
  });
});

describe("governance: confirmation boundary, provenance, audit", () => {
  const staff: Actor = { id: "1", name: "Test Team", role: "STAFF" };
  const doctor: Actor = { id: "2", name: "Test Ärztin", role: "DOCTOR" };
  const admin: Actor = { id: "3", name: "Test Verwaltung", role: "ADMIN" };
  const OPERATIONAL: ConfirmableKind[] = ["EXCEPTION", "CLOSURE", "ANNOUNCEMENT", "REPLACEMENT_ASSIGNMENT"];
  const PHYSICIAN: ConfirmableKind[] = ["WEEKLY_SCHEDULE", "ACUTE_RULE", "CONSULTATION_TYPE", "REPLACEMENT_PRACTICE", "EMERGENCY_INFORMATION", "MEDICAL_CONTENT", "DISCOVERY_MEDICAL"];

  test("STAFF confirms operational records only; medical scope is DOCTOR-only; ADMIN gets no bypass", () => {
    for (const k of OPERATIONAL) for (const a of [staff, doctor, admin]) assert.equal(canConfirm(a.role, k), true, `${a.role} ${k}`);
    for (const k of PHYSICIAN) {
      assert.equal(canConfirm("STAFF", k), false, k);
      assert.equal(canConfirm("ADMIN", k), false, k);
      assert.equal(canConfirm("DOCTOR", k), true, k);
    }
    assert.equal(canAdministrate("ADMIN"), true);
    assert.equal(canAdministrate("DOCTOR"), false);
  });

  test("provenance is generated from account + operation + date", () => {
    const v = buildProvenance(staff, "CLOSURE", "2026-10-13", "2026-10-23");
    assert.deepEqual(v, { status: "VERIFIED_CURRENT", lastVerified: "2026-10-13", reviewDue: "2026-10-23", verifiedBy: "Test Team, Praxisteam (Praxis Cockpit)", sourceIds: ["PRACTICE_COCKPIT"] });
    assert.throws(() => buildProvenance(staff, "WEEKLY_SCHEDULE", "2026-10-13", "2027-04-01"), ConfirmationNotAllowed);
  });

  test("audit events carry actor snapshot and versions, never secrets", () => {
    const e = buildAuditEvent({
      id: "e1",
      at: new Date("2026-10-13T07:20:00Z"),
      actor: admin,
      entityType: "staff",
      entityId: "9",
      operation: "UPDATE",
      previous: { name: "A", hash: "x", salt: "y", nested: { password: "p", resetPasswordToken: "t" } },
      next: { name: "B", sessions: [{ id: "s" }] },
    });
    assert.equal(e.actorName, "Test Verwaltung");
    assert.equal(e.actorRole, "ADMIN");
    assert.equal(e.publishState, "PUBLISHED");
    assert.deepEqual(e.previous, { name: "A", nested: {} });
    assert.deepEqual(e.next, { name: "B" });
    assert.doesNotMatch(JSON.stringify(e), /"(hash|salt|password|resetPasswordToken|sessions)"/);
    assert.deepEqual(stripSecrets([{ apiKey: "k", ok: 1 }]), [{ ok: 1 }]);
  });

  test("undo creates a new REVERT event (history is never rewritten)", () => {
    const e = buildAuditEvent({ id: "e1", at: new Date(), actor: staff, entityType: "closures", entityId: "u", operation: "CREATE", previous: null, next: { id: "u" } });
    const r = buildRevertEvent(e, { id: "e2", at: new Date(), actor: doctor });
    assert.equal(r.operation, "REVERT");
    assert.equal(r.revertOf, "e1");
    assert.deepEqual(r.previous, { id: "u" });
    assert.equal(r.next, null);
    assert.equal(e.operation, "CREATE"); // original untouched
  });
});
