// "Gut vorbereitet" — 10.1A prepared the items, 10.1B publishes them on STAGING from the practice input of
// 2026-11-16 (working data). Pure checks on the content source, the public selector, the wording, the
// production gate, the public page / Praxis hub sources and the staging-only approval workspace.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FirstVisitItem } from "../../domain/content-types.ts";
import { selectPublicFirstVisitItems } from "../../domain/publication.ts";
import { FIRST_VISIT_APPROVALS, FIRST_VISIT_ITEMS, publicFirstVisitItems } from "../first-visit.ts";
import { PRACTICE_INPUT, isWorkingInput } from "../practice.ts";
import { SITE_STAGE } from "../release.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRAXIS_GROUPS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const TODAY = "2026-11-16";
const item = (p: Partial<FirstVisitItem>): FirstVisitItem => ({ id: "x", block: "BRING", title: "T", text: "Text", displayOrder: 1, verification: { status: "TO_BE_CONFIRMED", sourceIds: [] }, ...p });
const VERIFIED = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-15", reviewDue: "2027-04-15", verifiedBy: "Test", sourceIds: ["TEST"] };
const byId = Object.fromEntries(FIRST_VISIT_ITEMS.map((i) => [i.id, i]));

describe("first-visit publication rule", () => {
  test("A: all four items are public on STAGING today, in display order (working input)", () => {
    assert.deepEqual(publicFirstVisitItems(TODAY).map((i) => i.id), ["gesundheitskarte", "impfpass-mitbringen", "impfung-nur-mit-impfpass", "mundschutz-bei-infekt"]);
    for (const i of FIRST_VISIT_ITEMS) {
      assert.deepEqual(i.verification, { ...PRACTICE_INPUT, sourceIds: ["PI-2026-11-16-GV"] }, i.id);
      assert.ok(isWorkingInput(i.verification), `${i.id}: working input, no invented named verifier`);
    }
  });
  test("B: VERIFIED_CURRENT (with dates, fresh) is returned in display order; unconfirmed is not", () => {
    const out = selectPublicFirstVisitItems([item({ id: "b", displayOrder: 2, verification: VERIFIED }), item({ id: "a", displayOrder: 1, verification: VERIFIED }), item({ id: "c" })], TODAY);
    assert.deepEqual(out.map((i) => i.id), ["a", "b"]);
  });
  test("C: OUTDATED_DO_NOT_PUBLISH is blocked; verified without dates or long overdue is not shown", () => {
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: [] } })], TODAY), []);
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { status: "VERIFIED_CURRENT", sourceIds: [] } })], TODAY), []);
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { ...VERIFIED, reviewDue: "2025-01-01" } })], TODAY), []);
  });
  test("production gate: PRODUCTION never shows an item that rests on working input only (LB-00)", () => {
    if (SITE_STAGE === "PRODUCTION") assert.deepEqual(publicFirstVisitItems(TODAY).filter((i) => isWorkingInput(i.verification)).map((i) => i.id), [], "named confirmation missing");
  });
});

describe("wording: exactly the practice input, nothing added", () => {
  test("titles and texts", () => {
    assert.deepEqual(
      FIRST_VISIT_ITEMS.map((i) => [i.title, i.text]),
      [
        ["Gesundheitskarte mitbringen", "Bitte bringen Sie die Gesundheitskarte Ihres Kindes zu jedem Besuch mit."],
        ["Impfpass mitbringen", "Bitte bringen Sie den Impfpass zu jedem Besuch mit."],
        ["Keine Impfung ohne Impfpass", "Vor einer Impfung muss der bisherige Impfstatus nachvollziehbar sein."],
        ["Bei Infekt: Bitte Mundschutz tragen", "Wenn Ihr Kind oder eine Begleitperson erkältet oder krank ist, bitten wir um einen Mundschutz."],
      ],
    );
  });
  test("no speculative items, no consequences, no old age rule", () => {
    const text = JSON.stringify(FIRST_VISIT_ITEMS);
    for (const banned of ["U-Heft", "Ausweis", "Überweisung", "Medikament", "Befund", "Urkunde", "Sorgerecht", "Einverständnis", "Handtuch", "Trinkflasche", "über 6", "FFP2", "Versichertennachweis"]) assert.ok(!text.includes(banned), banned);
    assert.doesNotMatch(byId.gesundheitskarte.text, /fehlt|ohne Karte|nicht behandeln|Privatrechnung/, "no consequence of a missing card");
  });
  test("Impfpass: two separate facts — bring it to every visit (not only vaccination appointments) vs. the practice rule", () => {
    assert.doesNotMatch(byId["impfpass-mitbringen"].text, /Impftermin/);
    assert.equal(byId["impfung-nur-mit-impfpass"].title, "Keine Impfung ohne Impfpass");
    assert.notEqual(byId["impfung-nur-mit-impfpass"].text, byId["impfpass-mitbringen"].text, "no repeated paragraph");
    assert.doesNotMatch(byId["impfung-nur-mit-impfpass"].text, /mitbringen|Pflicht|Gesetz|gesetzlich|bundesweit|Deutschland|doppelt|verweiger/i);
  });
  test("Mundschutz: a request, not a requirement", () => {
    const m = `${byId["mundschutz-bei-infekt"].title} ${byId["mundschutz-bei-infekt"].text}`;
    assert.match(m, /[Bb]itte|bitten wir/);
    assert.doesNotMatch(m, /\bmuss|müssen|Pflicht|verpflichtend|vorgeschrieben|Jahre|FFP|Ausnahme/);
  });
});

