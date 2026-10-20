// Regression (found in Phase 10.0A): the staff area must never be prerendered at build time.
// internSession() probes the database first; when the database was unreachable DURING the build,
// it returned "unavailable" before touching headers(), so Next froze the "nicht erreichbar" page
// as static HTML for every later request. The route group therefore declares itself dynamic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("the /intern route group is always rendered per request (never frozen at build time)", () => {
  const layout = readFileSync(join(ROOT, "app/(intern)/layout.tsx"), "utf8");
  assert.match(layout, /export const dynamic = "force-dynamic";/);
});
