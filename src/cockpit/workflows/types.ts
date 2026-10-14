// Shared types of the real cockpit workflows (Phase 09.5A: 7.1 Heute früher schließen,
// 7.2 Heute geschlossen). Pure — no Payload, no React.

import type { Closure, OpeningHourException } from "../../domain/content-types.ts";
import type { PracticeStatusResult } from "../../domain/practice-status.ts";
import type { ChangeSet } from "../../domain/operations.ts";
import type { LocalDate, LocalTime } from "../../domain/time.ts";

export type WorkflowKind = "EARLY_CLOSE" | "CLOSED_TODAY";

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
  | "REPLACEMENT_NOT_USABLE";

export interface Blocked {
  code: BlockCode;
  /** Plain German explanation. */
  message: string;
  /** Optional suggested next step (e.g. "Heute geschlossen"). */
  suggestion?: { label: string; href: string };
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
  /** EDIT = same record id, new version; NEW = first record of this kind today. */
  mode: "NEW" | "EDIT";
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
}

export type PublicReason = "KRANKHEIT" | "FORTBILDUNG" | "TECHNIK" | "KEINER" | "SONSTIGES";

export interface ClosedTodayInput {
  mode: "NOW" | "FROM_TIME";
  time?: string;
  reason: PublicReason;
  otherText?: string;
  replacementIds: string[];
}

export const MAX_PUBLIC_TEXT = 140;
