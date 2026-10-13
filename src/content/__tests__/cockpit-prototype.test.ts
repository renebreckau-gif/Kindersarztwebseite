// Phase 09.1 Praxis Cockpit lab prototype: mock data only, engine-driven guardrails,
// and no leak into the public site.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOCK_TODAY,
  checkChange,
  checks,
  cutAt,
  directoryState,
  entryVerification,
  initialState,
  nowStatus,
  plannedSegments,
  statusAt,
  type CockpitData,
} from "../../lab/cockpit/model.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const earlyClose = (d: CockpitData, id: string, time: string): CockpitData => ({
  ...d,
  exceptions: [
    ...d.exceptions,
    {
      id,
      kind: "SPECIAL_HOURS",
      startDate: MOCK_TODAY,
      endDate: MOCK_TODAY,
      intervals: cutAt(plannedSegments(d, MOCK_TODAY), time).map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
      priority: 1,
      verification: entryVerification("Anna Beispiel", "STAFF", MOCK_TODAY),
    },
  ],
});

test("starting situation comes from the real engine: open now, 25.12. unresolved", () => {
  const { data } = initialState();
  assert.equal(nowStatus(data).status, "OPEN");
  const xmas = statusAt(data, "2026-12-25", "10:00");
  assert.equal(xmas.status, "UNKNOWN");
  assert.equal(xmas.reason, "HOLIDAY_WITHOUT_RULE");
  assert.ok(checks(data, "STAFF").some((c) => c.id === "feiertag-2026-12-25"));
});

test("early close passes the check; a second, different special time for today is blocked", () => {
  const base = initialState().data;
  const first = earlyClose(base, "a", "11:00");
  assert.equal(checkChange(base, first, MOCK_TODAY), null);
  const second = earlyClose(first, "b", "10:00");
  const problem = checkChange(first, second, MOCK_TODAY);
  assert.equal(problem?.title, "Widersprüchliche Sonderzeiten");
  assert.deepEqual(problem?.relatedIds, ["a"]);
});

test("closing today while a special time exists is blocked (no new UNKNOWN day)", () => {
  const base = earlyClose(initialState().data, "a", "11:00");
  const closed: CockpitData = {
    ...base,
    closures: [{ id: "c", kind: "SHORT_NOTICE", startDate: MOCK_TODAY, endDate: MOCK_TODAY, replacements: [], verification: entryVerification("Anna Beispiel", "STAFF", MOCK_TODAY) }],
  };
  assert.ok(checkChange(base, closed, MOCK_TODAY));
});

test("replacement directory: stale entry cannot be chosen", () => {
  const dir = initialState().data.directory;
  assert.equal(directoryState(dir.find((p) => p.id === "vb-a")!).usable, true);
  assert.equal(directoryState(dir.find((p) => p.id === "vb-c")!).usable, false);
});

test("prototype model uses mock data only (no import from src/content)", () => {
  const model = read("src/lab/cockpit/model.ts");
  assert.doesNotMatch(model, /from "\.\.\/\.\.\/content\//);
  assert.doesNotMatch(model, /@\/content\//);
});

test("prototype is labelled and not indexed", () => {
  assert.match(read("src/lab/cockpit/ui.tsx"), /PROTOTYP · keine echten Daten/);
  assert.match(read("app/lab/praxis-cockpit/layout.tsx"), /robots: \{ index: false, follow: false \}/);
});

test("public site never links to the cockpit prototype", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${f}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(tsx?|css)$/.test(f)) files.push(rel);
    }
  };
  walk("app/(site)");
  walk("src/site");
  walk("src/content");
  for (const f of files.filter((x) => !x.includes("__tests__"))) assert.doesNotMatch(read(f), /praxis-cockpit/, f);
});
