// Phase 09.4 — real cockpit read model, Website-Vorschau and navigation (pure; synthetic data).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Announcement, Closure, OpeningHourException, OpeningHoursRule, ReplacementPractice } from "../../domain/content-types.ts";
import { getPracticeStatus, type PulsData } from "../../domain/practice-status.ts";
import type { FactVerification } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { cockpitHome, reviewItems, upcomingItems, dayPlan } from "../read-model.ts";
import { comparePreview, previewInstant } from "../preview.ts";
import { cockpitNav } from "../navigation.ts";

const V: FactVerification = { status: "VERIFIED_CURRENT", lastVerified: "2026-10-01", reviewDue: "2027-04-01", verifiedBy: "Test", sourceIds: ["TEST"] };
const OPEN: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [] };
const rule = (d: number, start: string, end: string): OpeningHoursRule => ({ id: `r${d}${start}`, weekday: d as 1, start, end, consultationType: "GENERAL", verification: V });
const DATA: PulsData = {
  schedule: { rules: [1, 2, 3, 4, 5].flatMap((d) => [rule(d, "08:00", "12:00"), rule(d, "14:00", "16:00")]), confirmedClosedWeekdays: [6, 7], verification: V },
  consultationTypes: [{ code: "GENERAL", label: "Sprechstunde", verification: V }],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};
const practice = (id: string, verification: FactVerification): ReplacementPractice => ({ id, practiceName: `Praxis ${id}`, contactPersons: [], street: "x", postalCode: "0", city: "x", phone: "0", verification });
const vacation = (id: string, from: string, to: string, reps: string[] = [], verification = V): Closure => ({
  id,
  kind: "VACATION",
  startDate: from,
  endDate: to,
  replacements: reps.map((r) => ({ replacementPracticeId: r, from, until: to })),
  verification,
});
const special = (id: string, date: string, verification = V): OpeningHourException => ({ id, kind: "SPECIAL_HOURS", startDate: date, endDate: date, intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }], priority: 1, verification });
const notice = (id: string, from: string, until: string | "OPEN_ENDED", published = true): Announcement => ({ id, category: "INFO", title: `Hinweis ${id}`, shortText: "x", validFrom: from, validUntil: until, priority: 1, homepageHighlight: false, published, verification: V });
const TODAY = "2026-10-13"; // Tuesday
const NOW = zonedToInstant(TODAY, "09:30");

describe("Praxis heute (engine, not React)", () => {
  test("today's status is exactly the engine result for the given data and instant", () => {
    const home = cockpitHome({ data: DATA, announcements: [], now: NOW });
    assert.deepEqual(home.today.result, getPracticeStatus(NOW, DATA));
    assert.equal(home.today.date, TODAY);
    assert.equal(home.today.time, "09:30");
    assert.deepEqual(home.today.hours, [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "16:00" }]);
  });

  test("day plan follows closures and exceptions", () => {
    const data = { ...DATA, closures: [vacation("u", "2026-10-19", "2026-10-23")], exceptions: [special("s", "2026-10-14")] };
    assert.deepEqual(dayPlan(data, "2026-10-20"), []);
    assert.deepEqual(dayPlan(data, "2026-10-14"), [{ start: "09:00", end: "11:00" }]);
    assert.deepEqual(dayPlan(data, "2026-10-17"), []);
  });
});

