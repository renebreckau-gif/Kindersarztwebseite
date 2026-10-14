// Step 5 of the clean-database proof (Phase 09.5A): REAL operational writes.
// HTTP: login → workflow → preview → publish (POST) → database changed → /intern changed;
// plus Local API checks of the same publish path with a fixed clock (edit, provenance, audit
// changeSetId, stale fingerprint, revalidation, rollback). Artificial accounts and data only.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { berlinToday } from "../provenance.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { buildDraft, commitDraft, publishWorkflow, STALE_MESSAGE } from "../../cockpit/workflows/publish.ts";
import { datasetFingerprint } from "../../cockpit/workflows/snapshot.ts";
import type { ReadyDraft } from "../../cockpit/workflows/types.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", Staff>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed", sourceIds: ["TEST"] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Artificial week: every day 08–12 and 14–16, so the tests work on any weekday.
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [
    { id: "vertretung-a", practiceName: "Praxis Beispiel A (Test)", contactPersons: [], street: "Teststraße 1", postalCode: "00000", city: "Testort", phone: "0000 111", verification: V },
    { id: "vertretung-b", practiceName: "Praxis Beispiel B (Test)", contactPersons: [], street: "Teststraße 2", postalCode: "00000", city: "Testort", phone: "0000 222", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
  ],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

async function freshSetup() {
  await payload.db.migrateFresh({ forceAcceptWarning: true });
  await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
  users.ADMIN = { ...doc<Staff>((await payload.find({ collection: "staff", overrideAccess: true })).docs[0]), collection: "staff" };
  for (const [k, role] of [["STAFF", "STAFF"], ["DOCTOR", "DOCTOR"]] as const) {
    users[k] = { ...doc<Staff>(await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active: true }, user: users.ADMIN, overrideAccess: false })), collection: "staff" };
  }
  const docs = docsFromPulsData(DATA);
  await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
  for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
  for (const p of docs.replacementPractices) await payload.create({ collection: "replacementPractices", data: p, ...seed });
  await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
}

const count = async (collection: "closures" | "openingHourExceptions" | "auditEvents", where?: Record<string, unknown>) =>
  (await payload.count({ collection, where: where as never, overrideAccess: true })).totalDocs;
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const post = (cookie: string | undefined, fields: Record<string, string | string[]>, origin: string | null = BASE ?? null) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) body.append(k, x);
  return fetch(`${BASE}/intern/heute/veroeffentlichen`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    body,
  });
};

