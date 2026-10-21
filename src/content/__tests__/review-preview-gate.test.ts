// Phase 10.5A.1 — security hotfix: the public review preview (?vorschau=freigabe, &zeit=) exists
// only on STAGING. One central gate (isPublicReviewPreview → stageAllowsReview); in PRODUCTION the
// query is ignored: LIVE PRAXIS PULS, no review time, no consent simulation, no draft chapters.
// The project stage stays STAGING — PRODUCTION is exercised through the injectable stage argument.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_SOURCE } from "../../data/source.ts";
import { staticPulsData } from "../../data/static-repository.ts";
import { zonedToInstant } from "../../domain/time.ts";
import { resolvePuls } from "../puls.ts";
import { RELEASE, SITE_STAGE, isPublicReviewPreview } from "../release.ts";
import { DOCTORS, TEAM, publicPeople } from "../people.ts";
import { MEIN_ARZTBESUCH, chapterView, discoveryReviewMode } from "../discovery.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? (f === "__tests__" ? [] : files(rel)) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
const PUBLIC_CODE = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content")];
const NOW = zonedToInstant("2026-10-20", "11:00");
const QUERY = { vorschau: "freigabe", zeit: "2026-10-24T09:30" };
const PREVIEW_TIME = { localDate: "2026-10-24", localTime: "09:30" };

describe("central gate: isPublicReviewPreview", () => {
  test("STAGING + freigabe → true; everything else → false", () => {
    assert.equal(isPublicReviewPreview({ vorschau: "freigabe" }, "STAGING"), true);
    assert.equal(isPublicReviewPreview({}, "STAGING"), false);
    assert.equal(isPublicReviewPreview({ vorschau: "ja" }, "STAGING"), false);
    assert.equal(isPublicReviewPreview({ vorschau: ["freigabe"] }, "STAGING"), false, "array params never match");
    assert.equal(isPublicReviewPreview({ vorschau: "freigabe" }, "PRODUCTION"), false);
    assert.equal(isPublicReviewPreview(QUERY, "PRODUCTION"), false);
    assert.equal(isPublicReviewPreview({ vorschau: "FREIGABE" }, "PRODUCTION"), false);
    assert.equal(isPublicReviewPreview({ vorschau: "1" }, "PRODUCTION"), false);
  });
  test("defaults to the project stage, which stays STAGING", () => {
    assert.equal(SITE_STAGE, "STAGING");
    assert.equal(isPublicReviewPreview({ vorschau: "freigabe" }), true);
  });
});

describe("PRAXIS PULS: preview and review time only through the gate", () => {
  test("STAGING: ?vorschau=freigabe&zeit → PREVIEW at the review time", () => {
    const p = resolvePuls(QUERY, NOW, staticPulsData(), "STAGING");
    assert.equal(p.mode, "PREVIEW");
    assert.deepEqual({ localDate: p.result.evaluatedAt.localDate, localTime: p.result.evaluatedAt.localTime }, PREVIEW_TIME);
  });
  test("STAGING: a normal request is LIVE at the real (injected) time", () => {
    const p = resolvePuls({}, NOW, staticPulsData(), "STAGING");
    assert.equal(p.mode, "LIVE");
    assert.equal(p.result.evaluatedAt.localDate, "2026-10-20");
  });
  test("PRODUCTION: the query changes nothing — identical to a plain LIVE request", () => {
    const plain = resolvePuls({}, NOW, staticPulsData(), "PRODUCTION");
    for (const q of [QUERY, { vorschau: "freigabe" }, { zeit: "2026-10-24T09:30" }]) {
      const withQuery = resolvePuls(q, NOW, staticPulsData(), "PRODUCTION");
      assert.equal(withQuery.mode, "LIVE");
      assert.deepEqual(withQuery, plain, JSON.stringify(q));
      assert.equal(withQuery.result.evaluatedAt.localDate, "2026-10-20", "no review-time override");
    }
  });
});

describe("person privacy: no consent simulation outside STAGING", () => {
  const today = "2026-10-20";
  const previewFor = (stage: "STAGING" | "PRODUCTION") => resolvePuls(QUERY, NOW, staticPulsData(), stage).mode === "PREVIEW";
  test("normal requests: no unconsented person is public (actual data, unmodified)", () => {
    assert.deepEqual(publicPeople(DOCTORS, today), []);
    assert.deepEqual(publicPeople(TEAM, today), []);
  });
  test("STAGING review preview may show the editorial list (labelled on screen)", () => {
    assert.equal(publicPeople(DOCTORS, today, previewFor("STAGING")).length, 2);
    assert.equal(publicPeople(TEAM, today, previewFor("STAGING")).length, 5);
  });
  test("PRODUCTION + ?vorschau=freigabe passes false → no people", () => {
    assert.equal(previewFor("PRODUCTION"), false);
    assert.deepEqual(publicPeople(DOCTORS, today, previewFor("PRODUCTION")), []);
    assert.deepEqual(publicPeople(TEAM, today, previewFor("PRODUCTION")), []);
    for (const p of [...DOCTORS, ...TEAM]) assert.equal(p.publicationConsent.value, false, p.name);
  });
});

