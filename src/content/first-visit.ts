// "Gut vorbereitet" (Phase 10.1A) — what families may need before a visit, as FirstVisitItem
// records (src/domain/content-types.ts). Source: practice-staff feedback, October 2026. These are
// PROPOSALS for the practice's confirmation, not practice rules: every record is TO_BE_CONFIRMED
// and the public selector (selectPublicFirstVisitItems) returns none of them. Only the staging
// approval draft shows them, labelled "Textvorschlag".
// Deliberately NOT included (not requested, not confirmed): U-Heft, ID documents, referrals,
// medication lists, insurance documents, consent forms, findings, certificates.

import type { FirstVisitItem } from "../domain/content-types.ts";
import type { FactVerification } from "../domain/verification.ts";
import { selectPublicFirstVisitItems } from "../domain/publication.ts";
import { UNCONFIRMED } from "./practice.ts";

/** Staff feedback is input, not confirmation: every proposal starts unconfirmed. */
const PROPOSAL: FactVerification = {
  ...UNCONFIRMED,
  internalNotes:
    "Hinweis aus dem Praxisteam, Oktober 2026 – noch nicht freigegeben.",
};

export const FIRST_VISIT_ITEMS: FirstVisitItem[] = [
  {
    id: "gesundheitskarte",
    block: "BRING",
    title: "Gesundheitskarte",
    text: "Bitte bringen Sie die Gesundheitskarte Ihres Kindes zum Besuch mit.",
    displayOrder: 10,
    verification: PROPOSAL,
  },
  {
    id: "impfpass-mitbringen",
    block: "BRING",
    title: "Impfpass",
    text: "Bitte bringen Sie zu Impfterminen den Impfpass Ihres Kindes mit.",
    displayOrder: 20,
    verification: PROPOSAL,
  },
  {
    // A separate, STRONGER statement — never merged with "bitte mitbringen".
    id: "impfung-nur-mit-impfpass",
    block: "BRING",
    title: "Impfung nur mit Impfpass",
    text: "Ohne Impfpass können wir leider nicht impfen.",
    displayOrder: 30,
    verification: PROPOSAL,
  },
  {
    // The wording is the existing website's claim (F47, unconfirmed) — shown as a starting point
    // for the question, not inferred as required, recommended or for whom.
    id: "mundschutz-bei-infekt",
    block: "ARRIVAL",
    title: "Bei Infekt",
    text: "Kinder über 6 Jahre benötigen im Falle eines Infektes einen Mundschutz.",
    displayOrder: 40,
    verification: PROPOSAL,
  },
];

/** Who must confirm before publication (content governance; no new auth role). */
export type FirstVisitApprover = "PRACTICE" | "DOCTOR";

export const APPROVER_LABEL: Record<FirstVisitApprover, string> = {
  PRACTICE: "Praxisteam (organisatorische Bestätigung)",
  DOCTOR: "Ärztin oder Arzt",
};

export interface FirstVisitApproval {
  itemId: string;
  /** Fact register id (docs/research/fact-status-register.md). */
  factId: string;
  approver: FirstVisitApprover;
  /** Where the proposed wording comes from — never "Praxisregel" until confirmed. */
  wordingSource: string;
  openQuestions: string[];
  /** Related existing register entries. */
  related?: string;
}

export const FIRST_VISIT_APPROVALS: FirstVisitApproval[] = [
  {
    itemId: "gesundheitskarte",
    factId: "F91",
    approver: "PRACTICE",
    wordingSource: "Textvorschlag nach Hinweis aus dem Praxisteam",
    openQuestions: [
      "Soll die Gesundheitskarte zu jedem Arztbesuch mitgebracht werden?",
      "Welche Formulierung bevorzugt die Praxis?",
      "Was gilt, wenn die Karte nicht vorliegt?",
      "Welcher Begriff: „Gesundheitskarte“, „Versichertenkarte“ oder ein anderer?",
    ],
    related: "präzisiert F78 („Was mitbringen“)",
  },
  {
    itemId: "impfpass-mitbringen",
    factId: "F92",
    approver: "PRACTICE",
    wordingSource: "Textvorschlag nach Hinweis aus dem Praxisteam",
    openQuestions: [
      "Sollen Familien den Impfpass zu Impfterminen mitbringen?",
      "Welche Formulierung bevorzugt die Praxis?",
    ],
    related: "präzisiert F78 („Was mitbringen“)",
  },
  {
    itemId: "impfung-nur-mit-impfpass",
    factId: "F93",
    approver: "DOCTOR",
    wordingSource:
      "Textvorschlag nach Hinweis aus dem Praxisteam – stärkere Aussage, getrennt freizugeben",
    openQuestions: [
      "Ist es tatsächlich eine Regel der Praxis, dass ohne Impfpass nicht geimpft wird?",
      "Gibt es Ausnahmen, und soll die Website sie nennen?",
      "Welche Formulierung bevorzugt die Praxis?",
    ],
  },
  {
    itemId: "mundschutz-bei-infekt",
    factId: "F94",
    approver: "DOCTOR",
    wordingSource: "Formulierung der bisherigen Website (F47, nicht bestätigt)",
    openQuestions: [
      "Gilt ein Mundschutz bei Infekt als Pflicht oder als Empfehlung?",
      "Für wen gilt er (Alter, Begleitpersonen)?",
      "Unter welchen Bedingungen (bestimmte Beschwerden, Infektzeiten)?",
      "Welche Formulierung bevorzugt die Praxis?",
    ],
    related: "gleiche Frage wie F47 (bisherige Website)",
  },
];

/** Public use (later 10.1B): only confirmed, fresh items — today: none. */
export const publicFirstVisitItems = (today: string) =>
  selectPublicFirstVisitItems(FIRST_VISIT_ITEMS, today);
