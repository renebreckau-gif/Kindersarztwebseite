// Step 6 of the clean-database proof (Phase 09.5B): lifecycle, supersede and safe undo against
// PostgreSQL. Nothing is deleted; history stays complete. Artificial accounts and data only.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { Closure, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { closureToDoc, docsFromPulsData, exceptionToDoc } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { applyUndo, buildDraft, commitDraft, previewUndo, publishWorkflow, revertChange } from "../../cockpit/workflows/publish.ts";
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
const today = berlinNow(new Date()).date;
const now = zonedToInstant(today, "09:30");
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
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
  await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
}

const active = () => new PayloadPracticeRepository(reader).getPulsData();
const fp = async () => datasetFingerprint(await active());
type Rec = { id: number; recordId: string; recordState: string; retiredReason: string | null; retiredByChangeSetId: string | null; supersededByRecordId: string | null; intervals?: { end: string }[]; verification: { verifiedBy: string } };
const record = async (collection: "openingHourExceptions" | "closures", recordId: string) => doc<Rec>((await payload.find({ collection, where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
const events = async (entityId: string) =>
  (await payload.find({ collection: "auditEvents", where: { entityId: { equals: entityId } }, sort: "id", pagination: false, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
const eventsOf = async (changeSetId: string) =>
  (await payload.find({ collection: "auditEvents", where: { changeSetId: { equals: changeSetId } }, sort: "id", pagination: false, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
const earlyClose = (user: Staff, time: string, replaceExisting = false) => fp().then((f) => publishWorkflow(payload, user as never, { kind: "EARLY_CLOSE", input: { time, ...(replaceExisting ? { replaceExisting } : {}) } }, f, now));
const closeToday = (user: Staff, replaceExisting = false) =>
  fp().then((f) => publishWorkflow(payload, user as never, { kind: "CLOSED_TODAY", input: { mode: "NOW", reason: "KEINER", replacementIds: [], ...(replaceExisting ? { replaceExisting } : {}) } }, f, now));
// 09.5D: undo previews fingerprint the whole operational state (Puls data + announcements).
const undoFp = async () => (await previewUndo(payload, null, crypto.randomUUID(), now)).fingerprint;
const undo = (user: Staff | null, cs: string) => undoFp().then((f) => revertChange(payload, user as never, cs, f, now));

describe("lifecycle, supersede and undo", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("migrations", () => {
    before(freshSetup);
    test("lifecycle migration applied from zero; records default to ACTIVE", async () => {
      const m = (await payload.find({ collection: "payload-migrations", overrideAccess: true, limit: 10, sort: "id" })).docs.map((d) => (d as { name?: string }).name);
      assert.deepEqual(m, ["20261013_122224_initial", "20261014_080446_operational_lifecycle", "20261014_123515_announcement_lifecycle"]);
      const r = await earlyClose(users.STAFF, "11:00");
      assert.ok(r.ok);
      assert.equal((await record("openingHourExceptions", r.ok ? r.recordId : "")).recordState, "ACTIVE");
    });
  });

  describe("CREATE undo, EDIT undo, latest-change rule", () => {
    before(freshSetup);

    test("CREATE undo (special hours): record kept, RETIRED/REVERTED, engine back to before, REVERT links the CREATE", async () => {
      const baseline = getPracticeStatus(now, await active());
      const pub = await earlyClose(users.STAFF, "11:00");
      assert.ok(pub.ok);
      const id = pub.ok ? pub.recordId : "";
      const [create] = await events(id);
      assert.equal(create.operation, "CREATE");
      const createJson = JSON.stringify(create);
      const before = await record("openingHourExceptions", id);

      const preview = await previewUndo(payload, users.STAFF as never, pub.ok ? pub.changeSetId : "", now);
      assert.ok(preview.plan.ok, !preview.plan.ok ? preview.plan.message : "");
      const r = await undo(users.STAFF, pub.ok ? pub.changeSetId : "");
      assert.ok(r.ok, JSON.stringify(r));

      const after = await record("openingHourExceptions", id);
      assert.equal(after.id, before.id, "same row, not deleted");
      assert.deepEqual([after.recordState, after.retiredReason, after.retiredByChangeSetId], ["RETIRED", "REVERTED", r.ok ? r.changeSetId : ""]);
      assert.deepEqual(after.verification, before.verification, "factual provenance kept (no manufactured verification)");
      assert.deepEqual((await active()).exceptions, [], "repository returns only ACTIVE records");
      assert.deepEqual(getPracticeStatus(now, await active()), baseline, "engine returns to the pre-create state");
      const evs = await events(id);
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "REVERT"]);
      assert.equal(evs[1].revertOf, create.eventId);
      assert.equal(evs[1].changeSetId, r.ok ? r.changeSetId : "");
      assert.notEqual(evs[1].changeSetId, create.changeSetId, "the revert is a NEW change set");
      assert.equal(JSON.stringify((await events(id))[0]), createJson, "original event unchanged");
      assert.equal(await payload.count({ collection: "openingHourExceptions", overrideAccess: true }).then((c) => c.totalDocs), 1);
    });

    test("CREATE undo (SHORT_NOTICE closure); a later new record never reuses the retired id", async () => {
      const pub = await closeToday(users.DOCTOR);
      assert.ok(pub.ok);
      const r = await undo(users.DOCTOR, pub.ok ? pub.changeSetId : "");
      assert.ok(r.ok, JSON.stringify(r));
      assert.equal((await record("closures", pub.ok ? pub.recordId : "")).recordState, "RETIRED");
      assert.deepEqual((await active()).closures, []);
      const again = await earlyClose(users.STAFF, "11:00");
      assert.ok(again.ok);
      assert.equal(again.ok && again.recordId, `heute-frueher-${today}-2`);
    });

    test("EDIT undo: same record restored to the previous content; provenance re-issued by the person undoing", async () => {
      const id = `heute-frueher-${today}-2`;
      const edit = await earlyClose(users.STAFF, "10:30");
      assert.ok(edit.ok && edit.mode === "EDIT");
      assert.equal((await record("openingHourExceptions", id)).intervals?.[0].end, "10:30");
      const r = await undo(users.ADMIN, edit.ok ? edit.changeSetId : "");
      assert.ok(r.ok, JSON.stringify(r));
      const rec = await record("openingHourExceptions", id);
      assert.equal(rec.recordState, "ACTIVE");
      assert.equal(rec.intervals?.[0].end, "11:00", "previous content restored");
      assert.equal(rec.verification.verifiedBy, "Test Verwaltung (künstlich), Verwaltung (Praxis Cockpit)");
      const evs = await events(id);
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "UPDATE", "REVERT"]);
      assert.equal(evs[2].revertOf, evs[1].eventId);
      assert.equal(await payload.count({ collection: "openingHourExceptions", where: { recordId: { equals: id } }, overrideAccess: true }).then((c) => c.totalDocs), 1, "no duplicate record");
    });

    test("latest-change rule: CREATE → EDIT A → EDIT B; A blocked, B allowed → state after A; a revert itself is not undoable", async () => {
      const id = `heute-frueher-${today}-2`;
      const a = await earlyClose(users.STAFF, "10:30");
      const b = await earlyClose(users.STAFF, "10:00");
      assert.ok(a.ok && b.ok);
      const ra = await undo(users.STAFF, a.ok ? a.changeSetId : "");
      assert.equal(!ra.ok && ra.code, "BLOCKED");
      assert.match(!ra.ok ? ra.message : "", /inzwischen erneut geändert/);
      const rb = await undo(users.STAFF, b.ok ? b.changeSetId : "");
      assert.ok(rb.ok, JSON.stringify(rb));
      assert.equal((await record("openingHourExceptions", id)).intervals?.[0].end, "10:30", "state after EDIT A");
      const rr = await undo(users.STAFF, rb.ok ? rb.changeSetId : "");
      assert.equal(!rr.ok && rr.code, "BLOCKED");
      assert.deepEqual((await events(id)).map((e) => e.operation), ["CREATE", "UPDATE", "REVERT", "UPDATE", "UPDATE", "REVERT"]);
    });

    test("roles: disabled or signed-out accounts cannot undo; stale preview refused", async () => {
      const pub = await earlyClose(users.STAFF, "09:45");
      assert.ok(pub.ok);
      const cs = pub.ok ? pub.changeSetId : "";
      assert.equal((await undo(null, cs) as { code?: string }).code, "UNAUTHENTICATED");
      assert.equal((await undo({ ...users.STAFF, active: false }, cs) as { code?: string }).code, "UNAUTHENTICATED");
      const stale = await revertChange(payload, users.STAFF as never, cs, "0".repeat(64), now);
      assert.equal(!stale.ok && stale.code, "STALE");
      assert.ok((await undo(users.DOCTOR, cs)).ok, "DOCTOR may undo");
    });
  });

  describe("supersede (explicit, single-day) and multi-day safety", () => {
    before(freshSetup);

    test("SPECIAL_HOURS → explicit replacement by SHORT_NOTICE: one change set, old RETIRED/SUPERSEDED, engine sees only the closure", async () => {
      const ex = await earlyClose(users.STAFF, "11:00");
      assert.ok(ex.ok);
      const exId = ex.ok ? ex.recordId : "";
      const blocked = await closeToday(users.STAFF, false);
      assert.equal(!blocked.ok && blocked.code, "BLOCKED", "never silently");
      const sup = await closeToday(users.STAFF, true);
      assert.ok(sup.ok && sup.mode === "SUPERSEDE", JSON.stringify(sup));
      const closureId = sup.ok ? sup.recordId : "";
      const old = await record("openingHourExceptions", exId);
      assert.deepEqual([old.recordState, old.retiredReason, old.supersededByRecordId, old.retiredByChangeSetId], ["RETIRED", "SUPERSEDED", closureId, sup.ok ? sup.changeSetId : ""]);
      const data = await active();
      assert.deepEqual([data.exceptions.length, data.closures.map((c) => c.id)], [0, [closureId]]);
      const status = getPracticeStatus(now, data);
      assert.equal(status.activeClosure?.kind, "SHORT_NOTICE");
      assert.notEqual(status.indicator, "OPEN");
      const group = await eventsOf(sup.ok ? sup.changeSetId : "");
      assert.deepEqual(group.map((e) => [e.entityType, e.operation]), [["openingHourExceptions", "SUPERSEDE"], ["closures", "CREATE"]]);
      assert.equal(doc<{ supersededByRecordId: string }>(group[0].next).supersededByRecordId, closureId);
    });

    test("undo of the supersede: closure RETIRED (REVERTED), special hours ACTIVE again", async () => {
      const latest = (await payload.find({ collection: "auditEvents", sort: "-id", limit: 1, overrideAccess: true })).docs[0] as unknown as { changeSetId: string };
      const r = await undo(users.STAFF, latest.changeSetId);
      assert.ok(r.ok, JSON.stringify(r));
      const data = await active();
      assert.equal(data.closures.length, 0);
      assert.equal(data.exceptions.length, 1);
      assert.equal(getPracticeStatus(now, data).activeClosure, undefined);
      const revert = await eventsOf(r.ok ? r.changeSetId : "");
      assert.deepEqual(revert.map((e) => e.operation), ["REVERT", "REVERT"]);
      assert.ok(revert.every((e) => typeof e.revertOf === "string"));
    });

    test("reverse supersede: SHORT_NOTICE → explicit replacement by early close", async () => {
      const close = await closeToday(users.STAFF, true);
      assert.ok(close.ok);
      const r = await earlyClose(users.STAFF, "11:30", true);
      assert.ok(r.ok && r.mode === "SUPERSEDE", JSON.stringify(r));
      const data = await active();
      assert.deepEqual([data.closures.length, data.exceptions.length], [0, 1]);
      assert.match(getPracticeStatus(now, data).detail, /11:30/);
    });

    test("multi-day SPECIAL_HOURS covering today: replacement refused, nothing modified", async () => {
      await freshSetup();
      await payload.create({ collection: "openingHourExceptions", data: exceptionToDoc({ id: "woche", kind: "SPECIAL_HOURS", startDate: addDays(today, -1), endDate: addDays(today, 1), intervals: [{ start: "09:00", end: "13:00", consultationType: "GENERAL" }], priority: 10, verification: V }) as never, ...seed });
      const r = await closeToday(users.STAFF, true);
      assert.equal(!r.ok && r.code, "BLOCKED");
      assert.match(!r.ok ? r.message : "", /mehrtägige Eintrag/);
      const rec = await record("openingHourExceptions", "woche");
      assert.equal(rec.recordState, "ACTIVE");
      assert.equal(await payload.count({ collection: "closures", overrideAccess: true }).then((c) => c.totalDocs), 0);
    });

    test("multi-day vacation covering today: early close refused, nothing modified", async () => {
      await freshSetup();
      await payload.create({ collection: "closures", data: closureToDoc({ id: "urlaub", kind: "VACATION", startDate: addDays(today, -1), endDate: addDays(today, 2), replacements: [], verification: V } as Closure) as never, ...seed });
      const r = await earlyClose(users.STAFF, "11:00", true);
      assert.equal(!r.ok && r.code, "BLOCKED");
      assert.equal((await record("closures", "urlaub")).recordState, "ACTIVE");
      assert.equal(await payload.count({ collection: "openingHourExceptions", overrideAccess: true }).then((c) => c.totalDocs), 0);
    });
  });

  describe("transactions, server-controlled lifecycle, secrets", () => {
    before(freshSetup);

    test("rollback: lifecycle mutation + REVERT audit vanish together when the transaction fails", async () => {
      const pub = await earlyClose(users.STAFF, "11:00");
      assert.ok(pub.ok);
      const id = pub.ok ? pub.recordId : "";
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const preview = await previewUndo(payload, users.STAFF as never, pub.ok ? pub.changeSetId : "", now);
      assert.ok(preview.plan.ok);
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await applyUndo(payload, req, preview.plan.ok ? preview.plan.actions : []);
      assert.equal(doc<Rec>((await payload.find({ collection: "openingHourExceptions", where: { recordId: { equals: id } }, overrideAccess: true, req })).docs[0]).recordState, "RETIRED", "inside the transaction");
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req }));
      await killTransaction(req);
      assert.equal((await record("openingHourExceptions", id)).recordState, "ACTIVE", "lifecycle unchanged");
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no REVERT event left");
    });

    test("rollback: failure in the middle of a multi-record supersede leaves the old record ACTIVE and no partial audit group", async () => {
      const data = await active();
      const draft = buildDraft({ kind: "CLOSED_TODAY", input: { mode: "NOW", reason: "KEINER", replacementIds: [], replaceExisting: true } }, data, now, datasetFingerprint(data)) as ReadyDraft;
      assert.ok(draft.ok && draft.mode === "SUPERSEDE");
      // The new record is invalid for storage (too long): it fails AFTER the old record was retired.
      (draft.record.value as Closure).publicMessage = "x".repeat(300);
      const cs = crypto.randomUUID();
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: cs } }, payload);
      await initTransaction(req);
      await assert.rejects(commitDraft(payload, req, draft));
      await killTransaction(req);
      assert.equal((await active()).exceptions.length, 1, "old record still ACTIVE");
      assert.equal(await payload.count({ collection: "closures", overrideAccess: true }).then((c) => c.totalDocs), 0, "new record does not exist");
      assert.deepEqual(await eventsOf(cs), [], "no partial audit group");
    });

    test("lifecycle fields cannot be set over REST; retired records are frozen; nothing deletable", { skip: skipHttp }, async () => {
      const cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
      const rec = (await active()).exceptions[0];
      const row = await record("openingHourExceptions", rec.id);
      const patch = await http(`/api/openingHourExceptions/${row.id}`, { method: "PATCH", cookie, body: { recordState: "RETIRED", retiredReason: "REVERTED", supersededByRecordId: "x" } });
      assert.ok([200, 409].includes(patch.status), patch.body);
      assert.equal((await record("openingHourExceptions", rec.id)).recordState, "ACTIVE", "client lifecycle values ignored");
      const created = await http("/api/closures", { method: "POST", cookie, body: { recordId: "rest-test", kind: "TRAINING", startDate: addDays(today, 30), endDate: addDays(today, 30), replacements: [], recordState: "RETIRED" } });
      assert.equal(created.status, 201, created.body);
      assert.equal((await record("closures", "rest-test")).recordState, "ACTIVE", "client cannot create a record as RETIRED");
      const del = await http(`/api/openingHourExceptions/${row.id}`, { method: "DELETE", cookie });
      assert.equal(del.status, 403);
      // A direct REST write has no cockpit change set: the cockpit refuses to undo it.
      const latest = (await payload.find({ collection: "auditEvents", where: { entityId: { equals: rec.id } }, sort: "-id", limit: 1, overrideAccess: true })).docs[0] as unknown as { changeSetId: string | null };
      assert.equal(latest.changeSetId, null);
      const viaRest = await revertChange(payload, users.STAFF as never, crypto.randomUUID(), await undoFp(), now);
      assert.equal(!viaRest.ok && viaRest.code, "BLOCKED");
      // freeze: retire via a real cockpit supersede, then try to edit the retired record over REST
      assert.ok((await closeToday(users.STAFF, true)).ok);
      assert.equal((await record("openingHourExceptions", rec.id)).recordState, "RETIRED");
      const frozen = await http(`/api/openingHourExceptions/${row.id}`, { method: "PATCH", cookie, body: { publicMessage: "geändert" } });
      assert.equal(frozen.status, 409, frozen.body);
    });

    test("no secrets anywhere in audit or lifecycle data", async () => {
      const all = (await payload.find({ collection: "auditEvents", pagination: false, overrideAccess: true })).docs;
      assert.deepEqual(secretKeys(all), []);
      const text = JSON.stringify(all);
      for (const s of [...Object.values(PW), process.env.PAYLOAD_SECRET ?? "unset"]) assert.ok(!text.includes(s));
    });
  });

  describe("HTTP: Letzte Änderung → undo preview → POST → database → cockpit", { skip: skipHttp }, () => {
    let cookie: string | undefined;
    let cs = "";
    before(async () => {
      await freshSetup();
      const pub = await closeToday(users.STAFF);
      assert.ok(pub.ok);
      cs = pub.ok ? pub.changeSetId : "";
      cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    });

    test("home shows the latest change with an undo action; confirmation offers undo", async () => {
      const home = await http("/intern", { cookie });
      assert.match(home.body, /Letzte Änderung/);
      assert.match(home.body, /Praxis heute geschlossen/);
      assert.match(home.body, new RegExp(`href="/intern/verlauf/${cs}/zuruecknehmen"`));
      const conf = await http(`/intern/heute/veroeffentlicht?art=geschlossen&modus=neu&vorgang=${cs}`, { cookie });
      assert.match(conf.body, /Änderung zurücknehmen/);
      assert.match(conf.body, /In der Testumgebung veröffentlicht/);
    });

    test("undo preview, refused cross-site / stale posts, then a real undo", async () => {
      const page = await http(`/intern/verlauf/${cs}/zuruecknehmen`, { cookie });
      assert.equal(page.status, 200);
      assert.match(page.body, /Aktuell in der Cockpit-Datenbank/);
      assert.match(page.body, /Nach dem Zurücknehmen/);
      const fingerprint = page.body.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
      assert.ok(fingerprint);
      const post = (fields: Record<string, string>, origin: string | null = BASE ?? null) =>
        fetch(`${BASE}/intern/verlauf/ruecknahme`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
      assert.equal((await post({ vorgang: cs, fingerprint }, "https://evil.example")).status, 403);
      const stale = await post({ vorgang: cs, fingerprint: "0".repeat(64) });
      assert.match(stale.headers.get("location")!, /status=veraltet/);
      const ok = await post({ vorgang: cs, fingerprint, revertOf: "11111111-1111-4111-8111-111111111111", changeSetId: "22222222-2222-4222-8222-222222222222", rolle: "ADMIN", snapshot: "{}" });
      assert.equal(ok.status, 303);
      assert.equal(new URL(ok.headers.get("location")!).pathname, "/intern/verlauf/zurueckgenommen");
      const evs = await eventsOf(cs);
      const reverts = (await payload.find({ collection: "auditEvents", where: { operation: { equals: "REVERT" } }, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
      assert.equal(reverts.length, 1);
      assert.equal(reverts[0].revertOf, evs[0].eventId, "server-loaded link, not the client's");
      assert.notEqual(reverts[0].changeSetId, "22222222-2222-4222-8222-222222222222");
      assert.equal(reverts[0].actorRole, "STAFF", "role from the session, not the form");
      assert.deepEqual((await active()).closures, []);
    });

    test("after undo: truthful confirmation, cockpit and preview show the active state, public site untouched", async () => {
      const done = await http("/intern/verlauf/zurueckgenommen", { cookie });
      assert.match(done.body, /Die Änderung wurde in der Testumgebung zurückgenommen\./);
      assert.match(done.body, /Die öffentliche Website verwendet weiterhin die bisherigen Daten\./);
      const home = await http("/intern", { cookie });
      assert.match(home.body, /Änderung zurückgenommen/);
      assert.doesNotMatch(home.body.match(/<section class="cp-last"[\s\S]*?<\/section>/)?.[0] ?? "", /zuruecknehmen/, "a revert is not offered for undo");
      const expected = getPracticeStatus(new Date(), await active());
      const preview = await http("/intern/vorschau", { cookie });
      assert.ok(preview.body.includes(expected.headline));
      assert.equal((await http("/heute")).status, 200);
    });
  });
});
