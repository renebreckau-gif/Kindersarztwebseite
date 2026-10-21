// Public operational snapshot (Phase 09.6B) — ONE object per public request that carries everything the
// public site shows about "today": PRAXIS PULS input + announcements. Framework-independent.
//
// 09.6B: the public loader is STATIC ONLY (src/content via the static repository). It never inspects
// DATA_SOURCE, the environment, Payload or PostgreSQL — the source switch is a later, deliberate change
// of THIS loader, not of every page. The Payload shadow reader lives in src/backend and returns the same
// shape for tests / internal diagnostics only.

import type { Announcement } from "../domain/content-types.ts";
import type { PulsData } from "../domain/practice-status.ts";
import type { DataSource } from "./contracts.ts";
import { FAIL_SAFE_PULS_DATA } from "./source.ts";
import { StaticPracticeRepository } from "./static-repository.ts";

export type OperationalReadState = "OK" | "FAILED";

export interface PublicOperationalSnapshot {
  puls: PulsData;
  announcements: Announcement[];
  /** Diagnostics only — never rendered for parents. `readAt` is the server read time, NOT a verification date. */
  meta: { source: DataSource; state: OperationalReadState; readAt: string };
}

/** The public loader. 09.6B: always the static snapshot (exactly PULS_DATA + ANNOUNCEMENTS). */
export async function loadPublicOperationalData(now: Date = new Date()): Promise<PublicOperationalSnapshot> {
  const repo = new StaticPracticeRepository();
  const [puls, announcements] = await Promise.all([repo.getPulsData(), repo.getAnnouncements()]);
  return { puls, announcements, meta: { source: "STATIC", state: "OK", readAt: now.toISOString() } };
}

/**
 * A failed read fails CLOSED as a whole: no schedule (engine → UNKNOWN), no announcements. Never the
 * static content — after a cutover old static operational facts are not an emergency truth.
 */
export function failedOperationalSnapshot(source: DataSource, now: Date = new Date()): PublicOperationalSnapshot {
  return { puls: FAIL_SAFE_PULS_DATA, announcements: [], meta: { source, state: "FAILED", readAt: now.toISOString() } };
}
