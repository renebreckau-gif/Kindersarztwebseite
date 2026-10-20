// Shared types of the real cockpit workflows (Phase 09.5A: 7.1 Heute früher schließen,
// 7.2 Heute geschlossen; 09.5C: 7.5 Urlaub / geplante Schließzeit). Pure — no Payload, no React.

import type { Closure, OpeningHourException } from "../../domain/content-types.ts";
import type { PracticeStatusResult } from "../../domain/practice-status.ts";
import type { ChangeSet } from "../../domain/operations.ts";
import type { LocalDate, LocalTime } from "../../domain/time.ts";

/** ACUTE_TODAY (09.5E-2): a one-day acute change on top of the physician baseline. */
export type WorkflowKind = "EARLY_CLOSE" | "CLOSED_TODAY" | "PLANNED_CLOSURE" | "ACUTE_TODAY";

/** Why a draft cannot be published (shown in plain German, never a raw code). */
export type BlockCode =
  | "INVALID_INPUT"
  | "TIME_NOT_AFTER_NOW"
  | "NO_CHANGE"
  | "NOTHING_LEFT"
  | "CLOSURE_EXISTS"
  | "SPECIAL_HOURS_EXISTS"
  | "DAY_UNKNOWN"
  | "CONFLICT"
  | "REPLACEMENT_NOT_USABLE"
  /** 09.5B: a multi-day record covers today — a today workflow never changes it. */
  | "MULTI_DAY_EXISTS"
  /** 09.5B: a compatible single-day record exists; it can be replaced only by explicit choice. */
  | "SUPERSEDE_AVAILABLE"
  /** 09.5C planned closures. */
  | "NOT_EDITABLE"
  | "OVERLAP_CLOSURE"
  | "OVERLAP_SPECIAL_HOURS"
  | "REPLACEMENT_PERIODS"
  | "REPLACEMENT_EXPIRES"
  | "GAP_NOT_CONFIRMED"
  /** 09.5E: no READY physician acute baseline. */
  | "BASELINE_NOT_READY";

/** Form sections of the planned-closure workflow (errors are shown in their section). */
export type PlannedSection = "art" | "zeitraum" | "ankuendigung" | "vertretung" | "hinweis";

export interface Blocked {
  code: BlockCode;
  /** Plain German explanation. */
  message: string;
  /** Optional suggested next step (e.g. "Heute geschlossen"). */
  suggestion?: { label: string; href: string };
  /** 09.5C: the form section the problem belongs to. */
  section?: PlannedSection;
}

export interface DraftBase {
  kind: WorkflowKind;
  today: LocalDate;
  now: LocalTime;
  /** Engine result on the current database snapshot. */
  before: PracticeStatusResult;
  /** Fingerprint of the snapshot the draft was built on (concurrency detector, not auth). */
  fingerprint: string;
}

export interface ReadyDraft extends DraftBase {
  ok: true;
  /**
   * EDIT = same record id, new version; NEW = first record of this kind today;
   * SUPERSEDE = new record replaces an existing single-day record (old one becomes RETIRED).
   */
  mode: "NEW" | "EDIT" | "SUPERSEDE";
  /** Records this draft deliberately replaces (only with mode SUPERSEDE). */
  supersedes?: { collection: "openingHourExceptions" | "closures"; recordId: string; label: string }[];
  changeSet: ChangeSet;
  record: { collection: "openingHourExceptions"; value: OpeningHourException } | { collection: "closures"; value: Closure };
  /** Engine result with the change applied. */
  after: PracticeStatusResult;
  /** The final button — it says what happens. */
  actionLabel: string;
  /** One sentence describing the effect. */
  effect: string;
}

export interface BlockedDraft extends DraftBase {
  ok: false;
  blocked: Blocked;
}

export type Draft = ReadyDraft | BlockedDraft;

export interface EarlyCloseInput {
  time: string;
  message?: string;
  /** Explicit choice "Bestehende Änderung ersetzen" (09.5B). */
  replaceExisting?: boolean;
}

export type PublicReason = "KRANKHEIT" | "FORTBILDUNG" | "TECHNIK" | "KEINER" | "SONSTIGES";

export interface ClosedTodayInput {
  mode: "NOW" | "FROM_TIME";
  time?: string;
  reason: PublicReason;
  otherText?: string;
  replacementIds: string[];
  /** Explicit choice "Bestehende Änderung ersetzen" (09.5B). */
  replaceExisting?: boolean;
}

export const MAX_PUBLIC_TEXT = 140;

/** 7.5 Urlaub / geplante Schließzeit — the kinds a planned closure may have (never SHORT_NOTICE). */
export type PlannedKind = "VACATION" | "TRAINING" | "OTHER";
export const PLANNED_KINDS: PlannedKind[] = ["VACATION", "TRAINING", "OTHER"];
export const MAX_PLANNED_TEXT = 280;
export const MAX_PERIODS = 8;

/** "ganz" = one practice for the whole range · "teilen" = explicit periods · "keine" = no replacement. */
export type ReplacementMode = "GANZ" | "TEILEN" | "KEINE";

/** Exactly what a person types or chooses — never dates of provenance, roles, ids of change sets. */
export interface PlannedClosureInput {
  /** Domain record id of the ACTIVE closure being edited (re-loaded on the server). */
  recordId?: string;
  kind?: PlannedKind;
  from: string;
  to: string;
  announceFrom: string;
  message?: string;
  mode?: ReplacementMode;
  /** GANZ: the one practice for the whole range. */
  practice?: string;
  /** TEILEN: explicit replacement periods. */
  periods: { from: string; to: string; practice: string }[];
  /** Days without replacement were acknowledged explicitly. */
  gapsAccepted: boolean;
}
