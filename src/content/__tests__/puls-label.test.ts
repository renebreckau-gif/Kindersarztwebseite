// Phase 08.9: the PRAXIS PULS instrument label is part of the public hero in every state
// (OPEN, CLOSED, SPECIAL, CLOSURE, UNKNOWN, preview) and never carries status logic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const src = read("src/lab/final/entry-chrome.tsx");
const fn = src.slice(src.indexOf("export function PulsStatement"), src.indexOf("export function EntryDock"));

test("PulsStatement renders the 'Praxis Puls' label unconditionally, before the status", () => {
  const label = fn.indexOf("<p className={s.pulsLabel}>Praxis Puls</p>");
  assert.ok(label > 0, "label present as real text");
  assert.ok(label < fn.indexOf("className={s.status}"), "label precedes the status line");
  // not inside any conditional: the line itself carries no ternary/&& and sits before the first branch
  const line = fn.split("\n").find((l) => l.includes("s.pulsLabel"))!;
  assert.equal(/\?|&&/.test(line), false);
  assert.ok(label < fn.indexOf("unknown ?"), "label is placed before the UNKNOWN branch");
});

test("the label is a paragraph, not a heading, and no status is computed in the component", () => {
  assert.equal(/<h[1-6][^>]*>\s*Praxis Puls/i.test(fn), false);
  assert.equal(/new Date|getDay|getHours|Date\.now/.test(fn), false);
});

test("the public homepage uses this PulsStatement with the live engine view", () => {
  const home = read("app/(frontend)/(site)/page.tsx");
  assert.match(home, /import \{[^}]*PulsStatement[^}]*\} from "@\/lab\/final\/entry-chrome"/);
  assert.match(home, /<PulsStatement puls=\{puls\.view\}/);
});
