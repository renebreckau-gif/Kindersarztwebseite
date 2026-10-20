// Step 8 of the clean-database proof (Phase 09.5D): "Hinweis veröffentlichen" against PostgreSQL —
// create (finite / open-ended), edit of the same record, invalid data without partial writes,
// collection-level invariants over REST, announcement lifecycle + undo, rollback, client
// smuggling over HTTP, one end-to-end path, and the static public website.
// Artificial accounts and data only. Dates are relative to the real Berlin date.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import type { OpeningHoursRule } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { announcementToDoc, docsFromPulsData } from "../../data/payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { createFirstAdmin } from "../bootstrap.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { berlinNow } from "../../cockpit/read-model.ts";
import { commitAnnouncement, previewUndo, publishAnnouncement, revertChange } from "../../cockpit/workflows/publish.ts";
import { announcementDraft, type AnnouncementInput } from "../../cockpit/workflows/announcement.ts";
import { announcementFingerprint } from "../../cockpit/workflows/snapshot.ts";
import { BASE, doc, EMAIL, http, restLogin, secretKeys, skipDb, skipHttp, testPayload } from "./helpers.ts";

let payload: Payload;
let reader: PayloadReader;
const PW = { ADMIN: `Verwaltung-${crypto.randomUUID()}`, STAFF: `Team-${crypto.randomUUID()}`, DOCTOR: `Aerztin-${crypto.randomUUID()}` };
type Staff = { id: number; name: string; role: string; active: boolean; collection: "staff" };
const users = {} as Record<"ADMIN" | "STAFF" | "DOCTOR", Staff>;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-01", reviewDue: "2099-01-01", verifiedBy: "Seed", sourceIds: ["TEST"] };
const today = berlinNow(new Date()).date;
const rule = (wd: number, start: string, end: string): OpeningHoursRule => ({ id: `r${wd}-${start}`, weekday: wd as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5, 6, 7].flatMap((wd) => [rule(wd, "08:00", "12:00"), rule(wd, "14:00", "16:00")]), confirmedClosedWeekdays: [], verification: V },
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

const active = () => new PayloadPracticeRepository(reader).getAnnouncements();
const fp = async () => announcementFingerprint(await active());
const count = async (collection: "announcements" | "auditEvents", where?: Record<string, unknown>) => (await payload.count({ collection, where: where as never, overrideAccess: true })).totalDocs;
type Row = { id: number; recordId: string; recordState: string; retiredReason: string | null; category: string; title: string; shortText: string; validFrom: string; validUntil: string | null; openEnded: boolean; priority: number; homepageHighlight: boolean; published: boolean; verification: { verifiedBy: string; reviewDue: string; status: string } };
const row = async (recordId: string) => doc<Row>((await payload.find({ collection: "announcements", where: { recordId: { equals: recordId } }, overrideAccess: true })).docs[0]);
const events = async (where: Record<string, unknown>) => (await payload.find({ collection: "auditEvents", where: where as never, sort: "id", pagination: false, overrideAccess: true })).docs.map((e) => doc<Record<string, unknown>>(e));
const input = (p: Partial<AnnouncementInput> = {}): AnnouncementInput => ({ title: "Telefon am Freitag eingeschränkt (Test)", shortText: "Am Freitag ist die Praxis telefonisch nur vormittags erreichbar.", validFrom: today, mode: "FINITE", validUntil: addDays(today, 7), ...p });
const publish = async (user: Staff | null, p: Partial<AnnouncementInput> = {}, fingerprint?: string) => publishAnnouncement(payload, user as never, input(p), fingerprint ?? (await fp()));
const undoFp = async () => (await previewUndo(payload, null, crypto.randomUUID())).fingerprint;
const undo = async (user: Staff, cs: string, now = new Date()) => revertChange(payload, user as never, cs, await undoFp(), now);

