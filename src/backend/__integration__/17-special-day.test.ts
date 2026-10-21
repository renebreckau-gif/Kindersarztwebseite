// Step 17 of the clean-database proof (Phase 09.5F): Sonderöffnungszeiten / Feiertag klären.
// HTTP: STAFF → special hours for a future day → preview → publish → /intern/vorschau → edit to
// closed → undo; holiday: "Feiertag klären" from Prüfen → closed → Prüfen item gone. Local API with
// the real publish path: roles, signed-out / inactive, spoofing, stale preview, rollback, undo.
// Artificial accounts, schedule and holiday date — no practice holiday decision exists.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { addDays, formatGermanDate, weekdayOf } from "../../domain/time.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { commitDraft, previewUndo, previewWorkflow, publishWorkflow, revertChange, STALE_MESSAGE } from "../../cockpit/workflows/publish.ts";
import { SPECIAL_DAY_MARKER, type SpecialDayInput } from "../../cockpit/workflows/special-day.ts";
import type { ReadyDraft } from "../../cockpit/workflows/types.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}`, INACTIVE: `Inaktiv-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR" | "INACTIVE", Staff>;
let cookie: string | undefined;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] };
const FAKE = { status: "VERIFIED_CURRENT", lastVerified: "2030-01-01", reviewDue: "2099-01-01", verifiedBy: "Dr. Erfunden", sourceIds: [{ sourceId: "FAKE" }] };

const today = berlinNow(new Date()).date;
// Future weekdays (Mon–Fri) from today + 7 — every artificial date gets its own day.
const W: string[] = [];
for (let d = addDays(today, 7); W.length < 10; d = addDays(d, 1)) if (weekdayOf(d) <= 5) W.push(d);
const [D, , H, D2, D3, D4, D5, D6, D7] = W;

