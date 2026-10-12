// Phase 08: Mein Arztbesuch release gate, child-copy rules, data safety, 116117 and U10
// governance. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAPTERS, MEIN_ARZTBESUCH, FORBIDDEN_CHILD_PHRASES, chapterPublishable, chapterView } from "../discovery.ts";
import { RELEASE } from "../release.ts";
import { publicEmergency } from "../notices.ts";
import { U10, publicDecisionStatement, practiceOffers } from "../examinations.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

test("release: PULS sign-off stays true; Mein Arztbesuch is released (2026-10-12)", () => {
  assert.equal(RELEASE.pulsPracticeSignOff, true);
  assert.equal(RELEASE.meinArztbesuchApproved, true);
});

test("released: public visitors get the full chapter", () => {
  assert.equal(chapterPublishable(MEIN_ARZTBESUCH), true);
  const v = chapterView(MEIN_ARZTBESUCH, false);
  assert.equal(v.mode, "PUBLIC");
  assert.ok("scenes" in v.chapter);
});

test("gate still bites: a revoked approval gives GATED meta only — no scenes", () => {
  const revoked = {
    ...MEIN_ARZTBESUCH,
    scenes: MEIN_ARZTBESUCH.scenes.map((s, i) => (i === 3 ? { ...s, medicalApproval: { status: "TO_BE_CONFIRMED" as const, sourceIds: [] } } : s)),
  };
  const v = chapterView(revoked, false);
  assert.equal(v.mode, "GATED");
  assert.equal("scenes" in v.chapter, false);
});

test("all six scenes in order (public, and preview behaves the same once released)", () => {
  const v = chapterView(MEIN_ARZTBESUCH, true);
  assert.equal(v.mode, "PUBLIC");
  assert.ok("scenes" in v.chapter);
  const scenes = "scenes" in v.chapter ? v.chapter.scenes : [];
  assert.deepEqual(
    scenes.map((s) => s.id),
    ["ankommen", "warten", "messen-wiegen", "abhoeren", "ohren-hals", "fertig"],
  );
  assert.deepEqual(
    scenes.map((s) => s.order),
    [1, 2, 3, 4, 5, 6],
  );
});

test("gate: placeholder visuals alone block release, even with all approvals", () => {
  const ok = { status: "VERIFIED_CURRENT" as const, sourceIds: [] };
  const approved = {
    ...MEIN_ARZTBESUCH,
    scenes: MEIN_ARZTBESUCH.scenes.map((s, i) => ({
      ...s,
      contentApproval: ok,
      practiceApproval: ok,
      medicalApproval: s.medicalApproval ? ok : undefined,
      // one scene back on its placeholder: must block even if the release flag were on
      visual: i === 2 ? { ...s.visual, class: "PLACEHOLDER" as const } : s.visual,
    })),
  };
  assert.equal(chapterPublishable(approved), false, "a placeholder blocks release");
});

test("medical scenes carry a medical approval slot", () => {
  for (const id of ["messen-wiegen", "abhoeren", "ohren-hals"]) {
    const s = MEIN_ARZTBESUCH.scenes.find((x) => x.id === id);
    assert.ok(s?.medicalApproval, id);
  }
});

test("copy: no fear, pain or bravery phrases anywhere in the chapter", () => {
  const texts = [
    MEIN_ARZTBESUCH.teaser,
    MEIN_ARZTBESUCH.parentIntro ?? "",
    ...MEIN_ARZTBESUCH.scenes.flatMap((s) => [s.title, ...s.childCopy, s.parentContext ?? "", s.why?.title ?? "", s.why?.copy ?? ""]),
  ];
  for (const t of texts) for (const re of FORBIDDEN_CHILD_PHRASES) assert.equal(re.test(t), false, `"${t}" matches ${re}`);
  // the ENTDECKEN overview lede too
  assert.equal(/angst/i.test(read("app/(site)/entdecken/page.tsx")), false);
});

test("copy: child sentences stay short (≤ 12 words)", () => {
  for (const s of MEIN_ARZTBESUCH.scenes) for (const line of s.childCopy) assert.ok(line.split(/\s+/).length <= 12, line);
});

test("future chapters: no routes, no scenes", () => {
  for (const c of CHAPTERS.filter((x) => x.state === "COMING_LATER")) {
    assert.equal(c.slug, null, c.id);
    assert.equal(c.scenes.length, 0, c.id);
  }
});

