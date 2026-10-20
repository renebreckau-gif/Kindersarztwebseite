// Step 15 of the clean-database proof (Phase 10.5A.1): the public review preview is a STAGING
// feature. On this (STAGING) build it still works for layout review; without the query nobody
// unconsented appears; every /review route stays available. PRODUCTION behaviour is proven by the
// pure stage tests (src/content/__tests__/review-preview-gate.test.ts) — the committed stage is
// never switched for a test.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const DOCTORS = ["Nadine Probst", "Dr. med. Elke Böhme"];
const STAFF = ["Andrea Zahn", "Steffi Christmann", "Katharina Weis", "Anke Bettche", "Peggy Kejs"];

describe("public review preview: STAGING only", { skip: skipHttp }, () => {
  test("without the query: no unconsented name as a person card or roster entry", async () => {
    const team = markup((await http("/praxis/team")).body);
    for (const n of STAFF) assert.ok(!team.includes(n), n);
    const doctors = markup((await http("/praxis/aerztinnen")).body);
    for (const n of DOCTORS) assert.ok(!doctors.includes(`>${n}</h2>`), n);
    assert.ok(!/<article/.test(doctors));
  });

  test("STAGING + ?vorschau=freigabe: editorial preview retained and labelled", async () => {
    const team = markup((await http("/praxis/team?vorschau=freigabe")).body);
    for (const n of STAFF) assert.ok(team.includes(n), n);
    const doctors = markup((await http("/praxis/aerztinnen?vorschau=freigabe")).body);
    for (const n of DOCTORS) assert.ok(doctors.includes(`>${n}</h2>`), n);
    const home = markup((await http("/?vorschau=freigabe&zeit=2026-10-06T09:30")).body);
    assert.ok(home.includes("Vorschau"), "preview is labelled on screen");
  });

  test("review tooling unaffected: every /review route answers 200", async () => {
    for (const path of ["/review", "/review/gut-vorbereitet", "/review/praxis-app", "/review/rezepte", "/review/kosten", "/review/team"]) {
      assert.equal((await http(path)).status, 200, path);
    }
    assert.ok(markup((await http("/review/team")).body).includes("Andrea Zahn"), "team review still shows the working data");
  });
});
