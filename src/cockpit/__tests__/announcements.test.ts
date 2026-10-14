// Phase 09.5D — "Hinweis veröffentlichen" (pure; synthetic data; no database): publication domain
// (decideAnnouncement / selectPublicAnnouncements), structural rules, draft builder, undo planning,
// read model, history wording, fingerprints, form parsing.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Announcement } from "../../domain/content-types.ts";
import type { PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { decideAnnouncement, selectPublicAnnouncements } from "../../domain/publication.ts";
import { announcementShapeProblems, ANNOUNCEMENT_DEFAULT_PRIORITY } from "../../domain/announcements.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { announcementFromDoc, announcementToDoc } from "../../data/payload-mapping.ts";
import { ANNOUNCEMENTS, activeAnnouncements } from "../../content/notices.ts";
import { announcementDraft, formDefaults, inputFromAnnouncement, noticeState, validityText, type AnnouncementInput } from "../workflows/announcement.ts";
import { announcementFingerprint, datasetFingerprint, operationalFingerprint } from "../workflows/snapshot.ts";
import { planUndo, type HistoryEvent } from "../workflows/undo.ts";
import { describeGroup } from "../history.ts";
import { announcementDates } from "../facts.ts";
import { reviewItems, upcomingItems } from "../read-model.ts";
import { announcementQuery, fromSearch, parseAnnouncement } from "../workflows/form.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test Team, Praxisteam (Praxis Cockpit)", sourceIds: ["TEST"] };
const TODAY = "2026-10-13";
const NOW = zonedToInstant(TODAY, "09:30");
const notice = (p: Partial<Announcement> = {}): Announcement => ({
  id: "hinweis-a",
  category: "INFO",
  title: "Telefon am Freitag eingeschränkt",
  shortText: "Am Freitag ist die Praxis telefonisch nur von 8 bis 10 Uhr erreichbar.",
  validFrom: "2026-10-14",
  validUntil: "2026-10-16",
  priority: 10,
  homepageHighlight: false,
  published: true,
  verification: V,
  ...p,
});
const EMPTY_PULS: PulsData = { consultationTypes: [], exceptions: [], closures: [], replacementPractices: [], publicHolidays: [], holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" } };
const input = (p: Partial<AnnouncementInput> = {}): AnnouncementInput => ({ title: "Telefon am Freitag eingeschränkt", shortText: "Bitte nur in dringenden Fällen anrufen.", validFrom: TODAY, mode: "FINITE", validUntil: "2026-10-20", ...p });
const draft = (list: Announcement[], p: Partial<AnnouncementInput> = {}) => announcementDraft(list, NOW, input(p), "fp");

describe("publication domain (decideAnnouncement / selectPublicAnnouncements)", () => {
  test("finite: visible from validFrom through validUntil inclusive, gone the day after, not early", () => {
    const a = notice();
    assert.equal(decideAnnouncement(a, "2026-10-13").visible, false);
    assert.deepEqual(["2026-10-14", "2026-10-15", "2026-10-16"].map((d) => decideAnnouncement(a, d).visible), [true, true, true]);
    assert.equal(decideAnnouncement(a, "2026-10-17").visible, false);
    assert.deepEqual(selectPublicAnnouncements([a], "2026-10-16").map((x) => x.id), ["hinweis-a"]);
    assert.deepEqual(selectPublicAnnouncements([a], "2026-10-17"), []);
  });
  test("open-ended visible; draft, unverified and OUTDATED are not", () => {
    assert.equal(decideAnnouncement(notice({ validUntil: "OPEN_ENDED" }), "2027-01-01").visible, true);
    assert.equal(decideAnnouncement(notice({ published: false }), "2026-10-15").visible, false);
    assert.equal(decideAnnouncement(notice({ verification: { status: "TO_BE_CONFIRMED", sourceIds: [] } }), "2026-10-15").mode, "FALLBACK");
    assert.equal(decideAnnouncement(notice({ verification: { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: [] } }), "2026-10-15").mode, "BLOCKED");
    assert.deepEqual(selectPublicAnnouncements([notice({ id: "b", priority: 20 }), notice({ id: "a", priority: 1 })], "2026-10-15").map((x) => x.id), ["a", "b"], "priority order");
  });
  test("the public wrapper is unchanged: static ANNOUNCEMENTS through the same selector", () => {
    for (const d of ["2026-07-20", "2026-10-13", "2027-01-01"]) assert.deepEqual(activeAnnouncements(d), selectPublicAnnouncements(ANNOUNCEMENTS, d));
    assert.deepEqual(activeAnnouncements("2026-07-20"), [], "the OUTDATED summer notice never renders");
  });
});

describe("structural rules (one helper for cockpit and collection hook)", () => {
  const ok = { title: "T", shortText: "X", validFrom: "2026-10-14", validUntil: "2026-10-15", openEnded: false };
  test("valid finite and open-ended shapes", () => {
    assert.deepEqual(announcementShapeProblems(ok), []);
    assert.deepEqual(announcementShapeProblems({ ...ok, validUntil: null, openEnded: true }), []);
  });
  test("rejects empty / too long text, bad dates, end before start, invalid finite/open-ended combinations", () => {
    const fields = (x: object) => announcementShapeProblems({ ...ok, ...x }).map((p) => p.field);
    assert.deepEqual(fields({ title: "   " }), ["title"]);
    assert.deepEqual(fields({ title: "x".repeat(81) }), ["title"]);
    assert.deepEqual(fields({ shortText: "" }), ["shortText"]);
    assert.deepEqual(fields({ shortText: "x".repeat(281) }), ["shortText"]);
    assert.deepEqual(fields({ validFrom: "2026-02-30" }), ["validFrom"]);
    assert.deepEqual(fields({ validUntil: "2026-10-13" }), ["validUntil"]);
    assert.deepEqual(fields({ validUntil: null }), ["validUntil"], "missing end without openEnded");
    assert.deepEqual(fields({ openEnded: true }), ["validUntil"], "open-ended with an end date");
  });
  test("storage round trip: OPEN_ENDED ↔ openEnded=true + validUntil=null", () => {
    const open = notice({ validUntil: "OPEN_ENDED" });
    const doc = announcementToDoc(open);
    assert.deepEqual([doc.openEnded, doc.validUntil], [true, null]);
    assert.equal(announcementFromDoc(doc).validUntil, "OPEN_ENDED");
    const fin = announcementToDoc(notice());
    assert.deepEqual([fin.openEnded, fin.validUntil], [false, "2026-10-16"]);
    assert.equal(announcementFromDoc(fin).validUntil, "2026-10-16");
  });
});

describe("draft: create", () => {
  test("finite notice: INFO, default priority, no highlight, published by the server, reviewDue = end", () => {
    const r = draft([]);
    assert.ok(r.draft.ok);
    const rec = r.draft.ok ? r.draft.record : undefined!;
    assert.deepEqual([rec.id, rec.category, rec.priority, rec.homepageHighlight, rec.published, rec.validUntil], ["hinweis-2026-10-13", "INFO", ANNOUNCEMENT_DEFAULT_PRIORITY, false, true, "2026-10-20"]);
    assert.equal(r.draft.ok && r.draft.reviewDue, "2026-10-20");
    assert.deepEqual(r.details.moments.map((m) => [m.kind, m.date]), [["TODAY", TODAY], ["END", "2026-10-20"], ["AFTER", "2026-10-21"]], "today = start (deduplicated)");
    for (const m of r.details.moments) assert.deepEqual(m.decision, decideAnnouncement(rec, m.date), "every preview date through decideAnnouncement");
    assert.equal(r.details.moments.at(-1)!.after.length, 0, "gone the day after");
    assert.match(r.draft.ok ? r.draft.effect : "", /Sichtbar vom 13\. Oktober bis 20\. Oktober/);
  });
  test("future start: preview today (not yet visible) and on the start date", () => {
    const r = draft([], { validFrom: "2026-10-15" });
    assert.deepEqual(r.details.moments.map((m) => [m.kind, m.decision.visible]), [["TODAY", false], ["START", true], ["END", true], ["AFTER", false]]);
  });
  test("open-ended: reviewDue = today + 30 days; preview includes the review date; note shown", () => {
    const r = draft([], { mode: "OPEN", validUntil: "" });
    assert.ok(r.draft.ok);
    assert.equal(r.draft.ok && r.draft.record.validUntil, "OPEN_ENDED");
    assert.equal(r.details.reviewDue, "2026-11-12");
    assert.deepEqual(r.details.moments.map((m) => m.kind), ["TODAY", "REVIEW"]);
    assert.match(r.draft.ok ? r.draft.effect : "", /kein Enddatum und sollte regelmäßig geprüft werden/);
    assert.equal(validityText(r.draft.ok ? r.draft.record : notice()), "Ab 13. Oktober ohne Enddatum");
  });
  test("whitespace is normalized", () => {
    const r = draft([], { title: "  Telefon   eingeschränkt ", shortText: " a \n  b " });
    assert.deepEqual(r.draft.ok && [r.draft.record.title, r.draft.record.shortText], ["Telefon eingeschränkt", "a b"]);
  });
});

describe("draft: invalid data (blocked, plain German, per section)", () => {
  const blocked = (p: Partial<AnnouncementInput>, section: string, re?: RegExp, list: Announcement[] = []) => {
    const r = draft(list, p);
    assert.equal(r.draft.ok, false);
    const hit = r.details.problems.find((x) => x.section === section);
    assert.ok(hit, JSON.stringify(r.details.problems));
    if (re) assert.match(hit.message, re);
  };
  test("title, text, dates, finite/open choice", () => {
    blocked({ title: "" }, "titel", /Titel eingeben/);
    blocked({ title: "x".repeat(81) }, "titel", /höchstens 80/);
    blocked({ shortText: " " }, "text");
    blocked({ shortText: "x".repeat(281) }, "text", /höchstens 280/);
    blocked({ validFrom: "13.10.2026" }, "zeitraum", /kein gültiges Datum/);
    blocked({ validFrom: "2026-10-12" }, "zeitraum", /Vergangenheit/);
    blocked({ validFrom: "2026-10-15", validUntil: "2026-10-14" }, "zeitraum", /vor „Gültig ab“/);
    blocked({ validUntil: "" }, "zeitraum", /Enddatum/);
    blocked({ mode: undefined }, "zeitraum", /mit Enddatum oder ohne/);
  });
});

describe("draft: edit", () => {
  const existing = notice({ id: "hinweis-x", category: "URGENT", priority: 3, homepageHighlight: true, validFrom: "2026-10-10", validUntil: "2026-10-20" });
  test("same record id; category, priority and homepage highlight preserved; running start kept", () => {
    const r = announcementDraft([existing], NOW, { ...inputFromAnnouncement(existing), title: "Telefon am Freitag ganz geschlossen", validUntil: "2026-10-24" }, "fp");
    assert.ok(r.draft.ok, JSON.stringify(r.details.problems));
    const rec = r.draft.ok ? r.draft.record : undefined!;
    assert.deepEqual([r.draft.ok && r.draft.mode, rec.id, rec.category, rec.priority, rec.homepageHighlight, rec.validFrom], ["EDIT", "hinweis-x", "URGENT", 3, true, "2026-10-10"]);
    assert.match(r.draft.ok ? r.draft.effect : "", /^Bisher: „Telefon am Freitag eingeschränkt“/);
  });
  test("switch to open-ended and back; another past start is refused; no change is reported", () => {
    assert.equal(announcementDraft([existing], NOW, { ...inputFromAnnouncement(existing), mode: "OPEN", validUntil: "" }, "fp").draft.ok, true);
    const past = announcementDraft([existing], NOW, { ...inputFromAnnouncement(existing), validFrom: "2026-10-11" }, "fp");
    assert.match(past.details.problems[0].message, /ursprünglichen Beginn/);
    const same = announcementDraft([existing], NOW, inputFromAnnouncement(existing), "fp");
    assert.equal(!same.draft.ok && same.draft.blocked.code, "NO_CHANGE");
  });
  test("an unpublished draft becomes published only through a full, valid publish", () => {
    const d = notice({ id: "entwurf", published: false });
    const r = announcementDraft([d], NOW, inputFromAnnouncement(d), "fp");
    assert.equal(r.draft.ok && r.draft.record.published, true);
  });
  test("not editable: unknown, expired", () => {
    for (const list of [[], [notice({ id: "hinweis-x", validFrom: "2026-10-01", validUntil: "2026-10-05" })]]) {
      const r = announcementDraft(list, NOW, { ...input(), recordId: "hinweis-x" }, "fp");
      assert.equal(!r.draft.ok && r.draft.blocked.code, "NOT_EDITABLE");
    }
  });
});

describe("form parsing: only the four person-chosen fields", () => {
  test("smuggled server fields are never read", () => {
    const q = Object.fromEntries(new URLSearchParams(announcementQuery(input())));
    const parsed = parseAnnouncement(fromSearch({ ...q, category: "URGENT", priority: "1", homepageHighlight: "true", published: "false", verifiedBy: "x", reviewDue: "2099-01-01", recordState: "RETIRED", changeSetId: "x", rolle: "ADMIN", recordId: "fremd" }));
    assert.deepEqual(parsed, input());
    assert.equal(parseAnnouncement(fromSearch({ eintrag: "../x" })).recordId, "");
    assert.deepEqual(formDefaults(TODAY), { title: "", shortText: "", validFrom: TODAY, mode: "FINITE", validUntil: "2026-10-27" });
  });
});

describe("undo planning for announcements (same change-set lifecycle)", () => {
  const CS = "11111111-1111-4111-8111-111111111111";
  const ev = (p: Partial<HistoryEvent> & Pick<HistoryEvent, "eventId" | "operation">): HistoryEvent => ({
    at: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
    actorId: "1",
    actorName: "Test Team",
    actorRole: "STAFF",
    entityType: "announcements",
    entityId: "hinweis-a",
    previous: null,
    next: null,
    changeSetId: CS,
    ...p,
  });
  const key = "announcements:hinweis-a";
  const plan = (a: Announcement, e: HistoryEvent, now = NOW, list = [a]) =>
    planUndo({ group: [e], latest: { [key]: e.eventId }, records: { [key]: { ...announcementToDoc(a), recordState: "ACTIVE" } }, data: EMPTY_PULS, announcements: list, now, role: "STAFF" });

  test("CREATE → RETIRE; the notice leaves the ACTIVE list; Puls data untouched", () => {
    const a = notice();
    const p = plan(a, ev({ eventId: "c", operation: "CREATE", next: announcementToDoc(a) }));
    assert.ok(p.ok, !p.ok ? p.message : "");
    assert.deepEqual(p.ok && [p.actions.map((x) => x.kind), p.announcementsAfter, p.touches], [["RETIRE"], [], { puls: false, announcements: true }]);
  });
  test("EDIT → RESTORE of every business field on the same record (provenance re-issued)", () => {
    const before = notice({ category: "IMPORTANT", priority: 2, homepageHighlight: true, published: false });
    const after = notice({ title: "Neu", shortText: "Neu", validUntil: "OPEN_ENDED", category: "IMPORTANT", priority: 2, homepageHighlight: true, published: true });
    const p = plan(after, ev({ eventId: "u", operation: "UPDATE", previous: announcementToDoc(before), next: announcementToDoc(after) }));
    assert.ok(p.ok, !p.ok ? p.message : "");
    const restored = p.ok ? p.announcementsAfter[0] : undefined!;
    const { verification: _a, ...gotBusiness } = restored;
    const { verification: _b, ...wantBusiness } = before;
    assert.deepEqual(gotBusiness, wantBusiness);
    assert.deepEqual([restored.verification.lastVerified, restored.verification.reviewDue], [TODAY, "2026-10-16"]);
  });
  test("latest-change rule, expired finite notice, open-ended notice", () => {
    const a = notice();
    const older = planUndo({ group: [ev({ eventId: "a", operation: "UPDATE", previous: announcementToDoc(a), next: announcementToDoc(a) })], latest: { [key]: "b" }, records: { [key]: { ...announcementToDoc(a), recordState: "ACTIVE" } }, data: EMPTY_PULS, announcements: [a], now: NOW, role: "STAFF" });
    assert.equal(!older.ok && older.code, "LATER_CHANGE");
    const short = notice({ validFrom: TODAY, validUntil: TODAY });
    const over = plan(short, ev({ eventId: "c", operation: "CREATE", next: announcementToDoc(short) }), zonedToInstant("2026-10-14", "00:05"));
    assert.equal(!over.ok && over.code, "EFFECT_OVER");
    const open = notice({ validUntil: "OPEN_ENDED" });
    assert.equal(plan(open, ev({ eventId: "c", operation: "CREATE", next: announcementToDoc(open) }), zonedToInstant("2026-10-14", "08:00")).ok, true);
  });
  test("ANNOUNCEMENT confirmation is required (role mapping); a signed-out person cannot plan", () => {
    const a = notice();
    const p = planUndo({ group: [ev({ eventId: "c", operation: "CREATE", next: announcementToDoc(a) })], latest: { [key]: "c" }, records: { [key]: { ...announcementToDoc(a), recordState: "ACTIVE" } }, data: EMPTY_PULS, announcements: [a], now: NOW, role: null });
    assert.equal(!p.ok && p.code, "NOT_ALLOWED");
  });
  test("history labels in plain German", () => {
    const a = notice();
    assert.equal(describeGroup([ev({ eventId: "c", operation: "CREATE", next: announcementToDoc(a) })], TODAY), "„Telefon am Freitag eingeschränkt“ veröffentlicht");
    assert.equal(describeGroup([ev({ eventId: "u", operation: "UPDATE", next: announcementToDoc(a) })], TODAY), "„Telefon am Freitag eingeschränkt“ geändert");
    assert.equal(describeGroup([ev({ eventId: "r", operation: "REVERT", next: { ...announcementToDoc(a), recordState: "RETIRED" } })], TODAY), "„Telefon am Freitag eingeschränkt“ zurückgenommen");
  });
  test("undo preview dates: today and a future start of a changed notice", () => {
    assert.deepEqual(announcementDates([notice()], [], TODAY), [TODAY, "2026-10-14"]);
  });
});

describe("fingerprints: one canonical hash, three views", () => {
  test("announcement changes alter the announcement and operational hash, never the Puls hash", () => {
    const a = [notice()];
    const b = [notice({ title: "anders" })];
    assert.equal(datasetFingerprint(EMPTY_PULS), datasetFingerprint(EMPTY_PULS));
    assert.notEqual(announcementFingerprint(a), announcementFingerprint(b));
    assert.notEqual(operationalFingerprint({ data: EMPTY_PULS, announcements: a }), operationalFingerprint({ data: EMPTY_PULS, announcements: b }));
    assert.equal(announcementFingerprint([notice({ id: "x" }), notice({ id: "y" })]), announcementFingerprint([notice({ id: "y" }), notice({ id: "x" })]), "order-independent");
  });
});

describe("cockpit read model: Nächste Termine and Prüfen", () => {
  test("current / future notices with state, confirmation and edit link; expired ones are history", () => {
    const items = upcomingItems(EMPTY_PULS, [notice({ id: "jetzt", validFrom: TODAY }), notice({ id: "spaeter" }), notice({ id: "alt", validFrom: "2026-10-01", validUntil: "2026-10-05" })], TODAY);
    const by = (id: string) => items.find((i) => i.id === id)!;
    assert.equal(by("jetzt").detail, "Sichtbar");
    assert.match(by("spaeter").detail!, /^Sichtbar ab Mittwoch, 14\. Oktober/);
    assert.equal(by("jetzt").editHref, "/intern/hinweis/jetzt");
    assert.equal(by("jetzt").confirmation, "Bestätigt von Test Team");
    assert.equal(items.some((i) => i.id === "alt"), false);
  });
  test("Prüfen: open-ended notice at its review date; a future start or a finite end raises nothing", () => {
    const due = notice({ id: "offen", validFrom: "2026-09-01", validUntil: "OPEN_ENDED", verification: { ...V, reviewDue: TODAY } });
    const items = reviewItems(EMPTY_PULS, TODAY, [due, notice({ id: "zukunft" }), notice({ id: "endlich", validFrom: TODAY })]);
    const notices = (list: { id: string }[]) => list.map((i) => i.id).filter((id) => id.startsWith("notice-"));
    assert.deepEqual(notices(items), ["notice-review-offen"]);
    const overdue = notice({ id: "alt-bestaetigt", validFrom: "2026-01-01", validUntil: "OPEN_ENDED", verification: { ...V, reviewDue: "2026-05-01" } });
    assert.deepEqual(notices(reviewItems(EMPTY_PULS, TODAY, [overdue])), ["notice-review-alt-bestaetigt"]);
    assert.equal(noticeState(notice(), TODAY).label, "Sichtbar ab 14. Oktober");
  });
});
