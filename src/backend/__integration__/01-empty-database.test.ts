// Step 1 of the clean-database proof: a freshly created, migrated, EMPTY database.
// No account may be created through any exposed route — not even the very first one.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, registerFirstUserOperation, type Payload } from "payload";
import { http, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
const staffCount = async () => (await payload.count({ collection: "staff", overrideAccess: true })).totalDocs;

describe("empty database (after migrations, before bootstrap)", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
  });
  after(async () => {
    await payload?.destroy();
  });

  test("migrations applied from zero; every collection empty", async () => {
    const migrations = await payload.find({ collection: "payload-migrations", overrideAccess: true, limit: 10 });
    assert.deepEqual(
      migrations.docs.map((m) => (m as { name?: string }).name),
      ["20261013_122224_initial"],
    );
    for (const c of ["staff", "weeklySchedules", "consultationTypes", "openingHourExceptions", "closures", "replacementPractices", "announcements", "auditEvents"] as const) {
      assert.equal((await payload.count({ collection: c, overrideAccess: true })).totalDocs, 0, c);
    }
  });

  test("Local API: Payload's first-user registration and account-less creation are rejected", async () => {
    const req = await createLocalReq({}, payload);
    await assert.rejects(registerFirstUserOperation({ collection: payload.collections.staff, data: { email: "angreifer@x.invalid", password: "Irgendwas-123456!", name: "X" } as never, req }));
    await assert.rejects(payload.create({ collection: "staff", data: { email: "y@x.invalid", password: "Irgendwas-123456!", name: "Y", role: "ADMIN" }, overrideAccess: true }));
    assert.equal(await staffCount(), 0);
  });

  test("HTTP: no first-user registration through any exposed route", { skip: skipHttp }, async () => {
    const register = await http("/api/staff/first-register", { method: "POST", body: { email: "angreifer@x.invalid", password: "Irgendwas-123456!", name: "X" } });
    assert.equal(register.status, 404, "REST first-register is closed");
    const view = await http("/intern/admin/create-first-user");
    assert.equal(view.status, 404, "admin registration view is closed");
    // The admin entry point on an empty database leads only to the closed view — never a form.
    let r = await http("/intern/admin");
    for (let i = 0; i < 5 && r.status >= 300 && r.status < 400 && r.location; i++) r = await http(new URL(r.location, "http://x").pathname);
    assert.doesNotMatch(r.body, /type="password"|name="password"/, "no registration form reachable");
    const create = await http("/api/staff", { method: "POST", body: { email: "neu@x.invalid", password: "Irgendwas-123456!", name: "Neu", role: "ADMIN" } });
    assert.ok([401, 403].includes(create.status), `anonymous account creation refused (${create.status})`);
    const closure = await http("/api/closures", { method: "POST", body: { recordId: "x", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-03" } });
    assert.ok([401, 403].includes(closure.status), `anonymous write refused (${closure.status})`);
    assert.equal(await staffCount(), 0);
  });
});
