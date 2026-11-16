// Impressum foundation (Phase 10.0C). Static editorial content — no Payload, no database.
// Only facts that are VERIFIED_CURRENT are shown: practice contact (F01, F13–F18, practice input
// 2026-11-16) and the professional bodies (F05–F07, cross-checked against the official sites on
// 2026-11-16). Deliberately NOT shown until confirmed / legally reviewed (docs/reviews/impressum-legal-
// review-2026-11.md): legal form / provider (F02), responsible person(s) (F03), statutory professional
// titles (F04 — F23 open, so no title for only one of the two physicians), § 18 Abs. 2 MStV person,
// the old disclaimer, and the outdated TMG / RStV references (F08) and privacy paragraph (F09).
// This is NOT a legal approval and makes no compliance claim.

/** Date the official sources below were checked. */
export const IMPRESSUM_SOURCES_CHECKED = "2026-11-16";

export interface ProfessionalBody {
  fact: "F05" | "F06";
  label: string;
  name: string;
  street: string;
  cityLine: string;
  link: { href: string; text: string };
}

export const PROFESSIONAL_BODIES: ProfessionalBody[] = [
  {
    fact: "F05",
    label: "Zuständige Ärztekammer",
    name: "Ärztekammer Sachsen-Anhalt",
    street: "Doctor-Eisenbart-Ring 2",
    cityLine: "39120 Magdeburg",
    link: { href: "https://www.aeksa.de", text: "Website der Ärztekammer Sachsen-Anhalt" },
  },
  {
    fact: "F06",
    label: "Zuständige Kassenärztliche Vereinigung",
    name: "Kassenärztliche Vereinigung Sachsen-Anhalt",
    street: "Doctor-Eisenbart-Ring 2",
    cityLine: "39120 Magdeburg",
    link: { href: "https://www.kvsa.de", text: "Website der Kassenärztlichen Vereinigung Sachsen-Anhalt" },
  },
];

/** F07 — the professional code, linked to the chamber's official page (no local copy). */
export const PROFESSIONAL_CODE = {
  fact: "F07",
  name: "Berufsordnung der Ärztekammer Sachsen-Anhalt",
  link: {
    href: "https://www.aeksa.de/www/website/PublicNavigation/arzt/arztundrecht/rechtsquellen/ordnungensatzungen/berufsordnung/",
    text: "Berufsordnung bei der Ärztekammer Sachsen-Anhalt aufrufen",
  },
} as const;

/** "<area> <number>" → "<area> / <number>" (conventional notation in the Impressum; same number). */
export const impressumNumber = (n: string) => n.replace(/^(\d+) /, "$1 / ");

/** Internal staging note (InternalNote only — never parent / production content). */
export const IMPRESSUM_REVIEW_NOTE = "Rechtliche Finalprüfung ausstehend: Rechtsform/Anbieter, verantwortliche Person(en) und vollständige Berufsbezeichnungen.";
