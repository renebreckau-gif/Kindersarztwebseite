// Step 3 of the clean-database proof: STATIC → PostgreSQL → Payload SHADOW READ (since 09.6B; before:
// repository parity). Persists datasets through the trusted seed path, reads them back with the
// consistent shadow reader (one REPEATABLE READ, READ ONLY transaction) and compares with the pure
// shadow comparator — domain snapshots AND every parent-visible derivation (status, public notices,
// homepage highlight, WeekHours, DayRuler). Plus: divergent data is detected, a concurrent cockpit-style
// commit never produces a mixed snapshot, and the shadow read is genuinely read-only.
// TECHNICAL parity only — no practice approval is implied. Artificial data only.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { Announcement, Closure } from "../../domain/content-types.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { ANNOUNCEMENTS } from "../../content/notices.ts";
import { announcementToDoc, closureToDoc, docsFromPulsData } from "../../data/payload-mapping.ts";
import { loadPublicOperationalData, type PublicOperationalSnapshot } from "../../data/public-operational.ts";
import { compareShadow, differenceKinds, type ShadowWindow } from "../../data/shadow-compare.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../payload-repository.ts";
import { readPayloadOperationalSnapshot, readPayloadOperationalDataSafely, withConsistentRead, type TransactionalReader } from "../public-operational-snapshot.ts";
import { SERVER_CONTEXT } from "../server-context.ts";
import { initialState, pulsDataOf } from "../../lab/cockpit/model.ts";
import { SCENARIOS } from "../../lab/cockpit/scenarios.ts";
import { skipDb, testPayload } from "./helpers.ts";

let payload: Payload;
const seed = { overrideAccess: true as const, context: { [SERVER_CONTEXT.SEED]: true } };
const tx = () => payload as unknown as TransactionalReader;
const V = (from: string, until: string) => ({ status: "VERIFIED_CURRENT" as const, lastVerified: from, reviewDue: until, verifiedBy: "Seed (künstlich)", sourceIds: ["TEST"] });

/** Trusted seed path: documented provenance is stored unchanged (no account, Local API only). */
async function persist(data: PulsData, announcements: Announcement[] = []) {
  await payload.db.migrateFresh({ forceAcceptWarning: true });
  const docs = docsFromPulsData(data);
  if (docs.schedule) await payload.create({ collection: "weeklySchedules", data: docs.schedule, ...seed });
  for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, ...seed });
  for (const p of docs.replacementPractices) await payload.create({ collection: "replacementPractices", data: p, ...seed });
  for (const x of docs.exceptions) await payload.create({ collection: "openingHourExceptions", data: x, ...seed });
  for (const c of docs.closures) await payload.create({ collection: "closures", data: c, ...seed });
  await payload.updateGlobal({ slug: "holidayCalendar", data: docs.holidayCalendar!, ...seed });
  for (const a of announcements) await payload.create({ collection: "announcements", data: announcementToDoc(a) as never, ...seed });
  return readPayloadOperationalSnapshot(tx());
}
const snap = (puls: PulsData, announcements: Announcement[]): PublicOperationalSnapshot => ({ puls, announcements, meta: { source: "STATIC", state: "OK", readAt: "" } });

// Representative Europe/Berlin instants (2026-10-13 is a Tuesday; DST ends 2026-10-25, starts 2027-03-28)
// + every full hour over four weeks.
const WINDOW: ShadowWindow = {
  instants: [
    ["2026-10-13", "07:30"], ["2026-10-13", "09:30"], ["2026-10-13", "12:45"], ["2026-10-13", "15:00"], ["2026-10-13", "19:00"], // before / morning / lunch / afternoon / after close
    ["2026-10-17", "10:00"], ["2026-10-18", "10:00"], ["2026-12-25", "10:00"], // Saturday, Sunday, unresolved weekday holiday
    ["2026-10-14", "10:00"], ["2026-10-14", "15:00"], ["2026-10-21", "10:00"], ["2026-10-22", "09:00"], // special hours, closure, replacement
    ["2026-10-23", "23:59"], ["2026-10-26", "09:00"], ["2026-10-25", "02:30"], ["2026-10-26", "08:00"], ["2027-03-29", "08:30"], // expiry + DST
  ].map(([date, time]) => ({ date, time })),
  from: "2026-10-12",
  days: 28,
};

