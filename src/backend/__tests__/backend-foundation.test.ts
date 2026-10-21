// Phase 09.2 — Payload backend foundation without a database: access rules, provenance and
// audit hooks, publish guard, no-patient-data guard, auth settings, dependency direction.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ACCESS, activeRole, type StaffUserLike } from "../access.ts";
import { COLLECTIONS, GLOBALS, Staff } from "../collections.ts";
import { auditHook, holidayPolicyHook, provenanceHook, publishGuardHook } from "../hooks.ts";
import { assertNoPatientFields, patientLikeFields } from "../privacy.ts";
import { actorFromUser, ProvenanceRejected, reviewDueFor, verificationForWrite } from "../provenance.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { RejectedError, SERVER_CONTEXT } from "../server-context.ts";
import { PULS_DATA } from "../../content/schedule.ts";

const STAFF = { id: 1, name: "Test Team", role: "STAFF", active: true };
const DOCTOR = { id: 2, name: "Test Ärztin", role: "DOCTOR", active: true };
const ADMIN = { id: 3, name: "Test Verwaltung", role: "ADMIN", active: true };
const DISABLED = { ...DOCTOR, id: 4, active: false };
const req = (user: StaffUserLike | null, extra: Record<string, unknown> = {}) => ({ req: { user, ...extra } });
type Hook = (args: Record<string, unknown>) => unknown;
const call = (h: unknown, args: Record<string, unknown>) => (h as Hook)(args);

describe("server-side access matrix", () => {
  test("signed-out and disabled accounts have no access at all", () => {
    for (const [slug, rules] of Object.entries(ACCESS)) {
      for (const [op, fn] of Object.entries(rules)) {
        assert.equal((fn as (a: unknown) => boolean)(req(null)), false, `${slug}.${op} anonymous`);
        assert.equal((fn as (a: unknown) => boolean)({ ...req(DISABLED), id: 4 }), false, `${slug}.${op} disabled`);
      }
    }
    assert.equal(activeRole({ role: "ROOT", active: true }), null);
  });

  test("nothing is deletable through the API; audit is append-only", () => {
    for (const [slug, rules] of Object.entries(ACCESS)) for (const u of [STAFF, DOCTOR, ADMIN]) assert.equal(rules.delete(), false, `${slug} ${u.role}`);
    for (const u of [STAFF, DOCTOR, ADMIN]) {
      assert.equal(ACCESS.auditEvents.create(), false);
      assert.equal(ACCESS.auditEvents.update(), false);
      assert.equal(ACCESS.auditEvents.read(req(u)), u.role !== "STAFF");
    }
  });

  test("weekly schedule and consultation types: DOCTOR only; operational records: every active role", () => {
    for (const slug of ["weeklySchedules", "consultationTypes"] as const) {
      assert.equal(ACCESS[slug].update(req(STAFF)), false);
      assert.equal(ACCESS[slug].update(req(ADMIN)), false);
    }
    // 09.5J: consultation types only through a trusted physician workflow (regular types / acute baseline).
    for (const op of ["create", "update"] as const) {
      assert.equal(ACCESS.consultationTypes[op](req(DOCTOR)), false, `${op} generic DOCTOR`);
      for (const k of [SERVER_CONTEXT.CONSULTATION_TYPE, SERVER_CONTEXT.ACUTE_BASELINE]) {
        assert.equal(ACCESS.consultationTypes[op](req(DOCTOR, { context: { [k]: true } })), true, `${op} ${k}`);
        for (const u of [STAFF, ADMIN]) assert.equal(ACCESS.consultationTypes[op](req(u, { context: { [k]: true } })), false, `${op} ${u.role} ${k}`);
      }
      assert.equal(ACCESS.consultationTypes[op](req(DOCTOR, { context: { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true } })), false, "weekly context cannot write types");
    }
    // 09.5I: the weekly plan only through a trusted physician workflow — no generic DOCTOR write.
    const ctx = (k: string) => ({ context: { [k]: true } });
    for (const op of ["create", "update"] as const) {
      assert.equal(ACCESS.weeklySchedules[op](req(DOCTOR)), false, `${op} generic`);
      assert.equal(ACCESS.weeklySchedules[op](req(DOCTOR, ctx(SERVER_CONTEXT.WEEKLY_SCHEDULE))), true, `${op} weekly`);
      assert.equal(ACCESS.weeklySchedules[op](req(DOCTOR, ctx(SERVER_CONTEXT.ACUTE_BASELINE))), true, `${op} acute`);
      for (const u of [STAFF, ADMIN]) assert.equal(ACCESS.weeklySchedules[op](req(u, ctx(SERVER_CONTEXT.WEEKLY_SCHEDULE))), false, `${op} ${u.role}`);
    }
    for (const slug of ["openingHourExceptions", "closures", "announcements"] as const) for (const u of [STAFF, DOCTOR, ADMIN]) assert.equal(ACCESS[slug].create(req(u)), true);
    assert.equal(ACCESS.replacementPractices.create(req(STAFF)), false);
  });

  test("staff accounts: ADMIN manages; others only themselves; role/active are admin-only fields", () => {
    assert.equal(ACCESS.staff.create(req(ADMIN)), true);
    assert.equal(ACCESS.staff.create(req(DOCTOR)), false);
    assert.equal(ACCESS.staff.update({ ...req(STAFF), id: 1 }), true);
    assert.equal(ACCESS.staff.update({ ...req(STAFF), id: 2 }), false);
    for (const name of ["role", "active"]) {
      const f = Staff.fields.find((x) => "name" in x && x.name === name) as { access: { update: (a: unknown) => boolean } };
      assert.equal(f.access.update(req(STAFF)), false, name);
      assert.equal(f.access.update(req(DOCTOR)), false, name);
      assert.equal(f.access.update(req(ADMIN)), true, name);
    }
  });
});

