// GLOBAL PROJECT RULE: the current Vercel deployment is STAGING (SITE_STAGE). Implemented work
// is directly visible there; content gates become authoritative only in PRODUCTION.
// Staging visibility is never approval provenance.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE, SITE_STAGE, stageAllowsReview } from "../release.ts";
import { CHAPTERS, MEIN_ARZTBESUCH, approvalsComplete, chapterCard, chapterPublishable, chapterView, discoveryReviewMode } from "../discovery.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP, AGES } from "../site.ts";
import { REVIEW_CARDS, REVIEW_TEST_ACCESS, isReviewHubEnabled } from "../../lab/review-hub.ts";

/** All navigation / sitemap models of the public (patient) site. */
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
const PUBLIC_CODE = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content")];
const ALL_CODE = [...files("app"), ...files("src"), "next.config.ts"];
const approvalsSnapshot = () => JSON.stringify(MEIN_ARZTBESUCH.scenes.map((s) => [s.contentApproval, s.practiceApproval, s.medicalApproval, s.approvedBy, s.lastReviewedAt]));

describe("deployment stage", () => {
  test("1: SITE_STAGE is currently STAGING (explicit, not derived from Vercel)", () => {
    assert.equal(SITE_STAGE, "STAGING");
    const release = read("src/content/release.ts");
    assert.match(release, /export const SITE_STAGE: SiteStage = "STAGING";/);
    for (const f of ALL_CODE) assert.doesNotMatch(read(f), /VERCEL_ENV|REVIEW_HUB_ENABLED/, `${f}: no environment-variable gating`);
    assert.equal(existsSync(join(ROOT, "src/content/environment.ts")), false, "no second 'review environment' concept");
  });
});

describe("Mein Arztbesuch on staging", () => {
  const card = () => chapterCard(CHAPTERS.find((c) => c.id === "mein-arztbesuch")!, discoveryReviewMode(undefined));

  test("2: normally visible as clickable chapter 1, without „In Vorbereitung“", () => {
    assert.deepEqual(card(), { href: "/entdecken/mein-arztbesuch", state: null });
    assert.equal(CHAPTERS[0].id, "mein-arztbesuch");
    assert.doesNotMatch(read("src/site/home.tsx"), /In Vorbereitung/);
    assert.doesNotMatch(JSON.stringify(NAV), /in Vorbereitung/i);
  });

  test("3 + 4: all six scenes without query parameter and without any environment variable", () => {
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
    }
    assert.equal(chapterView(MEIN_ARZTBESUCH, true).mode, "PUBLIC", "old ?vorschau links show the same chapter");
  });

  test("8: approval metadata unchanged and truthful (staging visibility ≠ approval)", () => {
    const before = approvalsSnapshot();
    chapterView(MEIN_ARZTBESUCH, false, "STAGING");
    chapterView(MEIN_ARZTBESUCH, false, "PRODUCTION");
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
  });

  test("11: PRODUCTION mode respects the release gates; STAGING visibility is not a production approval", () => {
    const ok = { status: "VERIFIED_CURRENT" as const, sourceIds: [] };
    const fullyApproved = { ...MEIN_ARZTBESUCH, scenes: MEIN_ARZTBESUCH.scenes.map((s) => ({ ...s, contentApproval: ok, practiceApproval: ok, medicalApproval: s.medicalApproval ? ok : undefined })) };
    // 1: STAGING + published=false → visible
    assert.equal(chapterPublishable(MEIN_ARZTBESUCH, "STAGING", { meinArztbesuchPublished: false }), true);
    assert.equal(chapterView(MEIN_ARZTBESUCH, false, "STAGING").mode, "PUBLIC");
    // 2: PRODUCTION + published=false → gated
    assert.equal(chapterPublishable(fullyApproved, "PRODUCTION", { meinArztbesuchPublished: false }), false);
    assert.equal(chapterView(MEIN_ARZTBESUCH, false, "PRODUCTION").mode, "GATED", "the real current state is gated for production");
    // 3: PRODUCTION + published=true + incomplete approvals (the real records) → gated
    assert.equal(chapterPublishable(MEIN_ARZTBESUCH, "PRODUCTION", { meinArztbesuchPublished: true }), false);
    // 4: PRODUCTION + published=true + approvals complete + final assets → visible
    assert.equal(chapterPublishable(fullyApproved, "PRODUCTION", { meinArztbesuchPublished: true }), true);
    assert.equal(RELEASE.meinArztbesuchPublished, false);
    const placeholder = { ...MEIN_ARZTBESUCH, scenes: MEIN_ARZTBESUCH.scenes.map((s, i) => (i === 0 ? { ...s, visual: { ...s.visual, class: "PLACEHOLDER" as const } } : s)) };
    assert.equal(chapterPublishable(placeholder, "STAGING"), false, "placeholders never count as implemented");
    assert.equal(stageAllowsReview("PRODUCTION"), false);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
  });
});

describe("review tooling on staging", () => {
  test("5: /review is available on staging (convenience overview, unlocks nothing)", () => {
    assert.equal(isReviewHubEnabled(), true);
    const page = read("app/(frontend)/review/page.tsx");
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    const by = Object.fromEntries(REVIEW_CARDS.map((c) => [c.id, c]));
    assert.equal(by.cockpit.href, "/lab/praxis-cockpit/anmelden");
    assert.equal(by.discovery.href, "/entdecken/mein-arztbesuch");
    assert.equal(by.website.href, "/");
    assert.match(REVIEW_TEST_ACCESS.email, /@beispiel\.test$/);
  });

  test("6: Praxis Cockpit prototype is reachable on staging (blocked only in PRODUCTION)", () => {
    assert.equal(stageAllowsReview(), true);
    assert.match(read("app/(frontend)/lab/praxis-cockpit/layout.tsx"), /if \(!stageAllowsReview\(\)\) notFound\(\);/);
    assert.ok(existsSync(join(ROOT, "app/(frontend)/lab/praxis-cockpit/anmelden/page.tsx")));
  });

  test("7: Praxis Cockpit and review hub are not in the patient navigation", () => {
    assert.doesNotMatch(JSON.stringify(NAV), /\/lab|praxis-cockpit|\/review/);
    for (const f of PUBLIC_CODE) assert.doesNotMatch(read(f), /praxis-cockpit|["'`]\/review["'`?]/, f);
    for (const f of ["app/sitemap.ts", "app/sitemap.xml", "public/sitemap.xml"]) {
      if (existsSync(join(ROOT, f))) assert.doesNotMatch(read(f), /\/review|\/lab/, f);
    }
  });
});

describe("indexing", () => {
  test("9 + 10: RELEASE.indexable stays false and staging stays noindex / nofollow", () => {
    assert.equal(RELEASE.indexable, false);
    assert.match(read("next.config.ts"), /source: "\/:path\*", headers: \[\{ key: "X-Robots-Tag", value: "noindex, nofollow" \}\]/);
    assert.match(read("app/(frontend)/(site)/layout.tsx"), /RELEASE\.indexable \? \{ index: true, follow: true \} : \{ index: false, follow: false \}/);
  });
});
