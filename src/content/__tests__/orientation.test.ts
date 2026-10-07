// Phase 08.1: deterministic back navigation and age context that survives Vorsorge /
// Impfungen — without turning the age range into a medical mapping.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGES, ageFromQuery, ageTopics, ageTopicHref, topicBack, ageSectionTitle, ageContextLine } from "../site.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

test("valid age queries resolve to the AGES entry", () => {
  for (const a of AGES) assert.equal(ageFromQuery(a.slug), a);
});

test("invalid or ambiguous age queries fall back to generic mode", () => {
  for (const v of ["banana", "", "3-6", "3–6-jahre", "<script>", undefined, ["3-6-jahre"], ["3-6-jahre", "0-2-jahre"]]) {
    assert.equal(ageFromQuery(v as string | string[] | undefined), null, String(v));
  }
});

test("age topic URLs carry ?alter= for Vorsorge and Impfungen only", () => {
  for (const a of AGES) {
    for (const t of ageTopics(a)) {
      if (/^\/mein-kind\/(vorsorge|impfungen)/.test(t.href)) {
        assert.ok(t.href.includes(`?alter=${a.slug}`), `${a.slug}: ${t.href}`);
      } else {
        assert.equal(t.href.includes("alter="), false, `no confetti: ${t.href}`);
      }
    }
  }
  const age36 = AGES.find((a) => a.slug === "3-6-jahre")!;
  const hrefs = ageTopics(age36).map((t) => t.href);
  assert.ok(hrefs.includes("/mein-kind/vorsorge?alter=3-6-jahre"));
  assert.ok(hrefs.includes("/mein-kind/impfungen?alter=3-6-jahre"));
});

test("hash links keep the hash after the query (J1 from 13–17)", () => {
  const teen = AGES.find((a) => a.slug === "13-17-jahre")!;
  const j1 = teen.topics.find((t) => t.label === "J1")!;
  assert.equal(ageTopicHref(teen, j1), "/mein-kind/vorsorge?alter=13-17-jahre#j1");
});

test("contextual Vorsorge/Impfungen go back to the age page; generic to Mein Kind", () => {
  const age = ageFromQuery("3-6-jahre");
  assert.deepEqual(topicBack(age), { href: "/mein-kind/3-6-jahre", label: "3–6 Jahre", ariaLabel: "Zurück zu 3–6 Jahre" });
  assert.deepEqual(topicBack(ageFromQuery("banana")), { href: "/mein-kind", label: "Mein Kind", ariaLabel: "Zurück zu Mein Kind" });
  for (const page of ["app/(site)/mein-kind/vorsorge/page.tsx", "app/(site)/mein-kind/impfungen/page.tsx"]) {
    const src = read(page);
    assert.match(src, /back=\{topicBack\(age\)\}/, page);
    assert.match(src, /ageFromQuery\(q\[AGE_PARAM\]\)/, page);
  }
});

test("age sections name the explicit range; the generic phrase is gone", () => {
  assert.deepEqual(
    AGES.map(ageSectionTitle),
    ["Orientierung für 0–2 Jahre", "Orientierung für 3–6 Jahre", "Orientierung für 7–12 Jahre", "Orientierung für 13–17 Jahre"],
  );
  assert.equal(ageContextLine(AGES[1]), "Orientierung für 3–6 Jahre · Kindergartenjahre");
  for (const f of [...files("app/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__"))]) {
    assert.equal(/für dieses Alter/.test(read(f)), false, f);
  }
});

