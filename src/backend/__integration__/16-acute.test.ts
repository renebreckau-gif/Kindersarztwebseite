// Step 16 of the clean-database proof (Phase 09.5E): Akutsprechstunde.
// 09.5E-1 physician baseline (DOCTOR only, ACUTE subset only, one transaction, VERIFY / UPDATE audit,
// no quick undo) and 09.5E-2 today override (STAFF / DOCTOR / ADMIN on a READY baseline, complete
// day, collection guard on every write path, undo). Artificial accounts and an ARTIFICIAL schedule —
// no acute time of the practice exists in the project; the real dev database is never seeded.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { addDays, formatMinutes, parseTime, zonedToInstant } from "../../domain/time.ts";
import { ACUTE_TODAY_MARKER, acuteBaselineStatus } from "../../domain/acute.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { planFor } from "../../cockpit/history.ts";
import { acuteBaselineDraft } from "../../cockpit/workflows/acute.ts";
import { commitAcuteBaseline, previewUndo, previewWorkflow, publishAcuteBaseline, publishWorkflow, revertChange, STALE_MESSAGE } from "../../cockpit/workflows/publish.ts";
import { datasetFingerprint } from "../../cockpit/workflows/snapshot.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", Staff>;
const cookies = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", string | undefined>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] };
const FAKE = { status: "VERIFIED_CURRENT", lastVerified: "2030-01-01", reviewDue: "2099-01-01", verifiedBy: "Dr. Erfunden", sourceIds: [{ sourceId: "FAKE" }] };

// ARTIFICIAL week (every day, so the test runs on any weekday at almost any time):
// GENERAL 00:00–12:00 and APPOINTMENT 12:00–23:55. An old, UNCONFIRMED acute type exists.
const rule = (d: number, id: string, start: string, end: string, consultationType: OpeningHoursRule["consultationType"]): OpeningHoursRule => ({ id: `r${d}-${id}`, weekday: d as 1, start, end, consultationType, verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [rule(d, "a", "00:00", "12:00", "GENERAL"), rule(d, "b", "12:00", "23:55", "APPOINTMENT")]), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde", verification: V },
    { code: "APPOINTMENT", label: "Nur Terminsprechstunde (Test)", verification: V },
    { code: "ACUTE", label: "Akut (alt, unbestätigt)", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const SLOT_ROWS = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].flatMap((d, i) => [[`z${i}_tag`, String(d)], [`z${i}_von`, "10:00"], [`z${i}_bis`, "11:00"]]));

const today = berlinNow(new Date()).date;
const nowMin = parseTime(berlinNow(new Date()).time);
// Today's HTTP change: a short interval starting soon (5-minute grid); skipped right before midnight.
const startMin = Math.ceil((nowMin + 10) / 5) * 5;
const TODAY_SLOT = startMin + 20 <= parseTime("23:55") ? { start: formatMinutes(startMin), end: formatMinutes(startMin + 20) } : null;
const D = addDays(today, 7); // fixed-clock Local API day
const at = (date: string, time: string) => zonedToInstant(date, time);

