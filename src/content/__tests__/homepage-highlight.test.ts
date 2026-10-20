// Phase 10.0A — start-page highlight (customer decision Variant B): at most ONE notice, from the
// engine's upcomingClosure or a homepageHighlight announcement after the public publication
// rule. Pure; artificial data through the REAL engine (getPracticeStatus). No public fixtures.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Announcement, Closure, OpeningHoursRule } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { closureWhen, highlightedAnnouncementIds, selectHomepageHighlight } from "../homepage-highlight.ts";
import { ANNOUNCEMENTS, homeChapterAnnouncements } from "../notices.ts";
import { PRACTICE } from "../practice.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}-${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const TODAY = "2026-10-13"; // Tuesday
const NOW = zonedToInstant(TODAY, "09:30");
const closure = (p: Partial<Closure> = {}): Closure => ({ id: "urlaub", kind: "VACATION", startDate: "2026-10-19", endDate: "2026-10-23", announceFrom: "2026-10-05", replacements: [], verification: { ...V, reviewDue: "2026-10-23" }, ...p });
const notice = (p: Partial<Announcement> = {}): Announcement => ({ id: "n", category: "INFO", title: "Telefon eingeschränkt", shortText: "Kurz.", validFrom: "2026-10-01", validUntil: "2026-10-31", priority: 10, homepageHighlight: false, published: true, verification: V, ...p });
const pick = (closures: Closure[], announcements: Announcement[] = [], now = NOW) => {
  const result = getPracticeStatus(now, { ...DATA, closures });
  return { result, highlight: selectHomepageHighlight({ result, announcements, today: result.evaluatedAt.localDate }) };
};

describe("homepage highlight: selection (max one)", () => {
  test("nothing eligible → null (the card renders nothing)", () => {
    assert.equal(pick([]).highlight, null);
    assert.equal(pick([], [notice()]).highlight, null, "a visible notice without homepageHighlight is not highlighted");
  });

  test("current static public data produces NO highlight (no fake content)", () => {
    for (const d of ["2026-07-20", TODAY, "2026-12-01"]) {
      const result = getPracticeStatus(zonedToInstant(d, "09:30"), DATA);
      assert.equal(selectHomepageHighlight({ result, announcements: ANNOUNCEMENTS, today: d }), null, d);
    }
  });

  test("announced upcoming vacation: one highlight with vacation semantics, real dates, link to /heute", () => {
    const { highlight } = pick([closure()]);
    assert.deepEqual(highlight, { kind: "CLOSURE", sourceId: "urlaub", tone: "closure", eyebrow: "Praxisurlaub", title: "Urlaub vom 19.–23. Oktober", href: "/heute", linkLabel: "Mehr unter „Heute“" });
  });

  test("not yet announced (announceFrom in the future) → nothing; training and other copy; public message as detail", () => {
    assert.equal(pick([closure({ announceFrom: "2026-10-15" })]).highlight, null);
    const t = pick([closure({ kind: "TRAINING", startDate: "2026-10-24", endDate: "2026-10-24", verification: { ...V, reviewDue: "2026-10-24" } })]).highlight!;
    assert.deepEqual([t.eyebrow, t.title], ["Hinweis", "Fortbildung am 24. Oktober"]);
    const o = pick([closure({ kind: "OTHER", publicMessage: "Wegen Umbau geschlossen." })]).highlight!;
    assert.deepEqual([o.eyebrow, o.title, o.detail], ["Aktueller Hinweis", "Praxis geschlossen vom 19.–23. Oktober", "Wegen Umbau geschlossen."]);
    assert.equal(closureWhen("2026-10-30", "2026-11-02"), "vom 30. Oktober bis 2. November");
    assert.equal(closureWhen("2026-12-30", "2027-01-02"), "vom 30. Dezember 2026 bis 2. Januar 2027");
  });

  test("unverified closure: the engine does not announce it → nothing", () => {
    assert.equal(pick([closure({ verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } })]).highlight, null);
  });

  test("closure active today: PRAXIS PULS says it — no second closure message", () => {
    const { result, highlight } = pick([closure({ id: "jetzt", startDate: "2026-10-12", endDate: "2026-10-14" }), closure()]);
    assert.equal(result.activeClosure?.id, "jetzt");
    assert.notEqual(result.indicator, "OPEN");
    assert.equal(highlight, null);
  });

  test("announcements: only homepageHighlight ones; priority order; still exactly one", () => {
    assert.equal(pick([], [notice({ id: "a" }), notice({ id: "b", homepageHighlight: true })]).highlight?.sourceId, "b");
    const many = pick([], [notice({ id: "b", homepageHighlight: true, priority: 20 }), notice({ id: "c", homepageHighlight: true, priority: 5 })]).highlight!;
    assert.deepEqual([many.sourceId, many.kind, many.tone, many.title, many.detail, many.href], ["c", "ANNOUNCEMENT", "notice", "Telefon eingeschränkt", "Kurz.", "/heute/aktuelles"]);
  });

  test("upcoming closure wins over a highlighted announcement", () => {
    const h = pick([closure()], [notice({ homepageHighlight: true })]).highlight!;
    assert.equal(h.kind, "CLOSURE");
  });

  test("publication rules are reused (selectPublicAnnouncements), not recreated", () => {
    const hl = (p: Partial<Announcement>) => pick([], [notice({ homepageHighlight: true, ...p })]).highlight;
    assert.equal(hl({ verification: { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: [] } }), null);
    assert.equal(hl({ verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } }), null);
    assert.equal(hl({ published: false }), null);
    assert.equal(hl({ validFrom: "2026-10-20" }), null, "future validFrom");
    assert.equal(pick([], [notice({ homepageHighlight: true, validFrom: "2026-10-20" })], zonedToInstant("2026-10-20", "09:00")).highlight?.sourceId, "n", "visible from its first day");
  });
});

describe("homepage: no duplication below, e-mail source", () => {
  test("the highlighted announcement is not repeated in the Heute chapter; others remain", () => {
    const list = [notice({ id: "a" }), notice({ id: "b", homepageHighlight: true })];
    const h = pick([], list).highlight;
    assert.deepEqual(highlightedAnnouncementIds(h), ["b"]);
    assert.deepEqual(homeChapterAnnouncements(TODAY, highlightedAnnouncementIds(h), list).map((a) => a.id), ["a"]);
    assert.deepEqual(highlightedAnnouncementIds(pick([closure()]).highlight), [], "a closure highlight excludes no announcement");
    assert.deepEqual(homeChapterAnnouncements(TODAY), [], "static public list unchanged (empty today)");
  });

  test("e-mail comes from the practice master data (F17), unchanged provenance", () => {
    assert.equal(PRACTICE.email.value, "kinderarztpraxis-hettstedt@gmx.de");
    assert.equal(PRACTICE.email.verification.status, "VERIFIED_CURRENT");
  });
});
