// ARTIFICIAL review data for the start-page highlight (Phase 10.0A) — never part of the public
// content source. Used only by the staging review view /review/startseite to show the REAL
// start page with a highlight; no practice facts (dates are relative, texts are generic).

import type { Announcement, Closure } from "@/domain/content-types";
import type { FactVerification } from "@/domain/verification";
import { addDays, type LocalDate } from "@/domain/time";

export type HighlightExample = "urlaub" | "fortbildung" | "hinweis" | "keiner";
export const HIGHLIGHT_EXAMPLES: HighlightExample[] = ["urlaub", "fortbildung", "hinweis", "keiner"];

const verified = (today: LocalDate, until: LocalDate): FactVerification => ({ status: "VERIFIED_CURRENT", lastVerified: today, reviewDue: until, verifiedBy: "Prüfansicht (Testdaten)", sourceIds: ["TEST"] });

export function exampleClosures(example: HighlightExample, today: LocalDate): Closure[] {
  if (example === "urlaub") {
    const from = addDays(today, 10);
    const to = addDays(today, 14);
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
