// Hero artwork slot: exactly one real painting per Europe/Berlin calendar day, in the fixed
// sequence 1 → 2 → 3 → 4 → 1, deterministic (no randomness, no client-only state).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTWORKS, artworkForDate, artworkIndexForDate, ROTATION_ANCHOR } from "../artworks.ts";
import { resolvePuls } from "../puls.ts";
import { addDays, zonedToInstant } from "../../domain/time.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

test("four real artworks in the approved order", () => {
  assert.deepEqual(
    ARTWORKS.map((a) => [a.order, a.id]),
    [
      [1, "junge"],
      [2, "kind-fell"],
      [3, "maedchen"],
      [4, "maedchen-gelaender"],
    ],
  );
  for (const a of ARTWORKS) for (const f of ["360.avif", "360.webp", "720.avif", "720.webp"]) assert.ok(existsSync(join(ROOT, `public/hero/art-${a.id}-${f}`)), `${a.id}-${f}`);
});

test("day 1 → 1, day 2 → 2, day 3 → 3, day 4 → 4, day 5 → 1 (from any start day)", () => {
  for (const start of [ROTATION_ANCHOR, "2026-10-12", "2025-12-30", "2027-02-27"]) {
    const first = artworkIndexForDate(start);
    const seq = [0, 1, 2, 3, 4].map((d) => artworkIndexForDate(addDays(start, d)));
    assert.deepEqual(seq, [first, (first + 1) % 4, (first + 2) % 4, (first + 3) % 4, first], start);
  }
  assert.equal(artworkForDate(ROTATION_ANCHOR).order, 1);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((d) => artworkForDate(addDays(ROTATION_ANCHOR, d)).order),
    [1, 2, 3, 4, 1],
  );
});

test("stable for the whole Berlin day, changes at Berlin midnight (not UTC)", () => {
  const morning = resolvePuls({}, zonedToInstant("2026-10-12", "00:05")).result.evaluatedAt.localDate;
  const night = resolvePuls({}, zonedToInstant("2026-10-12", "23:55")).result.evaluatedAt.localDate;
  const next = resolvePuls({}, zonedToInstant("2026-10-13", "00:05")).result.evaluatedAt.localDate;
  assert.equal(artworkForDate(morning).id, artworkForDate(night).id);
  assert.notEqual(artworkForDate(night).id, artworkForDate(next).id);
  // 00:05 Berlin is still the previous day in UTC — the Berlin date must win
  assert.equal(morning, "2026-10-12");
});

test("deterministic: no randomness; the page passes the engine's Berlin date to one slot", () => {
  assert.equal(/Math\.random|Date\.now|new Date\(/.test(read("src/content/artworks.ts")), false);
  const page = read("app/(frontend)/(site)/page.tsx");
  assert.match(page, /artwork=\{artworkForDate\(puls\.result\.evaluatedAt\.localDate\)\}/);
  const stage = read("src/lab/final/hero-stage.tsx");
  assert.equal((stage.match(/className=\{s\.art\}/g) ?? []).length, 1, "exactly one artwork slot");
  assert.equal(/setInterval|setTimeout\(.*art/i.test(stage), false, "no slideshow timer");
});
