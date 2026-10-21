// Step 18 of the clean-database proof (Phase 09.5G): Vertretungspraxen.
// ADMIN creates / corrects structural data (always unverified afterwards) → DOCTOR confirms exactly
// the stored data → usable in Urlaub; expiry, invalidation by edit, withdrawal, stale confirmation,
// REST bypass attempts, rollback on a failing audit write, no quick undo. ARTIFICIAL data only
// ("Praxis Beispiel …", example.invalid) — the project has no real replacement directory (F53).

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { addDays } from "../../domain/time.ts";
import { docsFromPulsData, replacementPracticeFromDoc } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { latestChange, planFor } from "../../cockpit/history.ts";
import { commitReplacement, commitVerification, saveReplacement, verifyReplacement } from "../../cockpit/workflows/publish.ts";
import { REPLACEMENT_STALE, replacementFingerprint } from "../../cockpit/workflows/replacement.ts";
import { directoryOptions } from "../../cockpit/workflows/planned.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}`, INACTIVE: `Inaktiv-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR" | "INACTIVE", Staff>;
const cookies = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", string | undefined>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const today = berlinNow(new Date()).date;
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-01-01", reviewDue: "2099-01-01", verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] };
const FAKE = { status: "VERIFIED_CURRENT", lastVerified: "2030-01-01", reviewDue: "2099-01-01", verifiedBy: "Dr. Erfunden", sourceIds: [{ sourceId: "FAKE" }] };
const rule = (d: number): OpeningHoursRule => ({ id: `r${d}`, weekday: d as 1, start: "08:00", end: "12:00", consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].map(rule), confirmedClosedWeekdays: [], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [
    // once confirmed, review expired yesterday (grace 0)
    { id: "vertretung-abgelaufen", practiceName: "Praxis Beispiel Abgelaufen (Test)", contactPersons: [], street: "Teststraße 3", postalCode: "00000", city: "Testort", phone: "0000 333", verification: { ...V, lastVerified: addDays(today, -183), reviewDue: addDays(today, -1) } },
  ],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const NEW = { name: "Praxis Beispiel A (Test)", strasse: "Teststraße 1", plz: "00000", ort: "Testort", telefon: "0000 111", email: "praxis-a@example.invalid", webseite: "https://example.invalid", hinweis: "" };

const repo = () => new PayloadPracticeRepository(reader);
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const post = (path: string, c: string | undefined, fields: Record<string, string>, origin: string | null = BASE ?? null) =>
  fetch(`${BASE}${path}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(c ? { Cookie: c } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
type Doc = { id: number; recordId: string; practiceName: string; phone: string; verification: { status: string; verifiedBy: string | null; lastVerified: string | null; reviewDue: string | null; sourceIds: { sourceId: string }[] } };
const row = async (recordId: string) => doc<Doc | undefined>((await payload.find({ collection: "replacementPractices", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
const events = async (where: Record<string, unknown>) => (await payload.find({ collection: "auditEvents", where: where as never, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const usable = async (id: string) => directoryOptions(await repo().getPulsData(), today).find((o) => o.id === id)?.usable ?? false;
const fp = async (id: string) => replacementFingerprint(replacementPracticeFromDoc((await row(id))! as never));

describe("Vertretungspraxen (09.5G)", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
    await payload.db.migrateFresh({ forceAcceptWarning: true });
    await createFirstAdmin(payload, { email: EMAIL("ADMIN"), name: "Test Verwaltung (künstlich)", password: PW.ADMIN });
    users.ADMIN = { ...doc<Staff>((await payload.find({ collection: "staff", overrideAccess: true })).docs[0]), collection: "staff" };
    for (const [k, role, active] of [["STAFF", "STAFF", true], ["DOCTOR", "DOCTOR", true], ["INACTIVE", "DOCTOR", false]] as const) {
      users[k] = { ...doc<Staff>(await payload.create({ collection: "staff", data: { email: EMAIL(k), password: PW[k], name: `Test ${k} (künstlich)`, role, active }, user: users.ADMIN, overrideAccess: false })), collection: "staff" };
    }
    const docs = docsFromPulsData(DATA);
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, ...seed });
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
    for (const p of docs.replacementPractices) await payload.create({ collection: "replacementPractices", data: p, ...seed });
    if (BASE) for (const k of ["ADMIN", "STAFF", "DOCTOR"] as const) cookies[k] = (await restLogin(EMAIL(k), PW[k])).cookie;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("REST bypass (generic API)", { skip: skipHttp }, () => {
    const body = { recordId: "rest-a", practiceName: "Praxis Beispiel REST (Test)", street: "Teststraße 5", postalCode: "00000", city: "Testort", phone: "0000 555", verification: FAKE, status: "VERIFIED_CURRENT", praxisReplacementVerify: "VERIFY", context: { praxisReplacementVerify: "VERIFY" }, role: "DOCTOR" };
    test("STAFF and DOCTOR cannot create; ADMIN creates, but TO_BE_CONFIRMED (fake provenance ignored)", async () => {
      assert.equal((await http("/api/replacementPractices", { method: "POST", cookie: cookies.STAFF, body })).status, 403);
      assert.equal((await http("/api/replacementPractices", { method: "POST", cookie: cookies.DOCTOR, body })).status, 403);
      const a = await http("/api/replacementPractices", { method: "POST", cookie: cookies.ADMIN, body });
      assert.equal(a.status, 201, a.body);
      const v = doc<{ doc: Doc }>(a.json).doc.verification;
      assert.deepEqual([v.status, v.verifiedBy ?? null, v.lastVerified ?? null], ["TO_BE_CONFIRMED", null, null]);
      assert.equal((await http("/api/replacementPractices", { method: "POST", cookie: cookies.ADMIN, body: { ...body, recordId: "rest-b", phone: "abc" } })).status, 400, "server validation");
    });
    test("updates: STAFF / DOCTOR refused (also with a claimed verification context); ADMIN → TO_BE_CONFIRMED; nobody deletes", async () => {
      const r = (await row("rest-a"))!;
      assert.equal((await http(`/api/replacementPractices/${r.id}`, { method: "PATCH", cookie: cookies.STAFF, body: { phone: "0000 666" } })).status, 403);
      for (const b of [{ phone: "0000 666" }, { phone: "0000 666", verification: FAKE, praxisReplacementVerify: "VERIFY" }, { praxisReplacementVerify: "VERIFY", context: { praxisReplacementVerify: "VERIFY" } }]) {
        assert.equal((await http(`/api/replacementPractices/${r.id}`, { method: "PATCH", cookie: cookies.DOCTOR, body: b })).status, 403, JSON.stringify(b));
      }
      const u = await http(`/api/replacementPractices/${r.id}`, { method: "PATCH", cookie: cookies.ADMIN, body: { phone: "0000 777", verification: FAKE } });
      assert.equal(u.status, 200, u.body);
      assert.equal(doc<{ doc: Doc }>(u.json).doc.verification.status, "TO_BE_CONFIRMED");
      assert.equal((await http(`/api/replacementPractices/${r.id}`, { method: "DELETE", cookie: cookies.ADMIN })).status, 403);
      assert.equal((await row("rest-a"))!.phone, "0000 777");
    });
  });

  describe("HTTP: ADMIN creates → DOCTOR confirms → usable", { skip: skipHttp }, () => {
    let id = "";
    test("routes: signed out → login; STAFF sees the list without create; ADMIN gets 'Neue Vertretungspraxis'", async () => {
      assert.equal(new URL((await http("/intern/vertretungen")).location!, BASE).pathname, "/intern/anmelden");
      const staff = (await http("/intern/vertretungen", { cookie: cookies.STAFF })).body;
      assert.ok(staff.includes("Vertretungspraxen") && staff.includes("Diese Praxen können bei Urlaub oder Schließzeiten als Vertretung ausgewählt werden."));
      assert.ok(!staff.includes('href="/intern/vertretungen/neu"') && staff.includes("Bestätigung abgelaufen"));
      assert.ok((await http("/intern/vertretungen/neu", { cookie: cookies.STAFF })).body.includes("Vertretungspraxen legt die Verwaltung an."));
      assert.ok((await http("/intern/vertretungen", { cookie: cookies.ADMIN })).body.includes('href="/intern/vertretungen/neu"'));
    });
    test("ADMIN: preview → save → TO_BE_CONFIRMED, not selectable; audit CREATE", async () => {
      const preview = (await http(`/intern/vertretungen/neu?${new URLSearchParams({ ...NEW, vorschau: "1" })}`, { cookie: cookies.ADMIN })).body;
      assert.ok(preview.includes("Neue Vertretungspraxis prüfen") && preview.includes("Vor der Verwendung muss die Vertretungspraxis ärztlich bestätigt werden."));
      const res = await post("/intern/vertretungen/speichern", cookies.ADMIN, { ...NEW, recordId: "evil", verifiedBy: "Dr. Erfunden", status: "VERIFIED_CURRENT" });
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.searchParams.get("art"), "neu");
      id = loc.searchParams.get("eintrag")!;
      assert.equal(id, "vertretung-praxis-beispiel-a-test");
      assert.equal((await row(id))!.verification.status, "TO_BE_CONFIRMED");
      assert.equal(await usable(id), false);
      const conf = (await http(`${loc.pathname}${loc.search}`, { cookie: cookies.ADMIN })).body;
      assert.ok(conf.includes("Vertretungspraxis angelegt.") && conf.includes("Vor der Verwendung muss sie noch ärztlich bestätigt werden."));
      assert.doesNotMatch(conf, /freigegeben|auf der Website verfügbar/);
      assert.deepEqual((await events({ entityId: { equals: id } })).map((e) => [e.operation, e.actorRole]), [["CREATE", "ADMIN"]]);
      assert.ok(!(await http(`/intern/vertretungen/${id}`, { cookie: cookies.ADMIN })).body.includes(">Vertretung bestätigen<"), "ADMIN never gets the confirmation");
    });
    test("STAFF / ADMIN cannot confirm (POST)", async () => {
      const f = await fp(id);
      for (const k of ["STAFF", "ADMIN"] as const) assert.equal((await post("/intern/vertretungen/bestaetigen", cookies[k], { eintrag: id, fingerprint: f, bestaetigt: "1" })).status, 403, k);
      assert.equal((await row(id))!.verification.status, "TO_BE_CONFIRMED");
    });
    test("DOCTOR: stored data read-only, explicit checkbox, confirmation → VERIFIED_CURRENT ~6 months; browser data ignored", async () => {
      const page = (await http(`/intern/vertretungen/${id}`, { cookie: cookies.DOCTOR })).body;
      for (const t of ["Vertretung bestätigen", "Bitte prüfen Sie die Angaben und bestätigen Sie die Vertretungspraxis, nachdem die Vertretung telefonisch abgestimmt wurde.", "Ich habe die Vertretung mit der Praxis abgestimmt und die angezeigten Kontaktdaten geprüft.", 'href="tel:0000111"']) assert.ok(page.includes(t), t);
      assert.ok(!page.includes('name="telefon"'), "no structural field for the physician");
      const f = fingerprintIn(page)!;
      assert.match((await post("/intern/vertretungen/bestaetigen", cookies.DOCTOR, { eintrag: id, fingerprint: f })).headers.get("location")!, /status=blockiert/, "checkbox required");
      const res = await post("/intern/vertretungen/bestaetigen", cookies.DOCTOR, { eintrag: id, fingerprint: f, bestaetigt: "1", telefon: "0000 999", phone: "0000 999", status: "OUTDATED_DO_NOT_PUBLISH", verifiedBy: "Dr. Erfunden", reviewDue: "2099-01-01", changeSetId: "11111111-1111-4111-8111-111111111111", praxisReplacementVerify: "WITHDRAW" });
      assert.equal(res.status, 303);
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "bestaetigt");
      const r = (await row(id))!;
      assert.equal(r.phone, "0000 111", "structural data unchanged");
      assert.deepEqual([r.verification.status, r.verification.verifiedBy, r.verification.lastVerified, r.verification.reviewDue, r.verification.sourceIds.map((s) => s.sourceId)], ["VERIFIED_CURRENT", "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)", today, addDays(today, 182), ["PRACTICE_COCKPIT"]]);
      const evs = await events({ entityId: { equals: id } });
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "VERIFY"]);
      assert.notEqual(evs[1].changeSetId, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(evs), []);
      assert.equal(await usable(id), true, "selectable in Urlaub");
      assert.ok((await http("/intern/urlaub", { cookie: cookies.STAFF })).body.includes("Praxis Beispiel A (Test)"));
    });
    test("ADMIN edits the phone → preview warns, TO_BE_CONFIRMED, not selectable; DOCTOR re-confirms → usable", async () => {
      const q = new URLSearchParams({ ...NEW, telefon: "0000 222", vorschau: "1" });
      const page = (await http(`/intern/vertretungen/${id}?${q}`, { cookie: cookies.ADMIN })).body;
      assert.ok(page.includes("Nach dieser Änderung muss die Vertretungspraxis erneut ärztlich bestätigt werden.") && page.includes(">geändert<"));
      const res = await post("/intern/vertretungen/speichern", cookies.ADMIN, { ...NEW, telefon: "0000 222", eintrag: id, fingerprint: fingerprintIn(page)! });
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "geaendert");
      const r = (await row(id))!;
      assert.deepEqual([r.phone, r.verification.status], ["0000 222", "TO_BE_CONFIRMED"]);
      assert.equal(await usable(id), false);
      assert.deepEqual((await events({ entityId: { equals: id } })).map((e) => e.operation), ["CREATE", "VERIFY", "UPDATE"]);
      const v = await verifyReplacement(payload, users.DOCTOR as never, id, await fp(id), true);
      assert.ok(v.ok);
      assert.equal(await usable(id), true);
    });
  });

  describe("Local API: expiry, concurrency, withdrawal, rollback, no quick undo, accounts", () => {
    test("expired confirmation: not selectable, Prüfen item; physician re-confirmation → fresh period, item gone", async () => {
      assert.equal(await usable("vertretung-abgelaufen"), false);
      if (BASE) {
        const home = (await http("/intern", { cookie: cookies.DOCTOR })).body;
        assert.ok(home.includes("Vertretungspraxis erneut bestätigen") && home.includes('href="/intern/vertretungen/vertretung-abgelaufen"'));
        const detail = (await http("/intern/vertretungen/vertretung-abgelaufen", { cookie: cookies.DOCTOR })).body;
        assert.ok(detail.includes("Vertretung erneut bestätigen") && detail.includes("Bestätigung abgelaufen"));
      }
      const r = await verifyReplacement(payload, users.DOCTOR as never, "vertretung-abgelaufen", await fp("vertretung-abgelaufen"), true);
      assert.ok(r.ok);
      assert.equal((await row("vertretung-abgelaufen"))!.verification.reviewDue, addDays(today, 182));
      assert.equal(await usable("vertretung-abgelaufen"), true);
      if (BASE) assert.ok(!(await http("/intern", { cookie: cookies.DOCTOR })).body.includes("Vertretungspraxis erneut bestätigen"));
    });

    test("stale: the physician saw data that ADMIN changed meanwhile → refused, nothing verified; stale ADMIN edit refused", async () => {
      const id = "vertretung-abgelaufen";
      const seen = await fp(id);
      const s = await saveReplacement(payload, users.ADMIN as never, { practiceName: "Praxis Beispiel Abgelaufen (Test)", street: "Teststraße 3", postalCode: "00000", city: "Testort", phone: "0000 334" }, { recordId: id, fingerprint: seen });
      assert.ok(s.ok, s.ok ? "" : s.message);
      const v = await verifyReplacement(payload, users.DOCTOR as never, id, seen, true);
      assert.ok(!v.ok && v.code === "STALE" && v.message === REPLACEMENT_STALE);
      assert.equal((await row(id))!.verification.status, "TO_BE_CONFIRMED");
      const e = await saveReplacement(payload, users.ADMIN as never, { practiceName: "X", street: "Y", postalCode: "00000", city: "Z", phone: "0000" }, { recordId: id, fingerprint: seen });
      assert.ok(!e.ok && e.code === "STALE");
    });

    test("withdraw: DOCTOR only, immediately unusable (OUTDATED), audit END; ADMIN correction → unverified again", async () => {
      const id = "vertretung-abgelaufen";
      await verifyReplacement(payload, users.DOCTOR as never, id, await fp(id), true);
      assert.ok(!(await verifyReplacement(payload, users.ADMIN as never, id, await fp(id), true, "WITHDRAW")).ok);
      const w = await verifyReplacement(payload, users.DOCTOR as never, id, await fp(id), true, "WITHDRAW");
      assert.ok(w.ok);
      assert.equal((await row(id))!.verification.status, "OUTDATED_DO_NOT_PUBLISH");
      assert.equal(await usable(id), false);
      assert.equal((await events({ entityId: { equals: id } })).at(-1)!.operation, "END");
      const s = await saveReplacement(payload, users.ADMIN as never, { practiceName: "Praxis Beispiel Abgelaufen (Test)", street: "Teststraße 3", postalCode: "00000", city: "Testort", phone: "0000 335" }, { recordId: id, fingerprint: await fp(id) });
      assert.ok(s.ok);
      assert.equal((await row(id))!.verification.status, "TO_BE_CONFIRMED");
    });

    test("rollback: a failing audit write undoes the verification / the structural write completely", async () => {
      const id = "vertretung-abgelaufen";
      const before = (await row(id))!;
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      // Fault injection: the audit write itself fails (temporary hook on auditEvents, removed below).
      const auditHooks = payload.collections.auditEvents.config.hooks.beforeChange;
      const failAudit = () => {
        throw new Error("Audit-Fehler (simuliert)");
      };
      for (const [k, run] of [
        ["DOCTOR", (req: never) => commitVerification(payload, req, before.id, "VERIFY")],
        ["ADMIN", (req: never) => commitReplacement(payload, req, { practiceName: "Praxis Beispiel Abgelaufen (Test)", street: "Teststraße 3", postalCode: "00000", city: "Testort", phone: "0000 999" }, { id: before.id })],
      ] as const) {
        const req = await createLocalReq({ user: users[k] as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
        await initTransaction(req);
        auditHooks.push(failAudit);
        try {
          await assert.rejects(run(req as never), /Audit-Fehler/);
        } finally {
          auditHooks.splice(auditHooks.indexOf(failAudit), 1);
        }
        await killTransaction(req);
        const after = (await row(id))!;
        assert.deepEqual([after.phone, after.verification], [before.phone, before.verification], `${k}: rolled back`);
      }
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no orphan audit");
    });

    test("no quick undo: directory change sets are not undoable and never the cockpit's 'Letzte Änderung'", async () => {
      const verify = (await events({ and: [{ entityType: { equals: "replacementPractices" } }, { operation: { equals: "VERIFY" } }] }))[0];
      const plan = await planFor(reader, String(verify.changeSetId), await repo().getPulsData(), new Date(), "DOCTOR");
      assert.equal(plan.ok, false);
      const last = await latestChange(reader, await repo().getPulsData(), new Date(), "DOCTOR");
      assert.ok(!last || !last.group.events.some((e) => (e.entityType as string) === "replacementPractices"));
    });

    test("accounts: signed out and inactive cannot write; inactive cannot sign in", async () => {
      for (const u of [null, users.INACTIVE]) {
        assert.equal((await verifyReplacement(payload, u as never, "vertretung-abgelaufen", "x", true)).ok, false);
        const s = await saveReplacement(payload, u as never, { practiceName: "X", street: "Y", postalCode: "00000", city: "Z", phone: "0000" });
        assert.ok(!s.ok && s.code === "UNAUTHENTICATED");
      }
      if (BASE) assert.equal((await restLogin(EMAIL("INACTIVE"), PW.INACTIVE)).cookie, undefined);
    });

    test("public website stays static: no database practice data", { skip: skipHttp }, async () => {
      for (const path of ["/", "/heute", "/heute/sprechzeiten", "/notfall", "/praxis/kontakt"]) {
        const body = (await http(path)).body;
        assert.equal((await http(path)).status, 200);
        assert.ok(!body.includes("Praxis Beispiel") && !body.includes("example.invalid"), path);
      }
    });
  });
});
