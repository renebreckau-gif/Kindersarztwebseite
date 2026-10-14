// Phase 09.4 — staff entry: footer "Mitarbeiterbereich" → /mitarbeiter → the right cockpit.
// The footer placement is UX, not security; security stays authentication + roles + server rules.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIMARY, SITEMAP, LEGAL } from "../site.ts";
import { BACKEND_ACTION, PROTOTYPE_ACTION, STAFF_ENTRY, backendConfigured, stagingNote, staffEntryActions } from "../staff-entry.ts";
import { SITE_STAGE, RELEASE } from "../release.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const fn = (src: string, name: string) => {
  const start = src.indexOf(`export function ${name}`);
  const next = src.indexOf("\nexport ", start + 10);
  return src.slice(start, next === -1 ? undefined : next);
};
const chrome = read("src/site/chrome.tsx");

describe("footer staff link", () => {
  test("1–2: the footer contains 'Mitarbeiterbereich' linking to /mitarbeiter, after the legal links", () => {
    assert.deepEqual(STAFF_ENTRY, { label: "Mitarbeiterbereich", href: "/mitarbeiter" });
    const footer = fn(chrome, "SiteFooter");
    assert.match(footer, /<Link href=\{STAFF_ENTRY\.href\}>\{STAFF_ENTRY\.label\}<\/Link>/);
    const legal = footer.slice(footer.indexOf("footerLegal"));
    assert.ok(legal.indexOf("LEGAL.map") < legal.indexOf("STAFF_ENTRY"), "after Impressum/Datenschutz/Barrierefreiheit");
    assert.deepEqual(LEGAL.map((l) => l.label), ["Impressum", "Datenschutz", "Barrierefreiheit"]);
  });

  test("3: not in the primary navigation, sitemap or header", () => {
    for (const p of PRIMARY) assert.notEqual(p.href, "/mitarbeiter");
    for (const g of SITEMAP) {
      assert.notEqual(g.href, "/mitarbeiter");
      for (const c of g.children) assert.notEqual(c.href, "/mitarbeiter");
    }
    assert.doesNotMatch(fn(chrome, "SiteHeader"), /STAFF_ENTRY|mitarbeiter/i);
  });

  test("4: not in the mobile dock or the mobile menu", () => {
    assert.doesNotMatch(fn(chrome, "SiteDock"), /STAFF_ENTRY|mitarbeiter/i);
    assert.doesNotMatch(read("src/site/mobile-menu.tsx"), /STAFF_ENTRY|mitarbeiter/i);
  });

  test("the link is a plain utility link (no button, icon or highlight)", () => {
    const line = fn(chrome, "SiteFooter").split("\n").find((l) => l.includes("STAFF_ENTRY.href"))!;
    assert.doesNotMatch(line, /className|Icon|lock/i);
  });
});

describe("/mitarbeiter", () => {
  test("the page exists in the public site frame and evaluates stage + backend per request", () => {
    const page = read("app/(frontend)/(site)/mitarbeiter/page.tsx");
    assert.match(page, /await connection\(\);/);
    assert.match(page, /staffEntryActions\(SITE_STAGE, backendConfigured\(process\.env\)\)/);
    assert.doesNotMatch(page, /payload|@\/backend|@\/cockpit/i, "no database access on the public page");
    assert.ok(existsSync(join(ROOT, "src/site/staff-entry.tsx")));
  });

  test("5–8: STAGING without backend → prototype only, to /lab/praxis-cockpit/anmelden, no /intern", () => {
    const actions = staffEntryActions("STAGING", false);
    assert.deepEqual(actions, [PROTOTYPE_ACTION]);
    assert.equal(actions[0].href, "/lab/praxis-cockpit/anmelden");
    assert.equal(actions[0].label, "Praxis Cockpit öffnen");
    assert.ok(actions.every((a) => !a.href.startsWith("/intern")));
    assert.equal(stagingNote("STAGING"), "Testumgebung · keine echten Daten");
  });

  test("9: STAGING with backend → prototype AND clearly labelled real login", () => {
    const actions = staffEntryActions("STAGING", true);
    assert.deepEqual(actions.map((a) => a.id), ["PROTOTYPE", "BACKEND"]);
    assert.equal(actions[1].href, "/intern/anmelden");
    assert.equal(BACKEND_ACTION.tag, "Echte Anmeldung · Datenbank-Testumgebung");
    assert.equal(PROTOTYPE_ACTION.tag, "Testdaten · vollständige Workflow-Vorschau");
  });

  test("10: PRODUCTION never offers the lab prototype", () => {
    for (const backend of [true, false]) {
      const actions = staffEntryActions("PRODUCTION", backend);
      assert.ok(actions.every((a) => !a.href.startsWith("/lab")), String(backend));
    }
    // Phase 09.5A: the real login appears in PRODUCTION only once the staff portal is released.
    assert.deepEqual(staffEntryActions("PRODUCTION", true), [], "flag off (current) → calm unavailable state");
    assert.deepEqual(staffEntryActions("PRODUCTION", true, { staffPortalProductionEnabled: true }).map((a) => a.href), ["/intern/anmelden"]);
    assert.deepEqual(staffEntryActions("PRODUCTION", false), []);
    assert.equal(stagingNote("PRODUCTION"), null);
  });

  test("backend detection needs both values; stage and release gates unchanged", () => {
    assert.equal(backendConfigured({}), false);
    assert.equal(backendConfigured({ DATABASE_URI: "x" }), false);
    assert.equal(backendConfigured({ DATABASE_URI: "x", PAYLOAD_SECRET: " " }), false);
    assert.equal(backendConfigured({ DATABASE_URI: "x", PAYLOAD_SECRET: "y" }), true);
    assert.equal(SITE_STAGE, "STAGING");
    assert.equal(RELEASE.indexable, false);
  });

  test("/review stays project tooling and is not the staff entry", () => {
    assert.doesNotMatch(fn(chrome, "SiteFooter"), /\/review/);
    assert.notEqual(STAFF_ENTRY.href, "/review");
  });
});
