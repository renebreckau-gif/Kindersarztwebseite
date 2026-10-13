// PayloadPracticeRepository — NOT authoritative in Phase 09.2 (DATA_SOURCE = "STATIC").
// Reads through a minimal reader interface (Payload's Local API satisfies it), maps documents
// to domain types and hands the domain nothing Payload-specific.

import type { Announcement } from "../domain/content-types.ts";
import type { PulsData } from "../domain/practice-status.ts";
import type { PracticeRepository } from "../data/contracts.ts";
import {
  announcementFromDoc,
  pulsDataFromDocs,
  type AnnouncementDoc,
  type ClosureDoc,
  type ConsultationTypeDoc,
  type ExceptionDoc,
  type HolidayCalendarDoc,
  type ReplacementPracticeDoc,
  type WeeklyScheduleDoc,
} from "../data/payload-mapping.ts";

/** The subset of Payload's Local API used here. */
export interface PayloadReader {
  find(args: { collection: string; limit?: number; pagination?: boolean; depth?: number; sort?: string; overrideAccess?: boolean; req?: unknown }): Promise<{ docs: unknown[] }>;
  findGlobal(args: { slug: string; depth?: number; overrideAccess?: boolean; req?: unknown }): Promise<unknown>;
}

export class PayloadPracticeRepository implements PracticeRepository {
  readonly source = "PAYLOAD" as const;
  private readonly payload: PayloadReader;
  /** Pass the request inside hooks so reads share the write transaction. */
  private readonly req?: unknown;
  constructor(payload: PayloadReader, req?: unknown) {
    this.payload = payload;
    this.req = req;
  }

  private async all<T>(collection: string, sort?: string): Promise<T[]> {
    const res = await this.payload.find({ collection, pagination: false, depth: 0, sort, overrideAccess: true, req: this.req });
    return res.docs as T[];
  }

  async getPulsData(): Promise<PulsData> {
    const [schedules, consultationTypes, exceptions, closures, replacementPractices, holidayCalendar] = await Promise.all([
      this.all<WeeklyScheduleDoc>("weeklySchedules", "-updatedAt"),
      this.all<ConsultationTypeDoc>("consultationTypes"),
      this.all<ExceptionDoc>("openingHourExceptions"),
      this.all<ClosureDoc>("closures"),
      this.all<ReplacementPracticeDoc>("replacementPractices"),
      this.payload.findGlobal({ slug: "holidayCalendar", depth: 0, overrideAccess: true, req: this.req }) as Promise<HolidayCalendarDoc | null>,
    ]);
    // One weekly schedule is authoritative: the most recently updated document.
    return pulsDataFromDocs({ schedule: schedules[0] ?? null, consultationTypes, exceptions, closures, replacementPractices, holidayCalendar });
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return (await this.all<AnnouncementDoc>("announcements")).map(announcementFromDoc);
  }
}
