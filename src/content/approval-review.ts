// Shared shape of the staging approval drafts (10.2A Praxis-App, 10.3A Rezepte): per topic what
// the project actually KNOWS (facts about the request, not about the practice process), what is
// UNCONFIRMED, and the exact OPEN QUESTIONS. Review tooling only — nothing here is published.

export type ApprovalRisk = "MEDIUM" | "HIGH";

/** A possible contact channel; its status stays UNCONFIRMED until the practice answers. */
export interface ApprovalChannel {
  id: string;
  label: string;
  status: "UNCONFIRMED";
  question: string;
  /** Existing register entries it depends on. */
  related?: string;
}

export interface ApprovalSection {
  id: string;
  title: string;
  /** Fact register ids (docs/research/fact-status-register.md). */
  factIds: string[];
  risk?: ApprovalRisk;
  /** What the project actually knows. */
  known: string[];
  /** Statements that must NOT be treated as facts until confirmed. */
  unconfirmed: string[];
  /** Exact questions for the practice. */
  questions: string[];
  /** Visible "missing" markers — never working dummy links. */
  missing?: string[];
  /** Candidate options: questions only, none pre-selected. */
  candidates?: string[];
  /** Items the practice must clarify (labelled "zu klären", never instructions). */
  toClarify?: string[];
  /** Possible contact channels, all unconfirmed. */
  channels?: ApprovalChannel[];
  /** Boundaries and relationships to other work packages / facts. */
  notes?: string[];
}
