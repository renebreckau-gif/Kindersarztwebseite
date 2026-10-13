// Mapping between Payload documents and domain types (pure, no Payload import).
// The document shapes mirror the collection definitions in src/backend/collections/.
// Payload stores absent values as null and adds ids to array rows; the domain uses undefined
// and stable record ids (`recordId`) — this module converts both ways, losslessly.

import type {
  Announcement,
  Closure,
  ConsultationType,
  ConsultationTypeCode,
  OpeningHourException,
  OpeningHoursRule,
  ReplacementPractice,
  WeeklySchedule,
} from "../domain/content-types.ts";
import type { HolidayPolicy, PulsData } from "../domain/practice-status.ts";
import type { FactVerification, VerificationStatus } from "../domain/verification.ts";
import type { IsoWeekday, LocalDate } from "../domain/time.ts";

type Nullable<T> = { [K in keyof T]?: T[K] | null };

export interface VerificationDoc {
  status: VerificationStatus;
  lastVerified?: string | null;
  verifiedBy?: string | null;
  reviewDue?: string | null;
  sourceIds?: { sourceId: string }[] | null;
  internalNotes?: string | null;
}
export interface RuleDoc {
  ruleId: string;
  weekday: string;
  start: string;
  end: string;
  consultationType: ConsultationTypeCode;
  validFrom?: string | null;
  validUntil?: string | null;
  publicNote?: string | null;
  verification: VerificationDoc;
}
export interface WeeklyScheduleDoc {
  rules: RuleDoc[];
  confirmedClosedWeekdays: string[];
  verification: VerificationDoc;
}
export interface ConsultationTypeDoc {
  code: ConsultationTypeCode;
  label: string;
  explanation?: string | null;
  verification: VerificationDoc;
}
export interface ExceptionDoc {
  recordId: string;
  kind: OpeningHourException["kind"];
  startDate: string;
  endDate: string;
  intervals?: { start: string; end: string; consultationType: ConsultationTypeCode }[] | null;
  reason?: string | null;
  publicMessage?: string | null;
  priority: number;
  verification: VerificationDoc;
}
export interface ClosureDoc {
  recordId: string;
  kind: Closure["kind"];
  startDate: string;
  endDate: string;
  announceFrom?: string | null;
  publicMessage?: string | null;
  replacements?: { replacementPracticeId: string; from: string; until: string; note?: string | null }[] | null;
  emergencyInformationIds?: { emergencyId: string }[] | null;
  verification: VerificationDoc;
}
export interface ReplacementPracticeDoc {
  recordId: string;
  practiceName: string;
  contactPersons?: { name: string }[] | null;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email?: string | null;
  website?: string | null;
  publicNote?: string | null;
  verification: VerificationDoc;
}
export interface HolidayCalendarDoc {
  holidays?: { date: string; name?: string | null }[] | null;
  policy: HolidayPolicy["mode"];
  policyVerification?: VerificationDoc | null;
}
export interface AnnouncementDoc {
  recordId: string;
  category: Announcement["category"];
  title: string;
  shortText: string;
  validFrom: string;
  validUntil?: string | null;
  openEnded?: boolean | null;
  priority: number;
  homepageHighlight?: boolean | null;
  published?: boolean | null;
  verification: VerificationDoc;
}

export interface PracticeDocs {
  schedule: WeeklyScheduleDoc | null;
  consultationTypes: ConsultationTypeDoc[];
  exceptions: ExceptionDoc[];
  closures: ClosureDoc[];
  replacementPractices: ReplacementPracticeDoc[];
  holidayCalendar: HolidayCalendarDoc | null;
}

// ---------------------------------------------------------------- helpers

/** Copy only defined, non-null values (domain optional fields stay absent). */
function compact<T extends object>(o: Nullable<T>): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as T;
}
const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export function verificationFromDoc(d: VerificationDoc): FactVerification {
  return compact<FactVerification>({
    status: d.status,
    lastVerified: d.lastVerified,
    verifiedBy: d.verifiedBy,
    reviewDue: d.reviewDue,
    sourceIds: (d.sourceIds ?? []).map((s) => s.sourceId),
    internalNotes: d.internalNotes,
  });
}
export function verificationToDoc(v: FactVerification): VerificationDoc {
  return {
    status: v.status,
    lastVerified: v.lastVerified ?? null,
    verifiedBy: v.verifiedBy ?? null,
    reviewDue: v.reviewDue ?? null,
    sourceIds: v.sourceIds.map((sourceId) => ({ sourceId })),
    internalNotes: v.internalNotes ?? null,
  };
}

