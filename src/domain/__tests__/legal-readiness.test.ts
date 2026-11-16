// Phase 10.0C — legal launch readiness gate. Current state → NOT ready; an artificial complete state → ready.
// Real fact statuses are never mutated (copies only).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REQUIRED_LEGAL_FACTS, legalLaunchReady, type LegalState } from "../legal-readiness.ts";
import { LEGAL_STATE } from "../../content/impressum.ts";
import { SITE_STAGE } from "../../content/release.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const register = readFileSync(join(ROOT, "docs/research/fact-status-register.md"), "utf8");
const registerStatus = (id: string) => register.match(new RegExp(`^\\| ${id} \\| [^|]+\\| ([A-Z_]+) \\|`, "m"))?.[1];

/** ARTIFICIAL complete state — test data only, not a practice fact. */
const complete = (): LegalState => ({
  facts: Object.fromEntries(REQUIRED_LEGAL_FACTS.map((id) => [id, "VERIFIED_CURRENT"])) as LegalState["facts"],
  mstvApplicabilityDecided: true,
});

describe("legal launch readiness", () => {
  test("current state: NOT ready — F02, F03, F04, F10 and the MStV question (LB-16) are open", () => {
    assert.deepEqual(legalLaunchReady(LEGAL_STATE), { ready: false, open: ["F02", "F03", "F04", "F10", "LB-16"] });
  });

  test("LEGAL_STATE mirrors the fact register (no silent promotion because the page exists)", () => {
    for (const id of REQUIRED_LEGAL_FACTS) assert.equal(LEGAL_STATE.facts[id], registerStatus(id), id);
    assert.equal(registerStatus("F08"), "OUTDATED_DO_NOT_PUBLISH");
    assert.equal(registerStatus("F09"), "OUTDATED_DO_NOT_PUBLISH");
  });

  test("artificial complete state → ready; any single open item blocks", () => {
    assert.deepEqual(legalLaunchReady(complete()), { ready: true, open: [] });
    for (const id of REQUIRED_LEGAL_FACTS) {
      const s = complete();
      s.facts[id] = "TO_BE_CONFIRMED";
      assert.deepEqual(legalLaunchReady(s), { ready: false, open: [id] }, id);
    }
    assert.deepEqual(legalLaunchReady({ ...complete(), mstvApplicabilityDecided: false }), { ready: false, open: ["LB-16"] });
    const outdated = complete();
    outdated.facts.F05 = "OUTDATED_DO_NOT_PUBLISH";
    assert.equal(legalLaunchReady(outdated).ready, false);
  });

  test("release guard: PRODUCTION is only allowed when legally launch-ready (STAGING renders regardless)", () => {
    if (SITE_STAGE === "PRODUCTION") assert.equal(legalLaunchReady(LEGAL_STATE).ready, true, `legal launch blocked: ${legalLaunchReady(LEGAL_STATE).open.join(", ")}`);
  });
});
