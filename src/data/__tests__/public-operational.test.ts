// Phase 09.6B — public operational snapshot, shadow comparison and the shadow reader's transaction
// handling (pure / fake Payload). The PostgreSQL proof (static copy, divergent data, concurrent write,
// outage) is integration step 3. ARTIFICIAL divergent data only; real content files are never mutated.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Announcement, Closure, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus } from "../../domain/practice-status.ts";
import { selectPublicAnnouncements } from "../../domain/publication.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { ANNOUNCEMENTS } from "../../content/notices.ts";
import { selectHomepageHighlight } from "../../content/homepage-highlight.ts";
import { FAIL_SAFE_PULS_DATA } from "../source.ts";
import { failedOperationalSnapshot, loadPublicOperationalData, type PublicOperationalSnapshot } from "../public-operational.ts";
import { compareShadow, differenceKinds } from "../shadow-compare.ts";
import { SNAPSHOT_TRANSACTION, readPayloadOperationalDataSafely, withConsistentRead, type TransactionalReader } from "../../backend/public-operational-snapshot.ts";

const NOW = new Date("2026-10-21T08:00:00Z");
const WINDOW = {
  instants: [
    { date: "2026-10-26", time: "07:30" }, { date: "2026-10-26", time: "09:30" }, { date: "2026-10-26", time: "12:45" }, { date: "2026-10-26", time: "15:00" },
    { date: "2026-10-26", time: "19:00" }, { date: "2026-10-24", time: "10:00" }, { date: "2026-10-25", time: "10:00" }, { date: "2026-12-25", time: "10:00" },
  ],
  from: "2026-10-19",
  days: 14,
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const staticSnap = async () => loadPublicOperationalData(NOW);
const asPayload = (s: PublicOperationalSnapshot): PublicOperationalSnapshot => ({ ...clone(s), meta: { ...s.meta, source: "PAYLOAD" } });
const V = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-19", reviewDue: "2026-11-30", verifiedBy: "Test (künstlich)", sourceIds: ["TEST"] };

describe("static public loader (the ONLY public source in 09.6B)", () => {
  test("returns exactly PULS_DATA and ANNOUNCEMENTS, STATIC / OK; readAt is diagnostic time only", async () => {
    const s = await staticSnap();
    assert.strictEqual(s.puls, PULS_DATA);
    assert.strictEqual(s.announcements, ANNOUNCEMENTS);
    assert.deepEqual(s.meta, { source: "STATIC", state: "OK", readAt: NOW.toISOString() });
  });
  test("a failed snapshot is closed as a whole: fail-safe PulsData, no announcements, never static content", () => {
    const f = failedOperationalSnapshot("PAYLOAD", NOW);
    assert.strictEqual(f.puls, FAIL_SAFE_PULS_DATA);
    assert.notStrictEqual(f.puls, PULS_DATA);
    assert.deepEqual(f.announcements, []);
    assert.deepEqual(f.meta, { source: "PAYLOAD", state: "FAILED", readAt: NOW.toISOString() });
    const at = zonedToInstant("2026-10-26", "09:30");
    const r = getPracticeStatus(at, f.puls);
    assert.equal(r.status, "UNKNOWN", "no guessed OPEN");
    assert.deepEqual(selectPublicAnnouncements(f.announcements, "2026-10-26"), []);
    assert.equal(selectHomepageHighlight({ result: r, announcements: f.announcements, today: "2026-10-26" }), null, "no closure, no notice → no highlight");
  });
});

describe("shadow comparison (pure)", () => {
  test("identical data in a different storage order → equal, no differences", async () => {
    const s = await staticSnap();
    const p = asPayload(s);
    p.puls.schedule!.rules.reverse();
    p.puls.consultationTypes.reverse();
    p.puls.publicHolidays.reverse();
    const c = compareShadow(s, p, WINDOW);
    assert.deepEqual(c, { equal: true, differences: [] });
  });

  test("deliberately divergent data: every relevant difference is detected and classified", async () => {
    const s = await staticSnap();
    const p = asPayload(s);
    // Monday closes earlier (11:00 → 10:30), a verified visible notice, a closure on Thursday 29.10.
    p.puls.schedule!.rules = p.puls.schedule!.rules.map((r: OpeningHoursRule) => (r.id === "mo-1" ? { ...r, end: "10:30" } : r));
    const notice: Announcement = { id: "it-shadow-hinweis", category: "IMPORTANT", title: "Testhinweis (künstlich)", shortText: "Nur für den Vergleichstest.", validFrom: "2026-10-19", validUntil: "2026-11-30", priority: 1, homepageHighlight: true, published: true, verification: V };
    p.announcements = [...p.announcements, notice];
    const closure: Closure = { id: "it-shadow-urlaub", kind: "VACATION", startDate: "2026-10-29", endDate: "2026-10-29", announceFrom: "2026-10-19", replacements: [], verification: { ...V, reviewDue: "2026-10-29" } } as Closure;
    p.puls.closures = [closure];
    const c = compareShadow(s, p, WINDOW);
    assert.equal(c.equal, false);
    assert.deepEqual(differenceKinds(c), ["ANNOUNCEMENTS", "DAY_RULER", "HOMEPAGE_HIGHLIGHT", "PUBLIC_ANNOUNCEMENTS", "PULS_DATA", "STATUS", "WEEK_HOURS"]);
    assert.ok(c.differences.some((d) => d.kind === "PULS_DATA" && /schedule/.test(d.description)));
    assert.ok(c.differences.some((d) => d.kind === "PULS_DATA" && /closures/.test(d.description)));
    assert.ok(c.differences.some((d) => d.kind === "STATUS" && d.date === "2026-10-26" && d.time === "10:00"), "Monday 10:00 is closed in the shadow week (sampled hour; open in static)");
    assert.ok(c.differences.some((d) => d.kind === "DAY_RULER" && /Wochentag 1/.test(d.description)));
    assert.ok(c.differences.some((d) => d.kind === "WEEK_HOURS" && /Wochentag 1/.test(d.description)));
    assert.ok(!c.differences.some((d) => d.kind === "WEEK_HOURS" && /Wochentag 2/.test(d.description)), "unchanged days are not reported");
  });

  test("consultation labels come from the snapshot's own types (09.5E rule) — a label change is visible", async () => {
    const s = await staticSnap();
    const p = asPayload(s);
    p.puls.consultationTypes = p.puls.consultationTypes.map((t) => (t.code === "HEALTHY_ONLY" ? { ...t, label: "Anders benannt (Test)" } : t));
    assert.deepEqual(differenceKinds(compareShadow(s, p, WINDOW)), ["DAY_RULER", "PULS_DATA", "WEEK_HOURS"]);
  });

  test("a FAILED shadow snapshot differs (read state) and shows nothing operational", async () => {
    const c = compareShadow(await staticSnap(), failedOperationalSnapshot("PAYLOAD", NOW), WINDOW);
    assert.ok(differenceKinds(c).includes("READ_STATE"));
  });
});

describe("shadow reader transaction handling (fake Payload)", () => {
  function fake(opts: { failRead?: () => boolean; noTx?: boolean } = {}) {
    const log: string[] = [];
    const payload: TransactionalReader = {
      db: {
        beginTransaction: async (o) => {
          log.push(`begin ${JSON.stringify(o)}`);
          return opts.noTx ? null : "tx-1";
        },
        commitTransaction: async (id) => void log.push(`commit ${id}`),
        rollbackTransaction: async (id) => void log.push(`rollback ${id}`),
      },
      find: async (a) => {
        log.push(`find ${a.collection} tx=${(a.req as { transactionID?: string })?.transactionID}`);
        if (opts.failRead?.()) throw new Error("DB weg (simuliert)");
        return { docs: [] };
      },
      findGlobal: async (a) => {
        log.push(`global ${a.slug} tx=${(a.req as { transactionID?: string })?.transactionID}`);
        return null;
      },
    };
    return { payload, log };
  }

  test("one REPEATABLE READ, READ ONLY transaction for every read; committed after success", async () => {
    const { payload, log } = fake();
    const s = await readPayloadOperationalDataSafely(payload, NOW);
    assert.equal(s.meta.state, "OK");
    assert.equal(log[0], `begin ${JSON.stringify(SNAPSHOT_TRANSACTION)}`);
    assert.deepEqual(SNAPSHOT_TRANSACTION, { isolationLevel: "repeatable read", accessMode: "read only" });
    assert.ok(log.slice(1, -1).every((l) => l.endsWith("tx=tx-1")), "all 7 reads on the same transaction");
    assert.equal(log.filter((l) => l.startsWith("find") || l.startsWith("global")).length, 7);
    assert.equal(log.at(-1), "commit tx-1");
  });

  test("any failing part → whole snapshot FAILED (fail-safe, no announcements, no static), rolled back; next call recovers", async () => {
    let down = true;
    const { payload, log } = fake({ failRead: () => down });
    const failed = await readPayloadOperationalDataSafely(payload, NOW);
    assert.deepEqual([failed.meta.source, failed.meta.state], ["PAYLOAD", "FAILED"]);
    assert.strictEqual(failed.puls, FAIL_SAFE_PULS_DATA);
    assert.deepEqual(failed.announcements, []);
    assert.equal(log.at(-1), "rollback tx-1");
    assert.ok(!log.includes("commit tx-1"));
    down = false;
    assert.equal((await readPayloadOperationalDataSafely(payload, NOW)).meta.state, "OK", "no cached failure");
  });

  test("no transaction available → refused (never silently per-statement reads)", async () => {
    const { payload, log } = fake({ noTx: true });
    await assert.rejects(withConsistentRead(payload, async () => 1), /keine Datenbanktransaktion/);
    assert.ok(!log.some((l) => l.startsWith("find")));
    assert.equal((await readPayloadOperationalDataSafely(payload, NOW)).meta.state, "FAILED");
  });
});