// ---------------------------------------------------------------- to domain

export function scheduleFromDoc(d: WeeklyScheduleDoc): WeeklySchedule {
  return {
    rules: d.rules.map(
      (r): OpeningHoursRule =>
        compact<OpeningHoursRule>({
          id: r.ruleId,
          weekday: Number(r.weekday) as IsoWeekday,
          start: r.start,
          end: r.end,
          consultationType: r.consultationType,
          validFrom: r.validFrom,
          validUntil: r.validUntil,
          publicNote: r.publicNote,
          verification: verificationFromDoc(r.verification),
        }),
    ),
    confirmedClosedWeekdays: d.confirmedClosedWeekdays.map((w) => Number(w) as IsoWeekday),
    verification: verificationFromDoc(d.verification),
  };
}

export const consultationTypeFromDoc = (d: ConsultationTypeDoc): ConsultationType =>
  compact<ConsultationType>({ code: d.code, label: d.label, explanation: d.explanation, verification: verificationFromDoc(d.verification) });

export const exceptionFromDoc = (d: ExceptionDoc): OpeningHourException =>
  compact<OpeningHourException>({
    id: d.recordId,
    kind: d.kind,
    startDate: d.startDate,
    endDate: d.endDate,
    intervals: (d.intervals ?? []).map((i) => ({ start: i.start, end: i.end, consultationType: i.consultationType })),
    reason: d.reason,
    publicMessage: d.publicMessage,
    priority: d.priority,
    verification: verificationFromDoc(d.verification),
  });

export const closureFromDoc = (d: ClosureDoc): Closure =>
  compact<Closure>({
    id: d.recordId,
    kind: d.kind,
    startDate: d.startDate,
    endDate: d.endDate,
    announceFrom: d.announceFrom,
    publicMessage: d.publicMessage,
    replacements: (d.replacements ?? []).map((r) => compact({ replacementPracticeId: r.replacementPracticeId, from: r.from, until: r.until, note: opt(r.note) })),
    // Stored arrays come back as [] when empty; the domain leaves the optional list absent.
    emergencyInformationIds: d.emergencyInformationIds?.length ? d.emergencyInformationIds.map((e) => e.emergencyId) : undefined,
    verification: verificationFromDoc(d.verification),
  });

export const replacementPracticeFromDoc = (d: ReplacementPracticeDoc): ReplacementPractice =>
  compact<ReplacementPractice>({
    id: d.recordId,
    practiceName: d.practiceName,
    contactPersons: (d.contactPersons ?? []).map((c) => c.name),
    street: d.street,
    postalCode: d.postalCode,
    city: d.city,
    phone: d.phone,
    email: d.email,
    website: d.website,
    publicNote: d.publicNote,
    verification: verificationFromDoc(d.verification),
  });

export const announcementFromDoc = (d: AnnouncementDoc): Announcement =>
  compact<Announcement>({
    id: d.recordId,
    category: d.category,
    title: d.title,
    shortText: d.shortText,
    validFrom: d.validFrom,
    validUntil: d.openEnded ? "OPEN_ENDED" : (d.validUntil as LocalDate),
    priority: d.priority,
    homepageHighlight: Boolean(d.homepageHighlight),
    published: Boolean(d.published),
    verification: verificationFromDoc(d.verification),
  });

export function holidayPolicyFromDoc(d: HolidayCalendarDoc | null): HolidayPolicy {
  if (d?.policy === "CLOSED_ON_PUBLIC_HOLIDAYS" && d.policyVerification) return { mode: "CLOSED_ON_PUBLIC_HOLIDAYS", verification: verificationFromDoc(d.policyVerification) };
  // An unverified or missing policy never becomes "closed on holidays" (fail-safe).
  return { mode: "REQUIRE_EXPLICIT_ENTRY" };
}

