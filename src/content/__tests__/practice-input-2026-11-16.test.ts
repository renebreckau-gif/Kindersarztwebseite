// Phase 10.0B — practice input #1 (2026-11-16). The INTENDED public changes (contact data, unchanged hours,
// no "nur gesunde Kinder") and the leak guards: staging placeholders, replacement candidates, emergency
// candidates and unconsented team names never reach public content; holidays stay fail-safe.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PRACTICE, PRACTICE_INPUT, publicAddress } from "../practice.ts";
import { CONSULTATION_TYPES, PULS_DATA, weekHoursView } from "../schedule.ts";
import { DOCTORS, TEAM, publicPeople } from "../people.ts";
import { resolvePuls } from "../puls.ts";
import { getPracticeStatus } from "../../domain/practice-status.ts";
import { standingReviewDue } from "../../domain/verification.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { PROVISIONAL_VACATION, exampleClosures } from "../../lab/homepage-fixtures.ts";
import { MOCK_RULES } from "../../lab/cockpit/model.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? (f === "__tests__" ? [] : files(rel)) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
/** Public page code + public content (the people working data and its staging review draft excluded). */
const PUBLIC = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !/\/(people|team-review)\.ts$/.test(f))];
const scan = (re: RegExp) => PUBLIC.filter((f) => re.test(read(f)));

describe("contact data (practice input 2026-11-16, project owner decision)", () => {
  test("exact values; the street is public now; provenance is transparent (no invented confirmer)", () => {
    assert.deepEqual(
      [PRACTICE.name.value, PRACTICE.street.value, PRACTICE.postalCode.value, PRACTICE.city.value, PRACTICE.phone.value.display, PRACTICE.phone.value.href, PRACTICE.fax.value, PRACTICE.email.value],
      ["Kinderarztpraxis Probst & Böhme", "Untere Bahnhofstraße 9", "06333", "Hettstedt", "03476 851157", "tel:+493476851157", "03476 854206", "kinderarztpraxis-hettstedt@gmx.de"],
    );
    assert.deepEqual(publicAddress(), { street: "Untere Bahnhofstraße 9", cityLine: "06333 Hettstedt" });
    assert.deepEqual(PRACTICE_INPUT, { status: "VERIFIED_CURRENT", lastVerified: "2026-11-16", reviewDue: standingReviewDue("2026-11-16"), verifiedBy: "Praxisangabe, übermittelt durch Projektinhaber", sourceIds: ["PI-2026-11-16"] });
    for (const k of ["name", "street", "postalCode", "city", "phone", "fax", "email"] as const) assert.strictEqual(PRACTICE[k].verification, PRACTICE_INPUT, k);
    assert.equal(PRACTICE.telephoneHours.verification.status, "TO_BE_CONFIRMED", "telephone hours (F19) were not part of the input");
  });
  test("no outdated street variant and no second phone / e-mail in public content", () => {
    assert.deepEqual(scan(/Bahnhofsstra(ß|ss)e|(?<!Untere )Bahnhofstraße 9/), []);
    assert.deepEqual(scan(/0347\d[ /]*\d{6}/).filter((f) => !/practice\.ts$/.test(f)), [], "phone numbers only from PRACTICE");
    assert.deepEqual(scan(/@gmx\.de/).filter((f) => !/practice\.ts$/.test(f)), [], "e-mail only from PRACTICE");
  });
});

describe("opening hours: unchanged, no 'nur gesunde Kinder'", () => {
  test("the week is exactly the practice card: Mo 08–11/14–17 · Di 08–11/14–16 · Mi 08–12 · Do 08–11/14–17 · Fr 08–12", () => {
    assert.deepEqual(
      weekHoursView(PULS_DATA).map((d) => [d.weekday, d.blocks.map((b) => `${b.start}–${b.end}`)]),
      [[1, ["08:00–11:00", "14:00–17:00"]], [2, ["08:00–11:00", "14:00–16:00"]], [3, ["08:00–12:00"]], [4, ["08:00–11:00", "14:00–17:00"]], [5, ["08:00–12:00"]]],
    );
    assert.deepEqual(PULS_DATA.schedule!.confirmedClosedWeekdays, [6, 7], "F40 unchanged");
  });
  test("HEALTHY_ONLY is not public content (deferred) — but the domain still supports it", () => {
    assert.ok(!PULS_DATA.schedule!.rules.some((r) => r.consultationType === "HEALTHY_ONLY"));
    assert.deepEqual(CONSULTATION_TYPES.map((t) => t.code), ["GENERAL", "APPOINTMENT"]);
    assert.deepEqual(scan(/gesunde Kinder|gesunden Kindern|nur gesunde/i), []);
    for (const t of ["08:30", "09:30"]) assert.doesNotMatch(JSON.stringify(resolvePuls({}, zonedToInstant("2026-11-17", t)).view), /gesund/i, t);
    assert.match(read("src/domain/content-types.ts"), /"HEALTHY_ONLY"/, "code kept");
    assert.match(read("src/domain/consultation-types.ts"), /"HEALTHY_ONLY"/, "09.5J workflow kept");
  });
});