describe("authentication settings (Payload built-in auth, no custom crypto)", () => {
  test("lockout, secure cookies, no API keys", () => {
    const auth = Staff.auth as { maxLoginAttempts: number; lockTime: number; useAPIKey: boolean; cookies: { secure: boolean; sameSite: string } };
    assert.equal(auth.maxLoginAttempts, 5);
    assert.equal(auth.lockTime, 15 * 60 * 1000);
    assert.equal(auth.useAPIKey, false);
    assert.deepEqual(auth.cookies, { secure: true, sameSite: "Lax" });
  });

  test("disabled accounts cannot log in", () => {
    const [beforeLogin] = Staff.hooks!.beforeLogin!;
    assert.throws(() => call(beforeLogin, { user: { ...DOCTOR, active: false } }), /^Error: Anmeldung nicht möglich\.$|Anmeldung nicht möglich/);
    assert.deepEqual(call(beforeLogin, { user: DOCTOR }), DOCTOR);
  });
});

describe("provenance: generated from the account, never typed in", () => {
  test("client-supplied verifiedBy is ignored", () => {
    const hook = provenanceHook("CLOSURE");
    const out = call(hook, {
      ...req(STAFF),
      data: { startDate: "2026-10-19", endDate: "2026-10-23", verification: { status: "VERIFIED_CURRENT", verifiedBy: "Dr. Erfunden", lastVerified: "2020-01-01", sourceIds: [] } },
    }) as { verification: { verifiedBy: string; reviewDue: string; sourceIds: { sourceId: string }[] } };
    assert.match(out.verification.verifiedBy, /^Test Team, Praxisteam \(Praxis Cockpit\)$/);
    assert.equal(out.verification.reviewDue, "2026-10-23");
    assert.deepEqual(out.verification.sourceIds, [{ sourceId: "PRACTICE_COCKPIT" }]);
  });

  test("nested weekly-schedule rule verifications are generated too", () => {
    const out = call(provenanceHook("WEEKLY_SCHEDULE"), { ...req(DOCTOR), data: { rules: [{ ruleId: "r", verification: { status: "VERIFIED_CURRENT", verifiedBy: "Fake" } }] } }) as {
      rules: { verification: { verifiedBy: string } }[];
    };
    assert.match(out.rules[0].verification.verifiedBy, /^Test Ärztin, Ärztin \/ Arzt/);
  });

  test("STAFF cannot confirm the weekly schedule; ADMIN directory entry stays unconfirmed; signed-out rejected", () => {
    assert.throws(() => call(provenanceHook("WEEKLY_SCHEDULE"), { ...req(STAFF), data: {} }), (e: Error & { status?: number }) => e instanceof RejectedError && e.status === 403 && /Ärztin oder ein Arzt/.test(e.message));
    assert.throws(() => call(provenanceHook("CONSULTATION_TYPE"), { ...req(ADMIN), data: {} }), RejectedError);
    const admin = actorFromUser(ADMIN);
    assert.deepEqual(verificationForWrite(admin, "REPLACEMENT_PRACTICE", "2027-01-01", "2026-10-13"), { status: "TO_BE_CONFIRMED", sourceIds: [] });
    assert.throws(() => verificationForWrite(null, "CLOSURE", "2026-10-13", "2026-10-13"), ProvenanceRejected);
    assert.equal(actorFromUser(DISABLED), null);
  });

  test("reviewDue per kind", () => {
    assert.equal(reviewDueFor("EXCEPTION", { endDate: "2026-10-14" }, "2026-10-13"), "2026-10-14");
    assert.equal(reviewDueFor("ANNOUNCEMENT", { validUntil: "2026-10-20" }, "2026-10-13"), "2026-10-20");
    assert.equal(reviewDueFor("ANNOUNCEMENT", { openEnded: true }, "2026-10-13"), "2026-11-12");
    assert.equal(reviewDueFor("WEEKLY_SCHEDULE", {}, "2026-10-13"), "2027-04-13");
  });

  // 09.5H: ADMIN maintains dates; a changed policy is unconfirmed; only the trusted physician path confirms.
  const STORED = { holidays: [{ date: "2026-12-25", name: "Test" }], policy: "CLOSED_ON_PUBLIC_HOLIDAYS", policyVerification: { status: "VERIFIED_CURRENT", verifiedBy: "Dr. Test" } };
  const holiday = (user: StaffUserLike | null, data: Record<string, unknown>, context: Record<string, unknown> = {}) =>
    call(holidayPolicyHook, { data, originalDoc: STORED, req: { user, context } }) as { policy: string; holidays: unknown; policyVerification: { status: string; verifiedBy?: string } };
  test("holiday policy: ADMIN policy change → TO_BE_CONFIRMED; client verification ignored", () => {
    const out = holiday(ADMIN, { policy: "REQUIRE_EXPLICIT_ENTRY", policyVerification: { status: "VERIFIED_CURRENT" } });
    assert.equal(out.policyVerification.status, "TO_BE_CONFIRMED");
  });
  test("holiday policy: ADMIN date maintenance keeps the stored physician verification", () => {
    const out = holiday(ADMIN, { holidays: [{ date: "2026-12-26", name: "Neu" }], policyVerification: { status: "TO_BE_CONFIRMED" } });
    assert.deepEqual(out.policyVerification, STORED.policyVerification);
  });
  test("holiday policy: DOCTOR via the trusted context — generated verification, stored dates kept; no date change; no STAFF", () => {
    const ctx = { praxisHolidayPolicyWrite: true };
    const out = holiday(DOCTOR, { policy: "REQUIRE_EXPLICIT_ENTRY", policyVerification: { status: "OUTDATED_DO_NOT_PUBLISH" } }, ctx);
    assert.equal(out.policy, "REQUIRE_EXPLICIT_ENTRY");
    assert.equal(out.policyVerification.status, "VERIFIED_CURRENT");
    assert.match(String(out.policyVerification.verifiedBy), /Test Ärztin, Ärztin \/ Arzt/);
    assert.deepEqual(out.holidays, STORED.holidays);
    assert.throws(() => holiday(DOCTOR, { policy: "CLOSED_ON_PUBLIC_HOLIDAYS", holidays: [{ date: "2027-01-01", name: "X" }] }, ctx));
    assert.throws(() => holiday({ id: 9, name: "Team", role: "STAFF", active: true } as StaffUserLike, { policy: "CLOSED_ON_PUBLIC_HOLIDAYS" }, ctx));
    assert.throws(() => holiday(ADMIN, { policy: "CLOSED_ON_PUBLIC_HOLIDAYS" }, ctx), "ADMIN cannot use the physician path");
    assert.throws(() => holiday(ADMIN, { policy: "IMMER_OFFEN" }));
  });
});