test("data safety: story player has no inputs, storage, audio or tracking", () => {
  const src = read("src/site/discovery/story.tsx") + read("src/site/discovery/placeholders.tsx");
  for (const re of [/<input/i, /<textarea/i, /<form/i, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /<audio/i, /new Audio/, /fetch\(/, /navigator\.sendBeacon/]) {
    assert.equal(re.test(src), false, String(re));
  }
});

test("116117: published, verified, after 112", () => {
  const list = publicEmergency("2026-10-07");
  const i112 = list.findIndex((e) => e.phone === "112");
  const i116 = list.findIndex((e) => e.phone === "116117");
  assert.ok(i112 >= 0 && i116 > i112);
  const e = list[i116];
  assert.equal(e.verification.status, "VERIFIED_CURRENT");
  assert.match(e.whenToUse ?? "", /nicht bei Lebensgefahr/);
});

test("116117: Notfall page renders a real tel: link and keeps 112 first", () => {
  const src = read("app/(site)/notfall/page.tsx");
  assert.match(src, /href="tel:112"/);
  assert.match(src, /href=\{`tel:\$\{onCall\.phone\}`\}/);
  assert.ok(src.indexOf('tel:112') < src.indexOf("tel:${onCall.phone}"));
});

test("U10: no public statement and no practice offer while not in force", () => {
  assert.equal(U10.entryIntoForce.value.state, "NOCH_NICHT_IN_KRAFT");
  assert.equal(publicDecisionStatement(U10), null);
  assert.equal(practiceOffers(U10), false);
  assert.notEqual(U10.ministryReview.verification.status, "VERIFIED_CURRENT");
});

test("U10: even a verified entry into force needs physician approval", () => {
  const ok = { status: "VERIFIED_CURRENT" as const, sourceIds: [] };
  const inForce = { ...U10, entryIntoForce: { value: { state: "IN_KRAFT" as const, since: "2027-01-01" }, verification: ok } };
  assert.equal(publicDecisionStatement(inForce), null);
  assert.equal(practiceOffers(inForce), false);
});

// ---------------------------------------------------------------- approvals + production images

test("recorded approvals: practice + content for all six, medical for 03–05 only", () => {
  for (const s of MEIN_ARZTBESUCH.scenes) {
    assert.equal(s.practiceApproval.status, "VERIFIED_CURRENT", s.id);
    assert.equal(s.contentApproval.status, "VERIFIED_CURRENT", s.id);
    assert.equal(s.practiceApproval.verifiedBy, "Nadine Probst, Ärztin / Praxis");
    assert.equal(s.practiceApproval.lastVerified, "2026-10-12");
  }
  const medical = MEIN_ARZTBESUCH.scenes.filter((s) => s.medicalApproval).map((s) => s.id);
  assert.deepEqual(medical, ["messen-wiegen", "abhoeren", "ohren-hals"]);
  for (const s of MEIN_ARZTBESUCH.scenes) if (s.medicalApproval) assert.equal(s.medicalApproval.status, "VERIFIED_CURRENT", s.id);
});

test("production images: AI_CONCEPTUAL, all exports present, never upscaled", () => {
  for (const s of MEIN_ARZTBESUCH.scenes) {
    const v = s.visual;
    assert.equal(v.class, "AI_CONCEPTUAL", s.id);
    assert.ok(v.image, s.id);
    assert.ok(Math.max(...v.image!.widths) <= v.image!.width, `${s.id}: no export wider than the source`);
    for (const w of v.image!.widths) for (const ext of ["avif", "webp"]) assert.ok(existsSync(join(ROOT, `public/discovery/d1-${v.image!.slug}-${w}.${ext}`)), `${s.id} ${w}.${ext}`);
    assert.ok(v.alt.length > 20, `${s.id}: alt text`);
  }
  const abhoeren = MEIN_ARZTBESUCH.scenes.find((s) => s.id === "abhoeren")!;
  assert.deepEqual(abhoeren.visual.image!.widths, [960, 1448]);
});

test("with approvals and final images, only the release flag decides publication", () => {
  assert.equal(chapterPublishable(MEIN_ARZTBESUCH), RELEASE.meinArztbesuchApproved);
});
