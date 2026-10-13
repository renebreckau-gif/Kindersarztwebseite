// Mein Arztbesuch on the normal website (published 2026-10-13 by explicit decision) and the
// staging-only /review hub. Publication ≠ approval: approval records stay truthful.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE } from "../release.ts";
import { CHAPTERS, MEIN_ARZTBESUCH, approvalsComplete, chapterCard, chapterView, discoveryReviewMode } from "../discovery.ts";
import { isReviewEnvironment } from "../environment.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP, AGES } from "../site.ts";
import { REVIEW_CARDS, REVIEW_TEST_ACCESS, isReviewHubEnabled } from "../../lab/review-hub.ts";

/** All navigation / sitemap models of the public site. */
const NAV = { PRIMARY, SITEMAP, LEGAL, NEEDS, AGES };

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string, out: string[] = []) => {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${f}`;
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.(tsx?|css)$/.test(f) && !rel.includes("__tests__")) out.push(rel);
  }
  return out;
};
const PUBLIC_CODE = [...files("app/(site)"), ...files("src/site"), ...files("src/content")];
const approvalsSnapshot = () => JSON.stringify(MEIN_ARZTBESUCH.scenes.map((s) => [s.contentApproval, s.practiceApproval, s.medicalApproval, s.approvedBy, s.lastReviewedAt]));

describe("Mein Arztbesuch on the normal website", () => {
  const card = () => chapterCard(CHAPTERS.find((c) => c.id === "mein-arztbesuch")!, discoveryReviewMode(undefined));

  test("1 + 2: normal /entdecken lists the chapter as clickable, without „In Vorbereitung“", () => {
    assert.deepEqual(card(), { href: "/entdecken/mein-arztbesuch", state: null });
    assert.equal(MEIN_ARZTBESUCH.teaser, "Was bei einem Arztbesuch passieren kann – Schritt für Schritt erklärt.");
    assert.equal(CHAPTERS[0].id, "mein-arztbesuch", "chapter 1");
  });

  test("3 + 6: normal /entdecken/mein-arztbesuch renders all six scenes with their final assets", () => {
    const v = chapterView(MEIN_ARZTBESUCH, false);
    assert.equal(v.mode, "PUBLIC");
    const scenes = "scenes" in v.chapter ? v.chapter.scenes : [];
    assert.deepEqual(
      scenes.map((s) => s.title),
      ["Ankommen", "Warten", "Messen & Wiegen", "Abhören", "Ohren & Hals", "Fertig"],
    );
    for (const s of scenes) {
      for (const w of s.visual.image!.widths) {
        for (const ext of ["avif", "webp"]) assert.ok(existsSync(join(ROOT, `public/discovery/d1-${s.visual.image!.slug}-${w}.${ext}`)), `${s.id} ${w} ${ext}`);
      }
      assert.ok(s.visual.alt.length > 20, `${s.id} alt text`);
    }
  });

  test("4 + 5: no review flag and no ?vorschau needed", () => {
    for (const f of ["app/(site)/entdecken/page.tsx", "app/(site)/entdecken/mein-arztbesuch/page.tsx", "src/content/discovery.ts"]) {
      assert.doesNotMatch(read(f), /isReviewEnvironment|REVIEW_HUB_ENABLED/, `${f}: REVIEW_HUB_ENABLED must not publish content`);
    }
    assert.equal(chapterView(MEIN_ARZTBESUCH, false).mode, "PUBLIC");
    assert.equal(chapterView(MEIN_ARZTBESUCH, true).mode, "PUBLIC", "old review links show the same chapter");
  });

  test("no review wording on the published chapter", () => {
    const page = read("app/(site)/entdecken/mein-arztbesuch/page.tsx");
    // the preview note only renders for PREVIEW mode, which a published chapter never has
    assert.match(page, /view\.mode === "PREVIEW" \? \(/);
    assert.doesNotMatch(read("app/(site)/entdecken/page.tsx"), /Inhalte werden noch final geprüft/);
    assert.doesNotMatch(read("src/site/home.tsx"), /In Vorbereitung/);
  });

  test("7 + 8: no fabricated provenance — approval records unchanged and open", () => {
    const before = approvalsSnapshot();
    chapterView(MEIN_ARZTBESUCH, false);
    chapterView(MEIN_ARZTBESUCH, true);
    assert.equal(approvalsSnapshot(), before);
    assert.equal(approvalsComplete(MEIN_ARZTBESUCH), false);
    for (const s of MEIN_ARZTBESUCH.scenes) {
      assert.equal(s.practiceApproval.status, "TO_BE_CONFIRMED", s.id);
      assert.equal(s.contentApproval.status, "TO_BE_CONFIRMED", s.id);
      assert.equal(s.practiceApproval.verifiedBy, undefined, s.id);
      assert.equal(s.contentApproval.lastVerified, undefined, s.id);
      assert.equal(s.approvedBy, undefined, s.id);
      if (s.medicalApproval) assert.equal(s.medicalApproval.status, "TO_BE_CONFIRMED", s.id);
    }
    assert.equal(RELEASE.meinArztbesuchApproved, false);
    assert.equal(RELEASE.meinArztbesuchPublished, true);
  });

  test("9: the site as a whole stays non-indexable", () => {
    assert.equal(RELEASE.indexable, false);
    assert.match(read("next.config.ts"), /X-Robots-Tag", value: "noindex, nofollow"/);
  });

  test("navigation: Start → Entdecken → Mein Arztbesuch → back to Entdecken", () => {
    assert.match(JSON.stringify(SITEMAP), /"\/entdecken\/mein-arztbesuch"/);
    assert.doesNotMatch(JSON.stringify(NAV), /in Vorbereitung/i);
    assert.match(read("src/site/home.tsx"), /href="\/entdecken\/mein-arztbesuch"/);
    assert.match(read("app/(site)/entdecken/mein-arztbesuch/page.tsx"), /: "\/entdecken"\} label="Entdecken"/);
  });

  test("no false claim that every chapter was checked by the physicians", () => {
    assert.doesNotMatch(read("app/(site)/entdecken/page.tsx"), /von unseren Ärztinnen geprüft, bevor es erscheint/);
  });

  test("10: Praxis Cockpit and lab stay out of the public navigation", () => {
    assert.doesNotMatch(JSON.stringify(NAV), /\/lab|praxis-cockpit|\/review/);
    for (const f of PUBLIC_CODE) assert.doesNotMatch(read(f), /praxis-cockpit|["'`]\/review["'`?]/, f);
  });
});

