// Phase 10.5A — "Team & Fotos": approval preparation only. Working data is shown on a staging
// review page; the public consent gate (decidePerson / publicPeople) is unchanged and nobody
// becomes public. No photo, no AI portrait, no guessed mapping, no invented role or bio.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCTORS, TEAM, publicPeople } from "../people.ts";
import { PEOPLE_REVIEW, TEAM_LIST_STATE, TEAM_TOPICS, WORKING_STATE } from "../team-review.ts";
import { isReviewHubEnabled, REVIEW_CARDS } from "../../lab/review-hub.ts";
import { LEGAL, NEEDS, PRIMARY, SITEMAP } from "../site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
const TODAY = "2026-10-20";
const STAFF = ["Andrea Zahn", "Steffi Christmann", "Katharina Weis", "Anke Bettche", "Peggy Kejs", "Firuza Rafiyeva"];
const PEOPLE_DATA = ["people.ts", "team-review.ts"];
const PUBLIC = [...files("app/(frontend)/(site)"), ...files("src/site"), ...files("src/content").filter((f) => !f.includes("__tests__") && !PEOPLE_DATA.some((r) => f.endsWith(r)))];
const register = read("docs/research/fact-status-register.md");
const status = (id: string) => register.match(new RegExp(`^\\| ${id} \\| [^|]+ \\| ([A-Z_]+) \\|`, "m"))?.[1];

describe("consent gate unchanged (E, F, G, K)", () => {
  test("E: nobody has a confirmed publication consent", () => {
    for (const p of [...DOCTORS, ...TEAM]) {
      assert.equal(p.publicationConsent.value, false, p.name);
      assert.notEqual(p.publicationConsent.verification.status, "VERIFIED_CURRENT", p.name);
    }
  });
  test("F: publicPeople returns no unapproved person in normal mode", () => {
    assert.deepEqual(publicPeople(DOCTORS, TODAY), []);
    assert.deepEqual(publicPeople(TEAM, TODAY), []);
  });
  test("G: the layout preview and the review content do not mutate the people data", () => {
    const before = structuredClone({ DOCTORS, TEAM });
    assert.equal(publicPeople(TEAM, TODAY, true).length, 5, "preview simulates consent on copies only");
    publicPeople(DOCTORS, TODAY, true);
    assert.ok(PEOPLE_REVIEW.length);
    assert.deepEqual({ DOCTORS, TEAM }, before);
    assert.deepEqual(publicPeople(TEAM, TODAY), []);
  });
  test("K: public team routes still filter through publicPeople; no new public route", () => {
    for (const [file, list] of [["team", "TEAM"], ["aerztinnen", "DOCTORS"]]) {
      const src = read(`app/(frontend)/(site)/praxis/${file}/page.tsx`);
      assert.match(src, new RegExp(`publicPeople\\(${list}, puls\\.result\\.evaluatedAt\\.localDate, puls\\.mode === "PREVIEW"\\)`), file);
      assert.doesNotMatch(src, /team-review|<img|<Image/, file);
    }
    assert.match(read("src/domain/publication.ts"), /if \(consent\.verification\.status !== "VERIFIED_CURRENT" \|\| consent\.value !== true\)/);
    assert.equal(existsSync(join(ROOT, "app/(frontend)/(site)/team")), false);
  });
});

describe("facts reused, statuses unchanged (H, I)", () => {
  test("H: F11, F23, F24, F31–F34 stay TO_BE_CONFIRMED; no new fact IDs for team topics", () => {
    for (const id of ["F11", "F23", "F24", "F31", "F32", "F33", "F34"]) assert.equal(status(id), "TO_BE_CONFIRMED", id);
    assert.doesNotMatch(register, /^\| F118 \|/m);
    const used = [...PEOPLE_REVIEW.flatMap((g) => g.people.flatMap((p) => p.factIds)), ...TEAM_TOPICS.flatMap((t) => t.factIds)];
    assert.ok(used.every((id) => Number(id.slice(1)) <= 34), used.join());
  });
  test("I: F25 stays OUTDATED_DO_NOT_PUBLISH and is not offered as a person", () => {
    assert.equal(status("F25"), "OUTDATED_DO_NOT_PUBLISH");
    const all = PEOPLE_REVIEW.flatMap((g) => g.people);
    assert.ok(!all.some((p) => p.factIds.includes("F25")));
    assert.doesNotMatch(JSON.stringify(PEOPLE_REVIEW), /Anne Horn/);
    assert.match(PEOPLE_REVIEW.find((g) => g.id === "weitere")!.notes![0], /historisch – nicht als aktuell vorgeschlagen/);
  });
});

