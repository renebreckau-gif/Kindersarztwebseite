// Phase 09.5G — Vertretungspraxen (pure): validation, directory read model, role actions, ADMIN
// draft, access rule, provenance, Prüfen items and the Urlaub selection. ARTIFICIAL DATA ONLY
// ("Praxis Beispiel …", example.invalid) — the project has no real replacement directory (F53).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Closure, ReplacementPractice } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { normalizeReplacement, replacementProblems, safeWebsite, structuralChanges, structuralKey } from "../../domain/replacement.ts";
import { directoryAction, directoryItem, directoryItems, replacementDraft, replacementFingerprint, replacementRecordId, statusLabel } from "../workflows/replacement.ts";
import { directoryOptions } from "../workflows/planned.ts";
import { replacementOptions } from "../workflows/today.ts";
import { reviewItems } from "../read-model.ts";
import { ACCESS, adminOrDoctorVerification } from "../../backend/access.ts";
import { SERVER_CONTEXT, auditOperationOf, replacementVerifyMode } from "../../backend/server-context.ts";
import { reviewDueFor, verificationForWrite, withdrawnProvenance } from "../../backend/provenance.ts";
import { fromSearch, parseReplacement } from "../workflows/form.ts";

const TODAY = "2026-10-21";
const V = (reviewDue: string): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: "2026-04-22", reviewDue, verifiedBy: "Test Ärztin, Ärztin / Arzt (Praxis Cockpit)", sourceIds: ["PRACTICE_COCKPIT"] });
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const OUT: FactVerification = { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: ["PRACTICE_COCKPIT"] };
const rp = (id: string, verification: FactVerification, extra: Partial<ReplacementPractice> = {}): ReplacementPractice => ({
  id,
  practiceName: `Praxis Beispiel ${id.toUpperCase()}`,
  contactPersons: [],
  street: "Teststraße 1",
  postalCode: "00000",
  city: "Testort",
  phone: "0000 111",
  email: "kontakt@example.invalid",
  verification,
  ...extra,
});
const A = rp("a", V("2027-04-21")); // current
const B = rp("b", OPEN); // ADMIN draft
const C = rp("c", V("2026-10-20")); // expired yesterday (grace 0)
const D = rp("d", OUT); // withdrawn
const E = rp("e", V("2026-11-10")); // current, due within 30 days
const data = (over: Partial<PulsData> = {}): PulsData => ({
  schedule: undefined,
  consultationTypes: [],
  exceptions: [],
  closures: [],
  replacementPractices: [A, B, C, D, E],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
  ...over,
});

describe("validation and structural comparison", () => {
  test("required fields, limits, postal code, phone, e-mail, safe website", () => {
    const ok = normalizeReplacement({ practiceName: "  Praxis   Beispiel A ", street: "Teststraße 1", postalCode: "00000", city: "Testort", phone: "0000 / 111-2", email: "a@example.invalid", website: "https://example.invalid" });
    assert.equal(ok.practiceName, "Praxis Beispiel A");
    assert.deepEqual(replacementProblems(ok), []);
    const bad = replacementProblems(normalizeReplacement({ practiceName: "x".repeat(121), postalCode: "!", phone: "abc", email: "nope", website: "javascript:alert(1)", publicNote: "y".repeat(161) }));
    assert.deepEqual(bad.map((p) => p.field).sort(), ["city", "email", "phone", "postalCode", "practiceName", "publicNote", "street", "website"].sort());
    assert.equal(safeWebsite("https://example.invalid/kontakt"), "https://example.invalid/kontakt");
    assert.equal(safeWebsite("data:text/html,x"), undefined);
    assert.equal(safeWebsite("ftp://example.invalid"), undefined);
  });
  test("structural key ignores verification, sees every public field", () => {
    assert.equal(structuralKey(A), structuralKey({ ...A, verification: OPEN }));
    for (const f of ["practiceName", "street", "postalCode", "city", "phone", "email", "website", "publicNote"] as const) assert.notEqual(structuralKey(A), structuralKey({ ...A, [f]: "anders" }), f);
    assert.notEqual(structuralKey(A), structuralKey({ ...A, contactPersons: ["Person (Test)"] }));
  });
});