describe("Nächste Termine", () => {
  const data: PulsData = {
    ...DATA,
    replacementPractices: [practice("A", V)],
    closures: [vacation("alt", "2026-09-01", "2026-09-05"), vacation("spaeter", "2026-11-02", "2026-11-06", ["A"]), vacation("laeuft", "2026-10-12", "2026-10-14")],
    exceptions: [special("sonder", "2026-10-20"), special("vorbei", "2026-10-12"), special("weit", "2027-06-01")],
  };
  const items = upcomingItems(data, [notice("n1", "2026-10-15", "2026-10-30"), notice("abgelaufen", "2026-10-01", "2026-10-10"), notice("entwurf", "2026-10-16", "OPEN_ENDED", false)], TODAY);

  test("chronological, current ones first, beyond the horizon excluded", () => {
    assert.deepEqual(items.map((i) => i.id), ["laeuft", "n1", "sonder", "spaeter"]);
    assert.equal(items[0].active, true);
    assert.equal(items.find((i) => i.id === "spaeter")!.detail, "Vertretung: Praxis A");
  });

  test("expired records and unpublished notices are not shown (they stay history)", () => {
    for (const gone of ["alt", "vorbei", "abgelaufen", "entwurf", "weit"]) assert.ok(!items.some((i) => i.id === gone), gone);
  });

  test("end date is inclusive (Berlin calendar day)", () => {
    const last = upcomingItems({ ...DATA, closures: [vacation("x", "2026-10-10", TODAY)] }, [], TODAY);
    assert.deepEqual(last.map((i) => i.id), ["x"]);
    assert.deepEqual(upcomingItems({ ...DATA, closures: [vacation("x", "2026-10-10", "2026-10-12")] }, [], TODAY), []);
  });
});

describe("Prüfen — only actionable items", () => {
  test("unresolved weekday holiday → item; resolved or weekend holiday → none", () => {
    const withHoliday = { ...DATA, publicHolidays: ["2026-10-20", "2026-10-24"] }; // Tue, Sat
    assert.deepEqual(reviewItems(withHoliday, TODAY).map((i) => i.id), ["holiday-2026-10-20"]);
    const resolved = { ...withHoliday, closures: [vacation("feiertag", "2026-10-20", "2026-10-20")] };
    assert.deepEqual(reviewItems(resolved, TODAY).filter((i) => i.id.startsWith("holiday")), []);
    const far = { ...DATA, publicHolidays: ["2027-03-01"] };
    assert.deepEqual(reviewItems(far, TODAY), []);
  });

  test("replacement practice that cannot be shown during a coming closure → item", () => {
    const stale = { ...DATA, replacementPractices: [practice("A", OPEN)], closures: [vacation("u", "2026-11-02", "2026-11-06", ["A"])] };
    assert.deepEqual(reviewItems(stale, TODAY).map((i) => i.id), ["replacement-u-A-2026-11-02"]);
    const expiring = { ...DATA, replacementPractices: [practice("A", { ...V, reviewDue: "2026-11-03" })], closures: [vacation("u", "2026-11-02", "2026-11-06", ["A"])] };
    assert.equal(reviewItems(expiring, TODAY).length, 1, "review deadline before the end of the closure");
    const fine = { ...DATA, replacementPractices: [practice("A", V)], closures: [vacation("u", "2026-11-02", "2026-11-06", ["A"])] };
    assert.deepEqual(reviewItems(fine, TODAY), []);
  });

  test("unconfirmed current/upcoming operational record → item; expired ones are ignored", () => {
    const data = { ...DATA, exceptions: [special("neu", "2026-10-20", OPEN), special("alt", "2026-10-01", OPEN)] };
    assert.deepEqual(reviewItems(data, TODAY).map((i) => i.id), ["unconfirmed-neu"]);
  });

  test("weekly schedule verification deadline within 30 days → item; otherwise none", () => {
    const soon = { ...DATA, schedule: { ...DATA.schedule!, verification: { ...V, reviewDue: "2026-11-01" } } };
    assert.deepEqual(reviewItems(soon, TODAY).map((i) => i.id), ["schedule-review"]);
    assert.deepEqual(reviewItems(DATA, TODAY), []);
    assert.deepEqual(reviewItems({ ...DATA, schedule: undefined }, TODAY).map((i) => i.id), ["schedule-missing"]);
  });

  test("TO_BE_CONFIRMED that does not matter operationally raises no alarm", () => {
    const data = { ...DATA, replacementPractices: [practice("unbenutzt", OPEN)], consultationTypes: [{ code: "GENERAL" as const, label: "x", verification: OPEN }] };
    assert.deepEqual(reviewItems(data, TODAY), []);
  });
});

