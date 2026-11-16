// Phase 10.0D — guard for the locked public content architecture (docs/architecture/public-content-
// architecture.md §3). Docs-backed: the route-ownership table is the source; this test only stops drift
// (a future route created without its B phase, a review route in public navigation, a changed top level / dock).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const DOC = read("docs/architecture/public-content-architecture.md");
const pageExists = (route: string) => existsSync(join(ROOT, "app/(frontend)/(site)", route, "page.tsx"));

/** §3 rows: [route, created?] for every route marked "(exists…)" or "(not created)". */
const ROWS = [...DOC.slice(DOC.indexOf("## 3."), DOC.indexOf("## 4.")).matchAll(/`(\/[a-z/-]+)` \*\((exists[^)]*|not created)\)\*/g)].map((m) => [m[1], !m[2].startsWith("not")] as const);

describe("locked public content architecture (10.0D)", () => {
  test("§3 route table is readable and covers the Phase 10 topics", () => {
    const routes = ROWS.map(([r]) => r);
    for (const r of ["/praxis/gut-vorbereitet", "/praxis/leistungen", "/praxis/rezepte", "/praxis/praxis-app", "/praxis/kosten", "/praxis/team", "/praxis/aerztinnen", "/praxis/kontakt", "/praxis/neu-bei-uns"]) assert.ok(routes.includes(r), r);
  });

  test("routes match their documented state — no placeholder page before its B phase", () => {
    for (const [route, created] of ROWS) assert.equal(pageExists(route), created, `${route} documented as ${created ? "existing" : "not created"}`);
  });

  test("public navigation links only existing pages and never a review / staff route", () => {
    const links = [...PRIMARY.map((p) => p.href), ...SITEMAP.flatMap((s) => [s.href, ...s.children.map((c) => c.href)]), ...LEGAL.map((l) => l.href), ...NEEDS.map((n) => n.href)];
    for (const href of links) {
      assert.ok(!/^\/(review|lab|intern|mitarbeiter)\b/.test(href), href);
      if (href !== "/") assert.ok(pageExists(href) || (/^\/mein-kind\/\d/.test(href) && pageExists("/mein-kind/[alter]")), `${href} has a page`);
    }
  });

  test("top level and mobile dock unchanged", () => {
    assert.deepEqual(PRIMARY.map((p) => p.label), ["Heute", "Mein Kind", "Praxis", "Entdecken"]);
    const dock = read("src/site/chrome.tsx");
    const body = dock.slice(dock.indexOf("export function SiteDock"), dock.indexOf("export function SiteFooter"));
    assert.deepEqual([...body.matchAll(/<span>([^<{]+)<\/span>/g)].map((m) => m[1]), ["Menü", "Heute", "Notfall", "Anrufen"]);
  });
});
