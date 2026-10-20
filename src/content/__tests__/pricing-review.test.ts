// Phase 10.4A — "Kosten & Zahlungsarten": approval preparation only. No price list exists in
// the project; no amount, no accepted payment method, no "keine Barzahlung", no billing claim.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRICING_REVIEW } from "../pricing-review.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string, ext = /\.(ts|tsx)$/): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel, ext) : ext.test(f) ? [rel] : [];
  });
const REVIEW_ONLY = ["digital-services.ts", "prescription-process.ts", "pricing-review.ts", "approval-review.ts"];
const PUBLIC = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__") && !REVIEW_ONLY.some((r) => f.endsWith(r)))];
const FACTS = ["F110", "F111", "F112", "F113", "F114", "F115", "F116", "F117"];
const RISK: Record<string, string> = { F110: "MEDIUM", F111: "HIGH", F112: "HIGH", F113: "HIGH", F114: "MEDIUM", F115: "MEDIUM", F116: "MEDIUM", F117: "MEDIUM" };
// Any Euro amount: "15 €", "€ 15", "15,00 EUR", "ab 20€" …
const EURO_AMOUNT = /\d\s*(€|EUR\b|Euro\b)|(€|EUR)\s*\d/;
const PAYMENT_CLAIM = /Barzahlung|Girocard|Kreditkarte|Kartenzahlung|EC-Karte|Visa|Mastercard|PayPal|Zahlungsart|Preisliste|Unsere Preise|Selbstzahler/;

describe("pricing content: questions, not a price list (D, G)", () => {
  test("eight sections in the requested order, each with known / unconfirmed / open questions", () => {
    assert.deepEqual(PRICING_REVIEW.map((s) => s.id), ["leistungen", "preisliste", "anzeige", "zahlungsarten", "barzahlung", "ablauf", "pflege", "darstellung"]);
    for (const s of PRICING_REVIEW) assert.ok(s.known.length && s.unconfirmed.length && s.questions.length, s.id);
    assert.deepEqual(PRICING_REVIEW.flatMap((s) => s.factIds).sort(), FACTS);
  });
  test("D: F110–F117 are TO_BE_CONFIRMED with the agreed risk, none verified", () => {
    const register = read("docs/research/fact-status-register.md");
    for (const id of FACTS) assert.match(register, new RegExp(`\\| ${id} \\| [^\\n]+ \\| TO_BE_CONFIRMED \\| ${RISK[id]} \\|`), id);
    assert.doesNotMatch(register, /\| F11[0-7] \| [^\n]+ \| (VERIFIED_CURRENT|OUTDATED)/);
    assert.match(register, /a confirmed price never makes an unconfirmed service public/i);
  });
  test("G: six payment methods, every one UNCONFIRMED; cash has its own section", () => {
    const pay = PRICING_REVIEW.find((s) => s.id === "zahlungsarten")!;
    assert.deepEqual(pay.channels!.map((c) => [c.label, c.status]), [["Girocard / Karte", "UNCONFIRMED"], ["Kreditkarte", "UNCONFIRMED"], ["Barzahlung", "UNCONFIRMED"], ["Rechnung", "UNCONFIRMED"], ["Überweisung", "UNCONFIRMED"], ["Sonstiges", "UNCONFIRMED"]]);
    assert.equal(pay.channelsTitle, "Mögliche Zahlungsarten");
    const cash = PRICING_REVIEW.find((s) => s.id === "barzahlung")!;
    assert.deepEqual(cash.factIds, ["F115"]);
    assert.match(cash.notes!.join(" "), /erscheint nicht, bevor die Praxis ihn bestätigt hat/);
  });
  test("Kita-Tauglichkeit is only a practice-team example; no amount, no service list, no billing claim", () => {
    assert.deepEqual(PRICING_REVIEW.find((s) => s.id === "leistungen")!.examples, ["Kita-Tauglichkeit / Bescheinigung"]);
    const text = JSON.stringify(PRICING_REVIEW);
    assert.doesNotMatch(text, EURO_AMOUNT);
    assert.doesNotMatch(text, /€|https?:\/\/|mailto:/);
    assert.doesNotMatch(text, /Umsatzsteuer|GOÄ|erstatt|absetzbar|Kassenleistung|Unsere Preise/i);
    // Abbreviations case-sensitive: /i plus ASCII-only \b would hit "Zuständigkeit".
    assert.doesNotMatch(text, /MwSt|\bUSt\b/);
    assert.match(PRICING_REVIEW.find((s) => s.id === "preisliste")!.missing![0], /Aktuelle Preisliste – noch nicht vorliegend/);
    assert.match(PRICING_REVIEW.find((s) => s.id === "pflege")!.notes![0], /^Vorschlag, noch keine Regel/);
  });
});

describe("approval draft is staging-only review tooling (A, B, C, H)", () => {
  const page = read("app/(frontend)/review/kosten/page.tsx");
  const shared = read("app/(frontend)/review/approval-sections.tsx");
  test("A: 404 outside STAGING, noindex, not in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP }), /kosten|\/review/);
  });
  test("B: clearly not public; C: linked from the review hub", () => {
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Kosten &amp; Zahlungsarten", "Vorschlag zur Klärung der Praxisangaben"]) assert.ok(page.includes(t), t);
    for (const t of ["Noch nicht bestätigt", "Beispiel aus dem Praxisteam, zu bestätigen", 'section.channelsTitle ?? "Kanäle"']) assert.ok(shared.includes(t), t);
    const card = REVIEW_CARDS.find((c) => c.id === "kosten");
    assert.deepEqual([card?.title, card?.status, card?.href], ["Kosten & Zahlungsarten – Freigabeentwurf", "Freigabeentwurf", "/review/kosten"]);
  });
  test("H: no logo, image or form control on the draft", () => {
    for (const f of [page, shared]) assert.doesNotMatch(f, /<img|<svg|<Image|<form|<input|<select|<textarea/);
  });
});

describe("public site: no prices, no payment claims (E, F, H, I, J)", () => {
  test("E / F: no Euro amount and no payment / price-list wording in public code", () => {
    for (const f of PUBLIC) {
      const src = read(f);
      assert.doesNotMatch(src, EURO_AMOUNT, f);
      assert.doesNotMatch(src, PAYMENT_CLAIM, f);
      assert.doesNotMatch(src, /Keine Barzahlung/i, f);
      assert.doesNotMatch(src, /pricing-review/, `${f} imports the pricing draft`);
    }
  });
  test("H: no payment-provider logo among public assets", () => {
    const assets = files("public", /./);
    assert.ok(assets.length > 0);
    for (const a of assets) assert.doesNotMatch(a, /visa|mastercard|maestro|girocard|paypal|amex|payment|zahlung/i, a);
  });
  test("I: start page unchanged in substance — no price, payment or self-pay content", () => {
    const start = read("src/site/start-page.tsx");
    assert.doesNotMatch(start, /Preis|Kosten|Zahlung|Barzahlung|Selbstzahl/);
    assert.match(start, /label: "E-Mail schreiben an die Kinderarztpraxis"/);
  });
  test("J: there is no public /praxis/kosten page yet", () => {
    assert.equal(existsSync(join(ROOT, "app/(frontend)/(site)/praxis/kosten")), false);
  });
});
