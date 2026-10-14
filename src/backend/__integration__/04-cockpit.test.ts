// Step 4 of the clean-database proof (Phase 09.4): the real cockpit READ experience.
// PostgreSQL → Payload → PayloadPracticeRepository → cockpit read model → getPracticeStatus()
// → rendered /intern and /intern/vorschau. Artificial accounts and data only.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Payload } from "payload";
import { getPracticeStatus } from "../../domain/practice-status.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { loadCockpitHome, loadPreview } from "../../cockpit/queries.ts";
import { EMAIL, http, restLogin, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}` };
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };

describe("real cockpit read experience", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
    await payload.db.migrateFresh({ forceAcceptWarning: true });
    await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
    const admin = { ...(await payload.find({ collection: "staff", overrideAccess: true })).docs[0], collection: "staff" };
    for (const [k, role] of [["DOCTOR", "DOCTOR"], ["STAFF", "STAFF"]] as const) {
      await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active: true }, user: admin, overrideAccess: false });
    }
    // The current static website data, persisted with its documented provenance.
    const docs = docsFromPulsData(PULS_DATA);
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
    await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
  });
  after(async () => {
    await payload?.destroy();
  });

  test("read model: Praxis heute is the engine result over database data", async () => {
    const now = zonedToInstant("2026-10-13", "09:30");
    const home = await loadCockpitHome(reader, now);
    const dbData = await new PayloadPracticeRepository(reader).getPulsData();
    assert.deepEqual(home.today.result, getPracticeStatus(now, dbData));
    assert.deepEqual(home.today.result, getPracticeStatus(now, PULS_DATA), "seeded database = current website");
    assert.ok(home.today.hours.length > 0);
  });

  test("Prüfen from the database: unresolved weekday holiday", async () => {
    const home = await loadCockpitHome(reader, zonedToInstant("2026-11-01", "10:00"));
    assert.ok(home.review.some((r) => r.id === "holiday-2026-12-25"), home.review.map((r) => r.id).join(","));
  });

  test("HTTP: unauthenticated preview → login", { skip: skipHttp }, async () => {
    const r = await http("/intern/vorschau?datum=2026-10-14&zeit=10:00");
    assert.equal(new URL(r.location ?? "/", "http://x").pathname, "/intern/anmelden");
  });

  test("HTTP: Website-Vorschau equals the current website for the seeded data", { skip: skipHttp }, async () => {
    const { cookie } = await restLogin(EMAIL("STAFF"), PW.STAFF);
    const r = await http("/intern/vorschau?datum=2026-10-14&zeit=10:00", { cookie });
    assert.equal(r.status, 200);
    assert.match(r.body, /Stimmt mit der aktuellen Website überein\./);
    const expected = getPracticeStatus(zonedToInstant("2026-10-14", "10:00"), PULS_DATA);
    assert.ok(r.body.includes(expected.headline), "engine headline rendered");
  });

  test("HTTP: a real operational write shows up as an upcoming date, a preview difference and a review item", { skip: skipHttp }, async () => {
    const admin = (await restLogin(EMAIL("ADMIN"), PW.ADMIN)).cookie;
    const staff = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    // ADMIN enters a replacement practice — it stays unconfirmed (physician scope).
    const rp = await http("/api/replacementPractices", { method: "POST", cookie: admin, body: { recordId: "it-vertretung", practiceName: "Praxis Beispiel (Test)", street: "Teststraße 1", postalCode: "00000", city: "Testort", phone: "0000 000" } });
    assert.equal(rp.status, 201, rp.body);
    const closure = await http("/api/closures", {
      method: "POST",
      cookie: staff,
      body: { recordId: "it-urlaub", kind: "VACATION", startDate: "2026-11-02", endDate: "2026-11-06", replacements: [{ replacementPracticeId: "it-vertretung", from: "2026-11-02", until: "2026-11-06" }] },
    });
    assert.equal(closure.status, 201, closure.body);

    const home = await loadCockpitHome(reader, zonedToInstant("2026-10-13", "09:30"));
    const item = home.upcoming.find((i) => i.id === "it-urlaub");
    // 09.5C: the summary names each replacement period.
    assert.ok(item && item.title === "Urlaub" && item.detail === "Vertretung: Praxis Beispiel (Test) (2.–6. November)", item?.detail);
    assert.ok(home.review.some((r) => r.id === "replacement-it-urlaub-it-vertretung-2026-11-02"));

    const page = await http("/intern", { cookie: staff });
    assert.equal(page.status, 200);
    assert.match(page.body, /Praxis heute/);
    assert.match(page.body, /Aus der Datenbank berechnet/);
    assert.match(page.body, /Montag, 2\. November – Freitag, 6\. November/);
    assert.match(page.body, /Vertretung Praxis Beispiel \(Test\) nicht nutzbar/);

    const preview = await http("/intern/vorschau?datum=2026-11-03&zeit=10:00", { cookie: staff });
    assert.match(preview.body, /Abweichung zur aktuellen Website/);
    assert.match(preview.body, /Schließung: Website „keine“ · Datenbank „Urlaub/);
    const { comparison } = await loadPreview(reader, PULS_DATA, zonedToInstant("2026-11-03", "10:00"));
    assert.equal(comparison.equal, false);
    assert.equal(comparison.database.status, "VACATION");
  });

  test("HTTP: navigation is role-aware; /intern/admin stays ADMIN-only server-side", { skip: skipHttp }, async () => {
    for (const [k, pw, admin] of [["ADMIN", PW.ADMIN, true], ["DOCTOR", PW.DOCTOR, false], ["STAFF", PW.STAFF, false]] as const) {
      const { cookie } = await restLogin(EMAIL(k), pw);
      const page = await http("/intern", { cookie });
      assert.match(page.body, /href="\/intern\/vorschau"/, k);
      assert.equal(/href="\/intern\/admin"/.test(page.body), admin, `${k} Verwaltung link`);
      const adminPage = await http("/intern/admin", { cookie });
      if (!admin) assert.ok(/unauthorized/.test(adminPage.location ?? "") || !/Praxis-Konten/.test(adminPage.body), `${k} must not reach the admin`);
    }
  });

  test("public website still static: same HTML status for / regardless of database content", { skip: skipHttp }, async () => {
    const r = await http("/heute");
    assert.equal(r.status, 200);
    assert.doesNotMatch(r.body, /Urlaub.*2\. November/, "the database closure never reaches the public site");
  });
});