describe("publish guard (same engine as the Website-Vorschau)", () => {
  const docs = docsFromPulsData(PULS_DATA);
  // As produced by the provenance hook (which runs before the guard).
  const VERIFIED = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: [{ sourceId: "PRACTICE_COCKPIT" }] };
  const existing = { recordId: "sonder", kind: "SPECIAL_HOURS", startDate: "2026-10-21", endDate: "2026-10-21", intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }], priority: 1, verification: VERIFIED };
  const payload = {
    find: async ({ collection }: { collection: string }) => ({
      docs: ({ weeklySchedules: [docs.schedule], consultationTypes: docs.consultationTypes, openingHourExceptions: [existing] } as Record<string, unknown[]>)[collection] ?? [],
    }),
    findGlobal: async () => docs.holidayCalendar,
  };

  test("a contradicting second record is rejected server-side", async () => {
    const hook = publishGuardHook("openingHourExceptions");
    const data = { ...existing, recordId: "neu", intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }] };
    await assert.rejects(async () => call(hook, { ...req(STAFF, { payload }), data }), /Widersprüchliche Angaben am 2026-10-21/);
  });

  test("editing the same record (same recordId) passes", async () => {
    const hook = publishGuardHook("openingHourExceptions");
    const data = { ...existing, intervals: [{ start: "08:00", end: "10:00", consultationType: "GENERAL" }] };
    assert.deepEqual(await call(hook, { ...req(STAFF, { payload }), data, originalDoc: existing }), data);
  });

  test("a vacation over the special-hours day is rejected", async () => {
    const hook = publishGuardHook("closures");
    const data = { recordId: "urlaub", kind: "VACATION", startDate: "2026-10-19", endDate: "2026-10-23", replacements: [], verification: VERIFIED };
    await assert.rejects(async () => call(hook, { ...req(STAFF, { payload }), data }), /Widersprüchliche/);
  });
});

