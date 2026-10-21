// Phase 09.6A — public data cutover readiness gate (NO cutover). Guards that the public website is
// still STATIC-authoritative and that nothing switches the data authority by accident. Complements
// (does not duplicate) review-preview-gate "release flags unchanged", repository.test.ts and the
// dependency-direction tests in backend-foundation.test.ts.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DATA_SOURCE, FAIL_SAFE_PULS_DATA, getPracticeRepository } from "../source.ts";
import { StaticPracticeRepository } from "../static-repository.ts";
import { PULS_DATA } from "../../content/schedule.ts";
import { ANNOUNCEMENTS } from "../../content/notices.ts";
import { RELEASE, SITE_STAGE } from "../../content/release.ts";
import { getPracticeStatus } from "../../domain/practice-status.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((n) => {
    const p = join(dir, n);
    return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p.split(sep).join("/")] : [];
  });
}
const PUBLIC = [...files("app/(frontend)/(site)"), ...files("src/site")];

describe("09.6A: no public data cutover has happened", () => {
  test("the practice repository is the static one and serves exactly the static content", async () => {
    const repo = getPracticeRepository();
    assert.ok(repo instanceof StaticPracticeRepository);
    assert.equal(repo.source, "STATIC");
    assert.equal(DATA_SOURCE, "STATIC");
    assert.strictEqual(await repo.getPulsData(), PULS_DATA);
    assert.strictEqual(await repo.getAnnouncements(), ANNOUNCEMENTS);
  });

  test("data authority is a deliberate code decision: never derived from the environment / Vercel", () => {
    for (const f of ["src/data/source.ts", "src/data/static-repository.ts", "src/content/release.ts", "src/content/puls.ts"]) {
      assert.doesNotMatch(read(f), /process\.env|VERCEL/, f);
    }
  });

  test("09.6B: public code takes operational data from ONE snapshot (no direct static operational imports, no database module)", () => {
    for (const f of PUBLIC) {
      const src = read(f);
      assert.doesNotMatch(src, /payload-repository|PayloadPracticeRepository|public-operational-snapshot|shadow-compare|@\/cockpit\/|@\/backend\/|readPulsDataSafely|getPayload/, f);
      // operational facts never imported directly (the static repository owns them)
      assert.doesNotMatch(src, /(RULES|PULS_DATA|ANNOUNCEMENTS|staticPulsData)/, f);
      // resolvePuls only in the one page helper, always with the snapshot's PulsData
      if (f !== "src/site/operational.ts") assert.doesNotMatch(src, /resolvePuls\(/, f);
      // notice helpers always receive the snapshot's list
      for (const m of src.matchAll(/(activeAnnouncements|homeChapterAnnouncements)\(([^)]*)\)/g)) assert.match(m[2], /snapshot\.announcements/, `${f}: ${m[0]}`);
    }
    assert.match(read("src/site/operational.ts"), /loadPublicOperationalData\(\);[\s\S]*resolvePuls\(params, new Date\(\), snapshot\.puls\)/);
  });

  test("09.6B: the public loader is STATIC-only — no Payload, no backend, no source switch, no dynamic import", () => {
    const src = read("src/data/public-operational.ts").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // code only, not comments
    assert.doesNotMatch(src, /backend|payload["'/]|@payloadcms|DATA_SOURCE|process\.env|import\(/);
    assert.match(src, /new StaticPracticeRepository\(\)/);
  });

  test("09.6B: WeekHours / DayRuler / slotsFor / blocksFor take the schedule as input — never the global RULES", () => {
    const schedule = read("src/content/schedule.ts");
    const helpers = schedule.slice(schedule.indexOf("export type ScheduleSource"));
    assert.doesNotMatch(helpers, /RULES|CONSULTATION_TYPES|PULS_DATA/, "helpers read only their `src` argument");
    assert.match(helpers, /export function slotsFor\(weekday: IsoWeekday, src: ScheduleSource\)/);
    assert.match(helpers, /export function blocksFor\(weekday: IsoWeekday, src: ScheduleSource\)/);
    const blocks = read("src/site/blocks.tsx");
    assert.match(blocks, /export function DayRuler\(\{[^}]*schedule \}: \{[^}]*schedule: ScheduleSource \}\)/);
    assert.match(blocks, /export function WeekHours\(\{ today, schedule \}: \{ today\?: IsoWeekday; schedule: ScheduleSource \}\)/);
    for (const f of PUBLIC) for (const m of read(f).matchAll(/<(DayRuler|WeekHours)[^>]*>/g)) assert.match(m[0], /schedule=\{snapshot\.puls\}/, `${f}: ${m[0]}`);
  });

  test("deployment stage, data authority, indexing and staff portal stay separate and unchanged", () => {
    assert.equal(SITE_STAGE, "STAGING");
    assert.equal(RELEASE.indexable, false);
    assert.equal(RELEASE.staffPortalProductionEnabled, false);
    assert.equal(RELEASE.meinArztbesuchPublished, false);
    assert.doesNotMatch(read("src/data/source.ts"), /from ["'][^"']*release/, "data source is not coupled to the stage (no release import)");
  });

  test("the fail-safe dataset is NOT a static fallback: no schedule, no operational facts → UNKNOWN", () => {
    assert.equal(FAIL_SAFE_PULS_DATA.schedule, undefined);
    for (const k of ["consultationTypes", "exceptions", "closures", "replacementPractices", "publicHolidays"] as const) assert.deepEqual(FAIL_SAFE_PULS_DATA[k], [], k);
    assert.equal(getPracticeStatus(new Date("2026-10-21T08:00:00Z"), FAIL_SAFE_PULS_DATA).status, "UNKNOWN");
  });
});
