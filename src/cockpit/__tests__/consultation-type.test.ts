// Phase 09.5J — Sprechstundenarten (pure + guard hook). ARTIFICIAL wording only; no static fact changes
// (F42 stays TO_BE_CONFIRMED).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ConsultationType, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { CODE_IMMUTABLE_TEXT, consultationTypeStatus, normalizeTypeWording, typeWriteProblems } from "../../domain/consultation-types.ts";
import { codeOfSlug, creatableCodes, typeDraft, typeFingerprint, typeItems, TYPE_SLUG } from "../workflows/consultation-type.ts";
import { regularTypeOptions } from "../workflows/weekly-plan.ts";
import { consultationTypeGuardHook } from "../../backend/hooks.ts";
import { RejectedError, SERVER_CONTEXT } from "../../backend/server-context.ts";

const TODAY = "2026-10-21";
const V = (reviewDue = "2027-04-21", lastVerified = TODAY): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified, reviewDue, verifiedBy: "Test Ärztin, Ärztin / Arzt (Praxis Cockpit)", sourceIds: ["PRACTICE_COCKPIT"] });
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const t = (code: ConsultationType["code"], label: string, verification = V(), explanation?: string): ConsultationType => ({ code, label, verification, ...(explanation ? { explanation } : {}) });
const r = (id: string, weekday: number, start: string, end: string, consultationType: OpeningHoursRule["consultationType"] = "GENERAL"): OpeningHoursRule => ({ id, weekday: weekday as 1, start, end, consultationType, verification: V() });
const data = (types: ConsultationType[], over: Partial<PulsData> = {}): PulsData => ({
  schedule: { rules: [r("mo", 1, "08:00", "12:00"), ...[2, 3, 4, 5].map((d) => r(`h${d}`, d, "08:00", "10:00", "HEALTHY_ONLY")), ...[2, 3, 4, 5].map((d) => r(`g${d}`, d, "10:00", "12:00"))], confirmedClosedWeekdays: [6, 7], verification: V() },
  consultationTypes: types,
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  ...over,
});
const BASE = [t("GENERAL", "Sprechstunde (Test)"), t("HEALTHY_ONLY", "Nur gesunde Kinder (Test)", OPEN)];

describe("wording validation (one helper for workflow and hook)", () => {
  test("label trimmed, required, ≤ 80; explanation optional, trimmed, ≤ 400; empty explanation is absent", () => {
    assert.deepEqual(normalizeTypeWording({ label: "  Sprechstunde  ", explanation: "   " }), { wording: { label: "Sprechstunde" }, problems: [] });
    assert.deepEqual(normalizeTypeWording({ label: "A", explanation: " Text " }).wording, { label: "A", explanation: "Text" });
    assert.equal(normalizeTypeWording({ label: "   " }).problems[0].message, "Bitte eine Bezeichnung eingeben.");
    assert.equal(normalizeTypeWording({ label: "x".repeat(81) }).problems[0].field, "label");
    assert.equal(normalizeTypeWording({ label: "x", explanation: "y".repeat(401) }).problems[0].field, "explanation");
    assert.equal(normalizeTypeWording({ label: "x".repeat(80), explanation: "y".repeat(400) }).problems.length, 0);
  });
  test("code immutable; ACUTE never through the regular workflow; the acute context writes ACUTE only", () => {
    assert.deepEqual(typeWriteProblems({ code: "HEALTHY_ONLY", label: "x" }, { code: "GENERAL" }, "REGULAR"), [CODE_IMMUTABLE_TEXT]);
    assert.match(typeWriteProblems({ code: "ACUTE", label: "x" }, null, "REGULAR")[0], /separat verwaltet/);
    assert.match(typeWriteProblems({ code: "GENERAL", label: "x" }, null, "ACUTE")[0], /nur die Akutsprechstunde/);
    assert.deepEqual(typeWriteProblems({ code: "OTHER", label: "Sonstiges (Test)" }, null, "REGULAR"), []);
    assert.deepEqual(typeWriteProblems({ code: "WHATEVER", label: "x" }, null, "REGULAR"), ["Unbekannte Sprechstundenart."]);
  });
});