describe("directory read model (freshness = evaluateFreshness + isUsable)", () => {
  test("status wording in plain German; usable only when current", () => {
    assert.deepEqual([A, B, C, D].map((p) => [statusLabel(p, TODAY), directoryItem(p, "STAFF", TODAY).usable]), [
      ["Bestätigt bis 21. April 2027", true],
      ["Noch nicht ärztlich bestätigt", false],
      ["Bestätigung abgelaufen", false],
      ["Nicht mehr zur Veröffentlichung freigegeben", false],
    ]);
    assert.equal(directoryItem(A, "STAFF", "2027-04-21").usable, true, "today <= reviewDue");
    assert.equal(directoryItem(A, "STAFF", "2027-04-22").usable, false, "day after reviewDue (grace 0)");
  });
  test("role actions: STAFF view · ADMIN edit · DOCTOR verify / reverify (incl. due within 30 days) / view", () => {
    assert.deepEqual([A, B, C, D, E].map((p) => directoryAction(p, "STAFF", TODAY)), ["VIEW", "VIEW", "VIEW", "VIEW", "VIEW"]);
    assert.deepEqual([A, B, C, D, E].map((p) => directoryAction(p, "ADMIN", TODAY)), ["EDIT", "EDIT", "EDIT", "EDIT", "EDIT"]);
    assert.deepEqual([A, B, C, D, E].map((p) => directoryAction(p, "DOCTOR", TODAY)), ["VIEW", "VERIFY", "REVERIFY", "VERIFY", "REVERIFY"]);
    assert.deepEqual(directoryItems([B, A], "STAFF", TODAY).map((i) => i.id), ["a", "b"], "usable first");
  });
  test("record fingerprint changes with any structural or verification change", () => {
    assert.notEqual(replacementFingerprint(A), replacementFingerprint({ ...A, phone: "0000 222" }));
    assert.notEqual(replacementFingerprint(A), replacementFingerprint({ ...A, verification: OPEN }));
    assert.equal(replacementFingerprint(A), replacementFingerprint({ ...A }));
  });
});

describe("ADMIN draft", () => {
  test("new entry; edit with field diff; a verified entry is invalidated; no change → blocked", () => {
    const n = replacementDraft(undefined, { practiceName: "Praxis Beispiel N", street: "Teststraße 9", postalCode: "00000", city: "Testort", phone: "0000 999" }, TODAY);
    assert.ok(n.ok && n.mode === "NEW" && !n.invalidates);
    const e = replacementDraft(A, { practiceName: A.practiceName, street: A.street, postalCode: A.postalCode, city: A.city, phone: "0000 222", email: A.email }, TODAY);
    assert.ok(e.ok && e.mode === "EDIT" && e.invalidates);
    assert.deepEqual(e.ok ? e.changes : [], [{ field: "phone", before: "0000 111", after: "0000 222" }]);
    const none = replacementDraft(A, { ...A }, TODAY);
    assert.ok(!none.ok && none.message === "Es wurde nichts geändert.");
    assert.deepEqual(structuralChanges(undefined, normalizeReplacement({ practiceName: "X", street: "S", postalCode: "00000", city: "O", phone: "0" })).map((c) => c.field), ["practiceName", "street", "postalCode", "city", "phone"]);
  });
  test("server-generated record id", () => {
    assert.equal(replacementRecordId("Kinderärztin Müller & Söhne (Test)"), "vertretung-kinderaerztin-mueller-soehne-test");
    assert.equal(replacementRecordId("!!!"), "vertretung-praxis");
  });
  test("form parsing reads only the structural fields", () => {
    const r = parseReplacement(fromSearch({ name: "Praxis Beispiel A", telefon: "0000", status: "VERIFIED_CURRENT", verifiedBy: "Dr. X", praxisReplacementVerify: "VERIFY", eintrag: "x" }));
    assert.deepEqual(Object.keys(r).sort(), ["city", "email", "phone", "postalCode", "practiceName", "publicNote", "street", "website"]);
  });
});