test("back navigation never uses the browser history", () => {
  for (const f of [...files("app/(site)"), ...files("src/site")]) {
    assert.equal(/history\.(back|go)\(|router\.back\(/.test(read(f)), false, f);
  }
});

test("every public page except Start has the shared back control (deterministic parent)", () => {
  const sub: Record<string, string> = {
    heute: "/",
    "mein-kind": "/",
    praxis: "/",
    "heute/sprechzeiten": "/heute",
    "heute/aktuelles": "/heute",
    "praxis/aerztinnen": "/praxis",
    "praxis/team": "/praxis",
    "praxis/leistungen": "/praxis",
    "praxis/neu-bei-uns": "/praxis",
    "praxis/kontakt": "/praxis",
    "mein-kind/[alter]": "/mein-kind",
  };
  for (const [route, parent] of Object.entries(sub)) {
    assert.match(read(`app/(site)/${route}/page.tsx`), new RegExp(`back=\\{\\{ href: "${parent}"`), route);
  }
  // Entdecken: Start (keeps the review parameter in preview)
  assert.match(read("app/(site)/entdecken/page.tsx"), /back=\{\{ href: preview \? "\/\?vorschau=freigabe" : "\/", label: "Start" \}\}/);
  assert.match(read("app/(site)/entdecken/mein-arztbesuch/page.tsx"), /<PageBackNav[^>]*label="Entdecken"/);
  // Notfall: Start, placed before (and outside) the 112 action
  const notfall = read("app/(site)/notfall/page.tsx");
  assert.match(notfall, /<PageBackNav href="\/" label="Start" \/>/);
  assert.ok(notfall.indexOf("<PageBackNav") < notfall.indexOf("tel:112"));
  // legal pages: through the shared LegalPlaceholder
  assert.match(read("src/site/legal.tsx"), /back=\{\{ href: "\/", label: "Start" \}\}/);
  for (const legal of ["impressum", "datenschutz", "barrierefreiheit"]) assert.match(read(`app/(site)/${legal}/page.tsx`), /<LegalPlaceholder/, legal);
  // Start is the root: no back control
  assert.equal(/back=\{|<PageBackNav/.test(read("app/(site)/page.tsx")), false);
});

test("route coverage: every public page file except Start carries the back pattern", () => {
  const pages = files("app/(site)")
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => f.endsWith("/page.tsx"));
  assert.ok(pages.length >= 20); // 20 files = 24 routes (the four age pages share [alter])
  for (const f of pages) {
    const isStart = f === "app/(site)/page.tsx";
    assert.equal(/back=\{|<PageBackNav|<LegalPlaceholder/.test(read(f)), !isStart, f);
  }
});

test("the back control is an arrow in a circle, not a play/carousel triangle", () => {
  const src = read("src/site/blocks.tsx");
  const nav = src.slice(src.indexOf("export function PageBackNav"), src.indexOf("// ---------------------------------------------------------------- page intro"));
  assert.match(nav, /<Link /);
  assert.match(nav, /aria-label=\{ariaLabel \?\? `Zurück zu \$\{label\}`\}/);
  assert.match(nav, /d="M19 12H5"/, "arrow shaft present");
  assert.equal(/fill="currentColor"|polygon/.test(nav), false, "no filled triangle");
});

test("U/J line: no links, buttons or age-based highlighting", () => {
  const src = read("app/(site)/mein-kind/vorsorge/page.tsx");
  const line = src.slice(src.indexOf("<ol className={u.examLine}>"), src.indexOf("</ol>", src.indexOf("<ol className={u.examLine}>")));
  assert.ok(line.length > 0);
  assert.equal(/<Link|<a |<button|onClick|aria-current|tabIndex|age\./.test(line), false);
});

test("growth scale: hover/current only tint the bar — no badge styles, no geometry", () => {
  const css = read("src/site/blocks.module.css");
  // every rule whose selector targets .growthBar in a :hover/aria-current state
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => /growthBar/.test(sel) && /:hover|aria-current/.test(sel));
  assert.ok(rules.length >= 2);
  for (const [, sel, body] of rules) {
    assert.equal(/growthNow/.test(sel), false, `badge shares a selector with the bar: ${sel.trim()}`);
    const props = body.split(";").map((d) => d.split(":")[0].trim()).filter(Boolean);
    assert.deepEqual(props, ["background"], `${sel.trim()} sets ${props.join(", ")}`);
  }
});