/** Assemble the engine input from documents. Missing schedule → engine resolves to UNKNOWN. */
export function pulsDataFromDocs(docs: PracticeDocs): PulsData {
  return {
    schedule: docs.schedule ? scheduleFromDoc(docs.schedule) : undefined,
    consultationTypes: docs.consultationTypes.map(consultationTypeFromDoc),
    exceptions: docs.exceptions.map(exceptionFromDoc),
    closures: docs.closures.map(closureFromDoc),
    replacementPractices: docs.replacementPractices.map(replacementPracticeFromDoc),
    publicHolidays: (docs.holidayCalendar?.holidays ?? []).map((h) => h.date),
    holidayPolicy: holidayPolicyFromDoc(docs.holidayCalendar),
  };
}

// ---------------------------------------------------------------- to documents (seed / parity)

export function docsFromPulsData(data: PulsData, holidayNames: Record<string, string> = {}): PracticeDocs {
  return {
    schedule: data.schedule
      ? {
          rules: data.schedule.rules.map((r) => ({
            ruleId: r.id,
            weekday: String(r.weekday),
            start: r.start,
            end: r.end,
            consultationType: r.consultationType,
            validFrom: r.validFrom ?? null,
            validUntil: r.validUntil ?? null,
            publicNote: r.publicNote ?? null,
            verification: verificationToDoc(r.verification),
          })),
          confirmedClosedWeekdays: data.schedule.confirmedClosedWeekdays.map(String),
          verification: verificationToDoc(data.schedule.verification),
        }
      : null,
    consultationTypes: data.consultationTypes.map((t) => ({ code: t.code, label: t.label, explanation: t.explanation ?? null, verification: verificationToDoc(t.verification) })),
    exceptions: data.exceptions.map((x) => ({
      recordId: x.id,
      kind: x.kind,
      startDate: x.startDate,
      endDate: x.endDate,
      intervals: x.intervals.map((i) => ({ ...i })),
      reason: x.reason ?? null,
      publicMessage: x.publicMessage ?? null,
      priority: x.priority,
      verification: verificationToDoc(x.verification),
    })),
    closures: data.closures.map((c) => ({
      recordId: c.id,
      kind: c.kind,
      startDate: c.startDate,
      endDate: c.endDate,
      announceFrom: c.announceFrom ?? null,
      publicMessage: c.publicMessage ?? null,
      replacements: c.replacements.map((r) => ({ replacementPracticeId: r.replacementPracticeId, from: r.from, until: r.until, note: r.note ?? null })),
      // Payload writes optional lists as [] (null is not a valid array value); [] maps back to absent.
      emergencyInformationIds: (c.emergencyInformationIds ?? []).map((emergencyId) => ({ emergencyId })),
      verification: verificationToDoc(c.verification),
    })),
    replacementPractices: data.replacementPractices.map((p) => ({
      recordId: p.id,
      practiceName: p.practiceName,
      contactPersons: p.contactPersons.map((name) => ({ name })),
      street: p.street,
      postalCode: p.postalCode,
      city: p.city,
      phone: p.phone,
      email: p.email ?? null,
      website: p.website ?? null,
      publicNote: p.publicNote ?? null,
      verification: verificationToDoc(p.verification),
    })),
    holidayCalendar: {
      holidays: data.publicHolidays.map((date) => ({ date, name: holidayNames[date] ?? null })),
      policy: data.holidayPolicy.mode,
      // An optional group is omitted, never null (Payload validates groups as objects).
      ...(data.holidayPolicy.mode === "CLOSED_ON_PUBLIC_HOLIDAYS" ? { policyVerification: verificationToDoc(data.holidayPolicy.verification) } : {}),
    },
  };
}

export function announcementToDoc(a: Announcement): AnnouncementDoc {
  return {
    recordId: a.id,
    category: a.category,
    title: a.title,
    shortText: a.shortText,
    validFrom: a.validFrom,
    validUntil: a.validUntil === "OPEN_ENDED" ? null : a.validUntil,
    openEnded: a.validUntil === "OPEN_ENDED",
    priority: a.priority,
    homepageHighlight: a.homepageHighlight,
    published: a.published,
    verification: verificationToDoc(a.verification),
  };
}
