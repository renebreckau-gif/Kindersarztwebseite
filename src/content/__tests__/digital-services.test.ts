// Phase 10.2A — "Praxis-App & digitale Services": approval preparation only. No app identity,
// no store link, no feature is claimed; the staging draft is review tooling.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_REVIEW } from "../digital-services.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
const APP_WORDING = /Praxis-App|App Store|App-Store|Google Play|Google-Play|apps\.apple\.com|play\.google\.com/;

describe("app content: questions, not claims", () => {
  test("six sections in the requested order, each with known / unconfirmed / open questions", () => {
    assert.deepEqual(APP_REVIEW.map((s) => s.id), ["identitaet", "plattformen", "funktionen", "zugang", "datenschutz", "platzierung"]);
    for (const s of APP_REVIEW) assert.ok(s.known.length && s.unconfirmed.length && s.questions.length, s.id);
    assert.deepEqual(APP_REVIEW.flatMap((s) => s.factIds), ["F95", "F96", "F97", "F98", "F99", "F100"]);
  });
  test("no store URL, no working link, no app name, no compliance claim in the content", () => {
    const text = JSON.stringify(APP_REVIEW);
    assert.doesNotMatch(text, /https?:\/\//, "no URL at all");
    assert.doesNotMatch(text, /DSGVO-konform|datenschutzkonform|rechtssicher/i);
    assert.ok(APP_REVIEW.find((s) => s.id === "plattformen")!.missing!.includes("App-Store-Link fehlt"));
  });
  test("functions are candidates only; prescriptions and e-mail stay separate work", () => {
    const f = APP_REVIEW.find((s) => s.id === "funktionen")!;
    assert.ok(f.candidates!.includes("Rezepte anfragen"));
    assert.equal(f.questions[0], "Bitte bestätigen, was die Praxis tatsächlich nutzt.");
    assert.match(f.notes!.join(" "), /eigenes Arbeitspaket \(10\.3\)/);
    assert.match(f.notes!.join(" "), /F18/);
  });
});

describe("approval draft: staging-only review tooling (A, B, C)", () => {
  const page = read("app/(frontend)/review/praxis-app/page.tsx");
  test("A: 404 outside STAGING, noindex, not in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP }), /praxis-app|\/review/);
  });
  test("B: clearly not public; C: linked from the review hub", () => {
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Praxis-App &amp; digitale Services", "Welche Funktionen bietet die Praxis tatsächlich an?", "Bekannt", "Unbestätigt", "Offene Fragen", "nicht bestätigt"]) assert.ok(page.includes(t), t);
    const card = REVIEW_CARDS.find((c) => c.id === "praxis-app");
    assert.deepEqual([card?.title, card?.href], ["Praxis-App – Freigabeentwurf", "/review/praxis-app"]);
  });
});

describe("public code carries no app content (D, E, F)", () => {
  test("no app wording, store link or placeholder in public pages, site components or public content", () => {
    const pub = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__") && !f.endsWith("digital-services.ts"))];
    for (const f of pub) assert.doesNotMatch(read(f), APP_WORDING, f);
    for (const f of pub) assert.doesNotMatch(read(f), /digital-services/, `${f} imports the app draft`);
  });
});