describe("audit hook", () => {
  test("appends one event with actor snapshot, versions and no secrets (overrideAccess, same req)", async () => {
    const created: { collection: string; data: Record<string, unknown>; overrideAccess: boolean; req: unknown }[] = [];
    const r = { user: ADMIN, payload: { create: async (a: (typeof created)[number]) => created.push(a) } };
    const doc = { id: 9, name: "Neu", email: "konto@beispiel.test", role: "STAFF", hash: "h", salt: "s", resetPasswordToken: "t" };
    await call(auditHook("staff"), { req: r, doc, previousDoc: { ...doc, name: "Alt" }, operation: "update" });
    assert.equal(created.length, 1);
    const [c] = created;
    assert.equal(c.collection, "auditEvents");
    assert.equal(c.overrideAccess, true);
    assert.equal(c.req, r);
    assert.equal(c.data.actorName, "Test Verwaltung");
    assert.equal(c.data.actorRole, "ADMIN");
    assert.equal(c.data.operation, "UPDATE");
    assert.equal(c.data.entityId, "9");
    assert.equal("id" in c.data, false);
    assert.doesNotMatch(JSON.stringify(c.data), /"(hash|salt|resetPasswordToken)"/);
  });
});

describe("no patient data", () => {
  test("no collection or global has a patient-like field", () => {
    assert.deepEqual(patientLikeFields([...COLLECTIONS, ...GLOBALS.map((g) => ({ slug: g.slug, fields: g.fields }))] as never), []);
  });
  test("the guard rejects patient-like fields", () => {
    for (const name of ["patientName", "geburtsdatum", "dateOfBirth", "diagnose", "behandlung", "terminZeit", "appointment", "versicherung", "insuranceNo", "medicalRecord", "nachricht", "message", "anliegen", "symptoms"]) {
      assert.throws(() => assertNoPatientFields([{ slug: "x", fields: [{ name }] }]), /Patient-like/, name);
    }
    assert.throws(() => assertNoPatientFields([{ slug: "x", fields: [{ name: "group", type: "group", fields: [{ name: "patient" }] }] }]));
  });
});

