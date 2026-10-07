// Physicians and team (F20–F33). Publication is decided by the domain rule
// `decidePerson`: verified + active + verified publication consent. Consent (F33/LB-09)
// is TO_BE_CONFIRMED, so nobody is shown publicly until the practice confirms it.

import type { Doctor, TeamMember } from "@/domain/content-types.ts";
import { decidePerson } from "@/domain/publication.ts";
import { UNCONFIRMED, WORKING } from "./practice";

const PERSON_VERIFIED = { ...WORKING, sourceIds: ["S04"] };
const CONSENT_PENDING = { value: false, verification: UNCONFIRMED };

export const DOCTORS: Doctor[] = [
  {
    id: "probst",
    name: "Nadine Probst", // F20
    professionalTitles: [],
    specialties: ["Fachärztin für Kinder- und Jugendmedizin"], // F21
    additionalQualifications: [],
    displayOrder: 1,
    active: true,
    publicationConsent: CONSENT_PENDING,
    verification: PERSON_VERIFIED,
  },
  {
    id: "boehme",
    name: "Dr. med. Elke Böhme", // F22 — qualifications F23 TO_BE_CONFIRMED, not listed
    professionalTitles: [],
    specialties: [],
    additionalQualifications: [],
    displayOrder: 2,
    active: true,
    publicationConsent: CONSENT_PENDING,
    verification: PERSON_VERIFIED,
  },
  // F24 (physician in training) TO_BE_CONFIRMED and F25 OUTDATED — not modelled as current.
];

/** Role labels (F32) are unconfirmed; names only. */
export const TEAM: TeamMember[] = ["Andrea Zahn", "Steffi Christmann", "Katharina Weis", "Anke Bettche", "Peggy Kejs"].map((name, i) => ({
  id: `team-${i + 1}`,
  name, // F26–F30
  role: "",
  displayOrder: i + 1,
  active: true,
  publicationConsent: CONSENT_PENDING,
  verification: PERSON_VERIFIED,
}));

/**
 * Public people. With `previewConsent` (review mode "?vorschau=freigabe") consent is
 * simulated as confirmed so the editorial layout can be reviewed — labelled on screen.
 */
export function publicPeople<T extends Doctor | TeamMember>(list: T[], today: string, previewConsent = false): T[] {
  return list
    .map((p) => (previewConsent ? { ...p, publicationConsent: { value: true, verification: WORKING } } : p))
    .filter((p) => decidePerson(p, today).visible)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
