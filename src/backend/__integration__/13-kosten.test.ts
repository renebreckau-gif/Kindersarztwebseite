// Step 13 of the clean-database proof (Phase 10.4A): prices and payment methods appear only as
// questions in the staging approval draft. Public pages carry no Euro amount, no payment
// method, no "keine Barzahlung", no logo; /praxis/kosten does not exist.
// Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const PUBLIC = ["/", "/praxis", "/praxis/leistungen", "/praxis/neu-bei-uns", "/praxis/kontakt", "/heute", "/heute/aktuelles", "/notfall"];
const EURO_AMOUNT = /\d\s*(€|EUR\b|Euro\b)|(€|EUR)\s*\d/;

describe("Kosten & Zahlungsarten: approval draft only", { skip: skipHttp }, () => {
  test("staging approval draft: reachable, noindex, eight sections, six unconfirmed payment methods, no amount", async () => {
    const r = await http("/review/kosten");
    assert.equal(r.status, 200);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const m = markup(r.body);
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Kosten &amp; Zahlungsarten", "Vorschlag zur Klärung der Praxisangaben", "Aktuelle Preisliste – noch nicht vorliegend", "Beispiel aus dem Praxisteam, zu bestätigen", ">Mögliche Zahlungsarten<"]) assert.ok(m.includes(t), t);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    assert.equal((m.match(/<h2/g) ?? []).length, 8);
    for (const g of [">Bekannt<", ">Unbestätigt<", ">Offene Fragen<"]) assert.equal(m.split(g).length - 1, 8, g);
    for (const c of ["Girocard / Karte", "Kreditkarte", "Barzahlung", "Rechnung", "Überweisung", "Sonstiges"]) assert.ok(m.includes(`>${c}</span>`), c);
    assert.equal(m.split("Noch nicht bestätigt").length - 1, 14, "8 section badges + 6 payment methods");
    assert.doesNotMatch(m, EURO_AMOUNT);
    assert.ok(!/<form|<input|<select|<textarea|<img|<svg|type="checkbox"|checked/.test(m), "no form, no logo, no ticked option");
    assert.ok(!/href="(mailto:|tel:|https?:\/\/(?!localhost))/.test(m), "no CTA, no external link");
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/kosten"') && hub.includes("Kosten &amp; Zahlungsarten – Freigabeentwurf"));
  });

  test("public pages: no price, no payment claim, no logo; /praxis/kosten does not exist", async () => {
    for (const path of PUBLIC) {
      const r = await http(path);
      assert.equal(r.status, 200, path);
      const m = markup(r.body);
      assert.doesNotMatch(m, EURO_AMOUNT, path);
      assert.doesNotMatch(m, /Preis|Barzahlung|Girocard|Kreditkarte|Zahlungsart/, path);
      assert.doesNotMatch(m, /visa|mastercard|paypal|girocard/i, `${path} has no payment logo`);
      assert.ok(!m.includes("/review/kosten"), `${path} links no review route`);
    }
    assert.equal((await http("/praxis/kosten")).status, 404);
    const home = markup((await http("/")).body);
    assert.ok(home.includes('aria-label="E-Mail schreiben an die Kinderarztpraxis"'), "start page Variant B unchanged");
  });
});
