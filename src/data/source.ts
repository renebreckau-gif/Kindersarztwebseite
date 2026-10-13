// Active data source — an implementation migration control, defined in code.
// Deliberately separate from SITE_STAGE (deployment stage) and never derived from Vercel.
// "PAYLOAD" is switched on only in Phase 09.4 after the parity tests pass (backend-foundation.md §14–15).

import type { PulsData } from "../domain/practice-status.ts";
import type { DataSource, PracticeRepository } from "./contracts.ts";
import { StaticPracticeRepository } from "./static-repository.ts";

export const DATA_SOURCE: DataSource = "STATIC";

export function getPracticeRepository(): PracticeRepository {
  // PAYLOAD is not wired into the public site in 09.2; the adapter lives in src/backend/.
  return new StaticPracticeRepository();
}

/**
 * Fail-safe dataset: no schedule → the engine resolves every day to UNKNOWN ("Aktuelle
 * Sprechzeiten" + phone). Used when live data cannot be read — never a guessed OPEN.
 */
export const FAIL_SAFE_PULS_DATA: PulsData = {
  schedule: undefined,
  consultationTypes: [],
  exceptions: [],
  closures: [],
  replacementPractices: [],
  publicHolidays: [],
  holidayPolicy: { mode: "REQUIRE_EXPLICIT_ENTRY" },
};

/** Read with the fail-safe rule: any read error yields the UNKNOWN dataset (design for 09.4). */
export async function readPulsDataSafely(repo: PracticeRepository): Promise<{ data: PulsData; failed: boolean }> {
  try {
    return { data: await repo.getPulsData(), failed: false };
  } catch {
    return { data: FAIL_SAFE_PULS_DATA, failed: true };
  }
}