describe("approvals: working input vs. final confirmation", () => {
  test("fact ids and final approvers; no open question asked again; F94 supersedes F47", () => {
    const by = Object.fromEntries(FIRST_VISIT_APPROVALS.map((a) => [a.itemId, a]));
    assert.deepEqual(FIRST_VISIT_ITEMS.map((i) => [by[i.id].factId, by[i.id].approver]), [["F91", "PRACTICE"], ["F92", "PRACTICE"], ["F93", "DOCTOR"], ["F94", "DOCTOR"]]);
    for (const a of FIRST_VISIT_APPROVALS) {
      assert.deepEqual(a.openQuestions, [], a.itemId);
      assert.match(a.wordingSource, /Praxisangabe vom 16\.11\.2026, übermittelt durch Projektinhaber \(Arbeitsstand\)/);
      assert.match(a.finalApproval, /Namentliche Bestätigung durch .+ vor dem Livegang \(LB-00\) – noch offen/);
    }
    assert.match(by["impfung-nur-mit-impfpass"].finalApproval, /Ärztin/);
    assert.match(by["mundschutz-bei-infekt"].related ?? "", /ersetzt .*F47/);
    assert.ok(!JSON.stringify(FIRST_VISIT_APPROVALS).includes("Praxisregel"));
  });
});

describe("public page and Praxis hub (10.1B)", () => {
  const page = read("app/(frontend)/(site)/praxis/gut-vorbereitet/page.tsx");
  const hub = read("app/(frontend)/(site)/praxis/page.tsx");
  test("the page renders the public selector only, no empty page, static (no Payload)", () => {
    assert.match(page, /publicFirstVisitItems\(puls\.result\.evaluatedAt\.localDate\)/);
    assert.match(page, /if \(items\.length === 0\) notFound\(\);/);
    assert.match(page, /title="Gut vorbereitet in die Praxis"/);
    assert.match(page, /back=\{\{ href: "\/praxis", label: "Praxis" \}\}/);
    assert.match(page, /aria-hidden="true"/, "pictograms are decorative");
    for (const f of [page, hub]) assert.doesNotMatch(f, /from "[^"]*(payload|backend)[^"]*"/i);
  });
  test("hub groups link only existing pages — never future 404 routes", () => {
    assert.deepEqual(PRAXIS_GROUPS.map((g) => g.title), ["Vor dem Besuch", "Angebot & Service", "Über uns"]);
    const hrefs = PRAXIS_GROUPS.flatMap((g) => g.links.map((l) => l.href));
    assert.deepEqual(hrefs, ["/praxis/neu-bei-uns", "/praxis/gut-vorbereitet", "/praxis/leistungen", "/praxis/aerztinnen", "/praxis/team", "/praxis/kontakt"]);
    for (const h of hrefs) assert.ok(existsSync(join(ROOT, "app/(frontend)/(site)", h, "page.tsx")), h);
    for (const future of ["/praxis/rezepte", "/praxis/praxis-app", "/praxis/kosten"]) assert.ok(!hrefs.includes(future) && !hub.includes(future), future);
    assert.match(hub, /l\.requires !== "first-visit" \|\| firstVisitPublic/, "Gut vorbereitet only while its content is public");
  });
  test("navigation: Gut vorbereitet is a Praxis sub-page, never a top-level or dock item", () => {
    assert.ok(SITEMAP.find((s) => s.href === "/praxis")?.children.some((c) => c.href === "/praxis/gut-vorbereitet"));
    assert.ok(!PRIMARY.some((p) => p.href.includes("gut-vorbereitet")));
    assert.doesNotMatch(read("src/site/chrome.tsx"), /gut-vorbereitet/);
  });
  test("'Neu bei uns?' links to Gut vorbereitet but does not repeat its items", () => {
    const neu = read("app/(frontend)/(site)/praxis/neu-bei-uns/page.tsx");
    assert.match(neu, /<Link href="\/praxis\/gut-vorbereitet">Gut vorbereitet<\/Link>/);
    assert.doesNotMatch(neu, /first-visit|FIRST_VISIT|Impfpass mit|Mundschutz|Gesundheitskarte Ihres/);
  });
});

describe("approval workspace stays staging-only review tooling", () => {
  const page = read("app/(frontend)/review/gut-vorbereitet/page.tsx");
  test("404 outside STAGING, noindex, never in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP, PRAXIS_GROUPS }), /\/review/);
    const card = REVIEW_CARDS.find((c) => c.id === "gut-vorbereitet");
    assert.deepEqual([card?.title, card?.status, card?.href], ["Gut vorbereitet – Freigabe", "Testumgebung · Freigabe offen", "/review/gut-vorbereitet"]);
  });
  test("working input is labelled as such — never as a final practice approval", () => {
    for (const t of ["Freigabestand · interne Ansicht", "Arbeitsstand und offene Freigabe", "Text auf der Website (Arbeitsstand)", "Formale Freigabe durch", "Vor dem Livegang", "Arbeitsstand – formale Freigabe offen"]) assert.ok(page.includes(t), t);
    assert.ok(!page.includes("Praxisregel"));
  });
});