describe("real today workflows", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("HTTP: login → Heute geschlossen → preview → publish → database → cockpit", { skip: skipHttp }, () => {
    let cookie: string | undefined;
    const today = berlinNow(new Date()).date;
    const recordId = `heute-geschlossen-${today}`;

    before(async () => {
      await freshSetup();
      cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    });

    test("preview from the database, with only usable replacements selectable", async () => {
      const r = await http("/intern/heute/geschlossen?modus=sofort&grund=KRANKHEIT&vertretung=vertretung-a", { cookie });
      assert.equal(r.status, 200);
      assert.match(r.body, /Aktuell in der Cockpit-Datenbank/);
      assert.match(r.body, /Mit dieser Änderung/);
      assert.match(r.body, />Heute geschlossen melden</);
      const b = r.body.match(/<input[^>]*value="vertretung-b"[^>]*>/)?.[0] ?? "";
      assert.match(b, /disabled/, "unverified practice offered disabled");
      assert.doesNotMatch(r.body.match(/<input[^>]*value="vertretung-a"[^>]*>/)?.[0] ?? "disabled", /disabled/, "verified practice selectable");
      assert.ok(fingerprintIn(r.body));
      assert.doesNotMatch(r.body, /Auf der Website veröffentlicht/);
    });

    test("security: cross-site, unauthenticated and stale posts write nothing", async () => {
      const fp = fingerprintIn((await http("/intern/heute/geschlossen?modus=sofort", { cookie })).body)!;
      const fields = { workflow: "CLOSED_TODAY", modus: "sofort", grund: "KEINER", fingerprint: fp };
      assert.equal((await post(cookie, fields, "https://evil.example")).status, 403);
      assert.equal((await post(cookie, fields, null)).status, 403);
      const anon = await post(undefined, fields);
      assert.equal(new URL(anon.headers.get("location")!).pathname, "/intern/anmelden");
      const stale = await post(cookie, { ...fields, fingerprint: "0".repeat(64) });
      assert.equal(stale.status, 303);
      assert.match(stale.headers.get("location")!, /status=veraltet/);
      const page = await http(new URL(stale.headers.get("location")!).pathname + new URL(stale.headers.get("location")!).search, { cookie });
      assert.ok(page.body.includes(STALE_MESSAGE));
      assert.equal(await count("closures"), 0);
      assert.equal(await count("auditEvents", { entityType: { in: ["closures", "openingHourExceptions"] } }), 0);
    });

    test("publish: one transaction — record, generated provenance, audit with server changeSetId", async () => {
      const fp = fingerprintIn((await http("/intern/heute/geschlossen?modus=sofort&grund=KRANKHEIT&vertretung=vertretung-a", { cookie })).body)!;
      const res = await post(cookie, {
        workflow: "CLOSED_TODAY",
        modus: "sofort",
        grund: "KRANKHEIT",
        vertretung: "vertretung-a",
        fingerprint: fp,
        // ignored client fields:
        changeSetId: "11111111-1111-4111-8111-111111111111",
        verifiedBy: "Dr. Erfunden",
        datum: "2030-01-01",
        rolle: "ADMIN",
      });
      assert.equal(res.status, 303);
      assert.equal(new URL(res.headers.get("location")!).pathname, "/intern/heute/veroeffentlicht");
      const stored = doc<{ startDate: string; endDate: string; kind: string; publicMessage: string; replacements: { replacementPracticeId: string }[]; verification: { status: string; verifiedBy: string; lastVerified: string; sourceIds: { sourceId: string }[] } }>(
        (await payload.find({ collection: "closures", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0],
      );
      assert.deepEqual([stored.kind, stored.startDate, stored.endDate], ["SHORT_NOTICE", today, today], "server date, not the client's");
      assert.equal(stored.publicMessage, "Die Praxis ist heute wegen Krankheit geschlossen.");
      assert.deepEqual(stored.replacements.map((r) => r.replacementPracticeId), ["vertretung-a"]);
      assert.equal(stored.verification.status, "VERIFIED_CURRENT");
      assert.equal(stored.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      assert.equal(stored.verification.lastVerified, berlinToday());
      assert.deepEqual(stored.verification.sourceIds.map((s) => s.sourceId), ["PRACTICE_COCKPIT"]);
      const events = (await payload.find({ collection: "auditEvents", where: { entityId: { equals: recordId } }, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
      assert.equal(events.length, 1);
      assert.equal(events[0].operation, "CREATE");
      assert.equal(events[0].actorRole, "STAFF");
      assert.match(String(events[0].changeSetId), UUID);
      assert.notEqual(events[0].changeSetId, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(events), []);
    });

    test("confirmation is truthful: test environment, public website unchanged", async () => {
      const r = await http("/intern/heute/veroeffentlicht?art=geschlossen&modus=neu", { cookie });
      assert.match(r.body, /In der Testumgebung veröffentlicht/);
      assert.match(r.body, /Die Cockpit-Datenbank wurde aktualisiert\./);
      assert.match(r.body, /Die öffentliche Website verwendet derzeit noch die bisherigen Daten\./);
      assert.match(r.body, /href="\/intern\/vorschau"/);
      assert.doesNotMatch(r.body, /Auf der Website veröffentlicht/);
    });

    test("/intern and the Website-Vorschau show the new database state; the public site does not", async () => {
      const data = await new PayloadPracticeRepository(reader).getPulsData();
      const expected = getPracticeStatus(new Date(), data);
      assert.equal(expected.activeClosure?.kind, "SHORT_NOTICE");
      const home = await http("/intern", { cookie });
      assert.ok(home.body.includes(expected.headline), expected.headline);
      assert.match(home.body, /Heute geschlossen/);
      const preview = await http("/intern/vorschau", { cookie });
      assert.match(preview.body, /Abweichung zur aktuellen Website/);
      const pub = await http("/heute");
      assert.equal(pub.status, 200);
      assert.doesNotMatch(pub.body, /wegen Krankheit geschlossen/, "public website stays static");
    });

    test("server revalidation: early close is refused while today is closed", async () => {
      const page = await http("/intern/heute/frueher-schliessen?zeit=23:30", { cookie });
      assert.match(page.body, /Früher schließen ist deshalb nicht möglich/);
      const fp = datasetFingerprint(await new PayloadPracticeRepository(reader).getPulsData());
      const res = await post(cookie, { workflow: "EARLY_CLOSE", zeit: "23:30", fingerprint: fp });
      assert.match(res.headers.get("location")!, /status=blockiert/);
      assert.equal(await count("openingHourExceptions"), 0);
    });

    test("edit existing: same record, UPDATE audit with a new changeSetId and meaningful previous/next", async () => {
      const fp = fingerprintIn((await http("/intern/heute/geschlossen?modus=sofort&grund=TECHNIK", { cookie })).body)!;
      const res = await post(cookie, { workflow: "CLOSED_TODAY", modus: "sofort", grund: "TECHNIK", fingerprint: fp });
      assert.match(res.headers.get("location")!, /modus=bearbeitet/);
      assert.equal(await count("closures"), 1);
      const events = (await payload.find({ collection: "auditEvents", where: { entityId: { equals: recordId } }, sort: "at", overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
      assert.deepEqual(events.map((e) => e.operation), ["CREATE", "UPDATE"]);
      assert.notEqual(events[0].changeSetId, events[1].changeSetId);
      assert.equal(doc<{ publicMessage: string }>(events[1].previous).publicMessage, "Die Praxis ist heute wegen Krankheit geschlossen.");
      assert.equal(doc<{ publicMessage: string }>(events[1].next).publicMessage, "Die Praxis ist heute wegen einer technischen Störung geschlossen.");
    });
  });

  describe("Local API: the same publish path with a fixed clock", () => {
    const today = berlinNow(new Date()).date;
    const now = zonedToInstant(today, "09:30");
    const recordId = `heute-frueher-${today}`;
    const fp = async () => datasetFingerprint(await new PayloadPracticeRepository(reader).getPulsData());

    before(freshSetup);

    test("unauthenticated or disabled accounts cannot write", async () => {
      assert.equal((await publishWorkflow(payload, null, { kind: "EARLY_CLOSE", input: { time: "11:00" } }, await fp(), now)).ok, false);
      const disabled = { ...users.STAFF, active: false };
      const r = await publishWorkflow(payload, disabled as never, { kind: "EARLY_CLOSE", input: { time: "11:00" } }, await fp(), now);
      assert.equal(!r.ok && r.code, "UNAUTHENTICATED");
      assert.equal(await count("openingHourExceptions"), 0);
    });

    test("early close NEW → then EDIT of the same record", async () => {
      const first = await publishWorkflow(payload, users.STAFF as never, { kind: "EARLY_CLOSE", input: { time: "11:00", message: "Heute nur vormittags." } }, await fp(), now);
      assert.ok(first.ok && first.mode === "NEW" && first.recordId === recordId, JSON.stringify(first));
      const second = await publishWorkflow(payload, users.DOCTOR as never, { kind: "EARLY_CLOSE", input: { time: "10:30" } }, await fp(), now);
      assert.ok(second.ok && second.mode === "EDIT" && second.recordId === recordId, JSON.stringify(second));
      assert.equal(await count("openingHourExceptions"), 1, "no duplicate");
      const stored = doc<{ intervals: { start: string; end: string }[]; priority: number; verification: { verifiedBy: string } }>((await payload.find({ collection: "openingHourExceptions", overrideAccess: true })).docs[0]);
      assert.deepEqual(stored.intervals.map((i) => `${i.start}-${i.end}`), ["08:00-10:30"]);
      assert.equal(stored.priority, 100);
      assert.equal(stored.verification.verifiedBy, "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)");
      const events = (await payload.find({ collection: "auditEvents", where: { entityId: { equals: recordId } }, sort: "at", overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
      assert.deepEqual(events.map((e) => e.operation), ["CREATE", "UPDATE"]);
      assert.deepEqual(events.map((e) => e.changeSetId), [first.ok && first.changeSetId, second.ok && second.changeSetId]);
      assert.deepEqual(doc<{ intervals: { end: string }[] }>(events[1].previous).intervals.map((i) => i.end), ["11:00"]);
      assert.deepEqual(doc<{ intervals: { end: string }[] }>(events[1].next).intervals.map((i) => i.end), ["10:30"]);
    });

    test("stale fingerprint is rejected; the database is unchanged", async () => {
      const before = await count("auditEvents");
      const r = await publishWorkflow(payload, users.STAFF as never, { kind: "EARLY_CLOSE", input: { time: "10:00" } }, "f".repeat(64), now);
      assert.equal(!r.ok && r.code, "STALE");
      assert.equal(!r.ok && r.message, STALE_MESSAGE);
      assert.equal(await count("auditEvents"), before);
    });

    test("server revalidation with the server clock (time before now → blocked)", async () => {
      const r = await publishWorkflow(payload, users.STAFF as never, { kind: "EARLY_CLOSE", input: { time: "09:00" } }, await fp(), now);
      assert.equal(!r.ok && r.code, "BLOCKED");
    });

test("transaction rollback: record + audit written by the workflow vanish together when the transaction fails", async () => {
      const data = await new PayloadPracticeRepository(reader).getPulsData();
      const draft = buildDraft({ kind: "EARLY_CLOSE", input: { time: "11:30" } }, data, now, datasetFingerprint(data)) as ReadyDraft;
      assert.equal(draft.ok, true);
      const auditBefore = await count("auditEvents");
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await commitDraft(payload, req, draft);
      // inside the transaction: the update and its audit event exist
      const inside = doc<{ intervals: { end: string }[] }>((await payload.find({ collection: "openingHourExceptions", overrideAccess: true, req })).docs[0]);
      assert.deepEqual(inside.intervals.map((i) => i.end), ["11:30"]);
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true, req })).totalDocs, auditBefore + 1);
      // a later failure in the same transaction (invalid write) rolls everything back
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req }));
      await killTransaction(req);
      const stored = doc<{ intervals: { end: string }[] }>((await payload.find({ collection: "openingHourExceptions", overrideAccess: true })).docs[0]);
      assert.deepEqual(stored.intervals.map((i) => i.end), ["10:30"], "business record unchanged");
      assert.equal(await count("auditEvents"), auditBefore, "no orphan audit event");
    });  });
});