describe("review content: working data, every check open (D, J)", () => {
  test("three people groups, five review topics, eight numbered sections in the requested order", () => {
    assert.deepEqual(PEOPLE_REVIEW.map((g) => g.title), ["Ärztinnen", "Praxisteam", "Weitere aktuelle Personen"]);
    assert.deepEqual(TEAM_TOPICS.map((t) => t.title), ["Rollen & Bezeichnungen", "Veröffentlichung von Namen", "Fotos", "Bildrechte", "Zukünftige Team-Seite"]);
    for (const t of TEAM_TOPICS) assert.ok(t.known.length && t.unconfirmed.length && t.questions.length, t.id);
  });
  test("names come from people.ts; Firuza separate; labels say working state", () => {
    const [docs, team, other] = PEOPLE_REVIEW;
    assert.deepEqual(docs.people.map((p) => p.name), DOCTORS.map((d) => d.name));
    assert.deepEqual(team.people.map((p) => p.name), TEAM.map((t) => t.name));
    assert.deepEqual(other.people.map((p) => p.name), ["Firuza Rafiyeva"]);
    assert.equal(docs.stateLabel, WORKING_STATE);
    assert.equal(team.stateLabel, TEAM_LIST_STATE);
    assert.equal(TEAM_LIST_STATE, "Arbeitsstand aus bisheriger Website – Vollständigkeit noch nicht bestätigt");
    assert.ok(team.questions!.includes("Ist diese Teamliste vollständig?"));
  });
  test("name and photo consent are separate checks for every person, all UNCONFIRMED", () => {
    for (const p of PEOPLE_REVIEW.flatMap((g) => g.people)) {
      const labels = p.checks.map((c) => c.label);
      assert.ok(labels.includes("Name veröffentlichen") && labels.includes("Foto veröffentlichen"), p.name);
      assert.ok(p.checks.every((c) => c.status === "UNCONFIRMED"), p.name);
    }
  });
  test("no rewritten title, no modernised role, no bio", () => {
    const text = JSON.stringify({ PEOPLE_REVIEW, TEAM_TOPICS });
    assert.match(text, /Fachärztin für Kinder- und Jugendmedizin\/Kinderchirurgie/, "Dr. Böhme's wording verbatim");
    // Modern terms appear exactly once: in the note saying they are NOT adopted.
    const rolesNote = TEAM_TOPICS.find((t) => t.id === "rollen")!.notes![0];
    assert.match(rolesNote, /nicht eigenmächtig modernisiert \(etwa zu „MFA“ oder „Medizinische Fachangestellte“\)/);
    assert.equal(text.split("MFA").length - 1, 1);
    assert.equal(text.split("Medizinische Fachangestellte").length - 1, 1);
    // Person data only — the topic notes name these things as forbidden.
    assert.doesNotMatch(JSON.stringify(PEOPLE_REVIEW), /Hobby|Jahre Erfahrung|seit \d{4}|Lieblings|Warum ich|Zitat/);
    for (const p of PEOPLE_REVIEW.flatMap((g) => g.people)) assert.equal(Object.keys(p).includes("bio"), false);
  });
  test("photo options: none selected, reuse conditional, no AI", () => {
    const fotos = TEAM_TOPICS.find((t) => t.id === "fotos")!;
    assert.deepEqual(fotos.candidates, ["Neue Einzelporträts", "Neues Teamfoto", "Bestehende Fotos verwenden – nur nach bestätigter Zuordnung, Nutzungsrechten und Einwilligung"]);
    assert.match(fotos.notes!.join(" "), /Keine KI-Porträts/);
  });
  test("J: no photo or AI / placeholder face attached to any real person", () => {
    for (const p of [...DOCTORS, ...TEAM]) assert.equal(p.photo, undefined, p.name);
    const card = read("app/(frontend)/review/team/team-review-card.tsx");
    assert.doesNotMatch(card, /<img|<Image|src=|background-image|url\(/);
    assert.match(card, /aria-hidden="true"/);
    assert.match(card, /Kein Foto zugeordnet/);
  });
  test("D: staff names appear in no public page, component or public content", () => {
    for (const f of PUBLIC) for (const n of STAFF) assert.ok(!read(f).includes(n), `${f} names ${n}`);
    for (const f of PUBLIC) assert.doesNotMatch(read(f), /team-review/, `${f} imports the review draft`);
  });
});

describe("approval draft is staging-only review tooling (A, B, C)", () => {
  const page = read("app/(frontend)/review/team/page.tsx");
  test("A: 404 outside STAGING, noindex, not in the patient navigation", () => {
    assert.match(page, /if \(!isReviewHubEnabled\(\)\) notFound\(\);/);
    assert.match(page, /robots: \{ index: false, follow: false \}/);
    assert.equal(isReviewHubEnabled("PRODUCTION"), false);
    assert.doesNotMatch(JSON.stringify({ PRIMARY, NEEDS, LEGAL, SITEMAP }), /\/review/);
  });
  test("B: clearly not public; C: linked from the review hub", () => {
    for (const t of ["Freigabeentwurf · nicht öffentlich", "Team &amp; Fotos", "Wer soll wie auf der Website erscheinen?", "noch nicht zur Veröffentlichung"]) assert.ok(page.includes(t), t);
    assert.doesNotMatch(page, /<form|<input|<select|<textarea|<img/);
    const card = REVIEW_CARDS.find((c) => c.id === "team");
    assert.deepEqual([card?.title, card?.status, card?.href], ["Team & Fotos – Freigabeentwurf", "Freigabeentwurf", "/review/team"]);
  });
});
