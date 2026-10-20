// Step 10 of the clean-database proof (Phase 10.1A): "Gut vorbereitet" proposals are visible
// only in the staging approval draft — never on the public pages (start page, "Neu bei uns?",
// mobile dock). Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { FIRST_VISIT_ITEMS } from "../../content/first-visit.ts";
import { http, skipHttp } from "./helpers.ts";

/** The visible document only (Next also embeds props as RSC data in <script> tags). */
const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const PROPOSALS = FIRST_VISIT_ITEMS.map((i) => i.text);

describe("Gut vorbereitet: approval draft only", { skip: skipHttp }, () => {
  test("staging approval draft: reachable, noindex, every proposal labelled as not public", async () => {
    const r = await http("/review/gut-vorbereitet");
    assert.equal(r.status, 200);
    const m = markup(r.body);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Gut vorbereitet", "Vorschlag zur inhaltlichen Freigabe"]) assert.ok(m.includes(t), t);
    for (const p of PROPOSALS) assert.ok(m.includes(p), p);
    assert.equal((m.match(/>Textvorschlag</g) ?? []).length, PROPOSALS.length, "every proposal is labelled");
    assert.equal((m.match(/Noch nicht freigegeben/g) ?? []).length, PROPOSALS.length, "status in words for every proposal");
    assert.ok(!m.includes("Praxisregel"));
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/gut-vorbereitet"') && hub.includes("Gut vorbereitet – Freigabeentwurf"));
  });

  test("public pages publish no proposal: start page unchanged, dock unchanged, 'Neu bei uns?' unchanged", async () => {
    for (const path of ["/", "/praxis/neu-bei-uns", "/praxis", "/heute"]) {
      const r = await http(path);
      assert.equal(r.status, 200, path);
      const m = markup(r.body);
      for (const p of PROPOSALS) assert.ok(!m.includes(p), `${path}: ${p}`);
      assert.ok(!m.includes("/review/gut-vorbereitet"), `${path} links no review route`);
    }
    const home = markup((await http("/")).body);
    assert.ok(!home.includes("Gut vorbereitet"), "no Gut-vorbereitet block on the start page");
    const dock = home.slice(home.indexOf('aria-label="Schnellzugriff"'));
    const labels = [...dock.matchAll(/<span>([^<]+)<\/span>/g)].map((x) => x[1]).filter((t) => ["Menü", "Heute", "Notfall", "Anrufen"].includes(t)).slice(0, 4);
    assert.deepEqual(labels, ["Menü", "Heute", "Notfall", "Anrufen"]);
  });
});
