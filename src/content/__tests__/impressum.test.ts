// Phase 10.0C — Impressum foundation. Only verified facts are shown; nothing is invented (legal form,
// responsible person, professional titles, § 18 Abs. 2 MStV person) and no outdated legal text (F08 / F09,
// old disclaimer) is reused. No compliance claim. HTTP / DB-off proof: integration step 26.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IMPRESSUM_REVIEW_NOTE, IMPRESSUM_SOURCES_CHECKED, PROFESSIONAL_BODIES, PROFESSIONAL_CODE, impressumNumber } from "../impressum.ts";
import { PRACTICE } from "../practice.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/** Everything that renders the public Impressum (the content module's header comment documents what is withheld). */
const RENDER = read("src/site/legal.tsx") + read("app/(frontend)/(site)/impressum/page.tsx");
const CONTENT_VALUES = JSON.stringify({ PROFESSIONAL_BODIES, PROFESSIONAL_CODE, IMPRESSUM_REVIEW_NOTE });

describe("Impressum: verified facts only", () => {
  test("practice contact from PRACTICE (practice input 2026-11-16), numbers in Impressum notation", () => {
    assert.equal(impressumNumber(PRACTICE.phone.value.display), "03476 / 851157");
    assert.equal(impressumNumber(PRACTICE.fax.value), "03476 / 854206");
    for (const k of ["name", "street", "postalCode", "city", "phone", "fax", "email"] as const) assert.equal(PRACTICE[k].verification.status, "VERIFIED_CURRENT", k);
    assert.match(RENDER, /PRACTICE\.phone\.value\.href/, "tel link");
    assert.match(RENDER, /href=\{`mailto:\$\{PRACTICE\.email\.value\}`\}/, "plain mailto — no prefilled subject / body");
    assert.doesNotMatch(RENDER, /mailto:[^`]*\?|subject=|body=/);
    assert.doesNotMatch(RENDER, /href=\{?[^}]*fax/i, "fax is text only");
  });

  test("professional bodies F05–F07 as cross-checked on the official sites", () => {
    assert.equal(IMPRESSUM_SOURCES_CHECKED, "2026-11-16");
    assert.deepEqual(
      PROFESSIONAL_BODIES.map((b) => [b.fact, b.name, b.street, b.cityLine, b.link.href]),
      [
        ["F05", "Ärztekammer Sachsen-Anhalt", "Doctor-Eisenbart-Ring 2", "39120 Magdeburg", "https://www.aeksa.de"],
        ["F06", "Kassenärztliche Vereinigung Sachsen-Anhalt", "Doctor-Eisenbart-Ring 2", "39120 Magdeburg", "https://www.kvsa.de"],
      ],
    );
    assert.equal(PROFESSIONAL_CODE.name, "Berufsordnung der Ärztekammer Sachsen-Anhalt");
    assert.match(PROFESSIONAL_CODE.link.href, /^https:\/\/www\.aeksa\.de\/.*berufsordnung\/$/, "official page, no local copy");
    for (const l of [...PROFESSIONAL_BODIES.map((b) => b.link), PROFESSIONAL_CODE.link]) assert.ok(l.text.length > 10 && !/^https?:/.test(l.text), "named link, not a bare URL");
    assert.match(RENDER, /rel="noopener noreferrer"/);
    assert.doesNotMatch(RENDER, /target="_blank"/);
  });

  test("the staging note uses the existing InternalNote mechanism", () => {
    assert.equal(IMPRESSUM_REVIEW_NOTE, "Rechtliche Finalprüfung ausstehend: Rechtsform/Anbieter, verantwortliche Person(en) und vollständige Berufsbezeichnungen.");
    assert.match(RENDER, /<InternalNote>\s*<p>\{IMPRESSUM_REVIEW_NOTE\}<\/p>/);
  });
});

describe("Impressum: nothing invented, nothing outdated, no claim", () => {
  const texts = RENDER + CONTENT_VALUES;
  test("no outdated legal basis (F08), no old privacy paragraph (F09), no old disclaimer", () => {
    assert.doesNotMatch(texts, /Telemediengesetz|\bTMG\b|Rundfunkstaatsvertrag|\bRStV\b/);
    assert.doesNotMatch(texts, /ohne Angabe personenbezogener Daten möglich/);
    assert.doesNotMatch(texts, /Haftung für (Inhalte|Links)|Trotz sorgfältiger|Urheberrecht/, "old disclaimer wording");
    assert.doesNotMatch(texts, /Bahnhofsstra/);
  });
  test("no legal form, provider role, responsible person or professional title is asserted", () => {
    assert.doesNotMatch(texts, /\bBAG\b|\bGbR\b|Gemeinschaftspraxis|Einzelpraxis|Partnerschaft|Vertretungsberechtigt|Inhaber/);
    assert.doesNotMatch(texts, /verantwortlich i\.\s?S\.\s?d\.|§\s?18 Abs\. 2|V\.i\.S\.d\.P/i);
    assert.doesNotMatch(texts, /Fachärztin|Fachärztinnen|verliehen in|Nadine Probst|Elke Böhme/, "F04 open: no title, no physician named as provider");
    assert.doesNotMatch(texts, /§\s?5 DDG|Angaben gemäß/, "no paragraph decoration — plain 'Impressum'");
  });
  test("no compliance / approval claim", () => {
    assert.doesNotMatch(read("src/site/legal.tsx").replace(/Kein\s+Rechtsfreigabe-Status/, ""), /rechtssicher|DSGVO-konform|rechtlich geprüft|Rechtsfreigabe|freigegeben/i);
  });
  test("Datenschutz stays the controlled placeholder; Impressum and Datenschutz are separate pages", () => {
    const ds = read("app/(frontend)/(site)/datenschutz/page.tsx");
    assert.match(ds, /<LegalPlaceholder title="Datenschutz"/);
    assert.doesNotMatch(RENDER, /<Section id="datenschutz"/, "no privacy section inside the Impressum");
  });
  test("static editorial content: no Payload / database dependency", () => {
    for (const f of ["src/content/impressum.ts", "src/site/legal.tsx", "app/(frontend)/(site)/impressum/page.tsx"]) assert.doesNotMatch(read(f), /from "[^"]*(payload|backend|\/data\/)[^"]*"|getPayload|DATA_SOURCE/i, f);
  });
});
