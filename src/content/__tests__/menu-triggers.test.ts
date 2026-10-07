// Regression (Phase 07.1.1): no public Menü trigger may jump to the footer (#menue).
// The footer keeps id="menue" for structure; every visible Menü control on the public
// site is the shared <MenuButton> that opens the Hauptmenü overlay.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(rel);
  }
  return out;
}

// Everything the public site renders: its routes, site components and content.
const PUBLIC = [...files("app/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__"))];
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

test("no public file links or scrolls to #menue", () => {
  const offenders = PUBLIC.filter((f) => {
    const src = read(f).replace(/id="menue"/g, ""); // the footer anchor itself is allowed
    return /#menue/.test(src) || /menuHref/.test(src) || /(scrollIntoView|scrollTo)[^\n]*menue/i.test(src) || /getElementById\(\s*["']menue/.test(src);
  });
  assert.deepEqual(offenders, []);
});

test("dock Menü is the shared button, placed first", () => {
  const chrome = read("src/site/chrome.tsx");
  const dock = chrome.slice(chrome.indexOf("export function SiteDock"), chrome.indexOf("export function SiteFooter"));
  const order = ["<MenuButton", 'href="/heute"', 'href="/notfall"', "PRACTICE.phone.value.href"].map((m) => dock.indexOf(m));
  assert.ok(order.every((i) => i > 0), "all four dock controls present");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "order: Menü · Heute · Notfall · Anrufen");
});

test("start page hero header uses the same menu button and mounts the overlay", () => {
  const start = read("app/(site)/page.tsx");
  assert.match(start, /menu=\{\(className\) => \(\s*<MenuButton/);
  assert.match(start, /<SiteMenu \/>/);
  assert.match(read("src/site/chrome.tsx"), /<SiteMenu \/>/); // every other public page (PageFrame)
});

test("menu trigger is an accessible <button> controlling the dialog", () => {
  const menu = read("src/site/mobile-menu.tsx");
  assert.match(menu, /<button\s+type="button"[\s\S]*?aria-expanded=\{isOpen\}[\s\S]*?aria-controls=\{MENU_ID\}/);
  assert.match(menu, /role="dialog"/);
  assert.match(menu, /aria-modal="true"/);
  assert.match(menu, /<nav aria-label="Hauptmenü"/);
  assert.doesNotMatch(menu, /role="menu"/);
  for (const href of ['"/"', '"/heute"', '"/mein-kind"', '"/praxis"', '"/entdecken"', '"/heute/sprechzeiten"', '"/notfall"']) {
    assert.ok(menu.includes(`href: ${href}`) || menu.includes(`href=${href}`), `menu links to ${href}`);
  }
});
