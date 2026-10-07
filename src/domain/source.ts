// Provenance for every fact (docs/architecture/source-governance.md).

import type { LocalDate } from "./time.ts";

export const SOURCE_TYPES = [
  "PRACTICE_CONFIRMATION", // strongest source for practice-specific facts
  "OFFICIAL_MEDICAL", // RKI/STIKO, G-BA, gesund.bund, BIÖG
  "OFFICIAL_SERVICE", // 116117, KV, official institutions (hospitals, poison centre)
  "LEGAL_REVIEW",
  "PRACTICE_WEBSITE_LEGACY", // working source only, never authoritative on its own
  "OTHER",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface SourceReference {
  id: string;
  type: SourceType;
  title: string;
  publisher: string;
  url?: string;
  /** Publication / version date stated by the source. */
  publishedOn?: LocalDate;
  version?: string;
  /** When the project last checked that the source still says this. */
  lastChecked: LocalDate;
  official: boolean;
  /** For PRACTICE_CONFIRMATION: channel and confirming role (internal). */
  confirmation?: { channel: "PHONE" | "EMAIL" | "IN_PERSON" | "DOCUMENT"; confirmedByRole: string };
  notes?: string;
}

/** Ranking used when sources disagree: higher wins, equal rank → conflict. */
export const SOURCE_RANK: Record<SourceType, number> = {
  PRACTICE_CONFIRMATION: 5,
  LEGAL_REVIEW: 5,
  OFFICIAL_MEDICAL: 4,
  OFFICIAL_SERVICE: 4,
  OTHER: 1,
  PRACTICE_WEBSITE_LEGACY: 0,
};
