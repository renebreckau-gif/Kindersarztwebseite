// Staging review availability (Phase 09.1.4): Mein Arztbesuch is reviewable via the preview
// query but NOT released; the /review hub exists only behind a server-side flag.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE } from "../release.ts";
import { CHAPTERS, MEIN_ARZTBESUCH, chapterView } from "../discovery.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

/** All navigation / sitemap models of the public site. */
const NAV = { PRIMARY, SITEMAP, LEGAL, NEEDS };
import { REVIEW_CARDS, REVIEW_TEST_ACCESS, isReviewHubEnabled } from "../../lab/review-hub.ts";

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

describe("Mein Arztbesuch: review availability without release", () => {
  test("1: release gate stays closed and the site stays non-indexable", () => {
    assert.equal(RELEASE.meinArztbesuchApproved, false);
    assert.equal(RELEASE.indexable, false);
  });

  test("2: the normal route does not expose the finished chapter", () => {
    const v = chapterView(MEIN_ARZTBESUCH, false);
    assert.equal(v.mode, "GATED");
    assert.equal("scenes" in v.chapter, false);
  });

  test("3 + 4: the review query exposes the complete chapter with all six scenes and their images", () => {
    const v = chapterView(MEIN_ARZTBESUCH, true);
    assert.equal(v.mode, "PREVIEW");
    const scenes = "scenes" in v.chapter ? v.chapter.scenes : [];
    assert.deepEqual(
      scenes.map((s) => s.title),
      ["Ankommen", "Warten", "Messen & Wiegen", "Abhören", "Ohren & Hals", "Fertig"],
    );
    for (const s of scenes) {
      assert.ok(s.visual.image, s.id);
      for (const w of s.visual.image!.widths) {
        for (const ext of ["avif", "webp"]) assert.ok(existsSync(join(ROOT, `public/discovery/d1-${s.visual.image!.slug}-${w}.${ext}`)), `${s.id} ${w} ${ext}`);
      }
      assert.ok(s.visual.alt && s.visual.alt.length > 20, `${s.id} alt text`);
    }
  });

  test("5: review mode stays noindex / nofollow", () => {
    const page = read("app/(site)/entdecken/mein-arztbesuch/page.tsx");
    assert.match(page, /v\.mode === "PUBLIC" \? \{\} : \{ robots: \{ index: false, follow: false \} \}/);
    assert.match(read("next.config.ts"), /X-Robots-Tag", value: "noindex, nofollow"/);
  });

  test("6: normal navigation does not link to the chapter as released content", () => {
    const hrefs = JSON.stringify(NAV);
    assert.doesNotMatch(hrefs, /\/entdecken\/mein-arztbesuch/);
    for (const f of PUBLIC_CODE) assert.doesNotMatch(read(f), /href="\/entdecken\/mein-arztbesuch"/, f);
  });

  test("7: a review request never changes approval data", () => {
    const before = JSON.stringify(MEIN_ARZTBESUCH.scenes.map((s) => [s.contentApproval, s.practiceApproval, s.medicalApproval]));
    chapterView(MEIN_ARZTBESUCH, true);
    chapterView(MEIN_ARZTBESUCH, false);
    assert.equal(JSON.stringify(MEIN_ARZTBESUCH.scenes.map((s) => [s.contentApproval, s.practiceApproval, s.medicalApproval])), before);
    for (const s of MEIN_ARZTBESUCH.scenes) {
      assert.equal(s.practiceApproval.status, "TO_BE_CONFIRMED", s.id);
      assert.equal(s.contentApproval.status, "TO_BE_CONFIRMED", s.id);
      assert.equal(s.practiceApproval.verifiedBy, undefined, s.id);
      if (s.medicalApproval) assert.equal(s.medicalApproval.status, "TO_BE_CONFIRMED", s.id);
    }
    assert.equal(CHAPTERS.find((c) => c.id === "mein-arztbesuch")?.state === "AVAILABLE" && RELEASE.meinArztbesuchApproved, false);
  });
});

describe("/review hub (staging only)", () => {
  test("1 + 2: enabled only by REVIEW_HUB_ENABLED=true; default off", () => {
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "true" }), true);
    assert.equal(isReviewHubEnabled({}), false);
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "false" }), false);
    assert.equal(isReviewHubEnabled({ REVIEW_HUB_ENABLED: "1" }), false);
    const page = read("app/review/page.tsx");
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/, "disabled → 404 at request time");
    assert.match(page, /export const dynamic = "force-dynamic"/);
  });

  test("3 + 4: links point to the mock login and the Discovery review query", () => {
    const by = Object.fromEntries(REVIEW_CARDS.map((c) => [c.id, c]));
    assert.equal(by.cockpit.href, "/lab/praxis-cockpit/anmelden");
    assert.equal(by.discovery.href, "/entdecken/mein-arztbesuch?vorschau=freigabe");
    assert.equal(by.discovery.status, "Freigabe ausstehend");
    assert.equal(by.website.href, "/");
    assert.match(REVIEW_TEST_ACCESS.email, /@beispiel\.test$/);
  });

  test("5: the hub does not open the release gate", () => {
    assert.equal(RELEASE.meinArztbesuchApproved, false);
  });

  test("6: the hub is not part of the public navigation", () => {
    assert.doesNotMatch(JSON.stringify(NAV), /"\/review"/);
    for (const f of PUBLIC_CODE) assert.doesNotMatch(read(f), /["'`]\/review["'`?]/, f);
  });

  test("7: no sitemap lists the hub", () => {
    assert.doesNotMatch(JSON.stringify(SITEMAP), /\/review|\/lab/);
    for (const f of ["app/sitemap.ts", "app/sitemap.xml", "public/sitemap.xml"]) {
      if (existsSync(join(ROOT, f))) assert.doesNotMatch(read(f), /\/review/, f);
    }
  });

  test("8: the hub sends noindex / nofollow", () => {
    assert.match(read("app/review/page.tsx"), /robots: \{ index: false, follow: false \}/);
    assert.match(read("next.config.ts"), /source: "\/:path\*", headers: \[\{ key: "X-Robots-Tag", value: "noindex, nofollow" \}\]/);
  });
});
