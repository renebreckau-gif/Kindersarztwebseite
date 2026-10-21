// Step 20 of the clean-database proof (Phase 09.5I): Regelmäßige Sprechzeiten.
// DOCTOR confirms the COMPLETE regular week through the trusted path (NON-ACUTE rules + closed weekdays;
// ACUTE rules carried over unchanged with their own provenance); STAFF / ADMIN read only; no generic
// weekly-schedule write for anyone; stale / rollback / reconfirmation / no quick undo; 09.5E still
// works; public site static. ARTIFICIAL weekly plans only — F35–F43 are not touched.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, weekdayOf, zonedToInstant } from "../../domain/time.ts";
import { ACUTE_ON_CLOSED_DAY, ACUTE_OUTSIDE_HOURS } from "../../domain/weekly-plan.ts";
import { docsFromPulsData, type RuleDoc, type WeeklyScheduleDoc } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { planFor } from "../../cockpit/history.ts";
import { commitWeeklyPlan, confirmWeeklyPlan, publishAcuteBaseline } from "../../cockpit/workflows/publish.ts";
import { datasetFingerprint } from "../../cockpit/workflows/snapshot.ts";
import { PLAN_STALE, READ_ONLY_TEXT, inputFromSchedule, weeklyPlanDraft, type WeeklyPlanInput } from "../../cockpit/workflows/weekly-plan.ts";
import { weeklyPlanQuery } from "../../cockpit/workflows/form.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}`, INACTIVE: `Inaktiv-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR" | "INACTIVE", Staff>;
const cookies = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", string | undefined>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] };
const AV = { ...V, verifiedBy: "Seed Akut (künstlich)" };
const FAKE = { status: "VERIFIED_CURRENT", lastVerified: "2030-01-01", reviewDue: "2099-01-01", verifiedBy: "Dr. Erfunden", sourceIds: [{ sourceId: "FAKE" }] };
const DOCTOR_BY = "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)";

