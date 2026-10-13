// Step 2 of the clean-database proof: after the REAL bootstrap script created the first ADMIN
// (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, generated per run, never printed).
// Accounts, authentication over HTTP, role enforcement, provenance, audit and transactions —
// against the real Payload runtime, the running Next server and PostgreSQL.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, commitTransaction, logoutOperation, registerFirstUserOperation, type Payload } from "payload";
import { BootstrapRefused, createFirstAdmin } from "../bootstrap.ts";
import { berlinToday } from "../provenance.ts";
import { doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
type Staff = { id: number; email: string; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "DOCTOR" | "STAFF" | "DISABLED" | "LOCK", Staff>;
const PW: Record<"DOCTOR" | "STAFF" | "DISABLED" | "LOCK", string> = {
  DOCTOR: `Aerztin-${crypto.randomUUID()}`,
  STAFF: `Praxisteam-${crypto.randomUUID()}`,
  DISABLED: `Deaktiviert-${crypto.randomUUID()}`,
  LOCK: `Sperre-${crypto.randomUUID()}`,
};
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD ?? "";
const as = (user: Staff) => ({ user, overrideAccess: false as const });
const FAKE = { status: "VERIFIED_CURRENT", verifiedBy: "Dr. Erfunden (gefälscht)", lastVerified: "2020-01-01", reviewDue: "2099-01-01", sourceIds: [{ sourceId: "FAKE" }] };
const count = async (collection: "closures" | "auditEvents" | "openingHourExceptions", where?: Record<string, unknown>) =>
  (await payload.count({ collection, where: where as never, overrideAccess: true })).totalDocs;

describe("runtime after bootstrap", { skip: skipDb }, () => {
  before(async () => {
    assert.ok(ADMIN_EMAIL && ADMIN_PW, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD from the bootstrap step are required");
    payload = await testPayload();
  });
  after(async () => {
    await payload?.destroy();
  });

  // ------------------------------------------------------------------ bootstrap result
  test("bootstrap created exactly one active ADMIN; it cannot run twice; registration stays closed", async () => {
    const all = (await payload.find({ collection: "staff", overrideAccess: true })).docs.map((d) => doc<Staff>(d));
    assert.equal(all.length, 1);
    assert.equal(all[0].email, ADMIN_EMAIL);
    assert.equal(all[0].role, "ADMIN");
    assert.equal(all[0].active, true);
    users.ADMIN = { ...all[0], collection: "staff" };
    await assert.rejects(createFirstAdmin(payload, { email: "zweite@integration-test.invalid", name: "Zweite Verwaltung", password: `Zweite-${crypto.randomUUID()}` }), BootstrapRefused);
    const req = await createLocalReq({}, payload);
    await assert.rejects(registerFirstUserOperation({ collection: payload.collections.staff, data: { email: "z@x.invalid", password: "Irgendwas-123456!" } as never, req }));
    const audit = (await payload.find({ collection: "auditEvents", where: { entityType: { equals: "staff" } }, overrideAccess: true })).docs.map((d) => doc<{ actorId: string; operation: string }>(d));
    assert.deepEqual(audit.map((e) => [e.actorId, e.operation]), [["system:bootstrap", "CREATE"]]);
  });

  test("HTTP: second first-user attempt after bootstrap is still impossible", { skip: skipHttp }, async () => {
    assert.equal((await http("/api/staff/first-register", { method: "POST", body: { email: "z@x.invalid", password: "Irgendwas-123456!" } })).status, 404);
    assert.equal((await http("/intern/admin/create-first-user")).status, 404);
    assert.equal((await payload.count({ collection: "staff", overrideAccess: true })).totalDocs, 1);
  });

  // ------------------------------------------------------------------ accounts
  test("accounts: only ADMIN creates them; no self-promotion; no deletion", async () => {
    for (const [k, role, active] of [["DOCTOR", "DOCTOR", true], ["STAFF", "STAFF", true], ["DISABLED", "STAFF", false], ["LOCK", "STAFF", true]] as const) {
      const created = await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active }, ...as(users.ADMIN) });
      users[k] = { ...doc<Staff>(created), collection: "staff" };
    }
    await assert.rejects(payload.create({ collection: "staff", data: { email: "neu@integration-test.invalid", password: PW.STAFF, name: "Neu" }, ...as(users.DOCTOR) }));
    await assert.rejects(payload.create({ collection: "staff", data: { email: "neu2@integration-test.invalid", password: PW.STAFF, name: "Neu" }, ...as(users.STAFF) }));
    const self = doc<Staff>(await payload.update({ collection: "staff", id: users.STAFF.id, data: { role: "ADMIN" }, ...as(users.STAFF) }));
    assert.equal(self.role, "STAFF", "role change by the account itself is ignored");
    await assert.rejects(payload.update({ collection: "staff", id: users.STAFF.id, data: { name: "Fremd" }, ...as(users.DOCTOR) }));
    await assert.rejects(payload.delete({ collection: "staff", id: users.STAFF.id, ...as(users.ADMIN) }));
  });

  // ------------------------------------------------------------------ authentication (Local API)
  test("login: role is resolved server-side; wrong password and unknown email fail identically", async () => {
    const ok = await payload.login({ collection: "staff", data: { email: EMAIL("STAFF"), password: PW.STAFF } });
    assert.ok(ok.token);
    assert.equal(doc<Staff>(ok.user).role, "STAFF");
    const wrong = await payload.login({ collection: "staff", data: { email: EMAIL("STAFF"), password: "falsch-falsch-falsch" } }).then(() => "accepted", (e: Error) => e.message);
    const unknown = await payload.login({ collection: "staff", data: { email: "gibt-es-nicht@integration-test.invalid", password: "falsch-falsch-falsch" } }).then(() => "accepted", (e: Error) => e.message);
    assert.notEqual(wrong, "accepted");
    assert.equal(wrong, unknown);
  });

  test("disabled account cannot log in with the correct password", async () => {
    await assert.rejects(payload.login({ collection: "staff", data: { email: EMAIL("DISABLED"), password: PW.DISABLED } }));
  });

  test("lockout: after 5 failures even the correct password is refused", async () => {
    for (let i = 0; i < 5; i++) await payload.login({ collection: "staff", data: { email: EMAIL("LOCK"), password: "falsch-falsch-falsch" } }).catch(() => undefined);
    await assert.rejects(payload.login({ collection: "staff", data: { email: EMAIL("LOCK"), password: PW.LOCK } }));
    const locked = doc<{ lockUntil?: string }>(await payload.findByID({ collection: "staff", id: users.LOCK.id, overrideAccess: true, showHiddenFields: true }));
    assert.ok(locked.lockUntil && Date.parse(locked.lockUntil) > Date.now() + 10 * 60 * 1000, "locked for ~15 minutes");
  });

  test("session: logout revokes the server-side session (token no longer accepted)", async () => {
    const { token } = await payload.login({ collection: "staff", data: { email: EMAIL("DOCTOR"), password: PW.DOCTOR } });
    const headers = new Headers({ Authorization: `JWT ${token}` });
    const first = await payload.auth({ headers });
    assert.equal(doc<Staff>(first.user).role, "DOCTOR");
    assert.equal(String((await payload.auth({ headers })).user?.id), String(users.DOCTOR.id), "session persists across requests");
    await logoutOperation({ collection: payload.collections.staff, req: await createLocalReq({ user: first.user! }, payload) });
    assert.equal((await payload.auth({ headers })).user, null);
  });

  // ------------------------------------------------------------------ authentication over HTTP
  test("HTTP cookie: HttpOnly, SameSite=Lax, Secure (also on localhost), Path=/", { skip: skipHttp }, async () => {
    const r = await restLogin(EMAIL("STAFF"), PW.STAFF);
    assert.equal(r.status, 200);
    assert.ok(r.raw, "payload-token cookie set");
    assert.match(r.raw!, /;\s*HttpOnly/i);
    assert.match(r.raw!, /;\s*SameSite=Lax/i);
    assert.match(r.raw!, /;\s*Secure/i);
    assert.match(r.raw!, /;\s*Path=\//i);
    assert.doesNotMatch(r.body, /"hash"|"salt"/);
  });

  test("HTTP: ADMIN / DOCTOR / STAFF reach /intern; only ADMIN reaches /intern/admin", { skip: skipHttp }, async () => {
    const accounts = [
      ["ADMIN", ADMIN_EMAIL, ADMIN_PW, "Verwaltung"],
      ["DOCTOR", EMAIL("DOCTOR"), PW.DOCTOR, "Ärztin / Arzt"],
      ["STAFF", EMAIL("STAFF"), PW.STAFF, "Praxisteam"],
    ] as const;
    for (const [role, email, password, label] of accounts) {
      const { status, cookie } = await restLogin(email, password);
      assert.equal(status, 200, `${role} login`);
      const intern = await http("/intern", { cookie });
      assert.equal(intern.status, 200, `${role} /intern`);
      assert.match(intern.body, /Backend verbunden · Testumgebung/);
      assert.ok(intern.body.includes(label), `${role} role label`);
      const admin = await http("/intern/admin", { cookie });
      if (role === "ADMIN") {
        assert.equal(admin.status, 200, "ADMIN /intern/admin");
        assert.match(admin.body, /Praxis-Konten/);
      } else {
        const denied = (admin.status >= 300 && admin.status < 400 && /unauthorized|login|logout/.test(admin.location ?? "")) || !/Praxis-Konten/.test(admin.body);
        assert.ok(denied, `${role} must not see the admin (${admin.status} ${admin.location})`);
        assert.equal((await http("/api/staff", { cookie })).status, 403, `${role} cannot list accounts`);
        assert.equal(doc<{ user: Staff | null }>((await http("/api/staff/me", { cookie })).json).user?.role, role, `${role} reads only the own account`);
      }
    }
  });

  test("HTTP: wrong password is generic; disabled account refused", { skip: skipHttp }, async () => {
    const wrong = await restLogin(EMAIL("STAFF"), "falsch-falsch-falsch");
    const unknown = await restLogin("gibt-es-nicht@integration-test.invalid", "falsch-falsch-falsch");
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(JSON.stringify(doc<{ errors: unknown }>(wrong.json).errors), JSON.stringify(doc<{ errors: unknown }>(unknown.json).errors));
    const disabled = await restLogin(EMAIL("DISABLED"), PW.DISABLED);
    assert.ok(disabled.status >= 400 && !disabled.cookie, "disabled account gets no session");
  });

  test("HTTP: unauthenticated /intern → /intern/anmelden; /intern/admin shows no admin content; /api reads refused", { skip: skipHttp }, async () => {
    const intern = await http("/intern");
    assert.ok([303, 307, 308].includes(intern.status));
    assert.equal(new URL(intern.location!, "http://x").pathname, "/intern/anmelden");
    const login = await http("/intern/anmelden");
    assert.equal(login.status, 200);
    assert.doesNotMatch(login.body, /registrier|Konto erstellen|Testzugang|@beispiel\.test/i);
    const admin = await http("/intern/admin");
    assert.doesNotMatch(admin.body, /Praxis-Konten/);
    assert.equal((await http("/api/staff")).status, 403);
    assert.equal((await http("/api/auditEvents")).status, 403);
  });

  test("HTTP: logout invalidates the session — the old cookie is useless afterwards", { skip: skipHttp }, async () => {
    const { cookie } = await restLogin(EMAIL("STAFF"), PW.STAFF);
    assert.equal(doc<{ user: Staff | null }>((await http("/api/staff/me", { cookie })).json).user?.role, "STAFF");
    assert.equal((await http("/api/staff/logout", { method: "POST", cookie })).status, 200);
    assert.equal(doc<{ user: unknown }>((await http("/api/staff/me", { cookie })).json).user, null, "replayed cookie after logout");
    const intern = await http("/intern", { cookie });
    assert.equal(new URL(intern.location ?? "/", "http://x").pathname, "/intern/anmelden");
  });

  // ------------------------------------------------------------------ access + provenance over HTTP
  test("HTTP provenance: fake client verifiedBy/lastVerified/status are overwritten from the account + Berlin date", { skip: skipHttp }, async () => {
    const { cookie } = await restLogin(EMAIL("STAFF"), PW.STAFF);
    const r = await http("/api/closures", { method: "POST", cookie, body: { recordId: "it-urlaub", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-06", replacements: [], verification: FAKE } });
    assert.equal(r.status, 201, r.body);
    const stored = doc<{ verification: { status: string; verifiedBy: string; lastVerified: string; reviewDue: string; sourceIds: { sourceId: string }[] } }>(
      (await payload.find({ collection: "closures", where: { recordId: { equals: "it-urlaub" } }, overrideAccess: true })).docs[0],
    );
    assert.equal(stored.verification.status, "VERIFIED_CURRENT");
    assert.equal(stored.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
    assert.equal(stored.verification.lastVerified, berlinToday());
    assert.equal(stored.verification.reviewDue, "2026-11-06");
    assert.deepEqual(stored.verification.sourceIds.map((s) => s.sourceId), ["PRACTICE_COCKPIT"]);
    const id = doc<{ id: number }>((await payload.find({ collection: "closures", where: { recordId: { equals: "it-urlaub" } }, overrideAccess: true })).docs[0]).id;
    const upd = await http(`/api/closures/${id}`, { method: "PATCH", cookie, body: { endDate: "2026-11-05", verification: FAKE } });
    assert.equal(upd.status, 200, upd.body);
    const after = doc<{ doc: { verification: { verifiedBy: string; reviewDue: string } } }>(upd.json).doc;
    assert.equal(after.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
    assert.equal(after.verification.reviewDue, "2026-11-05");
  });

  test("HTTP access: STAFF operational only; ADMIN cannot create physician verification", { skip: skipHttp }, async () => {
    const staff = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    const admin = (await restLogin(ADMIN_EMAIL, ADMIN_PW)).cookie;
    const doctor = (await restLogin(EMAIL("DOCTOR"), PW.DOCTOR)).cookie;
    const schedule = { rules: [{ ruleId: "r1", weekday: "2", start: "08:00", end: "11:00", consultationType: "GENERAL", verification: FAKE }], confirmedClosedWeekdays: ["6", "7"], verification: FAKE };
    assert.equal((await http("/api/weeklySchedules", { method: "POST", cookie: staff, body: schedule })).status, 403, "STAFF schedule");
    assert.equal((await http("/api/consultationTypes", { method: "POST", cookie: staff, body: { code: "GENERAL", label: "X", verification: FAKE } })).status, 403, "STAFF consultation type");
    assert.equal((await http("/api/staff", { method: "POST", cookie: staff, body: { email: "x@integration-test.invalid", password: "Irgendwas-123456!", name: "X" } })).status, 403, "STAFF accounts");
    assert.equal((await http("/api/weeklySchedules", { method: "POST", cookie: admin, body: schedule })).status, 403, "ADMIN schedule (physician scope)");
    assert.equal((await http("/api/consultationTypes", { method: "POST", cookie: admin, body: { code: "GENERAL", label: "X", verification: FAKE } })).status, 403, "ADMIN consultation type");
    const rp = await http("/api/replacementPractices", {
      method: "POST",
      cookie: admin,
      body: { recordId: "it-vertretung", practiceName: "Praxis Beispiel (Test)", street: "Teststraße 1", postalCode: "00000", city: "Testort", phone: "0000 000", verification: FAKE },
    });
    assert.equal(rp.status, 201, rp.body);
    assert.equal(doc<{ doc: { verification: { status: string; verifiedBy: string | null } } }>(rp.json).doc.verification.status, "TO_BE_CONFIRMED");
    assert.ok(!doc<{ doc: { verification: { verifiedBy: string | null } } }>(rp.json).doc.verification.verifiedBy);
    const cal = await http("/api/globals/holidayCalendar", { method: "POST", cookie: admin, body: { policy: "CLOSED_ON_PUBLIC_HOLIDAYS", policyVerification: FAKE } });
    assert.equal(cal.status, 200, cal.body);
    assert.equal(doc<{ result: { policyVerification: { status: string } } }>(cal.json).result.policyVerification.status, "TO_BE_CONFIRMED");
    const ds = await http("/api/weeklySchedules", { method: "POST", cookie: doctor, body: schedule });
    assert.equal(ds.status, 201, ds.body);
    const s = doc<{ doc: { verification: { verifiedBy: string }; rules: { verification: { verifiedBy: string } }[] } }>(ds.json).doc;
    assert.equal(s.verification.verifiedBy, "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)");
    assert.equal(s.rules[0].verification.verifiedBy, s.verification.verifiedBy);
    const id = doc<{ id: number }>((await payload.find({ collection: "closures", where: { recordId: { equals: "it-urlaub" } }, overrideAccess: true })).docs[0]).id;
    assert.equal((await http(`/api/closures/${id}`, { method: "DELETE", cookie: admin })).status, 403, "nothing deletable, not even by ADMIN");
    assert.equal(await count("closures", { recordId: { equals: "it-urlaub" } }), 1);
  });

  // ------------------------------------------------------------------ audit
  test("audit: persisted events carry actor, versions and publish state — recursively free of secrets", async () => {
    const events = (await payload.find({ collection: "auditEvents", where: { entityId: { equals: "it-urlaub" } }, sort: "at", overrideAccess: true })).docs.map((d) =>
      doc<Record<string, unknown>>(d),
    );
    assert.deepEqual(events.map((e) => e.operation), ["CREATE", "UPDATE"]);
    const [c, u] = events;
    assert.equal(c.actorId, String(users.STAFF.id));
    assert.equal(c.actorName, "Test STAFF (künstlich)");
    assert.equal(c.actorRole, "STAFF");
    assert.equal(c.entityType, "closures");
    assert.equal(c.entityId, "it-urlaub");
    assert.equal(c.publishState, "PUBLISHED");
    assert.ok(Math.abs(Date.parse(String(c.at)) - Date.now()) < 10 * 60 * 1000, "timestamp");
    assert.equal(c.previous, null);
    assert.equal(doc<{ endDate: string }>(c.next).endDate, "2026-11-06");
    assert.equal(doc<{ endDate: string }>(u.previous).endDate, "2026-11-06");
    assert.equal(doc<{ endDate: string }>(u.next).endDate, "2026-11-05");
    // an account change incl. a password change is audited without any secret
    const newPw = `Neu-${crypto.randomUUID()}`;
    await payload.update({ collection: "staff", id: users.DOCTOR.id, data: { password: newPw }, ...as(users.ADMIN) });
    const all = (await payload.find({ collection: "auditEvents", pagination: false, overrideAccess: true })).docs;
    assert.ok(all.some((e) => doc<{ entityType: string }>(e).entityType === "staff" && doc<{ actorId: string }>(e).actorId === String(users.ADMIN.id)));
    assert.deepEqual(secretKeys(all), [], "no secret-like key anywhere in any audit event");
    const text = JSON.stringify(all);
    for (const secret of [newPw, ADMIN_PW, ...Object.values(PW), process.env.PAYLOAD_SECRET ?? "unset"]) assert.ok(!text.includes(secret), "no secret value in audit");
    // append-only
    const id = doc<{ id: number }>(all[0]).id;
    await assert.rejects(payload.update({ collection: "auditEvents", id, data: { actorName: "x" } as never, ...as(users.ADMIN) }));
    await assert.rejects(payload.delete({ collection: "auditEvents", id, ...as(users.ADMIN) }));
  });

  // ------------------------------------------------------------------ transactions (PostgreSQL)
  test("transaction: successful operational write commits business record AND audit event", async () => {
    const before = { rec: await count("closures"), audit: await count("auditEvents") };
    await payload.create({ collection: "closures", data: { recordId: "it-ok", kind: "TRAINING", startDate: "2026-12-01", endDate: "2026-12-01", replacements: [], verification: FAKE } as never, ...as(users.STAFF) });
    assert.equal(await count("closures"), before.rec + 1);
    assert.equal(await count("auditEvents", { entityId: { equals: "it-ok" } }), 1);
    assert.equal(await count("auditEvents"), before.audit + 1);
  });

  test("transaction: a rejected write after the transaction began rolls back everything — no orphan audit", async () => {
    await payload.create({
      collection: "openingHourExceptions",
      data: { recordId: "it-sonder", kind: "SPECIAL_HOURS", startDate: "2026-11-11", endDate: "2026-11-11", intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }], priority: 1, verification: FAKE } as never,
      ...as(users.DOCTOR),
    });
    const before = { rec: await count("closures"), audit: await count("auditEvents") };

    const req = await createLocalReq({ user: users.STAFF as never }, payload);
    assert.equal(await initTransaction(req), true, "transaction started");
    await payload.create({ collection: "closures", data: { recordId: "it-tx-erst", kind: "TRAINING", startDate: "2026-12-02", endDate: "2026-12-02", replacements: [], verification: FAKE } as never, user: users.STAFF, overrideAccess: false, req });
    // inside the transaction: record and its audit event exist (same req → same connection)
    assert.equal((await payload.count({ collection: "auditEvents", where: { entityId: { equals: "it-tx-erst" } }, overrideAccess: true, req })).totalDocs, 1);
    // now a write that the publish guard rejects (vacation over the special-hours day)
    await assert.rejects(
      payload.create({ collection: "closures", data: { recordId: "it-tx-konflikt", kind: "VACATION", startDate: "2026-11-09", endDate: "2026-11-13", replacements: [], verification: FAKE } as never, user: users.STAFF, overrideAccess: false, req }),
      /Widersprüchliche Angaben am 2026-11-11/,
    );
    await killTransaction(req);

    assert.equal(await count("closures", { recordId: { in: ["it-tx-erst", "it-tx-konflikt"] } }), 0, "no business record persisted");
    assert.equal(await count("auditEvents", { entityId: { in: ["it-tx-erst", "it-tx-konflikt"] } }), 0, "no orphan audit event");
    assert.equal(await count("closures"), before.rec);
    assert.equal(await count("auditEvents"), before.audit);

    // and a plain rejected write outside an explicit transaction leaves nothing either
    await assert.rejects(payload.create({ collection: "closures", data: { recordId: "it-konflikt", kind: "VACATION", startDate: "2026-11-09", endDate: "2026-11-13", replacements: [], verification: FAKE } as never, ...as(users.STAFF) }));
    assert.equal(await count("closures"), before.rec);
    assert.equal(await count("auditEvents"), before.audit);
  });

  test("transaction: explicit commit keeps record and audit event together", async () => {
    const req = await createLocalReq({ user: users.STAFF as never }, payload);
    assert.equal(await initTransaction(req), true);
    await payload.create({ collection: "closures", data: { recordId: "it-tx-commit", kind: "TRAINING", startDate: "2026-12-03", endDate: "2026-12-03", replacements: [], verification: FAKE } as never, user: users.STAFF, overrideAccess: false, req });
    await commitTransaction(req);
    assert.equal(await count("closures", { recordId: { equals: "it-tx-commit" } }), 1);
    assert.equal(await count("auditEvents", { entityId: { equals: "it-tx-commit" } }), 1);
  });

  test("unauthenticated Local API writes are refused everywhere", async () => {
    const data = { recordId: "anon", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-03", replacements: [], verification: FAKE };
    for (const collection of ["closures", "openingHourExceptions", "announcements", "weeklySchedules", "consultationTypes", "replacementPractices", "auditEvents", "staff"] as const) {
      await assert.rejects(payload.create({ collection, data: data as never, overrideAccess: false }), collection);
    }
    await assert.rejects(payload.updateGlobal({ slug: "holidayCalendar", data: { policy: "CLOSED_ON_PUBLIC_HOLIDAYS" }, overrideAccess: false }));
  });
});
