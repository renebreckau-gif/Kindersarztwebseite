// Physicians and team (F20–F33). Publication is decided by the domain rule
// `decidePerson`: verified + active + verified publication consent. Consent (F33/LB-09)
// is TO_BE_CONFIRMED, so nobody is shown publicly until the practice confirms it.

import type { Doctor, TeamMember } from "../domain/content-types.ts";
import { decidePerson } from "../domain/publication.ts";
import { UNCONFIRMED, WORKING } from "./practice.ts";

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

/**
 * CURRENT working roster = the team list of the practice input 2026-11-16 (docs/reviews/practice-input-
 * 2026-11-16.md), in that order. Role labels (F32) stay unconfirmed: names only, `role` empty — the roles
 * the practice named are kept as evidence in team-review.ts. People new in this list (F118, F119) carry no
 * verified record yet. Katharina Weis (F28) is not in the current list → no longer modelled as current
 * (historical fact kept in the register). Nobody becomes public: consent (F33) is pending for everyone.
 */
const ROSTER: { id: string; name: string; fact: string; verification: TeamMember["verification"] }[] = [
  { id: "team-2", name: "Steffi Christmann", fact: "F27", verification: PERSON_VERIFIED },
  { id: "team-1", name: "Andrea Zahn", fact: "F26", verification: PERSON_VERIFIED },
  { id: "team-4", name: "Anke Bettche", fact: "F29", verification: PERSON_VERIFIED },
  { id: "team-6", name: "Nicole Schulz", fact: "F118", verification: UNCONFIRMED },
  { id: "team-7", name: "Jana Brandt", fact: "F119", verification: UNCONFIRMED },
  { id: "team-5", name: "Peggy Kejs", fact: "F30", verification: PERSON_VERIFIED },
];
/** Fact id of each current team member (register F26–F30, F118–F119). */
export const TEAM_FACT: Record<string, string> = Object.fromEntries(ROSTER.map((m) => [m.name, m.fact]));

export const TEAM: TeamMember[] = ROSTER.map((m, i) => ({
  id: m.id,
  name: m.name,
  role: "",
  displayOrder: i + 1,
  active: true,
  publicationConsent: CONSENT_PENDING,
  verification: m.verification,
}));

/**
 * Public people. With `previewConsent` consent is simulated as confirmed so the editorial layout
 * can be reviewed — labelled on screen. Pure: callers pass `puls.mode === "PREVIEW"`, which only
 * the central stage gate (isPublicReviewPreview, STAGING only) can produce; in PRODUCTION it is
 * always false.
 */
export function publicPeople<T extends Doctor | TeamMember>(list: T[], today: string, previewConsent = false): T[] {
  return list
    .map((p) => (previewConsent ? { ...p, publicationConsent: { value: true, verification: WORKING } } : p))
    .filter((p) => decidePerson(p, today).visible)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
