// ARTIFICIAL review data for the start-page highlight (Phase 10.0A) — never part of the public
// content source. Used only by the staging review view /review/startseite to show the REAL
// start page with a highlight; no practice facts (dates are relative, texts are generic).

import type { Announcement, Closure } from "../domain/content-types.ts";
import type { FactVerification } from "../domain/verification.ts";
import { addDays, type LocalDate } from "../domain/time.ts";

export type HighlightExample = "urlaub" | "fortbildung" | "hinweis" | "keiner";
export const HIGHLIGHT_EXAMPLES: HighlightExample[] = ["urlaub", "fortbildung", "hinweis", "keiner"];

const verified = (today: LocalDate, until: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: until, verifiedBy: "Prüfansicht (Testdaten)", sourceIds: ["TEST"] });

/**
 * Vacation example: the PROVISIONAL staging value from the practice input 2026-11-16 (24.12.2026 – 03.01.2027,
 * STAGING_PLACEHOLDER_DO_NOT_PUBLISH — not final, not a practice fact). Once that period has passed, the
 * review falls back to a relative example so the card can still be reviewed.
 */
export const PROVISIONAL_VACATION = { from: "2026-12-24", to: "2027-01-03" } as const;

export function exampleClosures(example: HighlightExample, today: LocalDate): Closure[] {
  if (example === "urlaub") {
    const provisional = today <= PROVISIONAL_VACATION.to;
    const from = provisional ? PROVISIONAL_VACATION.from : addDays(today, 10);
    const to = provisional ? PROVISIONAL_VACATION.to : addDays(today, 14);
    return [{ id: "test-urlaub", kind: "VACATION", startDate: from, endDate: to, announceFrom: today, replacements: [], verification: verified(today, to) }];
  }
  if (example === "fortbildung") {
    const day = addDays(today, 4);
    return [{ id: "test-fortbildung", kind: "TRAINING", startDate: day, endDate: day, announceFrom: today, replacements: [], verification: verified(today, day) }];
  }
  return [];
}

export function exampleAnnouncements(example: HighlightExample, today: LocalDate): Announcement[] {
  if (example !== "hinweis") return [];
  return [
    {
      id: "test-hinweis",
      category: "INFO",
      title: "Beispielhinweis (Testdaten)",
      shortText: "So erscheint ein besonders hervorgehobener Hinweis auf der Startseite. Der vollständige Text steht unter „Aktuelles“.",
      validFrom: today,
      validUntil: addDays(today, 7),
      priority: 10,
      homepageHighlight: true,
      published: true,
      verification: verified(today, addDays(today, 7)),
    },
  ];
}
