// Step 11 of the clean-database proof (Phase 10.2A): the practice-app questions appear only in
// the staging approval draft. Public pages carry no app name, store link, badge or placeholder.
// Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const APP_WORDING = /Praxis-App|App Store|App-Store|Google Play|Google-Play|apps\.apple\.com|play\.google\.com|Link fehlt/;

describe("Praxis-App: approval draft only", { skip: skipHttp }, () => {
  test("staging approval draft: reachable, noindex, six sections, nothing pre-selected, no link to a store", async () => {
    const r = await http("/review/praxis-app");
    assert.equal(r.status, 200);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const m = markup(r.body);
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Welche Funktionen bietet die Praxis tatsächlich an?", "App-Store-Link fehlt", "Google-Play-Link fehlt"]) assert.ok(m.includes(t), t);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    assert.equal((m.match(/>Bekannt</g) ?? []).length, 6);
    assert.equal((m.match(/>Unbestätigt</g) ?? []).length, 6);
    assert.equal((m.match(/>Offene Fragen</g) ?? []).length, 6);
    assert.ok(!/<input|<form|type="checkbox"|checked/.test(m), "no form, no ticked option");
    assert.ok(!/href="https?:\/\/(?!localhost)/.test(m), "no external link (no store, no dummy)");
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/praxis-app"') && hub.includes("Praxis-App – Freigabeentwurf"));
  });

  test("public pages: no app wording, no store links, no placeholders; start page and dock unchanged", async () => {
    for (const path of ["/", "/praxis", "/praxis/neu-bei-uns", "/praxis/kontakt", "/praxis/leistungen", "/heute", "/heute/aktuelles"]) {
      const r = await http(path);
      assert.equal(r.status, 200, path);
      assert.doesNotMatch(markup(r.body), APP_WORDING, path);
      assert.ok(!markup(r.body).includes("/review/praxis-app"), `${path} links no review route`);
    }
    const home = markup((await http("/")).body);
    const dock = home.slice(home.indexOf('aria-label="Schnellzugriff"'));
    const labels = [...dock.matchAll(/<span>([^<]+)<\/span>/g)].map((x) => x[1]).filter((t) => ["Menü", "Heute", "Notfall", "Anrufen"].includes(t)).slice(0, 4);
    assert.deepEqual(labels, ["Menü", "Heute", "Notfall", "Anrufen"]);
  });
});