describe("collection guard (every write path, before provenance)", () => {
  const DOCTOR = { id: 2, name: "Test Ärztin", role: "DOCTOR", active: true };
  const ADMIN = { id: 3, name: "Test Verwaltung", role: "ADMIN", active: true };
  const call = (user: unknown, context: Record<string, unknown>, data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
    (consultationTypeGuardHook as unknown as (a: Record<string, unknown>) => Record<string, unknown>)({ data, originalDoc, req: { user, context } });
  const status = (fn: () => unknown) => {
    try {
      fn();
      return 0;
    } catch (e) {
      assert.ok(e instanceof RejectedError, String(e));
      return (e as RejectedError).status;
    }
  };
  const REG = { [SERVER_CONTEXT.CONSULTATION_TYPE]: true };
  const AC = { [SERVER_CONTEXT.ACUTE_BASELINE]: true };
  test("only the trusted DOCTOR workflows; never both contexts; trusted seed untouched", () => {
    assert.equal(status(() => call(DOCTOR, {}, { code: "GENERAL", label: "x" })), 403, "generic DOCTOR write");
    assert.equal(status(() => call(ADMIN, REG, { code: "GENERAL", label: "x" })), 403, "ADMIN with context");
    assert.equal(status(() => call(DOCTOR, { ...REG, ...AC }, { code: "GENERAL", label: "x" })), 400);
    const seed = { code: "GENERAL", label: " ungetrimmt " };
    assert.strictEqual(call(null, { [SERVER_CONTEXT.SEED]: true }, seed), seed);
  });
  test("regular context: normalises wording, refuses ACUTE and code changes", () => {
    assert.deepEqual(call(DOCTOR, REG, { code: "GENERAL", label: "  Sprechstunde ", explanation: "  " }), { code: "GENERAL", label: "Sprechstunde", explanation: null });
    assert.equal(status(() => call(DOCTOR, REG, { code: "ACUTE", label: "Akut" })), 400);
    assert.equal(status(() => call(DOCTOR, REG, { code: "HEALTHY_ONLY", label: "x" }, { code: "GENERAL", label: "x" })), 400);
    assert.equal(status(() => call(DOCTOR, REG, { label: "" }, { code: "GENERAL", label: "x" })), 400);
  });
  test("acute context: ACUTE only; the explanation stays as stored", () => {
    assert.equal(status(() => call(DOCTOR, AC, { label: "x" }, { code: "GENERAL", label: "x" })), 400);
    assert.deepEqual(call(DOCTOR, AC, { label: "Akutsprechstunde" }, { code: "ACUTE", label: "Akut alt", explanation: "bleibt" }), { label: "Akutsprechstunde" });
    assert.equal(status(() => call(DOCTOR, AC, { label: "Akutsprechstunde", explanation: "neu" }, { code: "ACUTE", label: "x", explanation: "bleibt" })), 400);
  });
});

describe("draft semantics", () => {
  test("CONFIRM an unconfirmed stored type unchanged (VERIFY); CHANGE an unconfirmed one also VERIFY", () => {
    const d = typeDraft(data(BASE), "HEALTHY_ONLY", { label: "Nur gesunde Kinder (Test)" }, TODAY);
    assert.ok(d.ok && d.mode === "CONFIRM" && d.audit === "VERIFY" && d.actionLabel === "Sprechstundenart ärztlich bestätigen");
    const c = typeDraft(data(BASE), "HEALTHY_ONLY", { label: "Bitte nur gesunde Kinder (Test)" }, TODAY);
    assert.ok(c.ok && c.mode === "CHANGE" && c.audit === "VERIFY" && c.changed.label && !c.changed.explanation);
  });
  test("CURRENT + unchanged → 'Es wurde nichts geändert.'; CURRENT + changed → UPDATE", () => {
    const n = typeDraft(data(BASE), "GENERAL", { label: " Sprechstunde (Test) ", explanation: "" }, TODAY);
    assert.ok(!n.ok && n.reason === "NO_CHANGE" && n.message === "Es wurde nichts geändert.");
    const u = typeDraft(data(BASE), "GENERAL", { label: "Sprechstunde", explanation: "Für alle Anliegen (Test)." }, TODAY);
    assert.ok(u.ok && u.mode === "CHANGE" && u.audit === "UPDATE" && u.changed.label && u.changed.explanation);
  });
  test("due / expired + unchanged → RECONFIRM (VERIFY, 'erneut bestätigen')", () => {
    for (const v of [V("2026-11-10"), V("2026-10-01"), V("2026-06-01", "2025-12-01")]) {
      const d = typeDraft(data([t("GENERAL", "Sprechstunde (Test)", v)]), "GENERAL", { label: "Sprechstunde (Test)" }, TODAY);
      assert.ok(d.ok && d.mode === "RECONFIRM" && d.audit === "VERIFY" && d.actionLabel === "Sprechstundenart erneut bestätigen", JSON.stringify(v));
    }
    assert.deepEqual(["2026-11-10", "2026-10-01", "2026-06-01"].map((due) => consultationTypeStatus(V(due, "2025-12-01"), TODAY).state), ["DUE", "DUE", "EXPIRED"]);
  });
  test("CREATE a missing regular code with the physician's own wording (VERIFY); never ACUTE, never a duplicate, never an empty label", () => {
    const c = typeDraft(data(BASE), "APPOINTMENT", { label: "Terminsprechstunde (Test)" }, TODAY);
    assert.ok(c.ok && c.mode === "CREATE" && c.audit === "VERIFY" && !c.before);
    assert.ok(!typeDraft(data(BASE), "ACUTE", { label: "x" }, TODAY).ok);
    const dup = typeDraft(data([...BASE, t("GENERAL", "Zweite (Test)")]), "GENERAL", { label: "x" }, TODAY);
    assert.ok(!dup.ok && dup.message === "Sprechstundenart GENERAL ist mehrfach vorhanden.");
    const empty = typeDraft(data(BASE), "OTHER", { label: "   " }, TODAY);
    assert.ok(!empty.ok && empty.reason === "INVALID" && empty.problems[0].field === "label");
    assert.deepEqual(creatableCodes(data(BASE)), ["APPOINTMENT", "OTHER"]);
  });
  test("fingerprint covers wording AND verification; a missing code has its own fingerprint", () => {
    const a = typeFingerprint(data(BASE), "GENERAL");
    assert.notEqual(a, typeFingerprint(data([t("GENERAL", "Sprechstunde (Test)", V("2027-01-01")), BASE[1]]), "GENERAL"));
    assert.notEqual(a, typeFingerprint(data([t("GENERAL", "Anders (Test)"), BASE[1]]), "GENERAL"));
    assert.notEqual(typeFingerprint(data(BASE), "OTHER"), typeFingerprint(data([...BASE, t("OTHER", "x")]), "OTHER"));
  });
  test("slugs: fixed, validated", () => {
    assert.equal(codeOfSlug(TYPE_SLUG.HEALTHY_ONLY), "HEALTHY_ONLY");
    assert.equal(codeOfSlug("GENERAL"), undefined);
    assert.equal(codeOfSlug("../admin"), undefined);
  });
});

describe("read model, weekly-plan relation, engine", () => {
  test("a referenced but missing type is listed as missing; usage from the stored rules; special-hours usage", () => {
    const d = data([BASE[0]], { exceptions: [{ id: "x", kind: "SPECIAL_HOURS", startDate: "2026-10-30", endDate: "2026-10-30", intervals: [{ start: "09:00", end: "10:00", consultationType: "APPOINTMENT" }], priority: 10, verification: V("2026-10-30") }] });
    const items = typeItems(d, TODAY);
    const h = items.find((i) => i.code === "HEALTHY_ONLY")!;
    assert.ok(!h.stored && h.usedByWeeklyRules);
    assert.deepEqual(h.weeklyUsage, ["Di, Mi, Do, Fr 08:00–10:00 Uhr"]);
    assert.ok(items.find((i) => i.code === "APPOINTMENT")!.usedBySpecialHours);
  });
  test("weekly editor offers a type only while its confirmation is usable: unconfirmed → no, confirmed → yes, expired → no", () => {
    const opt = (v: FactVerification) => regularTypeOptions(data([BASE[0], t("HEALTHY_ONLY", "Nur gesunde Kinder (Test)", v)]), TODAY).find((o) => o.code === "HEALTHY_ONLY")!.usable;
    assert.deepEqual([opt(OPEN), opt(V()), opt(V("2026-06-01", "2025-12-01")), opt(V("2026-10-01"))], [false, true, false, true]);
  });
  test("a label change never changes the engine's status (only parent-facing wording differs)", () => {
    const a = data(BASE);
    const b = data([t("GENERAL", "Ganz anders benannt (Test)"), BASE[1]]);
    for (const time of ["07:30", "08:30", "11:00", "13:00"]) {
      const at = zonedToInstant("2026-10-27", time);
      const [x, y] = [getPracticeStatus(at, a), getPracticeStatus(at, b)];
      assert.deepEqual([x.status, x.reason, x.currentInterval], [y.status, y.reason, y.currentInterval], time);
    }
  });
});