// Two artificial notices (one valid, one unconfirmed → never public).
const NOTICES: Announcement[] = [
  { id: "it-hinweis-a", category: "IMPORTANT", title: "Testhinweis A (künstlich)", shortText: "Künstlicher Hinweis für den Schattenvergleich.", validFrom: "2026-10-12", validUntil: "2026-10-30", priority: 2, homepageHighlight: true, published: true, verification: V("2026-10-12", "2026-10-30") },
  { id: "it-hinweis-b", category: "IMPORTANT", title: "Testhinweis B (künstlich, unbestätigt)", shortText: "Darf nie erscheinen.", validFrom: "2026-10-12", validUntil: "2026-10-30", priority: 1, homepageHighlight: true, published: true, verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } },
];

describe("shadow read: static → PostgreSQL → consistent Payload snapshot", { skip: skipDb }, () => {
  before(async () => {
    payload = await testPayload();
  });
  after(async () => {
    await payload?.destroy();
  });

  test("current static snapshot (PulsData + announcements) copied into PostgreSQL: shadow comparison equal, no differences", async () => {
    const staticSnap = await loadPublicOperationalData();
    const shadow = await persist(staticSnap.puls, [...staticSnap.announcements, ...NOTICES]);
    assert.deepEqual([shadow.meta.source, shadow.meta.state], ["PAYLOAD", "OK"]);
    const base = snap(PULS_DATA, [...ANNOUNCEMENTS, ...NOTICES]);
    assert.deepEqual(compareShadow(base, shadow, WINDOW), { equal: true, differences: [] });
    // the derived output really covers the interesting states
    const statuses = new Set(WINDOW.instants.map(({ date, time }) => getPracticeStatus(zonedToInstant(date, time), shadow.puls).status));
    for (const s of ["UNKNOWN", "CLOSED"]) assert.ok(statuses.has(s as never), s);
    assert.deepEqual(shadow.announcements.map((a) => a.id), [...ANNOUNCEMENTS, ...NOTICES].map((a) => a.id), "deterministic notice order");
  });

  test("artificial dataset (special hours, vacation with replacement, expiry): shadow comparison equal", async () => {
    let d = initialState().data;
    for (const s of SCENARIOS.filter((x) => x.key !== "D")) d = s.build(d, "2026-10-13").next;
    const source = pulsDataOf(d);
    const shadow = await persist(source);
    assert.deepEqual(compareShadow(snap(source, []), shadow, WINDOW), { equal: true, differences: [] });
    const statuses = new Set(WINDOW.instants.map(({ date, time }) => getPracticeStatus(zonedToInstant(date, time), shadow.puls).status));
    for (const expected of ["SPECIAL_HOURS", "VACATION", "CLOSED"]) assert.ok(statuses.has(expected as never), expected);
    assert.ok(getPracticeStatus(zonedToInstant("2026-10-22", "09:00"), shadow.puls).replacementPractices.length > 0, "replacement resolved from the database");
  });

  test("deliberately divergent Payload data is detected and classified (Monday shorter, extra notice, closure)", async () => {
    await persist(PULS_DATA, ANNOUNCEMENTS);
    const s = (await payload.find({ collection: "weeklySchedules", limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as { id: number; rules: { ruleId: string; end: string }[] };
    await payload.update({ collection: "weeklySchedules", id: s.id, data: { rules: s.rules.map((r) => (r.ruleId === "mo-1" ? { ...r, end: "10:30" } : r)) } as never, ...seed });
    await payload.create({ collection: "announcements", data: announcementToDoc(NOTICES[0]) as never, ...seed });
    const closure: Closure = { id: "it-urlaub", kind: "VACATION", startDate: "2026-10-29", endDate: "2026-10-29", announceFrom: "2026-10-12", replacements: [], verification: V("2026-10-12", "2026-10-29") } as Closure;
    await payload.create({ collection: "closures", data: closureToDoc(closure) as never, ...seed });
    const c = compareShadow(snap(PULS_DATA, ANNOUNCEMENTS), await readPayloadOperationalSnapshot(tx()), WINDOW);
    assert.equal(c.equal, false);
    assert.deepEqual(differenceKinds(c), ["ANNOUNCEMENTS", "DAY_RULER", "HOMEPAGE_HIGHLIGHT", "PUBLIC_ANNOUNCEMENTS", "PULS_DATA", "STATUS", "WEEK_HOURS"]);
    assert.ok(c.differences.some((d) => d.kind === "STATUS" && d.date === "2026-10-26" && d.time === "10:00"));
    assert.ok(c.differences.some((d) => d.kind === "PUBLIC_ANNOUNCEMENTS" && /it-hinweis-a/.test(d.description)));
  });

  describe("consistency under a concurrent commit (REPEATABLE READ, READ ONLY)", () => {
    // Dataset A: static schedule + notice A, no closure. Dataset B (ONE committed transaction): closure B
    // (29.10.) + notice B2. A mixed snapshot would be detectable: "no closure + notice B2" or "closure B +
    // only notice A".
    const NOTICE_A: Announcement = { ...NOTICES[0], id: "it-hinweis-a" };
    const NOTICE_B: Announcement = { ...NOTICES[0], id: "it-hinweis-b2", title: "Testhinweis B2 (künstlich)", priority: 3 };
    const CLOSURE_B = { id: "it-urlaub-b", kind: "VACATION", startDate: "2026-10-29", endDate: "2026-10-29", announceFrom: "2026-10-12", replacements: [], verification: V("2026-10-12", "2026-10-29") } as Closure;

    async function commitDatasetB() {
      const req = await createLocalReq({ context: { [SERVER_CONTEXT.SEED]: true } }, payload);
      await initTransaction(req);
      try {
        await payload.create({ collection: "closures", data: closureToDoc(CLOSURE_B) as never, overrideAccess: true, req, context: req.context });
        await payload.create({ collection: "announcements", data: announcementToDoc(NOTICE_B) as never, overrideAccess: true, req, context: req.context });
        await commitTransaction(req);
      } catch (e) {
        await killTransaction(req);
        throw e;
      }
    }

    test("the snapshot started before the commit stays entirely Dataset A; a fresh read sees all of Dataset B", async () => {
      await persist(PULS_DATA, [NOTICE_A]);
      const inside = await withConsistentRead(tx(), async (req) => {
        const repo = new PayloadPracticeRepository(payload as unknown as PayloadReader, req);
        const puls = await repo.getPulsData(); // snapshot established here
        await commitDatasetB(); // separate connection + transaction, committed
        const announcements = await repo.getAnnouncements(); // still inside the original snapshot
        return { puls, announcements };
      });
      assert.deepEqual(inside.puls.closures, [], "Dataset A: no closure");
      assert.deepEqual(inside.announcements.map((a) => a.id), ["it-hinweis-a"], "Dataset A: notice A only — no mixed snapshot");
      const fresh = await readPayloadOperationalSnapshot(tx());
      assert.deepEqual(fresh.puls.closures.map((c) => c.id), ["it-urlaub-b"]);
      assert.deepEqual(fresh.announcements.map((a) => a.id), ["it-hinweis-a", "it-hinweis-b2"]);
    });

    test("control: the same sequence WITHOUT the snapshot transaction (default READ COMMITTED) does mix — the test is sensitive", async () => {
      await persist(PULS_DATA, [NOTICE_A]);
      const req = await createLocalReq({}, payload);
      await initTransaction(req); // adapter default (READ COMMITTED), as used by cockpit writes
      try {
        const repo = new PayloadPracticeRepository(payload as unknown as PayloadReader, req);
        const puls = await repo.getPulsData();
        await commitDatasetB();
        const announcements = await repo.getAnnouncements();
        assert.deepEqual(puls.closures, []);
        assert.deepEqual(announcements.map((a) => a.id), ["it-hinweis-a", "it-hinweis-b2"], "old PulsData + new notice = mixed");
      } finally {
        await killTransaction(req);
      }
    });
  });

  test("the shadow read is read-only: no audit, no timestamp change; a write inside its transaction is refused by PostgreSQL", async () => {
    await persist(PULS_DATA, [NOTICES[0]]);
    const state = async () => JSON.stringify(await Promise.all(["weeklySchedules", "consultationTypes", "announcements", "auditEvents"].map(async (c) => (await payload.find({ collection: c as "announcements", depth: 0, pagination: false, sort: "id", overrideAccess: true })).docs.map((d) => [d.id, (d as { updatedAt?: string }).updatedAt]))));
    const before = await state();
    for (let i = 0; i < 3; i++) await readPayloadOperationalSnapshot(tx());
    assert.equal(await state(), before);
    await assert.rejects(
      withConsistentRead(tx(), async (req) => payload.create({ collection: "announcements", data: announcementToDoc({ ...NOTICES[0], id: "it-write-attempt" }) as never, ...seed, req: req as never })),
    );
    assert.equal(await state(), before, "nothing written");
  });

  test("safe reader: OK on a healthy database; the result never contains static content on its own", async () => {
    await persist({ ...PULS_DATA, schedule: undefined }, []);
    const s = await readPayloadOperationalDataSafely(tx());
    assert.equal(s.meta.state, "OK");
    assert.equal(s.puls.schedule, undefined, "an empty database stays empty — no static fill-in");
    assert.deepEqual(s.announcements, []);
    assert.equal(getPracticeStatus(zonedToInstant(addDays("2026-10-12", 1), "09:30"), s.puls).status, "UNKNOWN");
  });
});
