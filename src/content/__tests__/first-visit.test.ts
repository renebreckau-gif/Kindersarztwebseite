// Phase 10.1A — "Gut vorbereitet": staff proposals are prepared for approval, never published.
// Pure checks on the content source, the public selector and the staging-only approval draft.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FirstVisitItem } from "../../domain/content-types.ts";
import { selectPublicFirstVisitItems } from "../../domain/publication.ts";
import { FIRST_VISIT_APPROVALS, FIRST_VISIT_ITEMS, publicFirstVisitItems } from "../first-visit.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const TODAY = "2026-10-20";
const item = (p: Partial<FirstVisitItem>): FirstVisitItem => ({ id: "x", block: "BRING", title: "T", text: "Text", displayOrder: 1, verification: { status: "TO_BE_CONFIRMED", sourceIds: [] }, ...p });
const VERIFIED = { status: "VERIFIED_CURRENT" as const, lastVerified: "2026-10-15", reviewDue: "2027-04-15", verifiedBy: "Test", sourceIds: ["TEST"] };

describe("first-visit publication rule (future public use)", () => {
  test("A: TO_BE_CONFIRMED items are not public — today nothing is", () => {
    assert.deepEqual(publicFirstVisitItems(TODAY), []);
    assert.ok(FIRST_VISIT_ITEMS.length > 0);
    for (const i of FIRST_VISIT_ITEMS) assert.equal(i.verification.status, "TO_BE_CONFIRMED", i.id);
  });
  test("B: VERIFIED_CURRENT (with dates, fresh) would be returned, in display order", () => {
    const out = selectPublicFirstVisitItems([item({ id: "b", displayOrder: 2, verification: VERIFIED }), item({ id: "a", displayOrder: 1, verification: VERIFIED }), item({ id: "c" })], TODAY);
    assert.deepEqual(out.map((i) => i.id), ["a", "b"]);
  });
  test("C: OUTDATED_DO_NOT_PUBLISH is blocked; verified without dates or long overdue is not shown", () => {
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: [] } })], TODAY), []);
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { status: "VERIFIED_CURRENT", sourceIds: [] } })], TODAY), []);
    assert.deepEqual(selectPublicFirstVisitItems([item({ verification: { ...VERIFIED, reviewDue: "2025-01-01" } })], TODAY), []);
  });
});

describe("content: only the requested topics, approval levels explicit", () => {
  test("health card, vaccination booklet (two separate facts), infection guidance — nothing else", () => {
    assert.deepEqual(FIRST_VISIT_ITEMS.map((i) => i.id), ["gesundheitskarte", "impfpass-mitbringen", "impfung-nur-mit-impfpass", "mundschutz-bei-infekt"]);
    const text = JSON.stringify(FIRST_VISIT_ITEMS);
    for (const banned of ["U-Heft", "Ausweis", "Überweisung", "Medikament", "Befund", "Urkunde", "Sorgerecht", "Einverständnis"]) assert.ok(!text.includes(banned), banned);
  });
  test("approvers: organisational items by the practice, vaccination/infection rules by a physician", () => {
    const by = Object.fromEntries(FIRST_VISIT_APPROVALS.map((a) => [a.itemId, a]));
    assert.deepEqual(FIRST_VISIT_ITEMS.map((i) => [by[i.id].factId, by[i.id].approver]), [["F91", "PRACTICE"], ["F92", "PRACTICE"], ["F93", "DOCTOR"], ["F94", "DOCTOR"]]);
    for (const a of FIRST_VISIT_APPROVALS) assert.ok(a.openQuestions.length >= 2, a.itemId);
    assert.match(by["mundschutz-bei-infekt"].wordingSource, /bisherigen Website \(F47, nicht bestätigt\)/);
    assert.ok(!JSON.stringify(FIRST_VISIT_APPROVALS).includes("Praxisregel"));
  });
});

describe("approval draft is staging-only review tooling (D, E)", () => {
  const page = read("app/(frontend)/review/gut-vorbereitet/page.tsx");
  test("D: 404 outside STAGING, noindex, not in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP }), /gut-vorbereitet|\/review/);
    assert.equal(REVIEW_CARDS.find((c) => c.id === "gut-vorbereitet")?.href, "/review/gut-vorbereitet");
    assert.equal(REVIEW_CARDS.find((c) => c.id === "gut-vorbereitet")?.title, "Gut vorbereitet – Freigabeentwurf");
  });
  test("E: proposals are labelled as not public, never as practice rules", () => {
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Vorschlag zur inhaltlichen Freigabe", "Textvorschlag", "Offene Fragen", "Freigabe durch", "Noch nicht freigegeben"]) assert.ok(page.includes(t), t);
    assert.ok(!page.includes("Praxisregel"));
  });
  test("H: the public 'Neu bei uns?' page renders no proposal", () => {
    const neu = read("app/(frontend)/(site)/praxis/neu-bei-uns/page.tsx");
    assert.doesNotMatch(neu, /first-visit|FIRST_VISIT|Impfpass mit|Mundschutz|Gesundheitskarte Ihres/);
  });
});