const rule = (d: number, id: string, start: string, end: string, consultationType: OpeningHoursRule["consultationType"]): OpeningHoursRule => ({ id: `r${d}-${id}`, weekday: d as 1, start, end, consultationType, verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [rule(d, "a", "08:00", "12:00", "GENERAL"), rule(d, "b", "14:00", "16:00", "APPOINTMENT")]), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde", verification: V },
    { code: "APPOINTMENT", label: "Nur Terminsprechstunde (Test)", verification: V },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [H],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

const repo = () => new PayloadPracticeRepository(reader);
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const post = (path: string, c: string | undefined, fields: Record<string, string>, origin: string | null = BASE ?? null) =>
  fetch(`${BASE}${path}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(c ? { Cookie: c } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
const record = async (recordId: string) =>
  doc<{ id: number; recordId: string; kind: string; reason: string; priority: number; recordState: string; retiredReason?: string; intervals: { start: string; end: string; consultationType: string }[]; verification: { verifiedBy: string; lastVerified: string; reviewDue: string; sourceIds: { sourceId: string }[] } } | undefined>(
    (await payload.find({ collection: "openingHourExceptions", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0],
  );
const events = async (where: Record<string, unknown>) => (await payload.find({ collection: "auditEvents", where: where as never, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const count = async () => (await payload.count({ collection: "openingHourExceptions", overrideAccess: true })).totalDocs;
const run = async (k: keyof typeof users, input: SpecialDayInput) => {
  const { draft } = await previewWorkflow(payload, { kind: "SPECIAL_DAY", input });
  return { draft, res: await publishWorkflow(payload, users[k] as never, { kind: "SPECIAL_DAY", input }, draft.fingerprint) };
};
const specialQuery = (date: string) => new URLSearchParams({ datum: date, art: "geaendert", z0_von: "08:00", z0_bis: "12:00", z0_art: "GENERAL" });

describe("Sonderöffnungszeiten / Feiertag klären (09.5F)", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
    await payload.db.migrateFresh({ forceAcceptWarning: true });
    await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
    users.ADMIN = { ...doc<Staff>((await payload.find({ collection: "staff", overrideAccess: true })).docs[0]), collection: "staff" };
    for (const [k, role, active] of [["STAFF", "STAFF", true], ["DOCTOR", "DOCTOR", true], ["INACTIVE", "STAFF", false]] as const) {
      users[k] = { ...doc<Staff>(await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active }, user: users.ADMIN, overrideAccess: false })), collection: "staff" };
    }
    const docs = docsFromPulsData(DATA, { [H]: "Testfeiertag (künstlich)" });
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
    await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
    if (BASE) cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("HTTP: STAFF special hours → edit to closed → undo", { skip: skipHttp }, () => {
    const id = `sonderzeit-${D}`;
    let createCs = "";
    let editCs = "";
    test("home: real quick action; Prüfen offers 'Feiertag klären' for the unresolved holiday", async () => {
      const home = (await http("/intern", { cookie })).body;
      assert.match(home, /href="\/intern\/sonderzeiten"[^>]*>\s*<span>Sonderöffnungszeiten<\/span>\s*<span class="cp-quick-tag">Testumgebung · Cockpit-Datenbank<\/span>/);
      assert.ok(home.includes(`href="/intern/sonderzeiten?datum=${H}"`) && home.includes(">Feiertag klären<"));
    });

    test("preview from the database: complete day, engine moments, fingerprint", async () => {
      const page = await http(`/intern/sonderzeiten?${specialQuery(D)}`, { cookie });
      assert.equal(page.status, 200);
      for (const t of ["Was gilt an diesem Tag?", "Aktuell in der Cockpit-Datenbank", "Mit dieser Änderung", "Prüfung mit der Statuslogik", "Alle anderen Zeiten dieses Tages sind geschlossen.", "Reguläre Sprechzeit dieses Tages übernehmen"]) assert.ok(page.body.includes(t), t);
      assert.ok(fingerprintIn(page.body));
      const template = await http(`/intern/sonderzeiten?${new URLSearchParams({ datum: D, art: "geaendert", vorlage: "regulaer" })}`, { cookie });
      assert.match(template.body, /name="z1_von"[^>]*value="14:00"|value="14:00"[^>]*name="z1_von"/, "regular hours copied into the editor only");
      assert.equal(await count(), 0, "nothing stored by a preview");
      const todayPage = await http(`/intern/sonderzeiten?datum=${today}&art=geschlossen`, { cookie });
      assert.ok(todayPage.body.includes("Änderungen für heute nehmen Sie bitte über die Schnellaktionen vor."));
    });

    test("signed out / cross-site / stale → nothing written", async () => {
      const fp = fingerprintIn((await http(`/intern/sonderzeiten?${specialQuery(D)}`, { cookie })).body)!;
      const fields = { ...Object.fromEntries(specialQuery(D)), fingerprint: fp };
      assert.equal(new URL((await post("/intern/sonderzeiten/veroeffentlichen", undefined, fields)).headers.get("location")!).pathname, "/intern/anmelden");
      assert.equal((await post("/intern/sonderzeiten/veroeffentlichen", cookie, fields, "https://evil.example")).status, 403);
      assert.match((await post("/intern/sonderzeiten/veroeffentlichen", cookie, { ...fields, fingerprint: "0".repeat(64) })).headers.get("location")!, /status=veraltet/);
      assert.equal(await count(), 0);
    });

    test("publish: server id, marker, priority, generated provenance, audit CREATE — client fields ignored", async () => {
      const fp = fingerprintIn((await http(`/intern/sonderzeiten?${specialQuery(D)}`, { cookie })).body)!;
      const res = await post("/intern/sonderzeiten/veroeffentlichen", cookie, {
        ...Object.fromEntries(specialQuery(D)),
        fingerprint: fp,
        recordId: "evil-id",
        reason: "BROWSER",
        priority: "999",
        role: "ADMIN",
        verifiedBy: "Dr. Erfunden",
        lastVerified: "2030-01-01",
        reviewDue: "2099-01-01",
        changeSetId: "11111111-1111-4111-8111-111111111111",
        recordState: "RETIRED",
        retiredReason: "REVERTED",
      });
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.pathname, "/intern/sonderzeiten/veroeffentlicht");
      createCs = loc.searchParams.get("vorgang")!;
      const r = (await record(id))!;
      assert.deepEqual([r.kind, r.reason, r.priority, r.recordState], ["SPECIAL_HOURS", SPECIAL_DAY_MARKER, 10, "ACTIVE"]);
      assert.deepEqual(r.intervals.map((i) => `${i.start}-${i.end} ${i.consultationType}`), ["08:00-12:00 GENERAL"], "the afternoon is not silently added back");
      assert.equal(r.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      assert.deepEqual([r.verification.lastVerified, r.verification.reviewDue, r.verification.sourceIds.map((s) => s.sourceId)], [today, D, ["PRACTICE_COCKPIT"]]);
      assert.equal(await record("evil-id"), undefined);
      const evs = await events({ changeSetId: { equals: createCs } });
      assert.deepEqual(evs.map((e) => [e.operation, e.actorRole]), [["CREATE", "STAFF"]]);
      assert.notEqual(createCs, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(evs), []);
      const conf = (await http(`${loc.pathname}${loc.search}`, { cookie })).body;
      for (const t of ["In der Testumgebung veröffentlicht.", "Die öffentliche Website verwendet weiterhin die bisherigen Daten.", "Änderung zurücknehmen"]) assert.ok(conf.includes(t), t);
      assert.doesNotMatch(conf, /Auf der Website veröffentlicht/);
    });

    test("/intern/vorschau shows the database result; home lists it with an edit link and human wording", async () => {
      assert.ok((await http(`/intern/vorschau?datum=${D}&zeit=15:00`, { cookie })).body.includes("Heute geschlossen"));
      assert.ok((await http(`/intern/vorschau?datum=${D}&zeit=10:00`, { cookie })).body.includes("Praxis geöffnet"));
      const home = (await http("/intern", { cookie })).body;
      assert.ok(home.includes(`href="/intern/sonderzeiten/${id}"`));
      assert.ok(home.includes(`Sonderöffnungszeit für ${D.slice(8, 10).replace(/^0/, "")}.`), "history wording");
      assert.ok(!home.includes(SPECIAL_DAY_MARKER));
    });

    test("edit the same record to CLOSED → UPDATE; then undo restores the special hours", async () => {
      const page = await http(`/intern/sonderzeiten/${id}?art=geschlossen`, { cookie });
      assert.ok(page.body.includes("Sonderöffnungszeit bearbeiten"));
      const fp = fingerprintIn(page.body)!;
      const res = await post("/intern/sonderzeiten/veroeffentlichen", cookie, { eintrag: id, datum: D, art: "geschlossen", hinweis: "", fingerprint: fp });
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.searchParams.get("modus"), "bearbeitet");
      editCs = loc.searchParams.get("vorgang")!;
      assert.deepEqual([(await record(id))!.kind, await count()], ["CLOSED", 1], "one record, edited in place");
      assert.deepEqual((await events({ changeSetId: { equals: editCs } })).map((e) => e.operation), ["UPDATE"]);
      const undoPage = await http(`/intern/verlauf/${editCs}/zuruecknehmen`, { cookie });
      assert.equal(undoPage.status, 200);
      const ok = await post("/intern/verlauf/ruecknahme", cookie, { vorgang: editCs, fingerprint: fingerprintIn(undoPage.body)! });
      assert.equal(ok.status, 303);
      const back = (await record(id))!;
      assert.deepEqual([back.kind, back.recordState, back.intervals.length], ["SPECIAL_HOURS", "ACTIVE", 1]);
      assert.ok((await http("/intern", { cookie })).body.includes("Änderung am "), "revert wording");
    });

    test("public website stays static: no database special day leaks", async () => {
      for (const path of ["/heute", "/heute/sprechzeiten", "/"]) {
        const body = (await http(path)).body.replace(/<script[\s\S]*?<\/script>/g, "");
        assert.ok(!body.includes(formatGermanDate(D)), `${path} does not show the database date`);
        assert.ok(!body.includes(SPECIAL_DAY_MARKER));
      }
    });
  });

  describe("HTTP: holiday deep link → closed → Prüfen item disappears", { skip: skipHttp }, () => {
    test("deep link, holiday wording, resolution", async () => {
      const page = await http(`/intern/sonderzeiten?datum=${H}`, { cookie });
      assert.ok(page.body.includes(">Feiertag klären<") && page.body.includes("Für diesen Feiertag ist noch nicht bestätigt, ob die Praxis geöffnet oder geschlossen ist."));
      const preview = await http(`/intern/sonderzeiten?datum=${H}&art=geschlossen`, { cookie });
      assert.ok(preview.body.includes("Die Website kann für diesen Feiertag aktuell keinen klaren Status anzeigen.") && preview.body.includes("Mit dieser Änderung ist der Feiertag geklärt."));
      const res = await post("/intern/sonderzeiten/veroeffentlichen", cookie, { datum: H, art: "geschlossen", hinweis: "", fingerprint: fingerprintIn(preview.body)! });
      assert.equal(res.status, 303);
      assert.equal((await record(`feiertag-${H}`))!.kind, "CLOSED");
      const home = (await http("/intern", { cookie })).body;
      assert.ok(!home.includes(`/intern/sonderzeiten?datum=${H}`), "Prüfen item gone (derived from the engine)");
      const cal = doc<{ policy: string; holidays: { date: string }[] }>(await payload.findGlobal({ slug: "holidayCalendar", overrideAccess: true }));
      assert.deepEqual([cal.policy, cal.holidays.map((h) => h.date)], ["REQUIRE_EXPLICIT_ENTRY", [H]], "global policy and calendar untouched");
    });
  });

  describe("Local API: roles, spoofing, stale, rollback, undo", () => {
    test("STAFF / DOCTOR / ADMIN may create; signed-out and inactive accounts may not", async () => {
      for (const [k, date] of [["STAFF", D2], ["DOCTOR", D3], ["ADMIN", D4]] as const) {
        const { res } = await run(k, { date, mode: "CLOSED", rows: [] });
        assert.ok(res.ok && res.mode === "NEW", `${k}: ${res.ok ? "" : res.message}`);
      }
      const { draft } = await previewWorkflow(payload, { kind: "SPECIAL_DAY", input: { date: D5, mode: "CLOSED", rows: [] } });
      for (const u of [null, users.INACTIVE]) {
        const r = await publishWorkflow(payload, u as never, { kind: "SPECIAL_DAY", input: { date: D5, mode: "CLOSED", rows: [] } }, draft.fingerprint);
        assert.ok(!r.ok && r.code === "UNAUTHENTICATED");
      }
      if (BASE) assert.equal((await restLogin(EMAIL("INACTIVE"), PW.INACTIVE)).cookie, undefined, "inactive account cannot sign in");
      assert.equal(await record(`sonderzeit-${D5}`), undefined);
    });

    test("REST: the marker is server-only; nothing deletable", { skip: skipHttp }, async () => {
      const r = await http("/api/openingHourExceptions", { method: "POST", cookie, body: { recordId: "rest-sonder", kind: "CLOSED", startDate: D6, endDate: D6, intervals: [], reason: SPECIAL_DAY_MARKER, priority: 10, verification: FAKE } });
      assert.equal(r.status, 403, r.body);
      const own = (await record(`sonderzeit-${D2}`))!;
      assert.equal((await http(`/api/openingHourExceptions/${own.id}`, { method: "PATCH", cookie, body: { publicMessage: "geändert über REST" } })).status, 403, "REST edit of a workflow record refused");
      assert.equal((await http(`/api/openingHourExceptions/${own.id}`, { method: "DELETE", cookie })).status, 403);
    });

    test("stale preview: dataset changed meanwhile → STALE, no record, no audit", async () => {
      const input: SpecialDayInput = { date: D6, mode: "CLOSED", rows: [] };
      const { draft } = await previewWorkflow(payload, { kind: "SPECIAL_DAY", input });
      await payload.create({ collection: "closures", data: { recordId: "zwischendurch", kind: "TRAINING", startDate: D7, endDate: D7, replacements: [], verification: FAKE } as never, user: users.STAFF, overrideAccess: false });
      const r = await publishWorkflow(payload, users.STAFF as never, { kind: "SPECIAL_DAY", input }, draft.fingerprint);
      assert.ok(!r.ok && r.code === "STALE" && r.message === STALE_MESSAGE);
      assert.equal(await record(`sonderzeit-${D6}`), undefined);
      assert.equal((await events({ entityId: { equals: `sonderzeit-${D6}` } })).length, 0);
    });

    test("rollback: failure after the record + audit write inside the transaction → nothing survives", async () => {
      const input: SpecialDayInput = { date: D6, mode: "SPECIAL", rows: [{ start: "09:00", end: "11:00", type: "GENERAL" }] };
      const { draft } = await previewWorkflow(payload, { kind: "SPECIAL_DAY", input });
      assert.ok(draft.ok);
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await commitDraft(payload, req, draft as ReadyDraft);
      await killTransaction(req); // e.g. a later step failed
      assert.equal(await record(`sonderzeit-${D6}`), undefined);
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore);
    });

    test("undo: CREATE → RETIRED; CLOSED → SPECIAL edit → undo restores CLOSED", async () => {
      const a = await run("DOCTOR", { recordId: `sonderzeit-${D3}`, date: D3, mode: "SPECIAL", rows: [{ start: "10:00", end: "12:00", type: "APPOINTMENT" }] });
      assert.ok(a.res.ok && a.res.mode === "EDIT", a.res.ok ? "" : a.res.message);
      const u1 = await previewUndo(payload, users.DOCTOR as never, a.res.ok ? a.res.changeSetId : "");
      assert.ok(u1.plan.ok);
      assert.ok((await revertChange(payload, users.DOCTOR as never, a.res.ok ? a.res.changeSetId : "", u1.fingerprint)).ok);
      assert.equal((await record(`sonderzeit-${D3}`))!.kind, "CLOSED");
      const create = (await events({ and: [{ entityId: { equals: `sonderzeit-${D4}` } }, { operation: { equals: "CREATE" } }] }))[0];
      const u2 = await previewUndo(payload, users.ADMIN as never, String(create.changeSetId));
      assert.ok((await revertChange(payload, users.ADMIN as never, String(create.changeSetId), u2.fingerprint)).ok);
      const retired = (await record(`sonderzeit-${D4}`))!;
      assert.deepEqual([retired.recordState, retired.retiredReason], ["RETIRED", "REVERTED"]);
      const again = await run("ADMIN", { date: D4, mode: "CLOSED", rows: [] });
      assert.ok(again.res.ok && again.res.recordId === `sonderzeit-${D4}-2`, "collision-safe new id next to the RETIRED one");
    });
  });
});
