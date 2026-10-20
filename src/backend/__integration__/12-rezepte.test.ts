// Step 12 of the clean-database proof (Phase 10.3A): the prescription-process questions appear
// only in the staging approval draft. Public pages carry no prescription instruction, no
// "Rezepte per E-Mail", no form; the start page keeps the generic "E-Mail schreiben".
// Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const PUBLIC = ["/", "/praxis", "/praxis/neu-bei-uns", "/praxis/kontakt", "/praxis/leistungen", "/heute", "/heute/aktuelles", "/notfall"];

describe("Rezepte & E-Rezept: approval draft only", { skip: skipHttp }, () => {
  test("staging approval draft: reachable, noindex, eight sections, four unconfirmed channels, no form", async () => {
    const r = await http("/review/rezepte");
    assert.equal(r.status, 200);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const m = markup(r.body);
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Rezepte &amp; E-Rezept", "Vorschlag zur Klärung des Praxisablaufs", "Muss die Gesundheitskarte vor einer Rezeptausstellung eingelesen sein?"]) assert.ok(m.includes(t), t);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    assert.equal((m.match(/<h2/g) ?? []).length, 8);
    for (const g of [">Bekannt<", ">Unbestätigt<", ">Offene Fragen<"]) assert.equal(m.split(g).length - 1, 8, g);
    assert.equal(m.split(">Kanäle<").length - 1, 1);
    for (const c of ["Telefon", "E-Mail", "Praxis-App", "Vor Ort"]) assert.ok(m.includes(`>${c}</span>`), c);
    assert.equal(m.split("Noch nicht bestätigt").length - 1, 12, "8 section badges + 4 channels");
    assert.ok(!/<form|<input|<textarea|<select|type="checkbox"|checked/.test(m), "no form, no ticked option");
    assert.ok(!/href="(mailto:|tel:|https?:\/\/(?!localhost))/.test(m), "no e-mail / phone CTA, no external link");
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/rezepte"') && hub.includes("Rezepte &amp; E-Rezept – Freigabeentwurf"));
  });

  test("public pages: no prescription wording, no form; /praxis/rezepte does not exist; start page keeps generic e-mail", async () => {
    for (const path of PUBLIC) {
      const r = await http(path);
      assert.equal(r.status, 200, path);
      const m = markup(r.body);
      assert.doesNotMatch(m, /Rezept/, path);
      assert.ok(!/<form|<input|<textarea/.test(m), `${path} has no form`);
      assert.ok(!m.includes("/review/rezepte"), `${path} links no review route`);
    }
    assert.equal((await http("/praxis/rezepte")).status, 404);
    const home = markup((await http("/")).body);
    assert.ok(home.includes('aria-label="E-Mail schreiben an die Kinderarztpraxis"'), "generic e-mail action unchanged");
    assert.doesNotMatch(home, /per E-Mail/);
  });
});