describe("/review hub (staging only, unchanged gating)", () => {
  test("11: enabled only by REVIEW_HUB_ENABLED=true; default off → 404", () => {
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "true" }), true);
    assert.equal(isReviewHubEnabled({}), false);
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "false" }), false);
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "1" }), false);
    assert.equal(isReviewEnvironment({ REVIEW_HUB_ENABLED: "true" }), true);
    const page = read("app/review/page.tsx");
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /export const dynamic = "force-dynamic"/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
  });

  test("hub links: cockpit mock login, the published chapter, the website", () => {
    const by = Object.fromEntries(REVIEW_CARDS.map((c) => [c.id, c]));
    assert.equal(by.cockpit.href, "/lab/praxis-cockpit/anmelden");
    assert.equal(by.discovery.href, "/entdecken/mein-arztbesuch");
    assert.equal(by.website.href, "/");
    assert.match(REVIEW_TEST_ACCESS.email, /@beispiel\.test$/);
  });

  test("no sitemap lists the hub or the lab", () => {
    assert.doesNotMatch(JSON.stringify(SITEMAP), /\/review|\/lab/);
    for (const f of ["app/sitemap.ts", "app/sitemap.xml", "public/sitemap.xml"]) {
      if (existsSync(join(ROOT, f))) assert.doesNotMatch(read(f), /\/review|\/lab/, f);
    }
  });
});
