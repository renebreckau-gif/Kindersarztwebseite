// Practice artworks for the hero's single wall slot.
// Four real paintings from the practice (signature „Rübsam '23“). The photographed canvases
// were only perspective-straightened to their square format (public/hero/art-*) — never
// redrawn, recoloured or cropped beyond the canvas edge.
//
// Publication gates (open, not cleared here): web-use permission of the artist / rights
// holder, and consent where an identifiable real child is depicted.
//
// Exactly one artwork per calendar day (Europe/Berlin), in a fixed sequence 1 → 2 → 3 → 4.
// Deterministic: the same date gives the same artwork on server and client, for everyone.

import type { LocalDate } from "../domain/time.ts";
import { daysBetween } from "../domain/time.ts";

export interface Artwork {
  /** File stem in public/hero: art-<id>-{360,720}.{avif,webp} */
  id: string;
  order: 1 | 2 | 3 | 4;
  /** Internal description (the hero scene is decorative: aria-hidden). */
  motif: string;
}

export const ARTWORKS: readonly Artwork[] = [
  { id: "junge", order: 1, motif: "Blonder Junge im hellen Pullover" },
  { id: "kind-fell", order: 2, motif: "Kind mit weißer Fellmütze und roter Kleidung" },
  { id: "maedchen", order: 3, motif: "Mädchen mit rotem Kopftuch" },
  { id: "maedchen-gelaender", order: 4, motif: "Mädchen, an ein Geländer gelehnt" },
];

/** Day 1 of the sequence. Any fixed date works; it only sets the phase of the cycle. */
export const ROTATION_ANCHOR: LocalDate = "2026-01-01";

/** Index 0–3 for a Europe/Berlin calendar date (works before the anchor, too). */
export function artworkIndexForDate(date: LocalDate): number {
  const n = ARTWORKS.length;
  return ((daysBetween(ROTATION_ANCHOR, date) % n) + n) % n;
}

export const artworkForDate = (date: LocalDate): Artwork => ARTWORKS[artworkIndexForDate(date)];
