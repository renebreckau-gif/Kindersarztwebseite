// Step 26 of the clean-database proof (Phase 10.0C): the rendered Impressum shows the verified facts
// only — no invented legal form / responsible person / professional title, no outdated legal text,
// no compliance claim. Datenschutz stays the controlled placeholder. Static content; the DB-off
// behaviour of both pages is proven in step 27 (outage).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const text = (html: string) => markup(html).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("Impressum foundation", { skip: skipHttp }, () => {
  test("/impressum: 200, one h1, verified facts, usable contact links, named external links", async () => {
    const r = await http("/impressum");
    assert.equal(r.status, 200);
    const m = markup(r.body);
    const t = text(r.body);
    for (const s of [
      "Kinderarztpraxis Probst & Böhme",
      "Untere Bahnhofstraße 9",
      "06333 Hettstedt",
      "03476 / 851157",
      "03476 / 854206",
      "kinderarztpraxis-hettstedt@gmx.de",
      "Berufsrechtliche Angaben",
      "Ärztekammer Sachsen-Anhalt",
      "Kassenärztliche Vereinigung Sachsen-Anhalt",
      "Doctor-Eisenbart-Ring 2",
      "39120 Magdeburg",
      "Berufsordnung der Ärztekammer Sachsen-Anhalt",
    ]) assert.ok(t.includes(s), s);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    assert.match(m, /<h1[^>]*>Impressum<\/h1>/);
    assert.ok((m.match(/<h2/g) ?? []).length >= 2);
    assert.match(m, /href="tel:\+493476851157"/);
    assert.match(m, /href="mailto:kinderarztpraxis-hettstedt@gmx\.de"/, "plain mailto, nothing prefilled");
    assert.ok(!/href="[^"]*854206/.test(m), "fax is text only");
    for (const href of ["https://www.aeksa.de", "https://www.kvsa.de", "https://www.aeksa.de/www/website/PublicNavigation/arzt/arztundrecht/rechtsquellen/ordnungensatzungen/berufsordnung/"]) {
      assert.match(m, new RegExp(`<a class="[^"]*" href="${href.replace(/[./]/g, "\\$&")}" rel="noopener noreferrer">`), href);
    }
  });

  test("/impressum: nothing outdated, nothing invented, no compliance claim (also in the staging note)", async () => {
    const t = text((await http("/impressum")).body);
    for (const re of [/Telemediengesetz/, /\bTMG\b/, /Rundfunkstaatsvertrag/, /\bRStV\b/, /ohne Angabe personenbezogener Daten möglich/, /Haftung für (Inhalte|Links)/, /Bahnhofsstra/]) assert.doesNotMatch(t, re, String(re));
    for (const re of [/\bBAG\b/, /\bGbR\b/, /Gemeinschaftspraxis/, /Vertretungsberechtigt/, /verantwortlich i\.\s?S\.\s?d\./i, /§\s?18 Abs\. 2/, /Fachärztin/, /verliehen in/]) assert.doesNotMatch(t, re, String(re));
    for (const re of [/rechtssicher/i, /DSGVO-konform/i, /vollständig rechtlich geprüft/i]) assert.doesNotMatch(t, re, String(re));
    assert.ok(t.includes("Rechtliche Finalprüfung ausstehend: Rechtsform/Anbieter, verantwortliche Person(en) und vollständige Berufsbezeichnungen."), "STAGING InternalNote");
  });

  test("/impressum and /datenschutz: no duplicate ids, exactly one h1", async () => {
    for (const path of ["/impressum", "/datenschutz"]) {
      const m = markup((await http(path)).body);
      const ids = [...m.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
      assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], path);
      assert.equal((m.match(/<h1/g) ?? []).length, 1, path);
    }
  });

  test("/datenschutz: still the controlled placeholder, no old privacy paragraph", async () => {
    const r = await http("/datenschutz");
    assert.equal(r.status, 200);
    const t = text(r.body);
    assert.ok(t.includes("Dieser Text wird derzeit fachlich geprüft und erscheint hier nach der Freigabe."));
    assert.doesNotMatch(t, /ohne Angabe personenbezogener Daten möglich/);
    assert.ok(!t.includes("Berufsrechtliche Angaben"), "Impressum and Datenschutz stay separate");
  });
});