const r = (id: string, d: number, start: string, end: string, consultationType: OpeningHoursRule["consultationType"] = "GENERAL", verification = V): OpeningHoursRule => ({ id, weekday: d as 1, start, end, consultationType, verification });
// ARTIFICIAL week: Mo 08–12 (+ ACUTE 10–11), Di 08–10 healthy / 10–12, Mi 08–12, Do 14–16 appointment, Fr 08–12; Sa + So closed.
const DATA: PulsData = {
  schedule: {
    rules: [r("t-mo", 1, "08:00", "12:00"), r("t-di-1", 2, "08:00", "10:00", "HEALTHY_ONLY"), r("t-di-2", 2, "10:00", "12:00"), r("t-mi", 3, "08:00", "12:00"), r("t-do", 4, "14:00", "16:00", "APPOINTMENT"), r("t-fr", 5, "08:00", "12:00"), r("akut-1-1000-1100", 1, "10:00", "11:00", "ACUTE", AV)],
    confirmedClosedWeekdays: [6, 7],
    verification: V,
  },
  consultationTypes: [
    { code: "GENERAL", label: "Sprechstunde (Test)", verification: V },
    { code: "HEALTHY_ONLY", label: "Nur gesunde Kinder (Test)", verification: V },
    { code: "APPOINTMENT", label: "Terminsprechstunde (Test)", verification: V },
    { code: "OTHER", label: "Erfundene Art (Test)", verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
    { code: "ACUTE", label: "Akutsprechstunde", verification: AV },
  ],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

const today = berlinNow(new Date()).date;
const next = (wd: number) => {
  for (let d = addDays(today, 1); ; d = addDays(d, 1)) if (weekdayOf(d) === wd) return d;
};
const repoData = () => new PayloadPracticeRepository(reader).getPulsData();
type StoredSchedule = WeeklyScheduleDoc & { id: number; verification: { status: string; verifiedBy?: string; reviewDue?: string; lastVerified?: string } };
const stored = async () => doc<StoredSchedule>((await payload.find({ collection: "weeklySchedules", sort: "-updatedAt", limit: 1, depth: 0, overrideAccess: true })).docs[0]);
const acuteRows = async () => (await stored()).rules.filter((x) => x.consultationType === "ACUTE").map(({ ruleId, weekday, start, end, verification }) => ({ ruleId, weekday, start, end, verification }));
const types = async () => (await payload.find({ collection: "consultationTypes", sort: "code", depth: 0, overrideAccess: true })).docs.map((d) => JSON.stringify(d));
const events = async () => (await payload.find({ collection: "auditEvents", where: { entityType: { equals: "weeklySchedules" } }, sort: "id", pagination: false, overrideAccess: true })).docs.map((d) => doc<Record<string, unknown>>(d));
const statusOn = async (date: string, time: string) => getPracticeStatus(zonedToInstant(date, time), await repoData());
const fingerprintIn = (html: string) => html.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1];
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const post = (c: string | undefined, fields: [string, string][], origin: string | null = BASE ?? null) =>
  fetch(`${BASE}/intern/sprechzeiten/bestaetigen`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(c ? { Cookie: c } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });
const currentInput = async () => inputFromSchedule((await repoData()).schedule);
const previewPath = (input: WeeklyPlanInput) => `/intern/sprechzeiten?${new URLSearchParams([["bearbeiten", "1"], ...weeklyPlanQuery(input), ["pruefen", "1"]])}`;
/** DOCTOR: preview over HTTP, then POST exactly what the page offers (+ extra fields). */
async function previewAndConfirm(input: WeeklyPlanInput, extra: [string, string][] = []) {
  const page = (await http(previewPath(input), { cookie: cookies.DOCTOR })).body;
  const fp = fingerprintIn(page);
  assert.ok(fp, strip(page).slice(0, 2000));
  return post(cookies.DOCTOR, [...weeklyPlanQuery(input), ["fingerprint", fp!], ["bestaetigt", "1"], ...extra]);
}
/** A Local API write in a transaction that is always rolled back (security probes leave no trace). */
async function probe(user: Staff, context: Record<string, unknown>, data: Partial<WeeklyScheduleDoc>) {
  const s = await stored();
  const req = await createLocalReq({ user: user as never, context }, payload);
  await initTransaction(req);
  try {
    return doc<StoredSchedule>(await payload.update({ collection: "weeklySchedules", id: s.id, data: data as never, user: user as never, overrideAccess: false, depth: 0, req, context }));
  } finally {
    await killTransaction(req);
  }
}

describe("Regelmäßige Sprechzeiten (09.5I)", { skip: skipDb }, () => {
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

  describe("security: no generic weekly-schedule write; trusted contexts stay separate", () => {
    test("REST: STAFF / ADMIN / DOCTOR cannot update the weekly schedule (context fields in the body are ignored)", { skip: skipHttp }, async () => {
      const s = await stored();
      const body = { rules: s.rules.filter((x) => x.consultationType !== "ACUTE"), confirmedClosedWeekdays: ["6", "7"], verification: FAKE, praxisWeeklyScheduleWrite: true, praxisAcuteBaselineWrite: true, context: { praxisWeeklyScheduleWrite: true } };
      for (const k of ["STAFF", "ADMIN", "DOCTOR"] as const) assert.equal((await http(`/api/weeklySchedules/${s.id}`, { method: "PATCH", cookie: cookies[k], body })).status, 403, k);
      assert.equal((await acuteRows()).length, 1, "ACUTE rule still there");
    });

    test("Local API: generic DOCTOR write refused; ADMIN never; the two trusted contexts never at once", async () => {
      const s = await stored();
      const rules = s.rules;
      await assert.rejects(probe(users.DOCTOR, {}, { rules, confirmedClosedWeekdays: ["6", "7"] }), "generic DOCTOR");
      await assert.rejects(probe(users.ADMIN, { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true }, { rules, confirmedClosedWeekdays: ["6", "7"] }), "ADMIN with context");
      await assert.rejects(probe(users.STAFF, { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true }, { rules, confirmedClosedWeekdays: ["6", "7"] }), "STAFF with context");
      await assert.rejects(probe(users.DOCTOR, { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true, [SERVER_CONTEXT.ACUTE_BASELINE]: true }, { rules, confirmedClosedWeekdays: ["6", "7"] }), "both contexts");
    });

    test("WEEKLY_SCHEDULE context: cannot remove / move ACUTE; invalid types and unresolved weekdays refused; forged ACUTE provenance replaced by the stored one", async () => {
      const s = await stored();
      const regular = s.rules.filter((x) => x.consultationType !== "ACUTE");
      const acute = s.rules.filter((x) => x.consultationType === "ACUTE");
      const ctx = { [SERVER_CONTEXT.WEEKLY_SCHEDULE]: true };
      const closed = ["6", "7"];
      await assert.rejects(probe(users.DOCTOR, ctx, { rules: regular, confirmedClosedWeekdays: closed }), /Akutsprechstunde wird hier nicht geändert/);
      await assert.rejects(probe(users.DOCTOR, ctx, { rules: [...regular, { ...acute[0], start: "10:30" }], confirmedClosedWeekdays: closed }), /Akutsprechstunde wird hier nicht geändert/);
      await assert.rejects(probe(users.DOCTOR, ctx, { rules: [...regular, { ruleId: "x", weekday: "3", start: "14:00", end: "15:00", consultationType: "OTHER", verification: FAKE } as RuleDoc, ...acute], confirmedClosedWeekdays: closed }), /nicht bestätigt oder nicht vorhanden/);
      await assert.rejects(probe(users.DOCTOR, ctx, { rules: [...regular, ...acute], confirmedClosedWeekdays: ["6"] }), /Sonntag: Bitte Sprechzeiten eintragen/);
      await assert.rejects(probe(users.DOCTOR, ctx, { rules: [...regular.filter((x) => x.weekday !== "1"), ...acute], confirmedClosedWeekdays: ["1", "6", "7"] }), new RegExp(ACUTE_ON_CLOSED_DAY.slice(0, 40)));
      const forged = await probe(users.DOCTOR, ctx, { rules: [...regular, ...acute.map((a) => ({ ...a, verification: FAKE as never }))], confirmedClosedWeekdays: closed });
      const fa = forged.rules.find((x) => x.consultationType === "ACUTE")!;
      assert.equal(fa.verification.verifiedBy, "Seed Akut (künstlich)", "ACUTE keeps its STORED provenance");
      assert.equal(forged.verification.verifiedBy, DOCTOR_BY, "aggregate provenance generated from the session");
      assert.equal((await stored()).verification.verifiedBy, "Seed (künstlich)", "probe rolled back");
    });

    test("ACUTE_BASELINE context still cannot change regular rules (09.5E boundary)", async () => {
      const s = await stored();
      const rules = s.rules.map((x) => (x.ruleId === "t-mi" ? { ...x, end: "13:00" } : x));
      await assert.rejects(probe(users.DOCTOR, { [SERVER_CONTEXT.ACUTE_BASELINE]: true }, { rules }), /nur die Akutsprechstunde/);
    });

    test("workflow authority: signed out / inactive / STAFF / ADMIN refused before any write", async () => {
      const input = await currentInput();
      input[3].rows = [{ start: "08:00", end: "13:00", type: "GENERAL" }];
      const fp = datasetFingerprint(await repoData());
      for (const [u, code] of [[null, "UNAUTHENTICATED"], [users.INACTIVE, "UNAUTHENTICATED"], [users.STAFF, "NOT_ALLOWED"], [users.ADMIN, "NOT_ALLOWED"]] as const) {
        const res = await confirmWeeklyPlan(payload, u as never, input, fp, true);
        assert.ok(!res.ok && res.code === code, String(code));
      }
      const res = await confirmWeeklyPlan(payload, users.DOCTOR as never, input, fp, false);
      assert.ok(!res.ok && res.code === "BLOCKED", "checkbox required");
      assert.equal((await stored()).verification.verifiedBy, "Seed (künstlich)");
    });
  });

  describe("HTTP: read-only roles, DOCTOR edit → preview → confirm", { skip: skipHttp }, () => {
    test("STAFF / ADMIN read the week; no editor, POST 403; signed out → login", async () => {
      for (const k of ["STAFF", "ADMIN"] as const) {
        const page = strip((await http("/intern/sprechzeiten", { cookie: cookies[k] })).body);
        for (const t of ["Regelmäßige Sprechzeiten", "Montag", "Sonntag", "Geschlossen", "08:00–12:00 Uhr · Sprechstunde (Test)", "Akutsprechstunde 10:00–11:00 Uhr (separat verwaltet)"]) assert.ok(page.includes(t), `${k}: ${t}`);
        assert.ok(page.includes(k === "STAFF" ? "Regelmäßige Sprechzeiten können nur ärztlich geändert werden." : READ_ONLY_TEXT), k);
        assert.ok(!page.includes("Regelmäßige Sprechzeiten ändern"), k);
        const edit = (await http(previewPath(await currentInput()), { cookie: cookies[k] })).body;
        assert.ok(!edit.includes('name="t1"') && !edit.includes('action="/intern/sprechzeiten/bestaetigen"'), `${k} no editor`);
        assert.equal((await post(cookies[k], [...weeklyPlanQuery(await currentInput()), ["fingerprint", "0".repeat(64)], ["bestaetigt", "1"]])).status, 403, k);
      }
      assert.match((await http("/intern/sprechzeiten")).location ?? "", /\/intern\/anmelden/);
      assert.match((await post(undefined, [["t1", "offen"]])).headers.get("location") ?? "", /\/intern\/anmelden/);
    });

    test("DOCTOR: status + edit action; seven weekdays with Geöffnet / Geschlossen; ACUTE not editable here", async () => {
      const page = strip((await http("/intern/sprechzeiten", { cookie: cookies.DOCTOR })).body);
      assert.ok(page.includes("Ärztlich bestätigt bis") && page.includes("Regelmäßige Sprechzeiten ändern"));
      const edit = strip((await http("/intern/sprechzeiten?bearbeiten=1", { cookie: cookies.DOCTOR })).body);
      for (let wd = 1; wd <= 7; wd++) assert.ok(edit.includes(`name="t${wd}"`), `weekday ${wd}`);
      assert.ok(edit.includes("Akutsprechzeiten werden separat verwaltet.") && edit.includes('href="/intern/akutsprechstunde"'));
      assert.ok(!/<option value="ACUTE"/.test(edit), "ACUTE never selectable");
      assert.match(edit, /<option value="OTHER" disabled="">Erfundene Art \(Test\) \(nicht bestätigt\)<\/option>/);
      assert.ok(edit.includes('aria-label="Montag, Sprechzeit 1 entfernen"') && edit.includes('aria-label="Montag: weitere Zeit hinzufügen"'));
    });

    test("change Monday: new physician provenance for regular rules, ACUTE + consultation types untouched, audit UPDATE", async () => {
      const acuteBefore = await acuteRows();
      const typesBefore = await types();
      const before = await stored();
      const input = await currentInput();
      input[1].rows = [{ start: "08:00", end: "12:30", type: "GENERAL" }];
      const preview = strip((await http(previewPath(input), { cookie: cookies.DOCTOR })).body);
      assert.ok(preview.includes("Aktueller und neuer Wochenplan") && preview.includes("Montag: künftig 08:00–12:30 Uhr.") && preview.includes("Prüfung mit der Statuslogik"));
      assert.ok(preview.includes("Ich bestätige den vollständigen Wochenplan für die Praxis.") && preview.includes("Geänderten Wochenplan ärztlich bestätigen"));
      const res = await previewAndConfirm(input, [["ruleId", "evil-id"], ["verifiedBy", "Dr. Erfunden"], ["reviewDue", "2099-01-01"], ["praxisWeeklyScheduleWrite", "true"], ["praxisAcuteBaselineWrite", "true"], ["changeSetId", "11111111-1111-4111-8111-111111111111"], ["rolle", "ADMIN"]]);
      assert.equal(res.status, 303);
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "geaendert");
      const after = await stored();
      const mo = after.rules.filter((x) => x.weekday === "1" && x.consultationType !== "ACUTE");
      assert.equal(mo.length, 1);
      assert.match(mo[0].ruleId, /^weekly-1-[0-9a-f]{8}$/, "server-generated id");
      assert.deepEqual(after.rules.filter((x) => x.consultationType !== "ACUTE" && x.weekday !== "1").map((x) => x.ruleId).sort(), before.rules.filter((x) => x.consultationType !== "ACUTE" && x.weekday !== "1").map((x) => x.ruleId).sort(), "unchanged rows keep their ids");
      for (const x of after.rules.filter((y) => y.consultationType !== "ACUTE")) assert.equal(x.verification.verifiedBy, DOCTOR_BY, x.ruleId);
      assert.deepEqual([after.verification.verifiedBy, after.verification.reviewDue], [DOCTOR_BY, addDays(today, 182)]);
      assert.deepEqual(await acuteRows(), acuteBefore, "ACUTE rule: same id, times and provenance");
      assert.deepEqual(await types(), typesBefore, "consultation types unchanged");
      assert.ok(!after.rules.some((x) => x.ruleId === "evil-id"));
      const ev = (await events()).at(-1)!;
      assert.deepEqual([ev.operation, ev.actorRole], ["UPDATE", "DOCTOR"]);
      assert.notEqual(ev.changeSetId, "11111111-1111-4111-8111-111111111111");
      assert.deepEqual(secretKeys(await events()), []);
      const mon = next(1);
      const s = await statusOn(mon, "12:15");
      assert.ok(["OPEN", "CLOSING_SOON"].includes(s.status), s.status);
      assert.ok(strip((await http(`/intern/vorschau?datum=${mon}&zeit=12:15`, { cookie: cookies.STAFF })).body).includes(s.headline), "Website-Vorschau uses the database week");
      assert.ok(strip((await http("/intern/sprechzeiten/bestaetigt?art=geaendert", { cookie: cookies.DOCTOR })).body).includes("Die öffentliche Website verwendet derzeit weiterhin die bisherigen Daten."));
    });

    test("close Wednesday: preview says so; engine resolves it CLOSED", async () => {
      const input = await currentInput();
      input[3] = { state: "CLOSED", rows: [] };
      assert.ok(strip((await http(previewPath(input), { cookie: cookies.DOCTOR })).body).includes("Mittwoch: künftig regelmäßig geschlossen."));
      assert.equal((await previewAndConfirm(input)).status, 303);
      assert.deepEqual((await stored()).confirmedClosedWeekdays.sort(), ["3", "6", "7"]);
      assert.equal((await statusOn(next(3), "10:00")).status, "CLOSED");
      assert.equal((await events()).at(-1)!.operation, "UPDATE");
    });

    test("unsafe changes are blocked: ACUTE outside the new hours, ACUTE on a closed day; nothing changed → no write", async () => {
      const before = JSON.stringify(await stored());
      const auditBefore = (await events()).length;
      const short = await currentInput();
      short[1].rows = [{ start: "08:00", end: "10:30", type: "GENERAL" }];
      const page = strip((await http(previewPath(short), { cookie: cookies.DOCTOR })).body);
      assert.ok(page.includes(ACUTE_OUTSIDE_HOURS) && page.includes('href="/intern/akutsprechstunde"') && !page.includes('action="/intern/sprechzeiten/bestaetigen"'));
      const fp = datasetFingerprint(await repoData());
      const forced = await post(cookies.DOCTOR, [...weeklyPlanQuery(short), ["fingerprint", fp], ["bestaetigt", "1"]]);
      assert.match(forced.headers.get("location")!, /status=blockiert/);
      const closedMon = await currentInput();
      closedMon[1] = { state: "CLOSED", rows: [] };
      assert.ok(strip((await http(previewPath(closedMon), { cookie: cookies.DOCTOR })).body).includes(ACUTE_ON_CLOSED_DAY));
      assert.ok(strip((await http(previewPath(await currentInput()), { cookie: cookies.DOCTOR })).body).includes("Es wurde nichts geändert."));
      assert.equal(JSON.stringify(await stored()), before);
      assert.equal((await events()).length, auditBefore);
    });

    test("stale: a change between preview and confirmation (ADMIN edits holiday dates) is refused", async () => {
      const input = await currentInput();
      input[5].rows = [{ start: "08:00", end: "11:30", type: "GENERAL" }];
      const page = (await http(previewPath(input), { cookie: cookies.DOCTOR })).body;
      await payload.updateGlobal({ slug: "holidayCalendar", data: { holidays: [{ date: addDays(today, 40), name: "Testfeiertag (künstlich)" }] } as never, user: users.ADMIN, overrideAccess: false });
      const before = JSON.stringify(await stored());
      const res = await post(cookies.DOCTOR, [...weeklyPlanQuery(input), ["fingerprint", fingerprintIn(page)!], ["bestaetigt", "1"]]);
      assert.match(res.headers.get("location")!, /status=veraltet/);
      assert.ok(strip((await http(res.headers.get("location")!.replace(/^https?:\/\/[^/]+/, ""), { cookie: cookies.DOCTOR })).body).includes(PLAN_STALE));
      assert.equal(JSON.stringify(await stored()), before);
    });
  });

  describe("reconfirmation, rollback, no quick undo, 09.5E regression, public site", () => {
    test("expired confirmation: one Prüfen item; unchanged week reconfirmed (VERIFY), same ids, ACUTE provenance unchanged", { skip: skipHttp }, async () => {
      const s = await stored();
      await payload.update({ collection: "weeklySchedules", id: s.id, data: { verification: { ...s.verification, status: "VERIFIED_CURRENT", lastVerified: "2025-10-01", reviewDue: "2026-04-01" } } as never, ...seed });
      const home = strip((await http("/intern", { cookie: cookies.STAFF })).body);
      assert.equal(home.split("Regelmäßige Sprechzeiten erneut ärztlich bestätigen").length - 1, 1, "exactly one item");
      assert.ok(home.includes('href="/intern/sprechzeiten"'));
      const page = strip((await http("/intern/sprechzeiten", { cookie: cookies.DOCTOR })).body);
      assert.ok(page.includes("Bestätigung abgelaufen") && page.includes("Unveränderten Wochenplan erneut bestätigen"));
      const ids = (await stored()).rules.map((x) => x.ruleId).sort();
      const acuteBefore = await acuteRows();
      const preview = strip((await http(previewPath(await currentInput()), { cookie: cookies.DOCTOR })).body);
      assert.ok(preview.includes("Wochenplan erneut bestätigen") && preview.includes("Der Wochenplan bleibt unverändert"));
      const res = await previewAndConfirm(await currentInput());
      assert.equal(new URL(res.headers.get("location")!).searchParams.get("art"), "erneut");
      const after = await stored();
      assert.deepEqual(after.rules.map((x) => x.ruleId).sort(), ids);
      assert.deepEqual([after.verification.reviewDue, after.verification.verifiedBy], [addDays(today, 182), DOCTOR_BY]);
      assert.deepEqual(await acuteRows(), acuteBefore);
      assert.equal((await events()).at(-1)!.operation, "VERIFY");
    });

    test("rollback: a failing audit write undoes the whole weekly-plan write", async () => {
      const before = JSON.stringify(await stored());
      const auditBefore = (await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs;
      const input = await currentInput();
      input[2].rows = [{ start: "08:00", end: "12:00", type: "GENERAL" }];
      const draft = weeklyPlanDraft(await repoData(), today, input, "fp");
      assert.ok(draft.ok);
      const hooks = payload.collections.auditEvents.config.hooks.beforeChange;
      const fail = () => {
        throw new Error("Audit-Fehler (simuliert)");
      };
      const req = await createLocalReq({ user: users.DOCTOR as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      hooks.push(fail);
      try {
        await assert.rejects(commitWeeklyPlan(payload, req, draft), /Audit-Fehler/);
      } finally {
        hooks.splice(hooks.indexOf(fail), 1);
      }
      await killTransaction(req);
      assert.equal(JSON.stringify(await stored()), before, "old week, no partial rules");
      assert.equal((await payload.count({ collection: "auditEvents", overrideAccess: true })).totalDocs, auditBefore, "no orphan audit");
    });

    test("no quick undo for the standing weekly plan", async () => {
      const ev = (await events()).filter((e) => e.actorRole === "DOCTOR").at(-1);
      if (!ev) return;
      assert.equal((await planFor(reader, String(ev.changeSetId), await repoData(), new Date(), "DOCTOR")).ok, false);
    });

    test("09.5E regression: the acute baseline still changes ONLY the ACUTE subset after a weekly-plan write", async () => {
      const before = (await stored()).rules.filter((x) => x.consultationType !== "ACUTE").map(({ ruleId, start, end, verification }) => ({ ruleId, start, end, verification }));
      const data = await repoData();
      const res = await publishAcuteBaseline(payload, users.DOCTOR as never, { confirmed: true, rows: [{ weekday: "1", start: "10:30", end: "11:30" }] }, datasetFingerprint(data));
      assert.ok(res.ok, JSON.stringify(res));
      const after = await stored();
      assert.deepEqual(after.rules.filter((x) => x.consultationType !== "ACUTE").map(({ ruleId, start, end, verification }) => ({ ruleId, start, end, verification })), before);
      assert.deepEqual(after.rules.filter((x) => x.consultationType === "ACUTE").map((x) => [x.weekday, x.start, x.end]), [["1", "10:30", "11:30"]]);
    });

    test("public website stays static: no database weekly plan leaks", { skip: skipHttp }, async () => {
      for (const path of ["/", "/heute", "/heute/sprechzeiten"]) {
        const res = await http(path);
        assert.equal(res.status, 200, path);
        const body = strip(res.body);
        assert.ok(!body.includes("Sprechstunde (Test)") && !body.includes("12:30"), path);
      }
    });
  });
});
