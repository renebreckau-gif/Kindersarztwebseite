// Step 7 of the clean-database proof (Phase 09.5C): 7.5 Urlaub / geplante Schließzeit against
// PostgreSQL — create, validation without partial writes, edit of the same record, replacement
// coverage, undo through the 09.5B lifecycle, transaction rollback and one end-to-end HTTP path.
// Artificial accounts and data only. Dates are relative to the real Berlin date.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHourException, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { docsFromPulsData, exceptionToDoc } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { applyUndo, buildDraft, commitDraft, previewUndo, publishWorkflow, revertChange } from "../../cockpit/workflows/publish.ts";
import { datasetFingerprint } from "../../cockpit/workflows/snapshot.ts";
import type { PlannedClosureInput, ReadyDraft } from "../../cockpit/workflows/types.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", Staff>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed", sourceIds: ["TEST"] };
const today = berlinNow(new Date()).date;
const S = addDays(today, 10); // first day of the test vacation
const E = addDays(today, 14); // last day
const d = (n: number) => addDays(S, n);
const rule = (wd: number, start: string, end: string): OpeningHoursRule => ({ id: `r${wd}-${start}`, weekday: wd as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((wd) => [rule(wd, "08:00", "12:00"), rule(wd, "14:00", "16:00")]), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [
    { id: "vertretung-a", practiceName: "Praxis Beispiel A (Test)", contactPersons: [], street: "Teststraße 1", postalCode: "00000", city: "Testort", phone: "0000 111", verification: V },
    { id: "vertretung-b", practiceName: "Praxis Beispiel B (Test)", contactPersons: [], street: "Teststraße 2", postalCode: "00000", city: "Testort", phone: "0000 222", verification: V },
    { id: "vertretung-c", practiceName: "Praxis Beispiel C (Test)", contactPersons: [], street: "Teststraße 3", postalCode: "00000", city: "Testort", phone: "0000 333", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
    { id: "vertretung-d", practiceName: "Praxis Beispiel D (Test)", contactPersons: [], street: "Teststraße 4", postalCode: "00000", city: "Testort", phone: "0000 444", verification: { ...V, reviewDue: addDays(today, 12) } },
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

const active = () => new PayloadPracticeRepository(reader).getPulsData();
const fp = async () => datasetFingerprint(await active());
const count = async (collection: "closures" | "auditEvents", where?: Record<string, unknown>) => (await payload.count({ collection, where: where as never, overrideAccess: true })).totalDocs;
type Rec = { id: number; recordId: string; recordState: string; retiredReason: string | null; startDate: string; endDate: string; announceFrom: string | null; publicMessage: string | null; replacements: { replacementPracticeId: string; from: string; until: string }[]; verification: { verifiedBy: string; reviewDue: string } };
const record = async (recordId: string) => doc<Rec>((await payload.find({ collection: "closures", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
const events = async (where: Record<string, unknown>) =>
  (await payload.find({ collection: "auditEvents", where: where as never, sort: "id", pagination: false, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
const input = (p: Partial<PlannedClosureInput> = {}): PlannedClosureInput => ({ kind: "VACATION", from: S, to: E, announceFrom: addDays(S, -7), mode: "KEINE", periods: [], gapsAccepted: false, ...p });
const publish = async (user: Staff | null, p: Partial<PlannedClosureInput> = {}, fingerprint?: string) => publishWorkflow(payload, user as never, { kind: "PLANNED_CLOSURE", input: input(p) }, fingerprint ?? (await fp()));
const undoFp = async () => (await previewUndo(payload, null, crypto.randomUUID())).fingerprint;
const undo = async (user: Staff, cs: string, now = new Date()) => revertChange(payload, user as never, cs, await undoFp(), now);
const TWO_PERIODS_WITH_GAP = { mode: "TEILEN" as const, gapsAccepted: true, periods: [{ from: S, to: d(1), practice: "vertretung-a" }, { from: d(3), to: E, practice: "vertretung-b" }] };

describe("7.5 Urlaub / Schließzeit against PostgreSQL", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("create: one Closure, repository, engine, audit", () => {
    before(freshSetup);

    test("multi-day vacation with two replacement periods and an intentional gap", async () => {
      const r = await publish(users.STAFF, { ...TWO_PERIODS_WITH_GAP, message: "Rezepte bitte vorher abholen." });
      assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual([r.ok && r.mode, r.ok && r.kind, r.ok && r.recordId], ["NEW", "PLANNED_CLOSURE", `urlaub-${S}`]);
      const rec = await record(`urlaub-${S}`);
      assert.deepEqual([rec.recordState, rec.startDate, rec.endDate, rec.announceFrom, rec.publicMessage], ["ACTIVE", S, E, addDays(S, -7), "Rezepte bitte vorher abholen."]);
      assert.deepEqual(rec.replacements.map((x) => [x.replacementPracticeId, x.from, x.until]), [["vertretung-a", S, d(1)], ["vertretung-b", d(3), E]], "exactly as entered — the gap is not stretched");
      assert.equal(rec.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)", "provenance from the account");
      assert.equal(rec.verification.reviewDue, E);
      const data = await active();
      assert.deepEqual(data.closures.map((c) => c.id), [`urlaub-${S}`]);
      assert.equal(getPracticeStatus(zonedToInstant(addDays(S, -7), "09:00"), data).upcomingClosure?.startDate, S, "announced");
      assert.deepEqual(getPracticeStatus(zonedToInstant(S, "09:00"), data).replacementPractices.map((p) => p.id), ["vertretung-a"]);
      assert.equal(getPracticeStatus(zonedToInstant(d(2), "09:00"), data).replacementFallback, true, "gap day: phone + emergency");
      assert.deepEqual(getPracticeStatus(zonedToInstant(d(3), "09:00"), data).replacementPractices.map((p) => p.id), ["vertretung-b"]);
      const evs = await events({ entityId: { equals: `urlaub-${S}` } });
      assert.equal(evs.length, 1, "one business record → one audit event");
      assert.deepEqual([evs[0].operation, evs[0].changeSetId, evs[0].actorRole, evs[0].previous], ["CREATE", r.ok ? r.changeSetId : "", "STAFF", null]);
      assert.equal((evs[0].next as { replacements: unknown[] }).replacements.length, 2);
    });

    test("single-day, training and other closures by DOCTOR and ADMIN; disabled account refused", async () => {
      const a = await publish(users.DOCTOR, { kind: "TRAINING", from: addDays(today, 20), to: addDays(today, 20), announceFrom: addDays(today, 20) });
      const b = await publish(users.ADMIN, { kind: "OTHER", from: addDays(today, 25), to: addDays(today, 26), mode: "GANZ", practice: "vertretung-a" });
      assert.ok(a.ok && b.ok, JSON.stringify([a, b]));
      assert.deepEqual([(await record(`fortbildung-${addDays(today, 20)}`)).recordState, (await record(`schliessung-${addDays(today, 25)}`)).recordState], ["ACTIVE", "ACTIVE"]);
      const off = await publish({ ...users.STAFF, active: false }, { from: addDays(today, 40), to: addDays(today, 41) });
      assert.equal(!off.ok && off.code, "UNAUTHENTICATED");
      const anon = await publish(null, { from: addDays(today, 40), to: addDays(today, 41) });
      assert.equal(!anon.ok && anon.code, "UNAUTHENTICATED");
    });
  });

  describe("validation: every refusal leaves no row and no audit event", () => {
    before(async () => {
      await freshSetup();
      await publish(users.STAFF, { from: d(10), to: d(12) }); // an existing vacation later on
      await payload.create({ collection: "openingHourExceptions", data: exceptionToDoc({ id: "sonder", kind: "SPECIAL_HOURS", startDate: d(20), endDate: d(20), intervals: [{ start: "08:00", end: "11:00", consultationType: "GENERAL" }], priority: 10, verification: V } as OpeningHourException) as never, ...seed });
    });

    const refused = async (p: Partial<PlannedClosureInput>, code: string, fingerprint?: string) => {
      const before = [await count("closures"), await count("auditEvents")];
      const r = await publish(users.STAFF, p, fingerprint);
      assert.equal(!r.ok && r.code, code, JSON.stringify(r));
      assert.deepEqual([await count("closures"), await count("auditEvents")], before, "no partial write");
      return r;
    };

    test("dates, announcement, message", async () => {
      await refused({ from: E, to: S }, "BLOCKED");
      await refused({ from: "2026-02-30", to: "2026-03-01" }, "BLOCKED");
      await refused({ from: "12.10.2026" }, "BLOCKED");
      await refused({ from: addDays(today, -3), to: addDays(today, 2) }, "BLOCKED");
      await refused({ announceFrom: addDays(E, 1) }, "BLOCKED");
      await refused({ message: "x".repeat(281) }, "BLOCKED");
    });

    test("replacements: outside, overlapping, unverified, expiring before the assignment ends, unconfirmed gap", async () => {
      await refused({ mode: "TEILEN", periods: [{ from: addDays(E, 1), to: addDays(E, 2), practice: "vertretung-a" }] }, "BLOCKED");
      await refused({ mode: "TEILEN", periods: [{ from: S, to: d(2), practice: "vertretung-a" }, { from: d(2), to: E, practice: "vertretung-b" }] }, "BLOCKED");
      await refused({ mode: "GANZ", practice: "vertretung-c" }, "BLOCKED");
      const exp = await refused({ mode: "GANZ", practice: "vertretung-d" }, "BLOCKED");
      assert.match(!exp.ok ? exp.message : "", /läuft am .* ab\. Danach kann sie auf der Website nicht mehr angezeigt werden\./);
      await refused({ ...TWO_PERIODS_WITH_GAP, gapsAccepted: false }, "BLOCKED");
    });

    test("overlaps with another closure or with special hours; stale preview", async () => {
      const c = await refused({ from: d(11), to: d(15) }, "BLOCKED");
      assert.match(!c.ok ? c.message : "", /bereits „Urlaub/);
      const s = await refused({ from: d(19), to: d(21) }, "BLOCKED");
      assert.match(!s.ok ? s.message : "", /geänderte Sprechzeiten/);
      await refused({}, "STALE", "0".repeat(64));
    });
  });

  describe("edit: same record, UPDATE audit, no duplicate", () => {
    let id = "";
    before(async () => {
      await freshSetup();
      const r = await publish(users.STAFF, { mode: "GANZ", practice: "vertretung-a" });
      assert.ok(r.ok);
      id = r.ok ? r.recordId : "";
    });
    const edit = (p: Partial<PlannedClosureInput>) => publish(users.STAFF, { recordId: id, mode: "TEILEN", periods: [{ from: S, to: E, practice: "vertretung-a" }], ...p });

    test("extend: new uncovered day must be confirmed; the replacement is not extended", async () => {
      const blocked = await edit({ to: addDays(E, 1) });
      assert.equal(!blocked.ok && blocked.code, "BLOCKED");
      const r = await edit({ to: addDays(E, 1), gapsAccepted: true });
      assert.ok(r.ok && r.mode === "EDIT", JSON.stringify(r));
      const rec = await record(id);
      assert.deepEqual([rec.endDate, rec.replacements.map((x) => x.until)], [addDays(E, 1), [E]]);
      assert.equal(await count("closures"), 1, "no duplicate row");
      const evs = await events({ entityId: { equals: id } });
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "UPDATE"]);
      assert.deepEqual([(evs[1].previous as { endDate: string }).endDate, (evs[1].next as { endDate: string }).endDate], [E, addDays(E, 1)]);
    });

    test("shorten: a period beyond the new end is refused until corrected explicitly", async () => {
      const blocked = await edit({ to: d(3), periods: [{ from: S, to: E, practice: "vertretung-a" }] });
      assert.equal(!blocked.ok && blocked.code, "BLOCKED");
      const r = await edit({ to: d(3), periods: [{ from: S, to: d(3), practice: "vertretung-a" }] });
      assert.ok(r.ok, JSON.stringify(r));
      assert.deepEqual([(await record(id)).endDate, (await record(id)).replacements[0].until], [d(3), d(3)]);
    });

    test("change replacements, announcement date and message", async () => {
      const r = await edit({ to: d(3), announceFrom: addDays(S, -3), message: "Neuer Hinweis.", periods: [{ from: S, to: d(1), practice: "vertretung-a" }, { from: d(2), to: d(3), practice: "vertretung-b" }] });
      assert.ok(r.ok, JSON.stringify(r));
      const rec = await record(id);
      assert.deepEqual([rec.announceFrom, rec.publicMessage, rec.replacements.length, rec.recordState], [addDays(S, -3), "Neuer Hinweis.", 2, "ACTIVE"]);
      assert.equal(await count("closures"), 1);
      assert.deepEqual((await events({ entityId: { equals: id } })).map((e) => e.operation), ["CREATE", "UPDATE", "UPDATE", "UPDATE"]);
    });
  });

  describe("undo through the 09.5B lifecycle", () => {
    before(freshSetup);

    test("CREATE undo: Closure kept, RETIRED / REVERTED, repository stops returning it", async () => {
      const r = await publish(users.STAFF, TWO_PERIODS_WITH_GAP);
      assert.ok(r.ok);
      const u = await undo(users.DOCTOR, r.ok ? r.changeSetId : "");
      assert.ok(u.ok, JSON.stringify(u));
      const rec = await record(`urlaub-${S}`);
      assert.deepEqual([rec.recordState, rec.retiredReason], ["RETIRED", "REVERTED"]);
      assert.deepEqual((await active()).closures, []);
      const rev = await events({ changeSetId: { equals: u.ok ? u.changeSetId : "" } });
      assert.deepEqual(rev.map((e) => e.operation), ["REVERT"]);
    });

    test("EDIT undo: same record id, previous content restored; an older edit is no longer undoable", async () => {
      const c = await publish(users.STAFF, { from: d(20), to: d(22) });
      assert.ok(c.ok);
      const id = c.ok ? c.recordId : "";
      const a = await publish(users.STAFF, { recordId: id, from: d(20), to: d(23) });
      const b = await publish(users.STAFF, { recordId: id, from: d(20), to: d(24), message: "B" });
      assert.ok(a.ok && b.ok);
      const old = await undo(users.STAFF, a.ok ? a.changeSetId : "");
      assert.equal(!old.ok && old.code, "BLOCKED");
      assert.match(!old.ok ? old.message : "", /inzwischen erneut geändert/);
      const u = await undo(users.ADMIN, b.ok ? b.changeSetId : "");
      assert.ok(u.ok, JSON.stringify(u));
      const rec = await record(id);
      assert.deepEqual([rec.recordState, rec.endDate, rec.publicMessage], ["ACTIVE", d(23), null]);
      assert.equal(rec.verification.reviewDue, d(23), "restored provenance due at the end of the vacation");
      const evs = await events({ entityId: { equals: id } });
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "UPDATE", "UPDATE", "REVERT"]);
      assert.equal(evs[3].revertOf, evs[2].eventId);
    });

    test("a closure whose effect is over offers no quick undo", async () => {
      const r = await publish(users.STAFF, { from: today, to: today, announceFrom: today });
      assert.ok(r.ok, JSON.stringify(r));
      const tomorrow = zonedToInstant(addDays(today, 1), "00:05");
      const plan = await previewUndo(payload, users.STAFF as never, r.ok ? r.changeSetId : "", tomorrow);
      assert.equal(!plan.plan.ok && plan.plan.code, "EFFECT_OVER");
    });
  });

  describe("transactions", () => {
    before(freshSetup);

    test("failure during a vacation publish: no business row, no audit event", async () => {
      const data = await active();
      const draft = buildDraft({ kind: "PLANNED_CLOSURE", input: input(TWO_PERIODS_WITH_GAP) }, data, new Date(), datasetFingerprint(data)) as ReadyDraft;
      assert.ok(draft.ok);
      const before = [await count("closures"), await count("auditEvents")];
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await commitDraft(payload, req, draft);
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req }));
      await killTransaction(req);
      assert.deepEqual([await count("closures"), await count("auditEvents")], before);
    });

    test("failure during an update: previous row unchanged, no partial audit; undo rollback unchanged", async () => {
      const c = await publish(users.STAFF, { mode: "GANZ", practice: "vertretung-a" });
      assert.ok(c.ok);
      const id = c.ok ? c.recordId : "";
      const data = await active();
      const draft = buildDraft({ kind: "PLANNED_CLOSURE", input: input({ recordId: id, to: addDays(E, 2), mode: "TEILEN", gapsAccepted: true, periods: [{ from: S, to: E, practice: "vertretung-a" }] }) }, data, new Date(), datasetFingerprint(data)) as ReadyDraft;
      assert.ok(draft.ok && draft.mode === "EDIT", JSON.stringify(draft));
      const auditBefore = await count("auditEvents");
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await commitDraft(payload, req, draft);
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req }));
      await killTransaction(req);
      assert.equal((await record(id)).endDate, E, "previous row unchanged");
      assert.equal(await count("auditEvents"), auditBefore, "no partial audit");

      const preview = await previewUndo(payload, users.STAFF as never, c.ok ? c.changeSetId : "");
      assert.ok(preview.plan.ok);
      const req2 = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req2);
      await applyUndo(payload, req2, preview.plan.ok ? preview.plan.actions : []);
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req: req2 }));
      await killTransaction(req2);
      assert.equal((await record(id)).recordState, "ACTIVE");
      assert.equal(await count("auditEvents"), auditBefore);
    });

    test("no secrets in any audit event", async () => {
      const all = (await payload.find({ collection: "auditEvents", pagination: false, overrideAccess: true })).docs;
      assert.deepEqual(secretKeys(all), []);
      const text = JSON.stringify(all);
      for (const s of [...Object.values(PW), process.env.PAYLOAD_SECRET ?? "unset"]) assert.ok(!text.includes(s));
    });
  });

  describe("HTTP: login → Urlaub eintragen → two periods → preview → publish → cockpit → Website-Vorschau → undo", { skip: skipHttp }, () => {
    let cookie: string | undefined;
    let hidden: [string, string][] = [];
    let changeSetId = "";
    const id = `urlaub-${S}`;
    before(async () => {
      await freshSetup();
      cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    });
    const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const send = (fields: [string, string][], origin: string | null = BASE ?? null) =>
      fetch(`${BASE}/intern/urlaub/veroeffentlichen`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });

    test("form → Zeitraum teilen → preview with several dates (GET never writes)", async () => {
      const start = await http("/intern/urlaub", { cookie });
      assert.equal(start.status, 200);
      assert.match(start.body, /Urlaub oder Schließzeit eintragen/);
      const split = await http(`/intern/urlaub?art=urlaub&von=${S}&bis=${E}&ankuendigen=&vertretung=ganz&praxis=vertretung-a&aktion=teilen`, { cookie });
      assert.match(split.body, /Vertretungszeitraum 2/);
      assert.match(split.body, new RegExp(`name="z1_von"[^>]*value="${d(3)}"`));
      const q = new URLSearchParams({ art: "urlaub", von: S, bis: E, ankuendigen: addDays(S, -7), vertretung: "teilen", z0_von: S, z0_bis: d(1), z0_praxis: "vertretung-a", z1_von: d(3), z1_bis: E, z1_praxis: "vertretung-b", luecke: "1" });
      const page = await http(`/intern/urlaub?${q}`, { cookie });
      assert.equal(page.status, 200);
      for (const t of ["Website-Vorschau", "Ankündigung (", "Erster Tag (", "Vertretung Praxis Beispiel B (Test)", "Ohne Vertretung (", "Erster Tag danach (", "Gegenüber dem jetzigen Stand"]) assert.ok(page.body.includes(t), t);
      assert.equal(await count("closures"), 0, "a GET never writes");
      const form = page.body.match(/<form[^>]*action="\/intern\/urlaub\/veroeffentlichen"[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
      hidden = [...form.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], decode(m[2])]);
      assert.ok(hidden.some(([k]) => k === "fingerprint"));
      assert.ok(!hidden.some(([k]) => /changeSet|verified|recordState|rolle|role/i.test(k)), "the form carries only user input + fingerprint");
    });

    test("publish: cross-site refused, smuggled server fields ignored, then one record", async () => {
      assert.equal((await send(hidden, "https://evil.example")).status, 403);
      const smuggled: [string, string][] = [...hidden, ["changeSetId", "22222222-2222-4222-8222-222222222222"], ["recordState", "RETIRED"], ["verifiedBy", "Gefälscht"], ["rolle", "ADMIN"], ["reviewDue", "2099-01-01"]];
      const res = await send(smuggled);
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.pathname, "/intern/urlaub/veroeffentlicht");
      changeSetId = loc.searchParams.get("vorgang") ?? "";
      assert.notEqual(changeSetId, "22222222-2222-4222-8222-222222222222");
      const rec = await record(id);
      assert.deepEqual([rec.recordState, rec.replacements.length], ["ACTIVE", 2]);
      assert.equal(rec.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      const ev = (await events({ entityId: { equals: id } }))[0];
      assert.deepEqual([ev.actorRole, ev.changeSetId], ["STAFF", changeSetId]);
      const again = await send(hidden);
      assert.equal(again.status, 303);
      assert.match(again.headers.get("location")!, /status=veraltet/, "re-sending the same preview is stale now (no duplicate)");
      assert.equal(await count("closures"), 1);
    });

    test("confirmation, cockpit overview with edit link, Website-Vorschau, public site untouched", async () => {
      const conf = await http(`/intern/urlaub/veroeffentlicht?eintrag=${id}&modus=neu&vorgang=${changeSetId}`, { cookie });
      for (const t of ["In der Testumgebung veröffentlicht", "Die öffentliche Website verwendet derzeit noch die bisherigen Daten.", "Praxis Beispiel A (Test)", "ohne Vertretung", "Website-Vorschau öffnen", "Änderung zurücknehmen"]) assert.ok(conf.body.includes(t), t);
      assert.doesNotMatch(conf.body, /Gespeichert</);
      const home = await http("/intern", { cookie });
      assert.match(home.body, /Urlaub [^<]+ eingetragen/);
      assert.ok(home.body.includes(`href="/intern/urlaub/${id}"`), "Bearbeiten link");
      assert.ok(home.body.includes('href="/intern/urlaub"'), "Urlaub eintragen is a real action");
      assert.ok(!home.body.includes('href="/lab/praxis-cockpit/urlaub"'), "no longer the prototype");
      // 09.5D: "Hinweis veröffentlichen" is a real workflow now (no prototype link).
      assert.ok(home.body.includes('href="/intern/hinweis"') && !home.body.includes('href="/lab/praxis-cockpit/hinweis"'), "announcements are real");
      const preview = await http(`/intern/vorschau?datum=${S}&zeit=09:00`, { cookie });
      assert.match(preview.body, /Praxisurlaub/);
      assert.match(preview.body, /Praxis Beispiel A \(Test\)/);
      const pub = await http("/heute");
      assert.equal(pub.status, 200);
      assert.doesNotMatch(pub.body, /Praxis Beispiel A/, "public website stays static");
      const editPage = await http(`/intern/urlaub/${id}`, { cookie });
      assert.match(editPage.body, /Urlaub bearbeiten/);
      assert.match(editPage.body, new RegExp(`name="z1_von"[^>]*value="${d(3)}"`));
    });

    test("undo preview shows the facts, then the undo retires the record", async () => {
      const page = await http(`/intern/verlauf/${changeSetId}/zuruecknehmen`, { cookie });
      assert.match(page.body, /Was sich ändert/);
      assert.match(page.body, /Schließung/);
      const fingerprint = page.body.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1] ?? "";
      const res = await fetch(`${BASE}/intern/verlauf/ruecknahme`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie ?? "", Origin: BASE! }, body: new URLSearchParams({ vorgang: changeSetId, fingerprint }) });
      assert.equal(res.status, 303);
      assert.equal((await record(id)).recordState, "RETIRED");
      assert.deepEqual((await active()).closures, []);
      const home = await http("/intern", { cookie });
      assert.match(home.body, /Urlaub [^<]* zurückgenommen/);
      assert.ok(!home.body.includes(`href="/intern/urlaub/${id}"`), "no controls for a RETIRED record");
      const gone = await http(`/intern/urlaub/${id}`, { cookie });
      assert.match(gone.body, /kann hier nicht bearbeitet werden/);
    });
  });
});

