// Phase 09.2 — repository boundary, static source, parity of the Payload mapping, fail-safe.
// In-memory only: no database, no network. The fake Payload reader serves documents produced by
// the mapping (JSON round-trip, i.e. how documents come back from storage with nulls).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { ANNOUNCEMENTS } from "../../content/notices.ts";
import { SITE_STAGE, RELEASE } from "../../content/release.ts";
import { resolvePuls } from "../../content/puls.ts";
import { DATA_SOURCE, FAIL_SAFE_PULS_DATA, getPracticeRepository, readPulsDataSafely } from "../source.ts";
import { StaticPracticeRepository, staticPulsData } from "../static-repository.ts";
import { announcementFromDoc, announcementToDoc, docsFromPulsData, pulsDataFromDocs, type PracticeDocs } from "../payload-mapping.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../../backend/payload-repository.ts";
import { initialState, pulsDataOf } from "../../lab/cockpit/model.ts";
import { SCENARIOS } from "../../lab/cockpit/scenarios.ts";
import type { PracticeRepository } from "../contracts.ts";

const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Instants every 90 minutes over `days` days, covering nights, weekends, holidays. */
function instants(from: string, days: number): Date[] {
  const out: Date[] = [];
  for (let d = 0; d < days; d++) for (let m = 0; m < 24 * 60; m += 90) out.push(zonedToInstant(addDays(from, d), `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`));
  return out;
}

function assertSameStatus(a: PulsData, b: PulsData, from: string, days: number) {
  for (const at of instants(from, days)) assert.deepEqual(getPracticeStatus(at, b), getPracticeStatus(at, a), at.toISOString());
}

/** Fake Local API over a document set. */
function fakeReader(docs: PracticeDocs, announcements = ANNOUNCEMENTS.map(announcementToDoc)): PayloadReader {
  const collections: Record<string, unknown[]> = roundTrip({
    weeklySchedules: docs.schedule ? [docs.schedule] : [],
    consultationTypes: docs.consultationTypes,
    openingHourExceptions: docs.exceptions,
    closures: docs.closures,
    replacementPractices: docs.replacementPractices,
    announcements,
  });
  return {
    find: async ({ collection }) => ({ docs: collections[collection] ?? [] }),
    findGlobal: async () => roundTrip(docs.holidayCalendar),
  };
}

// Mock cockpit data with exceptions, closures and replacements (invented test data, never practice data).
function richMockData(): PulsData {
  let d = initialState().data;
  for (const s of SCENARIOS.filter((x) => x.key !== "D")) d = s.build(d, "2026-10-13").next;
  return pulsDataOf(d);
}

describe("data source boundary", () => {
  test("STATIC is the active source; separate from SITE_STAGE; staging rules unchanged", () => {
    assert.equal(DATA_SOURCE, "STATIC");
    assert.equal(getPracticeRepository().source, "STATIC");
    assert.equal(SITE_STAGE, "STAGING");
    assert.equal(RELEASE.indexable, false);
    assert.equal(RELEASE.meinArztbesuchPublished, false);
  });

  test("static repository serves exactly the current content", async () => {
    const repo = new StaticPracticeRepository();
    assert.equal(await repo.getPulsData(), PULS_DATA);
    assert.equal(await repo.getAnnouncements(), ANNOUNCEMENTS);
    assert.equal(staticPulsData(), PULS_DATA);
  });

  test("public Praxis Puls output is unchanged by the repository wiring", () => {
    for (const at of instants("2026-10-12", 21)) {
      assert.deepEqual(resolvePuls({}, at), resolvePuls({}, at, PULS_DATA));
      assert.deepEqual(resolvePuls({}, at).result, getPracticeStatus(at, PULS_DATA));
    }
  });
});

describe("fail-safe", () => {
  test("missing data resolves to UNKNOWN — never a guessed OPEN", () => {
    for (const at of instants("2026-10-12", 7)) {
      const r = getPracticeStatus(at, FAIL_SAFE_PULS_DATA);
      assert.equal(r.status, "UNKNOWN");
      assert.notEqual(r.indicator, "OPEN");
    }
  });

  test("a failing repository read yields the fail-safe dataset", async () => {
    const broken: PracticeRepository = { source: "PAYLOAD", getPulsData: async () => Promise.reject(new Error("db down")), getAnnouncements: async () => [] };
    const r = await readPulsDataSafely(broken);
    assert.equal(r.failed, true);
    assert.equal(r.data, FAIL_SAFE_PULS_DATA);
    const ok = await readPulsDataSafely(new StaticPracticeRepository());
    assert.equal(ok.failed, false);
  });

  test("an unverified holiday policy from documents never becomes 'closed on holidays'", () => {
    const docs = docsFromPulsData(PULS_DATA);
    const d = pulsDataFromDocs({ ...docs, holidayCalendar: { ...docs.holidayCalendar!, policy: "CLOSED_ON_PUBLIC_HOLIDAYS", policyVerification: null } });
    assert.deepEqual(d.holidayPolicy, { mode: "REQUIRE_EXPLICIT_ENTRY" });
  });

  test("no weekly schedule document → UNKNOWN", () => {
    const d = pulsDataFromDocs({ ...docsFromPulsData(PULS_DATA), schedule: null });
    assert.equal(getPracticeStatus(zonedToInstant("2026-10-13", "09:00"), d).status, "UNKNOWN");
  });
});

describe("parity: static vs. Payload documents", () => {
  test("current site data: mapping round-trip is lossless", () => {
    assert.deepEqual(pulsDataFromDocs(roundTrip(docsFromPulsData(PULS_DATA))), PULS_DATA);
  });

  test("current site data: identical engine result at every sampled instant (8 weeks)", () => {
    assertSameStatus(PULS_DATA, pulsDataFromDocs(roundTrip(docsFromPulsData(PULS_DATA))), "2026-10-12", 56);
  });

  test("rich mock data (exceptions, closures, replacements): lossless and identical status", () => {
    const rich = richMockData();
    assert.ok(rich.exceptions.length > 0 && rich.closures.length > 0 && rich.replacementPractices.length > 0);
    const back = pulsDataFromDocs(roundTrip(docsFromPulsData(rich)));
    assert.deepEqual(back, rich);
    assertSameStatus(rich, back, "2026-10-12", 21);
  });

  test("PayloadPracticeRepository returns the same PulsData and announcements as the static source", async () => {
    const repo = new PayloadPracticeRepository(fakeReader(docsFromPulsData(PULS_DATA)));
    assert.equal(repo.source, "PAYLOAD");
    assert.deepEqual(await repo.getPulsData(), PULS_DATA);
    assert.deepEqual(await repo.getAnnouncements(), ANNOUNCEMENTS.map((a) => announcementFromDoc(roundTrip(announcementToDoc(a)))));
    for (const a of ANNOUNCEMENTS) {
      const { fullText: _ignored, ...rest } = a;
      assert.deepEqual(announcementFromDoc(roundTrip(announcementToDoc(a))), rest);
    }
  });
});