describe("Entdecken drafts: no review bypass outside STAGING", () => {
  test("discoveryReviewMode uses the gate", () => {
    assert.equal(discoveryReviewMode("freigabe", "STAGING"), "QUERY");
    assert.equal(discoveryReviewMode("freigabe", "PRODUCTION"), null);
    assert.equal(discoveryReviewMode(undefined, "STAGING"), null);
  });
  test("PRODUCTION: an unpublished chapter stays GATED even if a caller passes preview=true", () => {
    assert.equal(chapterView(MEIN_ARZTBESUCH, discoveryReviewMode("freigabe", "PRODUCTION") !== null, "PRODUCTION").mode, "GATED");
    assert.equal(chapterView(MEIN_ARZTBESUCH, true, "PRODUCTION").mode, "GATED");
  });
});

describe("architecture: one policy, one gate", () => {
  test("no public code compares the raw query except the central gate", () => {
    const RAW = /vorschau\s*===|===\s*["']freigabe["']|["']freigabe["']\s*===|\.vorschau\s*==(?!=)/;
    const hits = PUBLIC_CODE.filter((f) => RAW.test(read(f)));
    assert.deepEqual(hits, ["src/content/release.ts"]);
  });
  test("resolvePuls and discoveryReviewMode derive preview from isPublicReviewPreview", () => {
    assert.match(read("src/content/puls.ts"), /const preview = isPublicReviewPreview\(params, stage\);/);
    assert.match(read("src/content/puls.ts"), /const at = preview && typeof params\.zeit === "string" \? reviewInstant\(params\.zeit\) : now;/);
    assert.match(read("src/content/discovery.ts"), /return isPublicReviewPreview\(\{ vorschau \}, stage\) \? "QUERY" : null;/);
    assert.match(read("src/content/release.ts"), /stageAllowsReview\(stage\) && params\.vorschau === "freigabe"/);
  });
  test("homepage, team and doctor pages simulate consent only via puls.mode from resolvePuls", () => {
    const calls = PUBLIC_CODE.flatMap((f) => [...read(f).matchAll(/publicPeople\(([^)]*)\)/g)].map((m) => [f, m[1]]));
    const pages = calls.filter(([f]) => !f.endsWith("people.ts"));
    assert.deepEqual(pages.map(([f]) => f).sort(), ["app/(frontend)/(site)/praxis/aerztinnen/page.tsx", "app/(frontend)/(site)/praxis/team/page.tsx", "src/site/home.tsx"]);
    for (const [f, args] of pages) assert.match(args, /, puls\.mode === "PREVIEW"$/, f);
    // 09.6B: pages get `puls` from the one operational snapshot helper; it calls resolvePuls with the
    // request params, the server clock and the snapshot — never a stage (the gate stays central).
    for (const f of ["app/(frontend)/(site)/praxis/aerztinnen/page.tsx", "app/(frontend)/(site)/praxis/team/page.tsx"]) assert.match(read(f), /const \{ puls \} = await loadPublicPage\(await searchParams\);/, f);
    assert.match(read("app/(frontend)/(site)/page.tsx"), /loadPublicPage\(\{ vorschau: q\.vorschau, zeit: q\.zeit \}\)/);
    assert.match(read("src/site/operational.ts"), /resolvePuls\(params, new Date\(\), snapshot\.puls\)/);
  });
  test("pages never inject a stage (the stage argument is for tests only)", () => {
    for (const f of [...files("app"), ...files("src/site")]) assert.doesNotMatch(read(f), /resolvePuls\([^)]*["'](PRODUCTION|STAGING)["']|discoveryReviewMode\([^)]*,/, f);
  });
  test("release flags unchanged", () => {
    assert.equal(SITE_STAGE, "STAGING");
    assert.equal(DATA_SOURCE, "STATIC");
    assert.equal(RELEASE.indexable, false);
    assert.equal(RELEASE.staffPortalProductionEnabled, false);
  });
});