// ---------------------------------------------------------------- dependency direction

const ROOT = join(import.meta.dirname, "..", "..", "..");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n === ".next" || n === "__tests__" || n === "__integration__") return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}
const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const imports = (p: string) => [...readFileSync(p, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);

describe("dependency direction", () => {
  const all = [...files(join(ROOT, "src")), ...files(join(ROOT, "app"))];

  test("src/domain depends on nothing framework- or backend-specific", () => {
    for (const f of all.filter((p) => rel(p).startsWith("src/domain/"))) {
      for (const i of imports(f)) assert.doesNotMatch(i, /^(payload|react|next)(\/|$)|^@payloadcms\/|^@\/|\/lab\/|\/backend\/|\/data\/|\/content\//, `${rel(f)} → ${i}`);
    }
  });

  test("the public app and content never import the backend or Payload (static data stays authoritative)", () => {
    // Only the backend route groups (Payload admin/REST, /intern shell) may use the backend.
    for (const f of all.filter((p) => !/^(src\/backend\/|src\/cockpit\/|app\/\(payload\)\/|app\/\(intern\)\/)/.test(rel(p)))) {
      for (const i of imports(f)) {
        assert.doesNotMatch(i, /^payload$|^@payloadcms\//, `${rel(f)} → ${i}`);
        assert.doesNotMatch(i, /(^|\/)backend\//, `${rel(f)} → ${i}`);
      }
    }
  });

  test("backend modules import Payload as types only (no runtime coupling outside payload.config.ts)", () => {
    // Generated migration files are executed by the Payload CLI and may import the adapter.
    for (const f of all.filter((p) => rel(p).startsWith("src/backend/") && !rel(p).startsWith("src/backend/migrations/"))) {
      for (const line of readFileSync(f, "utf8").split("\n").filter((l) => /from ["'](payload|@payloadcms\/[^"']+)["']/.test(l))) {
        assert.match(line, /^import type /, `${rel(f)}: ${line}`);
      }
    }
  });

  test("production code does not depend on lab mocks", () => {
    const prod = all.filter((p) => /^src\/(domain|data|backend|content|cockpit)\//.test(rel(p)) || (rel(p).startsWith("app/") && !rel(p).startsWith("app/(frontend)/lab/")));
    for (const f of prod) for (const i of imports(f)) assert.doesNotMatch(i, /lab\/cockpit/, `${rel(f)} → ${i}`);
  });

  test("Payload is mounted only at /intern/admin (admin) and /api (REST) — no GraphQL, no /admin", () => {
    const backendRoutes = all.map(rel).filter((p) => /^app\/\(payload\)\//.test(p) && /\/(page|route|layout|not-found)\.tsx?$/.test(p));
    assert.deepEqual(backendRoutes.sort(), [
      "app/(payload)/api/[...slug]/route.ts",
      "app/(payload)/intern/admin/[[...segments]]/not-found.tsx",
      "app/(payload)/intern/admin/[[...segments]]/page.tsx",
      "app/(payload)/layout.tsx",
    ]);
    for (const f of all.map(rel)) assert.doesNotMatch(f, /graphql|^app\/(\([^)]+\)\/)?admin\//i, f);
    assert.match(readFileSync(join(ROOT, "payload.config.ts"), "utf8"), /graphQL: \{ disable: true \}/);
    assert.match(readFileSync(join(ROOT, "payload.config.ts"), "utf8"), /routes: \{ admin: "\/intern\/admin", api: "\/api" \}/);
  });
});