describe("Hinweis veröffentlichen against PostgreSQL", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
    reader = payload as unknown as PayloadReader;
  });
  after(async () => {
    await payload?.destroy();
  });

  describe("create and edit", () => {
    before(freshSetup);

    test("migration from zero: announcement lifecycle applied", async () => {
      const m = (await payload.find({ collection: "payload-migrations", overrideAccess: true, limit: 10, sort: "id" })).docs.map((x) => (x as { name?: string }).name);
      assert.deepEqual(m, ["20261013_122224_initial", "20261014_080446_operational_lifecycle", "20261014_123515_announcement_lifecycle"]);
    });

    test("finite: ACTIVE, published, INFO, default priority, no highlight, generated provenance, reviewDue = end, CREATE audit", async () => {
      const r = await publish(users.STAFF);
      assert.ok(r.ok, JSON.stringify(r));
      const id = r.ok ? r.recordId : "";
      assert.equal(id, `hinweis-${today}`);
      const x = await row(id);
      assert.deepEqual([x.recordState, x.published, x.category, x.priority, x.homepageHighlight, x.openEnded], ["ACTIVE", true, "INFO", 10, false, false]);
      assert.equal(x.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      assert.equal(x.verification.reviewDue, addDays(today, 7));
      const evs = await events({ entityId: { equals: id } });
      assert.deepEqual(evs.map((e) => [e.entityType, e.operation, e.changeSetId, e.actorRole]), [["announcements", "CREATE", r.ok ? r.changeSetId : "", "STAFF"]]);
      assert.deepEqual((await active()).map((a) => a.id), [id]);
    });

    test("open-ended: openEnded = true, validUntil = null in PostgreSQL, OPEN_ENDED in the domain, reviewDue = today + 30", async () => {
      const r = await publish(users.DOCTOR, { title: "Neue Telefonzeiten (Test)", mode: "OPEN", validUntil: "" });
      assert.ok(r.ok, JSON.stringify(r));
      const id = r.ok ? r.recordId : "";
      assert.equal(id, `hinweis-${today}-2`, "a new record never reuses an existing id");
      const x = await row(id);
      assert.deepEqual([x.openEnded, x.validUntil, x.verification.reviewDue], [true, null, addDays(today, 30)]);
      assert.equal((await active()).find((a) => a.id === id)?.validUntil, "OPEN_ENDED");
    });

    test("edit: same record, UPDATE, no duplicate; category / priority / highlight preserved; switch end mode", async () => {
      await payload.create({ collection: "announcements", data: announcementToDoc({ id: "bestand", category: "URGENT", title: "Bestand (Test)", shortText: "Alt.", validFrom: today, validUntil: addDays(today, 3), priority: 3, homepageHighlight: true, published: true, verification: V }) as never, ...seed });
      const before = await count("announcements");
      const r = await publish(users.STAFF, { recordId: "bestand", title: "Bestand geändert (Test)", shortText: "Neu.", validFrom: addDays(today, 1), mode: "OPEN", validUntil: "" });
      assert.ok(r.ok && r.mode === "EDIT", JSON.stringify(r));
      const x = await row("bestand");
      assert.deepEqual([x.title, x.shortText, x.validFrom, x.openEnded, x.validUntil, x.category, x.priority, x.homepageHighlight, x.published], ["Bestand geändert (Test)", "Neu.", addDays(today, 1), true, null, "URGENT", 3, true, true]);
      assert.equal(await count("announcements"), before);
      const back = await publish(users.STAFF, { recordId: "bestand", title: "Bestand geändert (Test)", shortText: "Neu.", validFrom: addDays(today, 1), mode: "FINITE", validUntil: addDays(today, 5) });
      assert.ok(back.ok);
      assert.deepEqual([(await row("bestand")).openEnded, (await row("bestand")).validUntil], [false, addDays(today, 5)]);
      assert.deepEqual((await events({ entityId: { equals: "bestand" } })).map((e) => e.operation), ["CREATE", "UPDATE", "UPDATE"]);
    });

    test("roles: disabled / signed-out cannot write", async () => {
      assert.equal(((await publish({ ...users.STAFF, active: false })) as { code?: string }).code, "UNAUTHENTICATED");
      assert.equal(((await publish(null)) as { code?: string }).code, "UNAUTHENTICATED");
    });
  });

  describe("invalid data and collection-level invariants", () => {
    before(freshSetup);
    const refused = async (p: Partial<AnnouncementInput>, code = "BLOCKED", fingerprint?: string) => {
      const before = [await count("announcements"), await count("auditEvents")];
      const r = await publish(users.STAFF, p, fingerprint);
      assert.equal(!r.ok && r.code, code, JSON.stringify(r));
      assert.deepEqual([await count("announcements"), await count("auditEvents")], before, "no business row, no partial audit");
    };

    test("cockpit path refuses every invalid input", async () => {
      await refused({ title: "" });
      await refused({ title: "x".repeat(81) });
      await refused({ shortText: "  " });
      await refused({ shortText: "x".repeat(281) });
      await refused({ validFrom: "2026-02-30" });
      await refused({ validFrom: addDays(today, -1) });
      await refused({ validFrom: addDays(today, 3), validUntil: addDays(today, 2) });
      await refused({ validFrom: today, validUntil: addDays(today, -1) });
      await refused({ mode: undefined });
      await refused({}, "STALE", "0".repeat(64));
    });

    test("REST: malformed announcements are refused by the collection hook; lifecycle not client-settable", { skip: skipHttp }, async () => {
      const cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
      const base = { recordId: "rest-hinweis", category: "INFO", title: "REST (Test)", shortText: "Text.", validFrom: today, priority: 10, published: true };
      for (const bad of [
        { ...base, validUntil: addDays(today, -1), openEnded: false },
        { ...base, validUntil: addDays(today, 2), openEnded: true },
        { ...base, openEnded: false },
        { ...base, title: "   ", validUntil: addDays(today, 2) },
      ]) {
        const res = await http("/api/announcements", { method: "POST", cookie, body: bad });
        assert.equal(res.status, 400, `${JSON.stringify(bad)} → ${res.status} ${res.body.slice(0, 200)}`);
      }
      assert.equal(await count("announcements"), 0);
      const ok = await http("/api/announcements", { method: "POST", cookie, body: { ...base, validUntil: addDays(today, 2), openEnded: false, recordState: "RETIRED" } });
      assert.equal(ok.status, 201, ok.body);
      assert.equal((await row("rest-hinweis")).recordState, "ACTIVE", "client lifecycle value ignored");
      const del = await http(`/api/announcements/${(await row("rest-hinweis")).id}`, { method: "DELETE", cookie });
      assert.equal(del.status, 403, "no delete access");
    });
  });

  describe("lifecycle and undo", () => {
    before(freshSetup);

    test("CREATE undo: RETIRED / REVERTED, kept in PostgreSQL, not returned by the repository; REVERT links the CREATE", async () => {
      const r = await publish(users.STAFF);
      assert.ok(r.ok);
      const id = r.ok ? r.recordId : "";
      const u = await undo(users.STAFF, r.ok ? r.changeSetId : "");
      assert.ok(u.ok, JSON.stringify(u));
      const x = await row(id);
      assert.deepEqual([x.recordState, x.retiredReason], ["RETIRED", "REVERTED"]);
      assert.equal((await active()).some((a) => a.id === id), false);
      const evs = await events({ entityId: { equals: id } });
      assert.deepEqual(evs.map((e) => e.operation), ["CREATE", "REVERT"]);
      assert.equal(evs[1].revertOf, evs[0].eventId);
    });

    test("EDIT undo restores the same record; an older edit is no longer directly undoable", async () => {
      const c = await publish(users.STAFF, { title: "Version 1 (Test)", validFrom: addDays(today, 1) });
      assert.ok(c.ok);
      const id = c.ok ? c.recordId : "";
      const a = await publish(users.STAFF, { recordId: id, title: "Version 2 (Test)", validFrom: addDays(today, 1) });
      const b = await publish(users.STAFF, { recordId: id, title: "Version 3 (Test)", validFrom: addDays(today, 1), mode: "OPEN", validUntil: "" });
      assert.ok(a.ok && b.ok);
      const older = await undo(users.STAFF, a.ok ? a.changeSetId : "");
      assert.equal(!older.ok && older.code, "BLOCKED");
      const u = await undo(users.DOCTOR, b.ok ? b.changeSetId : "");
      assert.ok(u.ok, JSON.stringify(u));
      const x = await row(id);
      assert.deepEqual([x.recordState, x.title, x.openEnded, x.validUntil, x.published], ["ACTIVE", "Version 2 (Test)", false, addDays(today, 7), true]);
      assert.equal(x.verification.verifiedBy, "Test DOCTOR (künstlich), Ärztin / Arzt (Praxis Cockpit)", "provenance regenerated for the person undoing");
    });

    test("open-ended: undo allowed; finite notice whose last day has passed: no quick undo", async () => {
      const open = await publish(users.STAFF, { title: "Offen (Test)", mode: "OPEN", validUntil: "" });
      assert.ok(open.ok);
      const tomorrow = zonedToInstant(addDays(today, 1), "00:05");
      assert.equal((await previewUndo(payload, users.STAFF as never, open.ok ? open.changeSetId : "", tomorrow)).plan.ok, true);
      const short = await publish(users.STAFF, { title: "Nur heute (Test)", validUntil: today });
      assert.ok(short.ok);
      const p = await previewUndo(payload, users.STAFF as never, short.ok ? short.changeSetId : "", tomorrow);
      assert.equal(!p.plan.ok && p.plan.code, "EFFECT_OVER");
    });

    test("rollback: a failure after the announcement write leaves no row and no audit event", async () => {
      const list = await active();
      const { draft } = announcementDraft(list, new Date(), input({ title: "Rollback (Test)", validFrom: addDays(today, 2) }), announcementFingerprint(list));
      assert.ok(draft.ok);
      const before = [await count("announcements"), await count("auditEvents")];
      const req = await createLocalReq({ user: users.STAFF as never, context: { [SERVER_CONTEXT.CHANGE_SET]: crypto.randomUUID() } }, payload);
      await initTransaction(req);
      await commitAnnouncement(payload, req, "NEW", draft.ok ? draft.record : (undefined as never));
      await assert.rejects(payload.create({ collection: "closures", data: { recordId: "kaputt" } as never, overrideAccess: true, req }));
      await killTransaction(req);
      assert.deepEqual([await count("announcements"), await count("auditEvents")], before);
    });

    test("no secrets in any audit event", async () => {
      const all = (await payload.find({ collection: "auditEvents", pagination: false, overrideAccess: true })).docs;
      assert.deepEqual(secretKeys(all), []);
      const text = JSON.stringify(all);
      for (const s of [...Object.values(PW), process.env.PAYLOAD_SECRET ?? "unset"]) assert.ok(!text.includes(s));
    });
  });

  describe("HTTP: login → Hinweis → preview → publish → cockpit → edit → undo; public site stays static", { skip: skipHttp }, () => {
    let cookie: string | undefined;
    let id = "";
    let editSet = "";
    const TITLE = "Telefon am Freitag eingeschränkt (HTTP-Test)";
    before(async () => {
      await freshSetup();
      cookie = (await restLogin(EMAIL("STAFF"), PW.STAFF)).cookie;
    });
    const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const hiddenOf = (html: string) => {
      const form = html.match(/<form[^>]*action="\/intern\/hinweis\/veroeffentlichen"[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
      return [...form.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], decode(m[2])] as [string, string]);
    };
    const send = (fields: [string, string][], origin: string | null = BASE ?? null) =>
      fetch(`${BASE}/intern/hinweis/veroeffentlichen`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: new URLSearchParams(fields) });

    test("form, preview (database vs. current website), publish with smuggled fields ignored", async () => {
      const start = await http("/intern/hinweis", { cookie });
      assert.equal(start.status, 200);
      assert.match(start.body, /Hinweis veröffentlichen/);
      const q = new URLSearchParams({ titel: TITLE, text: "Bitte nur in dringenden Fällen anrufen.", ab: today, ende: "datum", bis: addDays(today, 4) });
      const page = await http(`/intern/hinweis?${q}`, { cookie });
      for (const t of ["Website-Vorschau", "Cockpit-Datenbank", "Aktuelle Website", "Erster Tag danach", "Dieser Hinweis ist sichtbar."]) assert.ok(page.body.includes(t), t);
      assert.equal(await count("announcements"), 0, "a GET never writes");
      const hidden = hiddenOf(page.body);
      assert.ok(hidden.some(([k]) => k === "fingerprint"));
      assert.ok(!hidden.some(([k]) => /category|priority|homepage|published|verified|reviewDue|recordState|changeSet|rolle/i.test(k)), "the form carries only user input + fingerprint");
      assert.equal((await send(hidden, "https://evil.example")).status, 403);
      const smuggled: [string, string][] = [...hidden, ["recordId", "fremd"], ["eintrag", ""], ["category", "URGENT"], ["priority", "1"], ["homepageHighlight", "true"], ["published", "false"], ["verifiedBy", "Gefälscht"], ["reviewDue", "2099-01-01"], ["recordState", "RETIRED"], ["changeSetId", "22222222-2222-4222-8222-222222222222"], ["rolle", "ADMIN"]];
      const res = await send(smuggled.filter(([k]) => k !== "eintrag"));
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      assert.equal(loc.pathname, "/intern/hinweis/veroeffentlicht");
      id = loc.searchParams.get("eintrag") ?? "";
      const x = await row(id);
      assert.deepEqual([x.recordId, x.recordState, x.category, x.priority, x.homepageHighlight, x.published], [`hinweis-${today}`, "ACTIVE", "INFO", 10, false, true]);
      assert.equal(x.verification.verifiedBy, "Test STAFF (künstlich), Praxisteam (Praxis Cockpit)");
      assert.notEqual((await events({ entityId: { equals: id } }))[0].changeSetId, "22222222-2222-4222-8222-222222222222");
      const conf = await http(`${loc.pathname}${loc.search}`, { cookie });
      for (const t of ["In der Testumgebung veröffentlicht", "Die öffentliche Website verwendet derzeit noch die bisherigen Daten.", TITLE, "Sichtbar vom", "Website-Vorschau öffnen", "Änderung zurücknehmen"]) assert.ok(conf.body.includes(t), t);
      assert.doesNotMatch(conf.body, /Auf der Website veröffentlicht/);
    });

    test("cockpit: real quick action, Nächste Termine with edit link, list on /intern/hinweis; public site static", async () => {
      const home = await http("/intern", { cookie });
      assert.ok(home.body.includes('href="/intern/hinweis"'), "Hinweis veröffentlichen is real");
      assert.ok(!home.body.includes("/lab/praxis-cockpit/hinweis"), "no prototype link for notices");
      // 09.5E: the Akutsprechstunde entry exists, but without a physician baseline it says so.
      assert.ok(!home.body.includes("Akutsprechstunde heute ändern"), "no operational acute change without a baseline");
      assert.ok(home.body.includes('href="/intern/akutsprechstunde"') && home.body.includes("Noch nicht ärztlich bestätigt"));
      assert.ok(home.body.includes(`Hinweis: ${TITLE}`));
      assert.ok(home.body.includes(`href="/intern/hinweis/${id}"`));
      assert.match(home.body, /„Telefon am Freitag eingeschränkt \(HTTP-Test\)“ veröffentlicht/);
      const list = await http("/intern/hinweis", { cookie });
      assert.ok(list.body.includes("Aktuelle und geplante Hinweise") && list.body.includes(TITLE));
      for (const path of ["/heute", "/heute/aktuelles"]) {
        const pub = await http(path);
        assert.equal(pub.status, 200);
        assert.ok(!pub.body.includes("HTTP-Test"), `${path} stays static`);
      }
    });

    test("edit over HTTP, then the undo preview shows the notices and the undo restores them", async () => {
      const q = new URLSearchParams({ titel: `${TITLE} – geändert`, text: "Bitte nur in dringenden Fällen anrufen.", ab: today, ende: "offen" });
      const page = await http(`/intern/hinweis/${id}?${q}`, { cookie });
      assert.match(page.body, /Hinweis bearbeiten/);
      assert.match(page.body, /kein Enddatum und sollte regelmäßig geprüft werden/);
      const res = await send(hiddenOf(page.body));
      assert.equal(res.status, 303);
      const loc = new URL(res.headers.get("location")!);
      editSet = loc.searchParams.get("vorgang") ?? "";
      assert.equal(loc.searchParams.get("modus"), "bearbeitet");
      assert.deepEqual([(await row(id)).openEnded, await count("announcements")], [true, 1]);

      const undoPage = await http(`/intern/verlauf/${editSet}/zuruecknehmen`, { cookie });
      for (const t of ["Aktuelle Hinweise", "Aktuell in der Cockpit-Datenbank", "Nach dem Zurücknehmen", "– geändert"]) assert.ok(undoPage.body.includes(t), t);
      assert.ok(!undoPage.body.includes("Was sich ändert"), "no Praxis Puls card for a notice-only change");
      const fingerprint = undoPage.body.match(/name="fingerprint" value="([0-9a-f]{64})"/)?.[1] ?? "";
      const u = await fetch(`${BASE}/intern/verlauf/ruecknahme`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie ?? "", Origin: BASE! }, body: new URLSearchParams({ vorgang: editSet, fingerprint }) });
      assert.equal(u.status, 303);
      const x = await row(id);
      assert.deepEqual([x.title, x.openEnded, x.validUntil], [TITLE, false, addDays(today, 4)]);
      const home = await http("/intern", { cookie });
      assert.match(home.body, /Änderung an „Telefon am Freitag eingeschränkt \(HTTP-Test\)“ zurückgenommen/);
    });
  });
});
