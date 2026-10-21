// Step 19 of the clean-database proof (Phase 09.5H): Feiertagsregel.
// DOCTOR confirms the practice-wide holiday rule through the trusted path (policy only — never the
// dates); ADMIN maintains the calendar (a changed policy becomes unconfirmed, a date edit keeps it);
// explicit single-date entries (09.5F) override the rule; stale / rollback / no quick undo; static
// public site. ARTIFICIAL holiday dates and decisions only — F49 stays TO_BE_CONFIRMED.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, weekdayOf, zonedToInstant } from "../../domain/time.ts";
import { docsFromPulsData, type HolidayCalendarDoc } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { planFor } from "../../cockpit/history.ts";
import { commitHolidayPolicy, confirmHolidayPolicy } from "../../cockpit/workflows/publish.ts";
import { POLICY_STALE, calendarFingerprint } from "../../cockpit/workflows/holiday-policy.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}`, INACTIVE: `Inaktiv-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR" | "INACTIVE", Staff>;
const cookies = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", string | undefined>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] };
const FAKE = { status: "VERIFIED_CURRENT", lastVerified: "2030-01-01", reviewDue: "2099-01-01", verifiedBy: "Dr. Erfunden", sourceIds: [{ sourceId: "FAKE" }] };
const today = berlinNow(new Date()).date;
const W: string[] = [];
for (let d = addDays(today, 7); W.length < 4; d = addDays(d, 1)) if (weekdayOf(d) <= 5) W.push(d);
const [HA, , HB] = W; // artificial weekday holidays within the Prüfen horizon
const rule = (d: number): OpeningHoursRule => ({ id: `r${d}`, weekday: d as 1, start: "08:00", end: "16:00", consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].map(rule), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [HA, HB],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

const repo = () => new PayloadPracticeRepository(reader);
const calendar = async () => doc<HolidayCalendarDoc & { policyVerification?: { status: string; verifiedBy?: string; reviewDue?: string } }>(await payload.findGlobal({ slug: "holidayCalendar", depth: 0, overrideAccess: true }));
const fp = async () => calendarFingerprint(await calendar());
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const post = (path: string, c: string | undefined, fields: Record<string, string>, origin: string | null = BASE ?? null) =>
  fetch(`${BASE}${path}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(c ? { Cookie: c } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
const events = async () => (await payload.find({ collection: "auditEvents", where: { entityType: { equals: "holidayCalendar" } }, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const statusOn = async (date: string, time = "12:00") => getPracticeStatus(zonedToInstant(date, time), await repo().getPulsData());

describe("Feiertagsregel (09.5H)", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
    await payload.db.migrateFresh({ forceAcceptWarning: true });
    await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
    users.ADMIN = { ...doc<Staff>((await payload.find({ collection: "staff", overrideAccess: true })).docs[0]), collection: "staff" };
    for (const [k, role, active] of [["STAFF", "STAFF", true], ["DOCTOR", "DOCTOR", true], ["INACTIVE", "DOCTOR", false]] as const) {
      users[k] = { ...doc<Staff>(await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active }, user: users.ADMIN, overrideAccess: false })), collection: "staff" };
    }
    const docs = docsFromPulsData(DATA, { [HA]: "Testfeiertag A (künstlich)", [HB]: "Testfeiertag B (künstlich)" });
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
    await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
    if (BASE) for (const k of ["ADMIN", "STAFF", "DOCTOR"] as const) cookies[k] = (await restLogin(EMAIL(k), PW[k])).cookie;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("authority", () => {
    test("REST: STAFF and DOCTOR cannot update the global; ADMIN can, but a policy change stays TO_BE_CONFIRMED", { skip: skipHttp }, async () => {
      const body = { policy: "CLOSED_ON_PUBLIC_HOLIDAYS", policyVerification: FAKE, praxisHolidayPolicyWrite: true, context: { praxisHolidayPolicyWrite: true } };
      assert.equal((await http("/api/globals/holidayCalendar", { method: "POST", cookie: cookies.STAFF, body })).status, 403);
      assert.equal((await http("/api/globals/holidayCalendar", { method: "POST", cookie: cookies.DOCTOR, body })).status, 403);
      const a = await http("/api/globals/holidayCalendar", { method: "POST", cookie: cookies.ADMIN, body });
      assert.equal(a.status, 200, a.body);
      assert.equal((await calendar()).policyVerification?.status, "TO_BE_CONFIRMED", "ADMIN cannot create a verified policy");
      assert.equal((await statusOn(HA)).status, "UNKNOWN", "an unconfirmed closed policy never closes a holiday");
      await http("/api/globals/holidayCalendar", { method: "POST", cookie: cookies.ADMIN, body: { policy: "REQUIRE_EXPLICIT_ENTRY" } });
    });
    test("Local API: the trusted context does not elevate ADMIN; a DOCTOR cannot change dates through it", async () => {
      await assert.rejects(payload.updateGlobal({ slug: "holidayCalendar", data: { policy: "CLOSED_ON_PUBLIC_HOLIDAYS" } as never, user: users.ADMIN, overrideAccess: false, context: { [SERVER_CONTEXT.HOLIDAY_POLICY]: true } }));
      await assert.rejects(payload.updateGlobal({ slug: "holidayCalendar", data: { policy: "CLOSED_ON_PUBLIC_HOLIDAYS", holidays: [{ date: "2030-01-01", name: "Erfunden" }] } as never, user: users.DOCTOR, overrideAccess: false, context: { [SERVER_CONTEXT.HOLIDAY_POLICY]: true } }));
      for (const [u, code] of [[null, "UNAUTHENTICATED"], [users.INACTIVE, "UNAUTHENTICATED"], [users.STAFF, "NOT_ALLOWED"], [users.ADMIN, "NOT_ALLOWED"]] as const) {
        const r = await confirmHolidayPolicy(payload, u as never, "CLOSED_ON_PUBLIC_HOLIDAYS", await fp(), true);
        assert.ok(!r.ok && r.code === code, String(code));
      }
      assert.notEqual((await calendar()).policyVerification?.status, "VERIFIED_CURRENT");
    });
  });

  describe("HTTP: DOCTOR confirms 'closed' → explicit opening wins → switch to 'einzeln'", { skip: skipHttp }, () => {
    test("overview: unconfirmed, no preselected choice; STAFF / ADMIN have no confirmation", async () => {
      const page = (await http("/intern/feiertage", { cookie: cookies.DOCTOR })).body;
      for (const t of ["Feiertage", "Noch nicht ärztlich bestätigt", "Einzelne Sonderöffnungszeiten können die allgemeine Regel für einen konkreten Feiertag überschreiben.", "Testfeiertag A (künstlich)", "Für diesen Feiertag fehlt noch ein Eintrag.", "Brückentage sind keine Feiertage"]) assert.ok(page.includes(t), t);
      assert.doesNotMatch(page.match(/<form[^>]*action="\/intern\/feiertage"[\s\S]*?<\/form>/)?.[0] ?? "", /checked/, "no default selection");
      for (const k of ["STAFF", "ADMIN"] as const) {
        const b = (await http("/intern/feiertage?regel=CLOSED_ON_PUBLIC_HOLIDAYS", { cookie: cookies[k] })).body;
        assert.ok(!b.includes('action="/intern/feiertage/bestaetigen"') && !b.includes('name="regel"'), k);
        assert.equal((await post("/intern/feiertage/bestaetigen", cookies[k], { regel: "CLOSED_ON_PUBLIC_HOLIDAYS", fingerprint: await fp(), bestaetigt: "1" })).status, 403, k);
      }
      assert.ok((await http("/intern/feiertage", { cookie: cookies.ADMIN })).body.includes("Die allgemeine Regel kann nur ärztlich bestätigt werden."));
    });

    test("preview with the real engine; checkbox required; cross-site and stale refused", async () => {
      const page = (await http("/intern/feiertage?regel=CLOSED_ON_PUBLIC_HOLIDAYS", { cookie: cookies.DOCTOR })).body;
      assert.ok(page.includes("Auswirkung auf die nächsten Feiertage") && page.includes("Geschlossen (allgemeine Feiertagsregel)") && page.includes("Ich bestätige diese Regel für die Praxis."));
      const f = fingerprintIn(page)!;
      assert.match((await post("/intern/feiertage/bestaetigen", cookies.DOCTOR, { regel: "CLOSED_ON_PUBLIC_HOLIDAYS", fingerprint: f })).headers.get("location")!, /status=blockiert/);
      assert.equal((await post("/intern/feiertage/bestaetigen", cookies.DOCTOR, { regel: "CLOSED_ON_PUBLIC_HOLIDAYS", fingerprint: f, bestaetigt: "1" }, "https://evil.example")).status, 403);
      assert.match((await post("/intern/feiertage/bestaetigen", cookies.DOCTOR, { regel: "CLOSED_ON_PUBLIC_HOLIDAYS", fingerprint: "0".repeat(64), bestaetigt: "1" })).headers.get("location")!, /status=veraltet/);
      assert.notEqual((await calendar()).policyVerification?.status, "VERIFIED_CURRENT");
    });

    test("confirm 'closed': generated provenance, dates unchanged, audit VERIFY; holiday CLOSED; Prüfen item gone", async () => {
      const before = (await calendar()).holidays ?? [];
      const page = (await http("/intern/feiertage?regel=CLOSED_ON_PUBLIC_HOLIDAYS", { cookie: cookies.DOCTOR })).body;
      const res = await post("/intern/feiertage/bestaetigen", cookies.DOCTOR, {
        regel: "CLOSED_ON_PUBLIC_HOLIDAYS",
        fingerprint: fingerprintIn(page)!,
        bestaetigt: "1",
        // ignored client fields:
        policyVerification: "VERIFIED_CURRENT",
        verifiedBy: "Dr. Erfunden",
        reviewDue: "2099-01-01",
        holidays: "2030-01-01",
        changeSetId: "11111111-1111-4111-8111-111111111111",
        praxisHolidayPolicyWrite: "true",
        rolle: "ADMIN",
      });
      assert.equal(res.status, 303);
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "erst");
      const cal = await calendar();
      assert.deepEqual([cal.policy, cal.policyVerification?.status, cal.policyVerification?.verifiedBy, cal.policyVerification?.reviewDue], ["CLOSED_ON_PUBLIC_HOLIDAYS", "VERIFIED_CURRENT", "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)", addDays(today, 182)]);
      assert.deepEqual((cal.holidays ?? []).map((h) => [h.date, h.name]), before.map((h) => [h.date, h.name]), "holiday list untouched");
      const ev = (await events()).at(-1)!;
      assert.deepEqual([ev.entityId, ev.operation, ev.actorRole], ["holidayPolicy", "VERIFY", "DOCTOR"]);
      assert.notEqual(ev.changeSetId, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(await events()), []);
      assert.equal((await statusOn(HA)).status, "CLOSED");
      assert.ok(!(await http("/intern", { cookie: cookies.STAFF })).body.includes(`/intern/sonderzeiten?datum=${HA}`), "Prüfen: resolved by the rule");
      assert.ok((await http(`/intern/vorschau?datum=${HA}&zeit=10:00`, { cookie: cookies.STAFF })).body.includes("Heute geschlossen"));
      assert.ok((await http(`/intern/feiertage/bestaetigt?art=erst`, { cookie: cookies.DOCTOR })).body.includes("Die öffentliche Website verwendet weiterhin die bisherigen Daten."));
    });

    test("an explicit Sonderöffnungszeit (09.5F) opens the holiday despite the closed rule", async () => {
      const q = new URLSearchParams({ datum: HA, art: "geaendert", z0_von: "09:00", z0_bis: "12:00", z0_art: "GENERAL" });
      const page = (await http(`/intern/sonderzeiten?${q}`, { cookie: cookies.STAFF })).body;
      const res = await post("/intern/sonderzeiten/veroeffentlichen", cookies.STAFF, { ...Object.fromEntries(q), hinweis: "", fingerprint: fingerprintIn(page)! });
      assert.equal(res.status, 303);
      assert.equal((await statusOn(HA, "10:00")).indicator, "OPEN");
      assert.equal((await statusOn(HA, "13:00")).headline, "Heute geschlossen");
      assert.ok((await http(`/intern/vorschau?datum=${HA}&zeit=10:00`, { cookie: cookies.STAFF })).body.includes("Praxis geöffnet"));
    });

    test("switch to 'einzeln': audit UPDATE; the other holiday is UNKNOWN again and back in Prüfen; the explicit entry still wins", async () => {
      const page = (await http("/intern/feiertage?regel=REQUIRE_EXPLICIT_ENTRY", { cookie: cookies.DOCTOR })).body;
      const res = await post("/intern/feiertage/bestaetigen", cookies.DOCTOR, { regel: "REQUIRE_EXPLICIT_ENTRY", fingerprint: fingerprintIn(page)!, bestaetigt: "1" });
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "geaendert");
      assert.equal((await events()).at(-1)!.operation, "UPDATE");
      const b = await statusOn(HB);
      assert.deepEqual([b.status, b.reason], ["UNKNOWN", "HOLIDAY_WITHOUT_RULE"]);
      assert.equal((await statusOn(HA, "10:00")).indicator, "OPEN");
      const fe = (await http("/intern/feiertage", { cookie: cookies.STAFF })).body;
      assert.ok(fe.includes("Jeder Feiertag wird einzeln geklärt") && fe.includes("Für jeden Feiertag ist weiterhin ein eigener Eintrag notwendig."));
      assert.ok((await http("/intern", { cookie: cookies.STAFF })).body.includes(`/intern/sonderzeiten?datum=${HB}`));
    });
  });

  describe("calendar boundary, stale, rollback, no quick undo, public site", () => {
    test("ADMIN date maintenance keeps the physician confirmation; a stale physician preview is refused", async () => {
      if ((await calendar()).policyVerification?.status !== "VERIFIED_CURRENT") assert.ok((await confirmHolidayPolicy(payload, users.DOCTOR as never, "REQUIRE_EXPLICIT_ENTRY", await fp(), true)).ok);
      const seen = await fp();
      const cal = await calendar();
      await payload.updateGlobal({ slug: "holidayCalendar", data: { holidays: [...(cal.holidays ?? []).map((h) => ({ date: h.date, name: h.name })), { date: addDays(HB, 14), name: "Testfeiertag C (künstlich)" }] } as never, user: users.ADMIN, overrideAccess: false });
      const after = await calendar();
      assert.equal(after.policyVerification?.status, "VERIFIED_CURRENT", "policy confirmation survives a pure date edit");
      assert.equal((await events()).at(-1)!.entityId, "holidayCalendar", "structural calendar edits are audited too");
      const r = await confirmHolidayPolicy(payload, users.DOCTOR as never, "CLOSED_ON_PUBLIC_HOLIDAYS", seen, true);
      assert.ok(!r.ok && r.code === "STALE" && r.message === POLICY_STALE);
      assert.equal((await calendar()).policy, "REQUIRE_EXPLICIT_ENTRY");
    });

    test("rollback: a failing audit write undoes the policy write completely", async () => {
      const before = await calendar();
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const hooks = payload.collections.auditEvents.config.hooks.beforeChange;
      const fail = () => {
        throw new Error("Audit-Fehler (simuliert)");
      };
      const req = await createLocalReq({ user: users.DOCTOR as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      hooks.push(fail);
      try {
        await assert.rejects(commitHolidayPolicy(payload, req, "CLOSED_ON_PUBLIC_HOLIDAYS", false), /Audit-Fehler/);
      } finally {
        hooks.splice(hooks.indexOf(fail), 1);
      }
      await killTransaction(req);
      const after = await calendar();
      assert.deepEqual([after.policy, after.policyVerification], [before.policy, before.policyVerification]);
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no orphan audit");
    });

    test("no quick undo for the physician policy", async () => {
      const verify = (await events()).find((e) => e.operation === "VERIFY")!;
      assert.equal((await planFor(reader, String(verify.changeSetId), await repo().getPulsData(), new Date(), "DOCTOR")).ok, false);
    });

    test("public website stays static: database holiday decisions and names never leak", { skip: skipHttp }, async () => {
      for (const path of ["/", "/heute", "/heute/sprechzeiten"]) {
        const r = await http(path);
        assert.equal(r.status, 200);
        assert.ok(!r.body.includes("Testfeiertag"), path);
      }
    });
  });
});
