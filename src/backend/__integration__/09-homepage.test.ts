// Step 9 of the clean-database proof (Phase 10.0A): the REAL start page over HTTP — e-mail as a
// secondary contact, the mobile dock unchanged, no highlight with the current static data, the
// lab PRAXIS PULS unchanged, and the staging review view with artificial highlights. The public
// page reads static content only (no database access involved).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PRACTICE } from "../../content/practice.ts";
import { http, skipHttp } from "./helpers.ts";

const section = (html: string, start: RegExp) => {
  const m = html.match(start);
  if (!m || m.index === undefined) return "";
  const tag = m[0].match(/^<(\w+)/)![1];
  const end = html.indexOf(`</${tag}>`, m.index);
  return html.slice(m.index, end);
};
const puls = (html: string) => section(html, /<section[^>]*aria-label="Heute in der Praxis"[^>]*>/);
const dock = (html: string) => section(html, /<nav[^>]*aria-label="Schnellzugriff"[^>]*>/);
const MAILTO = `mailto:${PRACTICE.email.value}`;
/** The visible document only: Next also embeds the same props as RSC data in <script> tags. */
const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");

describe("start page (Variant B) over HTTP", { skip: skipHttp }, () => {
  test("e-mail: real mailto link from PRACTICE.email, secondary to Anrufen and Notfall, accessible name", async () => {
    const r = await http("/");
    assert.equal(r.status, 200);
    const p = puls(r.body);
    assert.ok(p, "PRAXIS PULS present");
    assert.match(p, /E-Mail schreiben/);
    assert.ok(p.includes(`href="${MAILTO}"`), "mailto from PRACTICE.email.value");
    assert.ok(!/mailto:[^"]*\?/.test(p), "plain mailto, nothing pre-filled");
    assert.match(p, /aria-label="E-Mail schreiben an die Kinderarztpraxis"/);
    const call = p.indexOf('href="tel:');
    const emergency = p.indexOf('href="/notfall"');
    const mail = p.indexOf(`href="${MAILTO}"`);
    assert.ok(call > -1 && emergency > call && mail > emergency, "order: Anrufen (primary) → Notfall → E-Mail");
    assert.equal(markup(r.body).split(MAILTO).length - 1, 1, "the address is not repeated on the page");
  });

  test("mobile dock unchanged: Menü · Heute · Notfall · Anrufen, no e-mail", async () => {
    const d = dock((await http("/")).body);
    assert.ok(d, "dock present");
    assert.ok(!d.includes("mailto:"), "no e-mail in the dock");
    const labels = [...d.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1]).filter((t) => ["Menü", "Heute", "Notfall", "Anrufen"].includes(t));
    assert.deepEqual(labels, ["Menü", "Heute", "Notfall", "Anrufen"]);
  });

  test("current static data: no homepage highlight and no empty placeholder", async () => {
    const r = await http("/");
    assert.ok(!r.body.includes('aria-labelledby="startseite-hinweis"'));
    assert.ok(!/Keine aktuellen Hinweise/.test(puls(r.body)));
  });

  test("lab PRAXIS PULS unchanged without the e-mail prop", async () => {
    const lab = await http("/lab/final");
    assert.equal(lab.status, 200);
    assert.ok(!lab.body.includes("mailto:"), "no e-mail in the lab");
    assert.ok(!lab.body.includes("E-Mail schreiben"));
  });

  test("staging review view: artificial highlights through the real selector, at most one, labelled test data", async () => {
    const v = await http("/review/startseite?beispiel=urlaub");
    assert.equal(v.status, 200);
    assert.equal((v.body.match(/aria-labelledby="startseite-hinweis"/g) ?? []).length, 1);
    assert.match(v.body, /Praxisurlaub/);
    assert.match(v.body, /Testdaten/);
    assert.match(v.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const aside = section(v.body, /<aside[^>]*aria-labelledby="startseite-hinweis"[^>]*>/);
    assert.ok(!/role="alert"|aria-live/.test(aside), "ordinary notice: no alert role, no live region");
    assert.ok(aside.includes('href="/heute"'));
    const n = await http("/review/startseite?beispiel=hinweis");
    assert.equal((n.body.match(/Beispielhinweis \(Testdaten\)/g) ?? []).filter(Boolean).length >= 1, true);
    const visible = markup(n.body);
    const lower = visible.slice(visible.indexOf('id="c-heute"'));
    assert.ok(!lower.includes("Beispielhinweis (Testdaten)"), "the highlighted notice is not repeated in the Heute chapter");
    const none = await http("/review/startseite?beispiel=keiner");
    assert.ok(!none.body.includes('aria-labelledby="startseite-hinweis"'));
  });

  test("public routes stay healthy", async () => {
    for (const path of ["/", "/heute", "/heute/aktuelles", "/notfall", "/mein-kind", "/praxis", "/praxis/kontakt", "/entdecken", "/mitarbeiter"]) {
      assert.equal((await http(path)).status, 200, path);
    }
  });
});