describe("Website-Vorschau", () => {
  test("date/time input: Berlin wall time, future allowed, invalid falls back to now", () => {
    const p = previewInstant("2027-02-01", "10:15", NOW);
    assert.deepEqual([p.date, p.time, p.corrected], ["2027-02-01", "10:15", false]);
    assert.equal(p.at.toISOString(), zonedToInstant("2027-02-01", "10:15").toISOString());
    const d = previewInstant(undefined, undefined, NOW);
    assert.deepEqual([d.date, d.time, d.corrected], [TODAY, "09:30", false]);
    const bad = previewInstant("2026-13-45", "25:99", NOW);
    assert.deepEqual([bad.date, bad.time, bad.corrected], [TODAY, "09:30", true]);
  });

  test("equal data → equal results, no differences", () => {
    const c = comparePreview(DATA, structuredClone(DATA), NOW);
    assert.equal(c.equal, true);
    assert.deepEqual(c.differences, []);
    assert.deepEqual(c.database, c.website);
  });

  test("database closure → meaningful differences (status, closure, replacement)", () => {
    const db = { ...DATA, replacementPractices: [practice("A", V)], closures: [vacation("u", "2026-10-12", "2026-10-16", ["A"])] };
    const c = comparePreview(DATA, db, NOW);
    assert.equal(c.equal, false);
    assert.ok(c.differences.some((d) => d.startsWith("Status:")), c.differences.join(" | "));
    assert.ok(c.differences.some((d) => d.startsWith("Schließung:")));
    assert.ok(c.differences.some((d) => d.startsWith("Vertretung:") && d.includes("Praxis A")));
  });

  test("different opening interval is reported", () => {
    const db = { ...DATA, exceptions: [special("s", TODAY)] };
    const c = comparePreview(DATA, db, NOW);
    assert.ok(c.differences.some((d) => d.startsWith("Aktuelle Sprechzeit:")), c.differences.join(" | "));
  });
});

describe("role-aware navigation", () => {
  test("ALL: Übersicht + Website-Vorschau; ADMIN additionally Verwaltung", () => {
    for (const role of ["STAFF", "DOCTOR"] as const) assert.deepEqual(cockpitNav(role).map((n) => n.href), ["/intern", "/intern/vorschau"]);
    assert.deepEqual(cockpitNav("ADMIN").map((n) => n.href), ["/intern", "/intern/vorschau", "/intern/admin"]);
  });
});

// ---------------------------------------------------------------- structure
const ROOT = join(import.meta.dirname, "..", "..", "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "__tests__") return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const imports = (p: string) => [...readFileSync(p, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);

describe("cockpit structure", () => {
  test("src/cockpit: no React/Next, no lab mocks, Payload types only via the repository", () => {
    for (const f of files(join(ROOT, "src/cockpit"))) {
      for (const i of imports(f)) assert.doesNotMatch(i, /^(react|next)(\/|$)|^payload$|^@payloadcms|\/lab\//, `${rel(f)} → ${i}`);
    }
  });

  test("the public frontend never imports the cockpit layer", () => {
    for (const f of files(join(ROOT, "app/(frontend)"))) for (const i of imports(f)) assert.doesNotMatch(i, /cockpit\/(read-model|queries|preview|navigation)|@\/cockpit/, `${rel(f)} → ${i}`);
  });

  test("real cockpit pages: unauthenticated → login, database down → calm unavailable state", () => {
    for (const p of ["app/(intern)/intern/page.tsx", "app/(intern)/intern/vorschau/page.tsx"]) {
      const src = readFileSync(join(ROOT, p), "utf8");
      assert.match(src, /if \(session\.state === "UNAVAILABLE"\) return <Unavailable \/>;/, p);
      assert.match(src, /if \(session\.state === "SIGNED_OUT"\) redirect\("\/intern\/anmelden"\);/, p);
      assert.match(src, /catch \{\s*return <Unavailable \/>;/, p);
      assert.doesNotMatch(src, /lab\/cockpit|MOCK_|sessionStorage/, p);
    }
  });

  test("the real cockpit does not read the static snapshot for its own status", () => {
    const home = readFileSync(join(ROOT, "app/(intern)/intern/page.tsx"), "utf8");
    assert.doesNotMatch(home, /staticPulsData|PULS_DATA/);
    assert.match(home, /resolvePuls\(\{\}, now, practice\.data\)/);
  });
});