const repo = () => new PayloadPracticeRepository(reader);
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const form = (path: string, cookie: string | undefined, fields: Record<string, string>, origin: string | null = BASE ?? null) =>
  fetch(`${BASE}${path}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
const acuteTypes = async () => (await payload.find({ collection: "consultationTypes", where: { code: { equals: "ACUTE" } }, overrideAccess: true })).docs.map((d) => doc<{ id: number; label: string; verification: { status: string; verifiedBy: string } }>(d));
const scheduleDoc = async () => doc<{ id: number; verification: { verifiedBy: string; lastVerified: string }; confirmedClosedWeekdays: string[]; rules: { ruleId: string; consultationType: string; start: string; end: string; verification: { status: string; verifiedBy: string; lastVerified: string } }[] }>((await payload.find({ collection: "weeklySchedules", sort: "-updatedAt", limit: 1, overrideAccess: true })).docs[0]);
const events = async (where: Record<string, unknown>) => (await payload.find({ collection: "auditEvents", where: where as never, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const exceptionsCount = async () => (await payload.count({ collection: "openingHourExceptions", overrideAccess: true })).totalDocs;
const acuteBody = (recordId: string, date: string, extra: Record<string, unknown> = {}) => ({
  recordId,
  kind: "SPECIAL_HOURS",
  startDate: date,
  endDate: date,
  intervals: [
    { start: "00:00", end: "10:00", consultationType: "GENERAL" },
    { start: "10:00", end: "11:00", consultationType: "ACUTE" },
    { start: "11:00", end: "12:00", consultationType: "GENERAL" },
    { start: "12:00", end: "23:55", consultationType: "APPOINTMENT" },
  ],
  priority: 10,
  verification: FAKE,
  ...extra,
});

describe("Akutsprechstunde (09.5E)", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
    await payload.db.migrateFresh({ forceAcceptWarning: true });
    await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
    users.ADMIN = { ...doc<Staff>((await payload.find({ collection: "staff", overrideAccess: true })).docs[0]), collection: "staff" };
    for (const k of ["STAFF", "DOCTOR"] as const) {
      users[k] = { ...doc<Staff>(await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role: k, active: true }, user: users.ADMIN, overrideAccess: false })), collection: "staff" };
    }
    const docs = docsFromPulsData(DATA);
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
    await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
    if (BASE) for (const k of ["ADMIN", "STAFF", "DOCTOR"] as const) cookies[k] = (await restLogin(EMAIL(k), PW[k])).cookie;
  });
  after(async () => {
    await payload?.destroy();
  });

  // ------------------------------------------------------------------ before any baseline
  describe("no physician baseline yet", () => {
    test("state NEEDS_CONFIRMATION (old acute type unconfirmed); nobody can change acute today", async () => {
      assert.equal(acuteBaselineStatus(await repo().getPulsData(), today).state, "NEEDS_CONFIRMATION");
      for (const k of ["STAFF", "ADMIN", "DOCTOR"] as const) {
        const { draft } = await previewWorkflow(payload, { kind: "ACUTE_TODAY", input: { mode: "CHANGE", start: "10:00", end: "10:30" } }, at(D, "09:00"));
        assert.equal(draft.ok, false, k);
        const res = await publishWorkflow(payload, users[k] as never, { kind: "ACUTE_TODAY", input: { mode: "CHANGE", start: "10:00", end: "10:30" } }, draft.fingerprint, at(D, "09:00"));
        assert.ok(!res.ok && res.code === "BLOCKED", k);
      }
      assert.equal(await exceptionsCount(), 0);
    });

    test("pages: STAFF / ADMIN see the explanation without a confirm action; DOCTOR gets the setup", { skip: skipHttp }, async () => {
      for (const k of ["STAFF", "ADMIN"] as const) {
        const page = await http("/intern/akutsprechstunde", { cookie: cookies[k] });
        assert.equal(page.status, 200);
        assert.ok(page.body.includes("Die Akutsprechstunde ist noch nicht ärztlich bestätigt und wird auf der Website nicht angezeigt."), k);
        assert.ok(!page.body.includes('href="/intern/akutsprechstunde/einrichten"'), `${k}: no confirm action`);
        const setup = await http("/intern/akutsprechstunde/einrichten?z0_tag=1&z0_von=10:00&z0_bis=11:00", { cookie: cookies[k] });
        assert.ok(setup.body.includes("kann nur eine Ärztin oder ein Arzt bestätigen"), k);
        assert.ok(!setup.body.includes('action="/intern/akutsprechstunde/bestaetigen"') && !setup.body.includes('name="z0_tag"'), `${k}: no setup form`);
        const todayPage = await http("/intern/akutsprechstunde/heute?modus=aendern&von=10:00&bis=10:30", { cookie: cookies[k] });
        assert.ok(todayPage.body.includes("Änderungen für heute sind erst danach möglich"), k);
        assert.equal(fingerprintIn(todayPage.body), undefined, `${k}: nothing to publish`);
      }
      const doctor = await http("/intern/akutsprechstunde", { cookie: cookies.DOCTOR });
      assert.ok(doctor.body.includes("Die Akutsprechstunde ist noch nicht ärztlich bestätigt und wird auf der Website nicht angezeigt."));
      assert.ok(doctor.body.includes(">Akutsprechstunde ärztlich bestätigen<"));
      const home = await http("/intern", { cookie: cookies.STAFF });
      assert.ok(home.body.includes('href="/intern/akutsprechstunde"') && home.body.includes("Noch nicht ärztlich bestätigt"));
    });

    test("baseline confirmation: STAFF / ADMIN refused (POST + Local API); STAFF / ADMIN cannot touch the schedule or the type via REST", { skip: skipHttp }, async () => {
      for (const k of ["STAFF", "ADMIN"] as const) {
        assert.equal((await form("/intern/akutsprechstunde/bestaetigen", cookies[k], { ...SLOT_ROWS, bestaetigt: "1", fingerprint: "0".repeat(64), rolle: "DOCTOR" })).status, 403, k);
        const r = await publishAcuteBaseline(payload, users[k] as never, { confirmed: true, rows: [{ weekday: "1", start: "10:00", end: "11:00" }] }, datasetFingerprint(await repo().getPulsData()));
        assert.ok(!r.ok && r.code === "NOT_ALLOWED", k);
        const s = await scheduleDoc();
        assert.equal((await http(`/api/weeklySchedules/${s.id}`, { method: "PATCH", cookie: cookies[k], body: { rules: s.rules, praxisAcuteBaselineWrite: true, context: { praxisAcuteBaselineWrite: true } } })).status, 403, `${k} schedule`);
        const t = (await acuteTypes())[0];
        assert.equal((await http(`/api/consultationTypes/${t.id}`, { method: "PATCH", cookie: cookies[k], body: { label: "Akutsprechstunde", verification: FAKE } })).status, 403, `${k} type`);
      }
      assert.equal((await acuteTypes())[0].verification.status, "TO_BE_CONFIRMED");
      assert.equal((await events({ entityType: { in: ["weeklySchedules", "consultationTypes"] }, actorId: { not_equals: "system:seed" } })).length, 0);
    });

    test("trusted context cannot elevate ADMIN: Local API schedule write with the acute context is refused", async () => {
      const s = await scheduleDoc();
      await assert.rejects(
        payload.update({ collection: "weeklySchedules", id: s.id, data: { rules: s.rules } as never, user: users.ADMIN, overrideAccess: false, context: { [SERVER_CONTEXT.ACUTE_BASELINE]: true } }),
      );
    });

    test("REST bypass: SPECIAL_HOURS with ACUTE is rejected for every role before a baseline; the marker is server-only", { skip: skipHttp }, async () => {
      for (const k of ["STAFF", "ADMIN", "DOCTOR"] as const) {
        const r = await http("/api/openingHourExceptions", { method: "POST", cookie: cookies[k], body: acuteBody(`rest-akut-${k.toLowerCase()}`, addDays(today, 3), { role: "DOCTOR", changeSetId: "11111111-1111-4111-8111-111111111111", sourceIds: ["X"], praxisAcuteTodayWrite: true }) });
        assert.ok([403, 409].includes(r.status), `${k}: ${r.status} ${r.body.slice(0, 200)}`);
      }
      const marker = await http("/api/openingHourExceptions", { method: "POST", cookie: cookies.STAFF, body: { ...acuteBody("rest-marker", addDays(today, 3)), intervals: [{ start: "08:00", end: "09:00", consultationType: "GENERAL" }], reason: ACUTE_TODAY_MARKER } });
      assert.equal(marker.status, 403, marker.body);
      assert.equal(await exceptionsCount(), 0);
    });
  });

  // ------------------------------------------------------------------ 09.5E-1 physician baseline (HTTP)
  describe("09.5E-1: physician baseline", { skip: skipHttp }, () => {
    let vorgang = "";
    test("DOCTOR preview: current vs proposed, engine checks over 28 days", async () => {
      const page = await http(`/intern/akutsprechstunde/einrichten?${new URLSearchParams(SLOT_ROWS)}`, { cookie: cookies.DOCTOR });
      assert.equal(page.status, 200);
      for (const t of ["Aktuell in der Cockpit-Datenbank", "Ärztlich bestätigt nach dem Speichern", "Prüfung mit der Statuslogik", "Während der Zeit: Akutsprechstunde", ">Akutsprechstunde ärztlich bestätigen<"]) assert.ok(page.body.includes(t), t);
      assert.ok(fingerprintIn(page.body));
      const outside = await http("/intern/akutsprechstunde/einrichten?z0_tag=1&z0_von=23:30&z0_bis=23:59", { cookie: cookies.DOCTOR });
      assert.ok(outside.body.includes("Die Akutsprechstunde muss vollständig innerhalb der bestätigten Sprechzeit liegen."));
      assert.match(outside.body, /aria-invalid="true"/);
    });

    test("POST without the physician confirmation, cross-site or stale → nothing written", async () => {
      const fp = fingerprintIn((await http(`/intern/akutsprechstunde/einrichten?${new URLSearchParams(SLOT_ROWS)}`, { cookie: cookies.DOCTOR })).body)!;
      assert.match((await form("/intern/akutsprechstunde/bestaetigen", cookies.DOCTOR, { ...SLOT_ROWS, fingerprint: fp })).headers.get("location")!, /status=blockiert/);
      assert.equal((await form("/intern/akutsprechstunde/bestaetigen", cookies.DOCTOR, { ...SLOT_ROWS, bestaetigt: "1", fingerprint: fp }, "https://evil.example")).status, 403);
      assert.match((await form("/intern/akutsprechstunde/bestaetigen", cookies.DOCTOR, { ...SLOT_ROWS, bestaetigt: "1", fingerprint: "0".repeat(64) })).headers.get("location")!, /status=veraltet/);
      assert.equal((await acuteTypes())[0].verification.status, "TO_BE_CONFIRMED");
    });

    test("DOCTOR confirms: same ACUTE type record, ACUTE rules with physician provenance, nothing else re-confirmed", async () => {
      const before = await scheduleDoc();
      const typeBefore = (await acuteTypes())[0];
      const fp = fingerprintIn((await http(`/intern/akutsprechstunde/einrichten?${new URLSearchParams(SLOT_ROWS)}`, { cookie: cookies.DOCTOR })).body)!;
      const res = await form("/intern/akutsprechstunde/bestaetigen", cookies.DOCTOR, {
        ...SLOT_ROWS,
        bestaetigt: "1",
        fingerprint: fp,
        // ignored client fields:
        rolle: "ADMIN",
        verifiedBy: "Dr. Erfunden",
        changeSetId: "11111111-1111-4111-8111-111111111111",
        praxisAcuteBaselineWrite: "true",
        sourceIds: "FAKE",
      });
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.pathname, "/intern/akutsprechstunde/bestaetigt");
      vorgang = loc.searchParams.get("vorgang")!;
      assert.notEqual(vorgang, "11111111-1111-4111-8111-111111111111");
      const types = await acuteTypes();
      assert.equal(types.length, 1, "no duplicate ACUTE type");
      assert.equal(types[0].id, typeBefore.id, "the same logical record was confirmed");
      assert.deepEqual([types[0].label, types[0].verification.status, types[0].verification.verifiedBy], ["Akutsprechstunde", "VERIFIED_CURRENT", "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)"]);
      const after = await scheduleDoc();
      assert.deepEqual(after.verification, before.verification, "schedule verification unchanged");
      assert.deepEqual(after.confirmedClosedWeekdays, before.confirmedClosedWeekdays);
      for (const r of before.rules) {
        const now = after.rules.find((x) => x.ruleId === r.ruleId)!;
        assert.deepEqual([now.start, now.end, now.consultationType, now.verification.verifiedBy, now.verification.lastVerified], [r.start, r.end, r.consultationType, "Seed (künstlich)", "2026-10-01"], r.ruleId);
      }
      const acute = after.rules.filter((r) => r.consultationType === "ACUTE");
      assert.equal(acute.length, 7);
      assert.ok(acute.every((r) => r.verification.verifiedBy === "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)" && r.start === "10:00" && r.end === "11:00"));
      assert.equal(acuteBaselineStatus(await repo().getPulsData(), today).state, "READY");
    });

    test("audit: one change set, VERIFY, DOCTOR, previous / next, no secrets; NOT quick-undoable", async () => {
      const evs = await events({ changeSetId: { equals: vorgang } });
      assert.deepEqual(evs.map((e) => [e.entityType, e.operation, e.actorRole]).sort(), [["consultationTypes", "VERIFY", "DOCTOR"], ["weeklySchedules", "VERIFY", "DOCTOR"]]);
      assert.ok(evs.every((e) => e.previous && e.next && e.actorId === String(users.DOCTOR.id)));
      assert.deepEqual(secretKeys(evs), []);
      const plan = await planFor(reader, vorgang, await repo().getPulsData(), new Date(), "DOCTOR");
      assert.equal(plan.ok, false, "physician baseline is not attached to the 24-hour quick undo");
      const conf = await http(`/intern/akutsprechstunde/bestaetigt?vorgang=${vorgang}&art=erst`, { cookie: cookies.DOCTOR });
      for (const t of ["Akutsprechstunde in der Testumgebung ärztlich bestätigt.", "Die öffentliche Website verwendet derzeit weiterhin die bisherigen Daten.", "Akutsprechstunde heute prüfen", "Website-Vorschau öffnen", "Zur Übersicht", "Akutsprechstunde ärztlich bestätigt"]) assert.ok(conf.body.includes(t), t);
      assert.doesNotMatch(conf.body, /zuruecknehmen/);
      assert.doesNotMatch((await http("/intern", { cookie: cookies.DOCTOR })).body, new RegExp(`/intern/verlauf/${vorgang}`));
    });
  });

  // ------------------------------------------------------------------ 09.5E-2 today (HTTP, real clock)
  describe("09.5E-2: STAFF changes today's acute slot (HTTP)", { skip: skipHttp || (TODAY_SLOT ? false : "too close to midnight for a real-clock change") }, () => {
    let vorgang = "";
    const recordId = `akut-heute-${today}`;
    test("entry offers the operational change; preview with engine points", async () => {
      const entry = await http("/intern/akutsprechstunde", { cookie: cookies.STAFF });
      assert.ok(entry.body.includes("Akutsprechstunde heute ändern"));
      assert.ok(entry.body.includes("10:00–11:00 Uhr"));
      assert.ok(!entry.body.includes('href="/intern/akutsprechstunde/einrichten"'), "no physician action for STAFF");
      const page = await http(`/intern/akutsprechstunde/heute?modus=aendern&von=${TODAY_SLOT!.start}&bis=${TODAY_SLOT!.end}`, { cookie: cookies.STAFF });
      for (const t of ["Aktuell in der Cockpit-Datenbank", "Mit dieser Änderung", "Prüfung mit der Statuslogik", `Akutsprechstunde heute ${TODAY_SLOT!.start}–${TODAY_SLOT!.end} Uhr`]) assert.ok(page.body.includes(t), t);
      assert.ok(fingerprintIn(page.body));
    });

    test("publish: complete-day exception, marker server-set, EXCEPTION provenance of STAFF, audit CREATE", async () => {
      const fp = fingerprintIn((await http(`/intern/akutsprechstunde/heute?modus=aendern&von=${TODAY_SLOT!.start}&bis=${TODAY_SLOT!.end}`, { cookie: cookies.STAFF })).body)!;
      const res = await form("/intern/heute/veroeffentlichen", cookies.STAFF, { workflow: "ACUTE_TODAY", modus: "aendern", von: TODAY_SLOT!.start, bis: TODAY_SLOT!.end, fingerprint: fp, grund: "Spoof", reason: "x", verifiedBy: "Dr. Erfunden", rolle: "DOCTOR" });
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.pathname, "/intern/heute/veroeffentlicht");
      assert.equal(loc.searchParams.get("art"), "akut");
      vorgang = loc.searchParams.get("vorgang")!;
      const rec = doc<{ recordId: string; kind: string; reason: string; priority: number; intervals: { start: string; end: string; consultationType: string }[]; verification: { verifiedBy: string } }>((await payload.find({ collection: "openingHourExceptions", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
      assert.deepEqual([rec.kind, rec.reason, rec.priority], ["SPECIAL_HOURS", ACUTE_TODAY_MARKER, 100]);
      assert.equal(rec.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)", "operational provenance, not the physician's");
      const types = rec.intervals.map((i) => i.consultationType);
      assert.ok(types.includes("ACUTE") && types.includes("APPOINTMENT"), "the whole day is stored, other types preserved");
      assert.equal(rec.intervals[0].start, "00:00");
      assert.equal(rec.intervals.at(-1)!.end, "23:55");
      const evs = await events({ changeSetId: { equals: vorgang } });
      assert.deepEqual(evs.map((e) => [e.operation, e.actorRole]), [["CREATE", "STAFF"]]);
      const conf = await http(`${loc.pathname}${loc.search}`, { cookie: cookies.STAFF });
      assert.ok(conf.body.includes("Akutsprechstunde heute") && conf.body.includes("Änderung zurücknehmen"));
      const home = await http("/intern", { cookie: cookies.STAFF });
      assert.ok(home.body.includes(`Akutsprechstunde heute ${TODAY_SLOT!.start}–${TODAY_SLOT!.end} Uhr geändert`), "human history wording");
      assert.ok(!home.body.includes(ACUTE_TODAY_MARKER), "the internal marker is never shown");
    });

    test("/intern/vorschau shows ACUTE_CONSULTATION from the database; the public website stays static", async () => {
      const mid = formatMinutes(parseTime(TODAY_SLOT!.start) + 10);
      const pv = await http(`/intern/vorschau?datum=${today}&zeit=${mid}`, { cookie: cookies.STAFF });
      assert.ok(pv.body.includes("Akutsprechstunde"), "database result");
      const span = `${TODAY_SLOT!.start}–${TODAY_SLOT!.end}`;
      for (const path of ["/heute", "/", "/heute/sprechzeiten"]) {
        const pub = (await http(path)).body.replace(/<script[\s\S]*?<\/script>/g, "");
        assert.ok(!pub.includes(span), `${path} shows no database acute time`);
        assert.doesNotMatch(pub, />Akutsprechstunde<\/(p|span|strong)>|Heute bis [0-9:]+ Uhr<\/p>[^<]*Akut/, `${path}: no acute status`);
      }
      for (const path of ["/heute", "/heute/sprechzeiten"]) assert.ok((await http(path)).body.includes("Aktuelle Informationen zur Akutsprechstunde werden geprüft."), `${path}: static fallback kept`);
    });

    test("undo preview and undo: the created acute-today record is RETIRED", async () => {
      const page = await http(`/intern/verlauf/${vorgang}/zuruecknehmen`, { cookie: cookies.STAFF });
      assert.equal(page.status, 200);
      const fp = fingerprintIn(page.body)!;
      const ok = await form("/intern/verlauf/ruecknahme", cookies.STAFF, { vorgang, fingerprint: fp });
      assert.equal(ok.status, 303);
      const rec = doc<{ recordState: string; retiredReason: string }>((await payload.find({ collection: "openingHourExceptions", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
      assert.deepEqual([rec.recordState, rec.retiredReason], ["RETIRED", "REVERTED"]);
      assert.ok((await http("/intern", { cookie: cookies.STAFF })).body.includes("Änderung an der Akutsprechstunde zurückgenommen"));
    });
  });

  // ------------------------------------------------------------------ 09.5E-2 today (Local API, fixed clock, all roles)
  describe("09.5E-2: roles, edit, cancel, conflicts, undo (fixed clock)", () => {
    const now = at(D, "09:00");
    before(async () => {
      // Self-sufficient: the physician baseline (artificial) — via the real Local API workflow.
      const data = await repo().getPulsData();
      if (acuteBaselineStatus(data, today).state !== "READY") {
        const rows = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: String(d), start: "10:00", end: "11:00" }));
        const r = await publishAcuteBaseline(payload, users.DOCTOR as never, { confirmed: true, rows }, datasetFingerprint(data));
        assert.ok(r.ok, r.ok ? "" : r.message);
      }
    });
    const run = async (k: "STAFF" | "ADMIN" | "DOCTOR", input: { mode: "CHANGE" | "CANCEL"; start?: string; end?: string }, when = now) => {
      const { draft } = await previewWorkflow(payload, { kind: "ACUTE_TODAY", input }, when);
      return { draft, res: await publishWorkflow(payload, users[k] as never, { kind: "ACUTE_TODAY", input }, draft.fingerprint, when) };
    };
    const record = async (id = `akut-heute-${D}`) => doc<{ recordState: string; intervals: { start: string; end: string; consultationType: string }[]; verification: { verifiedBy: string } }>((await payload.find({ collection: "openingHourExceptions", where: { recordId: { equals: id } }, overrideAccess: true })).docs[0]);
    const acuteOf = async () => (await record()).intervals.filter((i) => i.consultationType === "ACUTE").map((i) => `${i.start}-${i.end}`);
    let staffCs = "";
    let doctorCs = "";

    test("READY + STAFF change → NEW; READY + ADMIN cancel → EDIT same record; READY + DOCTOR change → EDIT", async () => {
      const a = await run("STAFF", { mode: "CHANGE", start: "10:30", end: "11:30" });
      assert.ok(a.res.ok && a.res.mode === "NEW", a.res.ok ? "" : a.res.message);
      staffCs = a.res.ok ? a.res.changeSetId : "";
      assert.deepEqual(await acuteOf(), ["10:30-11:30"]);
      const b = await run("ADMIN", { mode: "CANCEL" });
      assert.ok(b.res.ok && b.res.mode === "EDIT", b.res.ok ? "" : b.res.message);
      assert.deepEqual(await acuteOf(), []);
      assert.equal((await record()).verification.verifiedBy, "Test Verwaltung (künstlich), Verwaltung (Praxis Cockpit)");
      const c = await run("DOCTOR", { mode: "CHANGE", start: "10:00", end: "10:30" });
      assert.ok(c.res.ok && c.res.mode === "EDIT", c.res.ok ? "" : c.res.message);
      doctorCs = c.res.ok ? c.res.changeSetId : "";
      assert.deepEqual(await acuteOf(), ["10:00-10:30"]);
      assert.equal((await payload.count({ collection: "openingHourExceptions", where: { recordId: { like: `akut-heute-${D}` } }, overrideAccess: true })).totalDocs, 1, "one record, edited in place");
    });

    test("past / outside / closure → rejected; stale fingerprint → STALE (unknown day: unit tests)", async () => {
      assert.ok(!(await run("STAFF", { mode: "CHANGE", start: "10:00", end: "10:30" }, at(D, "11:00"))).res.ok);
      const outside = await run("STAFF", { mode: "CHANGE", start: "23:40", end: "23:59" });
      assert.ok(!outside.res.ok && outside.res.code === "BLOCKED" && /innerhalb der heutigen Sprechzeit/.test(outside.res.message));
      const stale = await publishWorkflow(payload, users.STAFF as never, { kind: "ACUTE_TODAY", input: { mode: "CANCEL" } }, "0".repeat(64), now);
      assert.ok(!stale.ok && stale.code === "STALE" && stale.message === STALE_MESSAGE);
      const D5 = addDays(D, 5);
      await payload.create({ collection: "closures", data: { recordId: "akut-test-urlaub", kind: "VACATION", startDate: D5, endDate: D5, replacements: [], verification: FAKE } as never, user: users.STAFF, overrideAccess: false });
      const closed = await run("STAFF", { mode: "CANCEL" }, at(D5, "09:00"));
      assert.ok(!closed.res.ok && /Schließung/.test(closed.res.message));
    });

    test("existing unrelated / multi-day SPECIAL_HOURS → blocked, never merged or superseded", async () => {
      const D2 = addDays(D, 1);
      const D3 = addDays(D, 2);
      await payload.create({ collection: "openingHourExceptions", data: { recordId: "frueher-test", kind: "SPECIAL_HOURS", startDate: D2, endDate: D2, intervals: [{ start: "00:00", end: "09:30", consultationType: "GENERAL" }], priority: 100, verification: FAKE } as never, user: users.STAFF, overrideAccess: false });
      await payload.create({ collection: "openingHourExceptions", data: { recordId: "mehrtaegig-test", kind: "SPECIAL_HOURS", startDate: D3, endDate: addDays(D3, 1), intervals: [{ start: "00:00", end: "12:00", consultationType: "GENERAL" }], priority: 10, verification: FAKE } as never, user: users.STAFF, overrideAccess: false });
      for (const day of [D2, D3]) {
        const r = await run("STAFF", { mode: "CHANGE", start: "10:00", end: "10:30" }, at(day, "08:00"));
        assert.ok(!r.res.ok && r.res.message === "Für heute gibt es bereits geänderte Sprechzeiten. Bitte diese Änderung zuerst prüfen.", day);
      }
      assert.equal((await record("frueher-test")).recordState, "ACTIVE");
      assert.equal((await record("mehrtaegig-test")).recordState, "ACTIVE");
    });

    test("undo EDIT restores the previous intervals; latest-change rule", async () => {
      const older = await planFor(reader, staffCs, await repo().getPulsData(), new Date(), "STAFF");
      assert.ok(!older.ok && older.code === "LATER_CHANGE");
      const { fingerprint } = await previewUndo(payload, users.DOCTOR as never, doctorCs);
      const undo = await revertChange(payload, users.DOCTOR as never, doctorCs, fingerprint);
      assert.ok(undo.ok, undo.ok ? "" : undo.message);
      assert.deepEqual(await acuteOf(), [], "back to the ADMIN cancel state");
      assert.equal((await record()).recordState, "ACTIVE");
    });

    test("REST after the baseline: a structurally valid ACUTE exception passes; generated provenance; marker still refused", { skip: skipHttp }, async () => {
      const ok = await http("/api/openingHourExceptions", { method: "POST", cookie: cookies.STAFF, body: acuteBody("rest-akut-ok", addDays(D, 10)) });
      assert.equal(ok.status, 201, ok.body);
      assert.equal(doc<{ doc: { verification: { verifiedBy: string } } }>(ok.json).doc.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      const marker = await http("/api/openingHourExceptions", { method: "POST", cookie: cookies.STAFF, body: { ...acuteBody("rest-marker-2", addDays(D, 11)), reason: ACUTE_TODAY_MARKER } });
      assert.equal(marker.status, 403);
    });
  });

  // ------------------------------------------------------------------ baseline edit, stale, rollback
  describe("09.5E-1: later change, stale, transaction rollback", () => {
    test("DOCTOR changes the baseline → UPDATE audit, still one ACUTE type; stale fingerprint refused", async () => {
      const data = await repo().getPulsData();
      const rows = [{ weekday: "1", start: "10:00", end: "11:00" }, { weekday: "1", start: "11:15", end: "11:45" }, ...[2, 3, 4, 5, 6, 7].map((d) => ({ weekday: String(d), start: "10:00", end: "11:00" }))];
      const stale = await publishAcuteBaseline(payload, users.DOCTOR as never, { confirmed: true, rows }, "0".repeat(64));
      assert.ok(!stale.ok && stale.code === "STALE");
      const res = await publishAcuteBaseline(payload, users.DOCTOR as never, { confirmed: true, rows }, datasetFingerprint(data));
      assert.ok(res.ok && !res.first, res.ok ? "" : res.message);
      const evs = await events({ changeSetId: { equals: res.ok ? res.changeSetId : "" } });
      assert.deepEqual(evs.map((e) => e.operation).sort(), ["UPDATE", "UPDATE"]);
      assert.equal((await acuteTypes()).length, 1);
      assert.equal((await scheduleDoc()).rules.filter((r) => r.consultationType === "ACUTE").length, 8);
    });

    test("rollback: a failure after the type write leaves no half state", async () => {
      const data = await repo().getPulsData();
      const typeBefore = (await acuteTypes())[0];
      const scheduleBefore = await scheduleDoc();
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const draft = acuteBaselineDraft(data, new Date(), { confirmed: true, rows: [{ weekday: "1", start: "10:00", end: "10:30" }] }, datasetFingerprint(data));
      assert.ok(draft.ok);
      const failing = new Proxy(payload, {
        get(target, prop, recv) {
          if (prop === "update") return (args: { collection: string }) => (args.collection === "weeklySchedules" ? Promise.reject(new Error("simulierter Fehler")) : target.update(args as never));
          const v = Reflect.get(target, prop, recv);
          return typeof v === "function" ? v.bind(target) : v;
        },
      });
      const req = await createLocalReq({ user: users.DOCTOR as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await assert.rejects(commitAcuteBaseline(failing as Payload, req, draft as never), /simulierter Fehler/);
      await killTransaction(req);
      const typeAfter = (await acuteTypes())[0];
      assert.deepEqual(typeAfter, typeBefore, "type write rolled back");
      assert.deepEqual((await scheduleDoc()).rules, scheduleBefore.rules);
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no audit event survived");
    });
  });
});