describe("holidays: practice statement recorded, public policy unchanged (no named confirmation)", () => {
  test("static policy stays REQUIRE_EXPLICIT_ENTRY: a weekday holiday is fail-safe UNKNOWN; a bridge day follows the regular week", () => {
    assert.deepEqual(PULS_DATA.holidayPolicy, { mode: "REQUIRE_EXPLICIT_ENTRY" });
    assert.equal(getPracticeStatus(zonedToInstant("2026-12-25", "10:00"), PULS_DATA).status, "UNKNOWN", "Friday holiday");
    // A day next to a holiday that is not itself a public holiday (Thu 24.12.2026) follows the regular week.
    assert.equal(getPracticeStatus(zonedToInstant("2026-12-24", "09:00"), PULS_DATA).status, "OPEN");
  });
  test("documented timeline risk (unchanged): the static working hours expire after reviewDue 2027-01-07 + 60 days grace", () => {
    assert.equal(getPracticeStatus(zonedToInstant("2027-03-08", "09:00"), PULS_DATA).status, "OPEN", "Monday 08.03.2027: still within grace");
    assert.equal(getPracticeStatus(zonedToInstant("2027-03-09", "09:00"), PULS_DATA).status, "UNKNOWN", "from 09.03.2027 fail-safe UNKNOWN until a named re-confirmation");
  });
});

describe("team: working roster updated, nobody public", () => {
  test("no consent, nobody public; new people are not even shown in the staging layout preview", () => {
    for (const p of [...DOCTORS, ...TEAM]) assert.equal(p.publicationConsent.value, false, p.name);
    assert.deepEqual([publicPeople(DOCTORS, "2026-11-16"), publicPeople(TEAM, "2026-11-16")], [[], []]);
    const preview = publicPeople(TEAM, "2026-11-16", true).map((p) => p.name);
    assert.ok(!preview.includes("Nicole Schulz") && !preview.includes("Jana Brandt"));
    assert.deepEqual(scan(/Nicole Schulz|Jana Brandt|Katharina Weis/), []);
  });
});

describe("leak guards: replacement and emergency candidates, staging placeholders", () => {
  test("replacement candidates (sheet of 06.11.2025) and the struck-out entry never appear in public content", () => {
    assert.deepEqual(scan(/Teichler|Csilla Bedi|Gunther Jach|Paul Weihe|Steffi Reich|Hinter den Planken|Schützenplatz|Bodestraße|Klaus Peter Werner|Kreuter|812088|Doceins/), []);
  });
  test("practice-provided emergency candidates are not published; 112 / 116117 unchanged", () => {
    assert.deepEqual(scan(/AMEOS|Helios|St\. Elisabeth|Universitätsklinikum Halle|730730|3473 970|3464 660|2134310|5572053|Beinschuh|Ernst-Grube/), []);
    const notfall = read("app/(frontend)/(site)/notfall/page.tsx") + read("src/content/notices.ts");
    assert.match(notfall, /112/);
    assert.match(notfall, /116117/);
  });
  test("acute 08:00–09:00 and vacation 24.12.2026–03.01.2027 exist only as labelled staging fixtures", () => {
    assert.deepEqual(scan(/24\.12\.2026|2026-12-24|03\.01\.2027|2027-01-03/), []);
    assert.ok(!PULS_DATA.schedule!.rules.some((r) => r.consultationType === "ACUTE"), "no acute rule in the public data");
    assert.ok(!CONSULTATION_TYPES.some((t) => t.code === "ACUTE"));
    assert.deepEqual(MOCK_RULES.filter((r) => r.consultationType === "ACUTE").map((r) => `${r.start}–${r.end}`), Array(5).fill("08:00–09:00"), "lab prototype test data");
    assert.match(read("src/lab/cockpit/model.ts"), /STAGING_PLACEHOLDER_DO_NOT_PUBLISH/);
    assert.deepEqual(PROVISIONAL_VACATION, { from: "2026-12-24", to: "2027-01-03" });
    const c = exampleClosures("urlaub", "2026-11-16")[0];
    assert.deepEqual([c.startDate, c.endDate, c.verification.verifiedBy], ["2026-12-24", "2027-01-03", "Prüfansicht (Testdaten)"]);
    assert.match(read("app/(frontend)/review/startseite/page.tsx"), /example === "urlaub" \? "Testdaten · vorläufig"/);
  });
});
