// "Gut vorbereitet" — what families should bring or observe before a visit, as FirstVisitItem records
// (src/domain/content-types.ts). 10.1A prepared them as staff proposals; 10.1B publishes them on STAGING
// from the practice input of 2026-11-16 (relayed by the project owner, PRACTICE_INPUT): VERIFIED_CURRENT
// as WORKING data with transparent provenance — no named practice person is recorded, so the final
// confirmation before PRODUCTION (LB-00; F93/F94 by a physician) stays open and is guarded by tests.
// Public route: /praxis/gut-vorbereitet (docs/architecture/public-content-architecture.md).
// Deliberately NOT included (not requested, not confirmed): U-Heft, ID documents, referrals,
// medication lists, insurance documents, consent forms, findings, certificates, consequences of a
// missing card, mask age limits / mask types / exemptions.

import type { FirstVisitItem } from "../domain/content-types.ts";
import type { FactVerification } from "../domain/verification.ts";
import { selectPublicFirstVisitItems } from "../domain/publication.ts";
import { PRACTICE_INPUT } from "./practice.ts";

/** Practice input 2026-11-16, second part (Gut vorbereitet) — docs/reviews/practice-input-2026-11-16.md §9. */
const GUT_VORBEREITET_INPUT: FactVerification = { ...PRACTICE_INPUT, sourceIds: ["PI-2026-11-16-GV"] };

export const FIRST_VISIT_ITEMS: FirstVisitItem[] = [
  {
    id: "gesundheitskarte",
    block: "BRING",
    title: "Gesundheitskarte mitbringen",
    text: "Bitte bringen Sie die Gesundheitskarte Ihres Kindes zu jedem Besuch mit.",
    displayOrder: 10,
    verification: GUT_VORBEREITET_INPUT,
  },
  {
    id: "impfpass-mitbringen",
    block: "BRING",
    title: "Impfpass mitbringen",
    text: "Bitte bringen Sie den Impfpass zu jedem Besuch mit.",
    displayOrder: 20,
    verification: GUT_VORBEREITET_INPUT,
  },
  {
    // A separate, STRONGER statement (the practice rule) — never merged with "mitbringen"; the
    // text gives only the reason, it does not repeat the request to bring the booklet.
    id: "impfung-nur-mit-impfpass",
    block: "BRING",
    title: "Keine Impfung ohne Impfpass",
    text: "Vor einer Impfung muss der bisherige Impfstatus nachvollziehbar sein.",
    displayOrder: 30,
    verification: GUT_VORBEREITET_INPUT,
  },
  {
    // A request, not a requirement: no age limit, no mask type, no exemptions, no enforcement.
    // Supersedes the old website's age-specific wording (F47).
    id: "mundschutz-bei-infekt",
    block: "ARRIVAL",
    title: "Bei Infekt: Bitte Mundschutz tragen",
    text: "Wenn Ihr Kind oder eine Begleitperson erkältet oder krank ist, bitten wir um einen Mundschutz.",
    displayOrder: 40,
    verification: GUT_VORBEREITET_INPUT,
  },
];

/** Who gives the FINAL confirmation before PRODUCTION (content governance; no new auth role). */
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
  /** Where the current wording comes from. */
  wordingSource: string;
  /** Questions still open for this item (the 10.1A questions are answered by the working input). */
  openQuestions: string[];
  /** What is still needed before PRODUCTION. */
  finalApproval: string;
  /** Related existing register entries. */
  related?: string;
}

const WORKING_SOURCE = "Praxisangabe vom 16.11.2026, übermittelt durch Projektinhaber (Arbeitsstand)";
const NAMED = (who: string) => `Namentliche Bestätigung durch ${who} vor dem Livegang (LB-00) – noch offen`;

export const FIRST_VISIT_APPROVALS: FirstVisitApproval[] = [
  { itemId: "gesundheitskarte", factId: "F91", approver: "PRACTICE", wordingSource: WORKING_SOURCE, openQuestions: [], finalApproval: NAMED("die Praxis"), related: "präzisiert F78 („Was mitbringen“)" },
  { itemId: "impfpass-mitbringen", factId: "F92", approver: "PRACTICE", wordingSource: WORKING_SOURCE, openQuestions: [], finalApproval: NAMED("die Praxis"), related: "präzisiert F78; gilt für jeden Besuch, nicht nur Impftermine" },
  { itemId: "impfung-nur-mit-impfpass", factId: "F93", approver: "DOCTOR", wordingSource: WORKING_SOURCE, openQuestions: [], finalApproval: NAMED("eine Ärztin") },
  {
    itemId: "mundschutz-bei-infekt",
    factId: "F94",
    approver: "DOCTOR",
    wordingSource: `${WORKING_SOURCE}: Bitte, keine Pflicht`,
    openQuestions: [],
    finalApproval: NAMED("eine Ärztin"),
    related: "ersetzt die frühere Formulierung der bisherigen Website (F47)",
  },
];

/** Public items (STAGING: working input; PRODUCTION only after the named confirmation — LB-00). */
export const publicFirstVisitItems = (today: string) => selectPublicFirstVisitItems(FIRST_VISIT_ITEMS, today);
