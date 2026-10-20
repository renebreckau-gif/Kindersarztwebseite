// Phase 10.3A — "Rezepte & E-Rezept": approval preparation only. The practice's prescription
// process is unknown; nothing is published, no channel is "available", no form exists.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRESCRIPTION_REVIEW } from "../prescription-process.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
const REVIEW_ONLY = ["digital-services.ts", "prescription-process.ts", "pricing-review.ts", "approval-review.ts"];
const PUBLIC = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__") && !REVIEW_ONLY.some((r) => f.endsWith(r)))];
const FACTS = ["F101", "F102", "F103", "F104", "F105", "F106", "F107", "F108", "F109"];

describe("prescription content: questions, not a process (D, I)", () => {
  test("eight sections in the requested order; F101–F109 each referenced", () => {
    assert.deepEqual(PRESCRIPTION_REVIEW.map((s) => s.id), ["welche", "wer", "wie", "gesundheitskarte", "bearbeitung", "ergebnis", "angaben", "darstellung"]);
    for (const s of PRESCRIPTION_REVIEW) assert.ok(s.known.length && s.unconfirmed.length && s.questions.length, s.id);
    assert.deepEqual(PRESCRIPTION_REVIEW.flatMap((s) => s.factIds).sort(), FACTS);
  });
  test("D: every new fact is TO_BE_CONFIRMED in the fact register", () => {
    const register = read("docs/research/fact-status-register.md");
    for (const id of FACTS) assert.match(register, new RegExp(`\\| ${id} \\| [^\\n]+ \\| TO_BE_CONFIRMED \\| (MEDIUM|HIGH) \\|`), id);
    assert.doesNotMatch(register, /\| F10[1-9] \| [^\n]+ \| VERIFIED_CURRENT/);
  });
  test("channel matrix: phone, e-mail, app, in person — all unconfirmed; I: no app capability asserted", () => {
    const channels = PRESCRIPTION_REVIEW.find((s) => s.id === "wie")!.channels!;
    assert.deepEqual(channels.map((c) => [c.label, c.status]), [["Telefon", "UNCONFIRMED"], ["E-Mail", "UNCONFIRMED"], ["Praxis-App", "UNCONFIRMED"], ["Vor Ort", "UNCONFIRMED"]]);
    assert.match(channels.find((c) => c.id === "app")!.related!, /F98/);
    assert.match(channels.find((c) => c.id === "email")!.related!, /F18/);
  });
  test("no invented rule, time, required field, URL or security / compliance claim", () => {
    const text = JSON.stringify(PRESCRIPTION_REVIEW);
    assert.doesNotMatch(text, /https?:\/\/|mailto:/);
    assert.doesNotMatch(text, /DSGVO-konform|datenschutzkonform|sichere E-Mail|verschlüsselt/i);
    assert.doesNotMatch(text, /\bverfügbar über\b|ist verfügbar|Pflichtangabe:/);
    const times = text.match(/\d+ ?(Stunden|Werktage|Tage)/g) ?? [];
    assert.deepEqual(times, ["24 Stunden"], "the only time mentioned is the example of what must NOT be published");
    assert.match(PRESCRIPTION_REVIEW.find((s) => s.id === "bearbeitung")!.notes![0], /erscheint keine Zeitangabe \(etwa „innerhalb von 24 Stunden“\), bevor die Praxis sie bestätigt hat/);
    assert.equal(PRESCRIPTION_REVIEW.find((s) => s.id === "angaben")!.toClarify, undefined, "no example fields listed at all");
  });
  test("request vs. issuance; health card separate from F91; the staff term is not adopted automatically", () => {
    assert.match(PRESCRIPTION_REVIEW.find((s) => s.id === "darstellung")!.notes!.join(" "), /„Rezept anfragen“ statt „Rezept bestellen“\. Eine Anfrage ist keine Ausstellung/);
    const card = PRESCRIPTION_REVIEW.find((s) => s.id === "gesundheitskarte")!;
    assert.match(card.notes!.join(" "), /bestätigt nicht automatisch F91/);
    assert.match(card.notes!.join(" "), /„Chipkarte“\. Der Begriff wird nicht automatisch der Website-Begriff/);
  });
});

describe("approval draft is staging-only review tooling (A, B, C, H)", () => {
  const page = read("app/(frontend)/review/rezepte/page.tsx");
  const shared = read("app/(frontend)/review/approval-sections.tsx");
  test("A: 404 outside STAGING, noindex, not in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP }), /rezepte|\/review/);
  });
  test("B: clearly not public; C: linked from the review hub", () => {
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Rezepte &amp; E-Rezept", "Vorschlag zur Klärung des Praxisablaufs"]) assert.ok(page.includes(t), t);
    for (const t of ["Bekannt", "Unbestätigt", "Offene Fragen", "Noch nicht bestätigt", "zu klären"]) assert.ok(shared.includes(t), t);
    const card = REVIEW_CARDS.find((c) => c.id === "rezepte");
    assert.deepEqual([card?.title, card?.status, card?.href], ["Rezepte & E-Rezept – Freigabeentwurf", "Freigabeentwurf", "/review/rezepte"]);
  });
  test("H: no form controls on any approval draft", () => {
    for (const f of [page, shared, read("app/(frontend)/review/praxis-app/page.tsx"), read("app/(frontend)/review/gut-vorbereitet/page.tsx"), read("app/(frontend)/review/kosten/page.tsx")]) assert.doesNotMatch(f, /<form|<input|<textarea|<select/);
  });
});

describe("public code: no prescription content (E, F, G)", () => {
  test("E / G: no prescription instruction or 'Rezepte per E-Mail' anywhere public", () => {
    for (const f of PUBLIC) assert.doesNotMatch(read(f), /Rezept|E-Rezept|prescription-process/, f);
  });
  test("F: the start page keeps only the generic 'E-Mail schreiben'", () => {
    const start = read("src/site/start-page.tsx");
    assert.match(start, /label: "E-Mail schreiben an die Kinderarztpraxis"/);
    assert.match(read("src/lab/final/entry-chrome.tsx"), /<span>E-Mail schreiben<\/span>/);
    assert.doesNotMatch(start, /Rezept/);
  });
});
