// Emergency actions stay real links with fixed targets, never nested in other controls.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const chrome = read("src/site/chrome.tsx");
const notfall = read("app/(frontend)/(site)/notfall/page.tsx");

test("112 is a plain tel: link in the footer and on the Notfall page", () => {
  assert.match(chrome, /<a href="tel:112">112<\/a>/);
  assert.match(notfall, /href="tel:112"/);
});

test("header and dock Notfall actions link to /notfall", () => {
  const dock = chrome.slice(chrome.indexOf("export function SiteDock"), chrome.indexOf("export function SiteFooter"));
  assert.match(dock, /href="\/notfall"/);
  assert.match(chrome, /className=\{s\.emergency\}[^>]*href="\/notfall"|href="\/notfall"[^>]*className=\{s\.emergency\}/);
});

test("no nested interactive elements around emergency links", () => {
  for (const src of [chrome, notfall]) {
    // an <a> opened and, before it closes, another <a or <button
    assert.equal(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<(a|button)\b/.test(src), false);
  }
});

test("112 target: footer link is enlarged to 48 px without moving the text", () => {
  const css = read("src/site/chrome.module.css");
  const rule = css.slice(css.indexOf(".footer112 a {"), css.indexOf("}", css.indexOf(".footer112 a {")));
  assert.match(rule, /min-width: 48px/);
  assert.match(rule, /min-height: 48px/);
  assert.match(rule, /margin: -14px -12px/);
});