describe("authority boundary (pure parts)", () => {
  const req = (role: string | null, ctx?: Record<string, unknown>) => ({ req: { user: role ? { id: 1, role, active: true } : null, context: ctx } });
  test("create: ADMIN only; update: ADMIN, or DOCTOR only inside the trusted verification context", () => {
    assert.deepEqual(["STAFF", "DOCTOR", "ADMIN", null].map((r) => ACCESS.replacementPractices.create(req(r) as never)), [false, false, true, false]);
    assert.deepEqual(["STAFF", "DOCTOR", "ADMIN"].map((r) => adminOrDoctorVerification(req(r))), [false, false, true]);
    assert.equal(adminOrDoctorVerification(req("DOCTOR", { [SERVER_CONTEXT.REPLACEMENT_VERIFY]: "VERIFY" })), true);
    assert.equal(adminOrDoctorVerification(req("STAFF", { [SERVER_CONTEXT.REPLACEMENT_VERIFY]: "VERIFY" })), false);
    assert.equal(adminOrDoctorVerification(req("DOCTOR", { [SERVER_CONTEXT.REPLACEMENT_VERIFY]: "yes" })), false, "only the exact server values");
    assert.equal(ACCESS.replacementPractices.delete(), false);
    assert.equal(replacementVerifyMode({ praxisReplacementVerify: "WITHDRAW" }), "WITHDRAW");
    assert.equal(auditOperationOf({ [SERVER_CONTEXT.AUDIT_OPERATION]: "END" }), "END");
  });
  test("provenance: ADMIN → TO_BE_CONFIRMED; DOCTOR → VERIFIED_CURRENT, ~6 months; STAFF refused; withdraw → OUTDATED", () => {
    const admin = { id: "1", name: "Test Verwaltung", role: "ADMIN" as const };
    const doctor = { id: "2", name: "Test Ärztin", role: "DOCTOR" as const };
    const staff = { id: "3", name: "Test Team", role: "STAFF" as const };
    assert.equal(verificationForWrite(admin, "REPLACEMENT_PRACTICE", "2027-04-21", TODAY).status, "TO_BE_CONFIRMED");
    const v = verificationForWrite(doctor, "REPLACEMENT_PRACTICE", reviewDueFor("REPLACEMENT_PRACTICE", {}, TODAY), TODAY);
    assert.deepEqual([v.status, v.lastVerified, v.reviewDue, v.sourceIds], ["VERIFIED_CURRENT", TODAY, "2027-04-21", ["PRACTICE_COCKPIT"]]);
    assert.throws(() => verificationForWrite(staff, "REPLACEMENT_PRACTICE", TODAY, TODAY));
    assert.equal(withdrawnProvenance(doctor, TODAY).status, "OUTDATED_DO_NOT_PUBLISH");
    assert.throws(() => withdrawnProvenance(admin, TODAY));
  });
});

describe("Prüfen and Urlaub integration", () => {
  test("expired once-confirmed entry → one actionable item; ADMIN drafts and withdrawn entries → none", () => {
    const items = reviewItems(data(), TODAY).filter((i) => i.id.startsWith("replacement"));
    assert.deepEqual(items.map((i) => [i.id, i.title, i.action?.href]), [["replacement-review-c", "Vertretungspraxis erneut bestätigen", "/intern/vertretungen/c"]]);
  });
  test("closure using an unusable practice: closure item with 'Vertretung prüfen', no duplicate general item", () => {
    const closure: Closure = { id: "urlaub-x", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-06", replacements: [{ replacementPracticeId: "c", from: "2026-11-02", until: "2026-11-06" }], verification: V("2026-11-06") };
    const items = reviewItems(data({ closures: [closure] }), TODAY).filter((i) => i.id.startsWith("replacement"));
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Vertretung Praxis Beispiel C nicht nutzbar");
    assert.deepEqual(items[0].action, { label: "Vertretung prüfen", href: "/intern/vertretungen/c" });
  });
  test("Urlaub / Heute geschlossen offer only current entries (no free-text replacement exists)", () => {
    assert.deepEqual(directoryOptions(data(), TODAY).filter((o) => o.usable).map((o) => o.id).sort(), ["a", "e"]);
    assert.deepEqual(replacementOptions(data(), TODAY).filter((o) => o.usable).map((o) => o.id).sort(), ["a", "e"]);
  });
});
