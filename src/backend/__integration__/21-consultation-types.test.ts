// Step 21 of the clean-database proof (Phase 09.5J): Sprechstundenarten.
// NON-ACUTE consultation types only through the physician workflow (trusted CONSULTATION_TYPE context);
// ACUTE only through the 09.5E acute baseline; generic REST / Local API writes closed for every role;
// create / confirm / change / reconfirm with generated provenance + audit; stale, rollback, no quick undo;
// weekly-plan relation; static public site. ARTIFICIAL wording only — F42 stays TO_BE_CONFIRMED.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { addDays } from "../../domain/time.ts";
import { docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { planFor } from "../../cockpit/history.ts";
import { commitConsultationType, confirmConsultationType, publishAcuteBaseline } from "../../cockpit/workflows/publish.ts";
import { datasetFingerprint } from "../../cockpit/workflows/snapshot.ts";
import { READ_ONLY_TEXT, TYPE_STALE, typeDraft, typeFingerprint } from "../../cockpit/workflows/consultation-type.ts";
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
const DOCTOR_BY = "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)";
const today = berlinNow(new Date()).date;

const r = (id: string, d: number, start: string, end: string, consultationType: OpeningHoursRule["consultationType"] = "GENERAL"): OpeningHoursRule => ({ id, weekday: d as 1, start, end, consultationType, verification: V });
// ARTIFICIAL week: Mo 08–12 general; Di–Fr 08–10 healthy-only + 10–12 general; Do 14–16 appointment
// (APPOINTMENT is referenced but its type is MISSING on purpose).
const DATA: PulsData = {
  schedule: { rules: [r("mo", 1, "08:00", "12:00"), ...[2, 3, 4, 5].flatMap((d) => [r(`h${d}`, d, "08:00", "10:00", "HEALTHY_ONLY"), r(`g${d}`, d, "10:00", "12:00")]), r("do-t", 4, "14:00", "16:00", "APPOINTMENT")], confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde (Test)", verification: V },
    { code: "HEALTHY_ONLY", label: "Nur gesunde Kinder (Test)", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

type TypeDoc = { id: number; code: string; label: string; explanation?: string | null; verification: { status: string; verifiedBy?: string; reviewDue?: string; lastVerified?: string } };
const typeDoc = async (code: string) => (await payload.find({ collection: "consultationTypes", where: { code: { equals: code } }, depth: 0, overrideAccess: true })).docs.map((d) => doc<TypeDoc>(d))[0];
const allTypes = async () => JSON.stringify((await payload.find({ collection: "consultationTypes", sort: "code", depth: 0, pagination: false, overrideAccess: true })).docs);
const scheduleJson = async () => JSON.stringify((await payload.find({ collection: "weeklySchedules", depth: 0, pagination: false, overrideAccess: true })).docs);
const events = async () => (await payload.find({ collection: "auditEvents", where: { entityType: { equals: "consultationTypes" } }, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const repoData = () => new PayloadPracticeRepository(reader).getPulsData();
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const post = (c: string | undefined, fields: Record<string, string>) =>
  fetch(`${BASE}/intern/sprechstundenarten/bestaetigen`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(c ? { Cookie: c } : {}), Origin: BASE! }, body: new URLSearchParams(fields) });
const previewPath = (slug: string, label: string, explanation = "") => `/intern/sprechstundenarten/${slug}?${new URLSearchParams({ bezeichnung: label, erklaerung: explanation, vorschau: "1" })}`;
async function confirmViaHttp(slug: string, label: string, explanation = "", extra: Record<string, string> = {}) {
  const page = strip((await http(previewPath(slug, label, explanation), { cookie: cookies.DOCTOR })).body);
  const fp = fingerprintIn(page);
  assert.ok(fp, page.slice(0, 1500));
  return post(cookies.DOCTOR, { art: slug, bezeichnung: label, erklaerung: explanation, fingerprint: fp!, bestaetigt: "1", ...extra });
}
/** A Local API write in a transaction that is always rolled back (security probes leave no trace). */
async function probe(user: Staff, context: Record<string, unknown>, code: string | null, data: Record<string, unknown>) {
  const req = await createLocalReq({ user: user as never, context }, payload);
  await initTransaction(req);
  try {
    const existing = code ? await typeDoc(code) : undefined;
    return existing
      ? await payload.update({ collection: "consultationTypes", id: existing.id, data: data as never, user: user as never, overrideAccess: false, depth: 0, req, context })
      : await payload.create({ collection: "consultationTypes", data: data as never, user: user as never, overrideAccess: false, depth: 0, req, context });
  } finally {
    await killTransaction(req);
  }
}
const weeklyOption = async (code: string) => strip((await http("/intern/sprechzeiten?bearbeiten=1", { cookie: cookies.DOCTOR })).body).match(new RegExp(`<option value="${code}"( disabled="")?>`))?.[1] === undefined;

describe("Sprechstundenarten (09.5J)", { skip: skipDb }, () => {
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
    await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
    if (BASE) for (const k of ["ADMIN", "STAFF", "DOCTOR"] as const) cookies[k] = (await restLogin(EMAIL(k), PW[k])).cookie;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("security: generic writes closed, contexts separated", () => {
    test("REST: every role may read; nobody may create or update a consultation type (context fields in the body are ignored)", { skip: skipHttp }, async () => {
      const general = await typeDoc("GENERAL");
      const body = { code: "OTHER", label: "Erfunden (Test)", verification: FAKE, praxisConsultationTypeWrite: true, context: { praxisConsultationTypeWrite: true } };
      for (const k of ["STAFF", "ADMIN", "DOCTOR"] as const) {
        assert.equal((await http("/api/consultationTypes", { cookie: cookies[k] })).status, 200, `${k} read`);
        assert.equal((await http("/api/consultationTypes", { method: "POST", cookie: cookies[k], body })).status, 403, `${k} create`);
        assert.equal((await http(`/api/consultationTypes/${general.id}`, { method: "PATCH", cookie: cookies[k], body: { label: "Geändert (Test)", verification: FAKE, praxisConsultationTypeWrite: true } })).status, 403, `${k} update`);
      }
      assert.deepEqual([(await typeDoc("GENERAL")).label, await typeDoc("OTHER")], ["Sprechstunde (Test)", undefined]);
    });

    test("Local API: generic DOCTOR refused; ADMIN never; ACUTE never through the regular context; regular types never through the acute context; code immutable", async () => {
      const REG = { [SERVER_CONTEXT.CONSULTATION_TYPE]: true };
      const AC = { [SERVER_CONTEXT.ACUTE_BASELINE]: true };
      await assert.rejects(probe(users.DOCTOR, {}, "GENERAL", { label: "x" }), "generic DOCTOR");
      await assert.rejects(probe(users.ADMIN, REG, "GENERAL", { label: "x" }), "ADMIN with context");
      await assert.rejects(probe(users.DOCTOR, { ...REG, ...AC }, "GENERAL", { label: "x" }), "both contexts");
      await assert.rejects(probe(users.DOCTOR, REG, null, { code: "ACUTE", label: "Akut (Test)", verification: FAKE }), /separat verwaltet/);
      await assert.rejects(probe(users.DOCTOR, AC, "GENERAL", { label: "x" }), /nur die Akutsprechstunde/);
      await assert.rejects(probe(users.DOCTOR, REG, "GENERAL", { code: "OTHER", label: "x" }), /kann nicht geändert werden/);
      const forged = doc<TypeDoc>(await probe(users.DOCTOR, REG, "GENERAL", { label: "  Sprechstunde (Test)  ", verification: FAKE }));
      assert.deepEqual([forged.label, forged.verification.verifiedBy], ["Sprechstunde (Test)", DOCTOR_BY], "trimmed; provenance from the session");
      assert.equal((await typeDoc("GENERAL")).verification.verifiedBy, "Seed (künstlich)", "probe rolled back");
    });

    test("workflow authority: signed out / inactive / STAFF / ADMIN refused before any write; ACUTE refused in the regular workflow", async () => {
      const d = await repoData();
      for (const [u, code] of [[null, "UNAUTHENTICATED"], [users.INACTIVE, "UNAUTHENTICATED"], [users.STAFF, "NOT_ALLOWED"], [users.ADMIN, "NOT_ALLOWED"]] as const) {
        const res = await confirmConsultationType(payload, u as never, "HEALTHY_ONLY", { label: "Nur gesunde Kinder (Test)" }, typeFingerprint(d, "HEALTHY_ONLY"), true);
        assert.ok(!res.ok && res.code === code, String(code));
      }
      const acute = await confirmConsultationType(payload, users.DOCTOR as never, "ACUTE", { label: "Akut (Test)" }, typeFingerprint(d, "ACUTE"), true);
      assert.ok(!acute.ok && acute.code === "BLOCKED" && /separat verwaltet/.test(acute.message));
      assert.equal((await typeDoc("HEALTHY_ONLY")).verification.status, "TO_BE_CONFIRMED");
    });
  });

  describe("HTTP: read-only roles; DOCTOR confirms, changes, creates", { skip: skipHttp }, () => {
    test("overview for every role: wording, code as secondary info, status in words, usage, missing type; STAFF / ADMIN read only", async () => {
      for (const k of ["STAFF", "ADMIN", "DOCTOR"] as const) {
        const page = strip((await http("/intern/sprechstundenarten", { cookie: cookies[k] })).body);
        for (const t of ["Sprechstundenarten", "Diese Bezeichnungen werden im Wochenplan und bei Sonderöffnungszeiten verwendet.", "Nur gesunde Kinder (Test)", "Interner Code: HEALTHY_ONLY", "Noch nicht ärztlich bestätigt", "Im Wochenplan: Di, Mi, Do, Fr 08:00–10:00 Uhr", "APPOINTMENT fehlt"]) assert.ok(page.includes(t), `${k}: ${t}`);
        if (k !== "DOCTOR") {
          assert.ok(page.includes(READ_ONLY_TEXT), k);
          const detail = strip((await http(previewPath("gesunde-kinder", "Erfunden"), { cookie: cookies[k] })).body);
          assert.ok(!detail.includes('name="bezeichnung"') && !detail.includes('action="/intern/sprechstundenarten/bestaetigen"'), `${k} no editor`);
          assert.equal((await post(cookies[k], { art: "gesunde-kinder", bezeichnung: "x", fingerprint: "0".repeat(64), bestaetigt: "1" })).status, 403, k);
        }
      }
      const home = strip((await http("/intern", { cookie: cookies.STAFF })).body);
      for (const t of ["Sprechstundenart bestätigen", "Sprechstundenart fehlt", 'href="/intern/sprechstundenarten/termin"', 'href="/intern/sprechstundenarten"']) assert.ok(home.includes(t), t);
      assert.match((await http("/intern/sprechstundenarten")).location ?? "", /\/intern\/anmelden/);
    });

    test("DOCTOR confirms the unconfirmed HEALTHY_ONLY unchanged: generated provenance, audit VERIFY; the weekly editor offers it afterwards", async () => {
      assert.equal(await weeklyOption("HEALTHY_ONLY"), false, "not selectable before");
      const scheduleBefore = await scheduleJson();
      const preview = strip((await http(previewPath("gesunde-kinder", "Nur gesunde Kinder (Test)"), { cookie: cookies.DOCTOR })).body);
      for (const t of ["Ich bestätige diese Bezeichnung und Erklärung für die Praxis.", "Sprechstundenart ärztlich bestätigen", "Auf der Website würde künftig stehen:", "Betroffene regelmäßige Zeiten: Di, Mi, Do, Fr 08:00–10:00 Uhr", "nicht die Sprechzeiten"]) assert.ok(preview.includes(t), t);
      const res = await confirmViaHttp("gesunde-kinder", "Nur gesunde Kinder (Test)", "", { verifiedBy: "Dr. Erfunden", reviewDue: "2099-01-01", status: "VERIFIED_CURRENT", code: "ACUTE", changeSetId: "11111111-1111-4111-8111-111111111111", praxisConsultationTypeWrite: "true", rolle: "ADMIN" });
      assert.equal(res.status, 303);
      assert.deepEqual(Object.fromEntries(new URL(res.headers.get("location")!).searchParams), { art: "gesunde-kinder", vorgang: "erst" });
      const t = await typeDoc("HEALTHY_ONLY");
      assert.deepEqual([t.code, t.label, t.verification.status, t.verification.verifiedBy, t.verification.reviewDue], ["HEALTHY_ONLY", "Nur gesunde Kinder (Test)", "VERIFIED_CURRENT", DOCTOR_BY, addDays(today, 182)]);
      const ev = (await events()).at(-1)!;
      assert.deepEqual([ev.operation, ev.actorRole], ["VERIFY", "DOCTOR"]);
      assert.notEqual(ev.changeSetId, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(await events()), []);
      assert.equal(await scheduleJson(), scheduleBefore, "the type workflow never touches the weekly schedule");
      assert.equal(await weeklyOption("HEALTHY_ONLY"), true, "selectable after confirmation");
      assert.ok(strip((await http("/intern/sprechstundenarten/bestaetigt?art=gesunde-kinder&vorgang=erst", { cookie: cookies.DOCTOR })).body).includes("Die öffentliche Website verwendet weiterhin die bisherigen Daten."));
    });

    test("unchanged CURRENT type → 'Es wurde nichts geändert.'; changing the label → preview marks it, audit UPDATE, same code, fresh provenance", async () => {
      const none = strip((await http(previewPath("gesunde-kinder", "Nur gesunde Kinder (Test)"), { cookie: cookies.DOCTOR })).body);
      assert.ok(none.includes("Es wurde nichts geändert.") && !none.includes('action="/intern/sprechstundenarten/bestaetigen"'));
      const preview = strip((await http(previewPath("gesunde-kinder", "Bitte nur gesunde Kinder (Test)", "Künstliche Erklärung für den Test."), { cookie: cookies.DOCTOR })).body);
      assert.ok(preview.includes("geändert") && preview.includes("Bitte nur gesunde Kinder (Test)") && preview.includes("Nach der Änderung"));
      const res = await confirmViaHttp("gesunde-kinder", "Bitte nur gesunde Kinder (Test)", "Künstliche Erklärung für den Test.");
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("vorgang"), "geaendert");
      const t = await typeDoc("HEALTHY_ONLY");
      assert.deepEqual([t.code, t.label, t.explanation, t.verification.verifiedBy], ["HEALTHY_ONLY", "Bitte nur gesunde Kinder (Test)", "Künstliche Erklärung für den Test.", DOCTOR_BY]);
      assert.equal((await events()).at(-1)!.operation, "UPDATE");
    });

    test("the missing APPOINTMENT is created with the physician's wording (no prefill), confirmed at once; its Prüfen item disappears", async () => {
      const page = strip((await http("/intern/sprechstundenarten/termin", { cookie: cookies.DOCTOR })).body);
      assert.ok(page.includes("Sprechstundenart APPOINTMENT anlegen") && /name="bezeichnung"[^>]*value=""/.test(page), "label not prefilled");
      const res = await confirmViaHttp("termin", "Terminsprechstunde (Test)");
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("vorgang"), "erst");
      const t = await typeDoc("APPOINTMENT");
      assert.deepEqual([t.label, t.verification.status], ["Terminsprechstunde (Test)", "VERIFIED_CURRENT"]);
      assert.equal((await events()).at(-1)!.operation, "VERIFY");
      assert.ok(!strip((await http("/intern", { cookie: cookies.STAFF })).body).includes("Sprechstundenart fehlt"));
    });

    test("expired confirmation: not selectable, one Prüfen item; reconfirmed unchanged (VERIFY) → selectable again", async () => {
      const t = await typeDoc("HEALTHY_ONLY");
      await payload.update({ collection: "consultationTypes", id: t.id, data: { verification: { ...t.verification, lastVerified: "2025-10-01", reviewDue: "2026-04-01" } } as never, ...seed });
      assert.equal(await weeklyOption("HEALTHY_ONLY"), false);
      const home = strip((await http("/intern", { cookie: cookies.STAFF })).body);
      assert.equal(home.split("Die ärztliche Bestätigung ist abgelaufen; die Bezeichnung gilt derzeit nicht als bestätigt.").length - 1, 1);
      const detail = strip((await http("/intern/sprechstundenarten/gesunde-kinder", { cookie: cookies.DOCTOR })).body);
      assert.ok(detail.includes("Bestätigung abgelaufen") && detail.includes("Unveränderte Angaben erneut bestätigen"));
      const res = await confirmViaHttp("gesunde-kinder", t.label, t.explanation ?? "");
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("vorgang"), "erneut");
      assert.equal((await events()).at(-1)!.operation, "VERIFY");
      assert.equal((await typeDoc("HEALTHY_ONLY")).verification.reviewDue, addDays(today, 182));
      assert.equal(await weeklyOption("HEALTHY_ONLY"), true);
    });

    test("stale: a change between preview and confirmation is refused; a create raced by another writer too", async () => {
      const page = strip((await http(previewPath("sprechstunde", "Sprechstunde neu (Test)"), { cookie: cookies.DOCTOR })).body);
      const g = await typeDoc("GENERAL");
      await payload.update({ collection: "consultationTypes", id: g.id, data: { label: "Zwischendurch geändert (Test)" } as never, ...seed });
      const before = await allTypes();
      const doctorEvents = async () => (await events()).filter((e) => e.actorRole === "DOCTOR").length; // the seed "other writer" is audited as system:seed
      const auditBefore = await doctorEvents();
      const res = await post(cookies.DOCTOR, { art: "sprechstunde", bezeichnung: "Sprechstunde neu (Test)", erklaerung: "", fingerprint: fingerprintIn(page)!, bestaetigt: "1" });
      assert.match(res.headers.get("location")!, /status=veraltet/);
      assert.ok(strip((await http(res.headers.get("location")!.replace(/^https?:\/\/[^/]+/, ""), { cookie: cookies.DOCTOR })).body).includes(TYPE_STALE));
      const create = strip((await http(previewPath("sonstige", "Sonstiges (Test)"), { cookie: cookies.DOCTOR })).body);
      await payload.create({ collection: "consultationTypes", data: { code: "OTHER", label: "Von anderer Seite (Test)", verification: V } as never, ...seed });
      const raced = await post(cookies.DOCTOR, { art: "sonstige", bezeichnung: "Sonstiges (Test)", erklaerung: "", fingerprint: fingerprintIn(create)!, bestaetigt: "1" });
      assert.match(raced.headers.get("location")!, /status=veraltet/);
      assert.equal((await typeDoc("OTHER")).label, "Von anderer Seite (Test)");
      assert.equal(await doctorEvents(), auditBefore, "no audit for refused writes");
      assert.notEqual(await allTypes(), before, "only the seed create changed the collection");
    });
  });

  describe("rollback, no quick undo, ACUTE regression, public site", () => {
    test("rollback: a failing audit write undoes the type write completely", async () => {
      const before = await allTypes();
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const draft = typeDraft(await repoData(), "GENERAL", { label: "Rollback (Test)" }, today);
      assert.ok(draft.ok);
      const hooks = payload.collections.auditEvents.config.hooks.beforeChange;
      const fail = () => {
        throw new Error("Audit-Fehler (simuliert)");
      };
      const req = await createLocalReq({ user: users.DOCTOR as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      hooks.push(fail);
      try {
        await assert.rejects(commitConsultationType(payload, req, draft), /Audit-Fehler/);
      } finally {
        hooks.splice(hooks.indexOf(fail), 1);
      }
      await killTransaction(req);
      assert.equal(await allTypes(), before);
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no orphan audit");
    });

    test("no quick undo for consultation types", async () => {
      const ev = (await events()).filter((e) => e.actorRole === "DOCTOR").at(-1);
      if (!ev) return;
      assert.equal((await planFor(reader, String(ev.changeSetId), await repoData(), new Date(), "DOCTOR")).ok, false);
    });

    test("09.5E regression: the acute baseline still creates the ACUTE type (trusted acute context); generic REST to ACUTE refused", async () => {
      const res = await publishAcuteBaseline(payload, users.DOCTOR as never, { confirmed: true, rows: [{ weekday: "1", start: "10:00", end: "11:00" }] }, datasetFingerprint(await repoData()));
      assert.ok(res.ok, JSON.stringify(res));
      const a = await typeDoc("ACUTE");
      assert.deepEqual([a.label, a.verification.status, a.verification.verifiedBy], ["Akutsprechstunde", "VERIFIED_CURRENT", DOCTOR_BY]);
      if (BASE) assert.equal((await http(`/api/consultationTypes/${a.id}`, { method: "PATCH", cookie: cookies.DOCTOR, body: { label: "Akut geändert" } })).status, 403);
      if (BASE) {
        const page = strip((await http("/intern/sprechstundenarten", { cookie: cookies.DOCTOR })).body);
        assert.ok(page.includes("Die Akutsprechstunde wird separat verwaltet.") && page.includes("Akutsprechstunde verwalten"));
        assert.ok(strip((await http("/intern/sprechstundenarten/akut", { cookie: cookies.DOCTOR })).body).includes('href="/intern/akutsprechstunde"'));
      }
    });

    test("public website stays static: database type wording never leaks", { skip: skipHttp }, async () => {
      for (const path of ["/", "/heute", "/heute/sprechzeiten"]) {
        const res = await http(path);
        assert.equal(res.status, 200, path);
        assert.ok(!strip(res.body).includes("(Test)"), path);
      }
    });
  });
});
