// StaticPracticeRepository: wraps the current repository content (src/content/*) — authoritative
// during Phase 09.2. Public pages read the same snapshot, so behaviour is unchanged.

import type { Announcement } from "../domain/content-types.ts";
import type { PulsData } from "../domain/practice-status.ts";
import { PULS_DATA } from "../content/schedule.ts";
import { ANNOUNCEMENTS } from "../content/notices.ts";
import type { PracticeRepository } from "./contracts.ts";

/** Synchronous snapshot for server components that are not async-repository-ready yet (until 09.4). */
export const staticPulsData = (): PulsData => PULS_DATA;

export class StaticPracticeRepository implements PracticeRepository {
  readonly source = "STATIC" as const;
  async getPulsData(): Promise<PulsData> {
    return staticPulsData();
  }
  async getAnnouncements(): Promise<Announcement[]> {
    return ANNOUNCEMENTS;
  }
}
