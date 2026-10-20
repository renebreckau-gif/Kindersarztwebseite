// Step 14 of the clean-database proof (Phase 10.5A): the team working data appears only in the
// staging approval draft. The public team pages keep their consent gate: no staff name, no
// photo, no newly public person. Static content only; no database access involved.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { http, skipHttp } from "./helpers.ts";

const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const STAFF = ["Andrea Zahn", "Steffi Christmann", "Katharina Weis", "Anke Bettche", "Peggy Kejs", "Firuza Rafiyeva"];
const PUBLIC = ["/", "/praxis", "/praxis/team", "/praxis/aerztinnen", "/praxis/kontakt", "/praxis/neu-bei-uns", "/heute"];

describe("Team & Fotos: approval draft only", { skip: skipHttp }, () => {
  test("staging approval draft: reachable, noindex, eight sections, one card per person, every check open, no photo", async () => {
    const r = await http("/review/team");
    assert.equal(r.status, 200);
    assert.match(r.body, /<meta name="robots" content="noindex, nofollow"\/>/);
    const m = markup(r.body);
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Team &amp; Fotos", "Wer soll wie auf der Website erscheinen?", "Arbeitsstand aus bisheriger Website – Vollständigkeit noch nicht bestätigt", "Ist diese Teamliste vollständig?", "nur nach bestätigter Zuordnung, Nutzungsrechten und Einwilligung"]) assert.ok(m.includes(t), t);
    assert.equal((m.match(/<h1/g) ?? []).length, 1);
    assert.equal((m.match(/<h2/g) ?? []).length, 8);
    assert.equal((m.match(/<article/g) ?? []).length, 8, "2 doctors + 5 team + 1 further person");
    for (const n of STAFF) assert.ok(m.includes(n), n);
    assert.equal(m.split("Noch nicht bestätigt").length - 1, 38, "33 person checks + 5 topic badges");
    assert.equal(m.split("Kein Foto zugeordnet").length - 1, 8);
    assert.ok(!m.includes("Anne Horn"), "historical entry not offered");
    assert.ok(!/<img|<form|<input|<select|<textarea|type="checkbox"|checked/.test(m), "no photo, no form, nothing ticked");
    const hub = markup((await http("/review")).body);
    assert.ok(hub.includes('href="/review/team"') && hub.includes("Team &amp; Fotos – Freigabeentwurf"));
  });

  test("public pages: consent gate unchanged — no staff name, no portrait, no review link", async () => {
    for (const path of PUBLIC) {
      const r = await http(path);
      assert.equal(r.status, 200, path);
      const m = markup(r.body);
      for (const n of STAFF) assert.ok(!m.includes(n), `${path} names ${n}`);
      assert.ok(!m.includes("/review/team"), `${path} links no review route`);
    }
    const team = markup((await http("/praxis/team")).body);
    assert.ok(team.includes("Das Team stellt sich hier vor, sobald die Freigaben vorliegen."));
    assert.ok(!/<img/.test(team), "no team photo");
    const doctors = markup((await http("/praxis/aerztinnen")).body);
    assert.ok(doctors.includes("Unsere Ärztinnen stellen sich hier vor, sobald Texte und Fotos freigegeben sind."));
    assert.ok(!/<img|<article/.test(doctors), "no doctor card, no portrait");
  });
});
