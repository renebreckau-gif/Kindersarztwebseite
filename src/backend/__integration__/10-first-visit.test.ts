// Step 10 of the clean-database proof (10.1A, public since 10.1B): "Gut vorbereitet" is a public STAGING
// page (/praxis/gut-vorbereitet) built from the practice input of 2026-11-16 (working data); the Praxis hub
// links only existing pages; the start page, Heute and the dock stay unchanged; the approval workspace
// stays staging-only. Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { FIRST_VISIT_ITEMS } from "../../content/first-visit.ts";
import { http, skipHttp } from "./helpers.ts";

/** The visible document only (Next also embeds props as RSC data in <script> tags). */
const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const text = (html: string) => markup(html).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const ids = (m: string) => [...m.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);

describe("Gut vorbereitet: public STAGING page", { skip: skipHttp }, () => {
  test("/praxis/gut-vorbereitet: 200, one h1, the four items, nothing speculative", async () => {
    const r = await http("/praxis/gut-vorbereitet");
    assert.equal(r.status, 200);
    const m = markup(r.body);
    const t = text(r.body);
    assert.match(m, /<h1[^>]*>Gut vorbereitet in die Praxis<\/h1>/);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    for (const s of ["Gesundheitskarte", "Impfpass", "Keine Impfung ohne Impfpass", "Mundschutz", "Die wichtigsten Dinge für Ihren Besuch auf einen Blick."]) assert.ok(t.includes(s), s);
    for (const i of FIRST_VISIT_ITEMS) assert.ok(t.includes(i.title) && t.includes(i.text), i.id);
    const main = m.slice(m.indexOf("<main"), m.indexOf("</main>"));
    assert.equal((main.match(/<h2/g) ?? []).length, FIRST_VISIT_ITEMS.length + 1, "one h2 per item + 'Außerdem hilfreich'");
    for (const banned of ["U-Heft", "Überweisung", "Medikamentenliste", "über 6 Jahre", "FFP2", "Pflicht", "verpflichtend"]) assert.ok(!t.includes(banned), banned);
    assert.deepEqual(ids(m).filter((id, i, a) => a.indexOf(id) !== i), [], "no duplicate ids");
    assert.match(m, /href="\/praxis\/neu-bei-uns"/);
    assert.match(m, /href="\/mein-kind\/impfungen"/);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/, "STAGING stays non-indexable");
  });

  test("/praxis hub: three task groups, every link resolves, no future 404 route", async () => {
    const r = await http("/praxis");
    assert.equal(r.status, 200);
    const m = markup(r.body);
    const t = text(r.body);
    for (const s of ["Vor dem Besuch", "Angebot & Service", "Über uns", "Neu bei uns?", "Gut vorbereitet", "Leistungen", "Ärztinnen", "Team", "Kontakt"]) assert.ok(t.includes(s), s);
    for (const f of ["/praxis/rezepte", "/praxis/praxis-app", "/praxis/kosten", "/review"]) assert.ok(!m.includes(`href="${f}`), f);
    const links = [...new Set([...m.matchAll(/href="(\/praxis\/[a-z-]+)"/g)].map((x) => x[1]))];
    assert.ok(links.length >= 6);
    for (const l of links) assert.equal((await http(l)).status, 200, l);
    assert.deepEqual(ids(m).filter((id, i, a) => a.indexOf(id) !== i), []);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
  });

  test("'Neu bei uns?' links to Gut vorbereitet without repeating it; start page, Heute and dock unchanged", async () => {
    const neu = markup((await http("/praxis/neu-bei-uns")).body);
    assert.match(neu, /href="\/praxis\/gut-vorbereitet"/);
    for (const i of FIRST_VISIT_ITEMS) assert.ok(!neu.includes(i.text), i.id);
    for (const path of ["/", "/heute"]) {
      const m = markup((await http(path)).body);
      for (const i of FIRST_VISIT_ITEMS) assert.ok(!m.includes(i.text) && !m.includes(i.title), `${path}: ${i.id}`);
      assert.ok(!m.includes("/review/gut-vorbereitet"), `${path} links no review route`);
    }
    const home = markup((await http("/")).body);
    // Only as a sitemap link (footer / menu, next to "Neu bei uns?") — never a start-page block or banner.
    assert.equal((home.match(/Gut vorbereitet/g) ?? []).length, (home.match(/href="\/praxis\/gut-vorbereitet"/g) ?? []).length, "no Gut-vorbereitet block on the start page");
    const homeMain = home.slice(home.indexOf("<main"), home.indexOf("</main>"));
    assert.ok(!homeMain.includes("Gut vorbereitet"), "nothing in the start page's main content");
    const dock = home.slice(home.indexOf('aria-label="Schnellzugriff"'));
    const labels = [...dock.matchAll(/<span>([^<]+)<\/span>/g)].map((x) => x[1]).filter((t) => ["Menü", "Heute", "Notfall", "Anrufen"].includes(t)).slice(0, 4);
    assert.deepEqual(labels, ["Menü", "Heute", "Notfall", "Anrufen"]);
  });

  test("approval workspace: staging-only, noindex, working input vs. final approval", async () => {
    const r = await http("/review/gut-vorbereitet");
    assert.equal(r.status, 200);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const m = markup(r.body);
    for (const t of ["Freigabestand · interne Ansicht", "Arbeitsstand und offene Freigabe", "Vor dem Livegang"]) assert.ok(m.includes(t), t);
    assert.equal((m.match(/Arbeitsstand – formale Freigabe offen/g) ?? []).length, FIRST_VISIT_ITEMS.length);
    assert.equal((m.match(/>Text auf der Website \(Arbeitsstand\)</g) ?? []).length, FIRST_VISIT_ITEMS.length);
    assert.ok(!m.includes("Praxisregel"));
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/gut-vorbereitet"') && hub.includes("Gut vorbereitet – Freigabe"));
  });
});
