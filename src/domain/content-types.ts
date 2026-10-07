// Core content model (docs/architecture/content-model.md).
// Plain TypeScript types — no CMS dependency. Every entity that carries a public
// fact has a FactVerification. No patient data exists anywhere in this model.

import type { FactVerification } from "./verification.ts";
import type { IsoWeekday, LocalDate, LocalTime } from "./time.ts";

/** Rich text is kept abstract here; the CMS decides the concrete format. */
export type RichText = { format: "portable-text" | "lexical" | "markdown"; value: unknown };

export interface Verified {
  verification: FactVerification;
}

/** A single field whose value has its own verification (e.g. street spelling). */
export interface VerifiedValue<T> extends Verified {
  value: T;
}

// ---------------------------------------------------------------- practice

export interface Practice {
  id: "practice"; // singleton
  displayName: VerifiedValue<string>;
  officialName?: VerifiedValue<string>;
  legalName?: VerifiedValue<string>;
  legalForm?: VerifiedValue<string>;
  phone: VerifiedValue<string>;
  fax?: VerifiedValue<string>;
  email?: VerifiedValue<string>;
  emailUsageNote?: VerifiedValue<string>;
  telephoneHours?: VerifiedValue<string>;
  website?: string;
  description?: VerifiedValue<RichText>;
  locationId: string;
  internalNotes?: string;
}

export interface Location {
  id: string;
  street: VerifiedValue<string>;
  postalCode: VerifiedValue<string>;
  city: VerifiedValue<string>;
  coordinates?: VerifiedValue<{ lat: number; lng: number }>;
  /** Convenience facts: absent until verified — never defaulted. */
  entrance?: VerifiedValue<string>;
  floor?: VerifiedValue<string>;
  lift?: VerifiedValue<boolean>;
  stepFreeAccess?: VerifiedValue<boolean>;
  strollerAccess?: VerifiedValue<string>;
  parking?: VerifiedValue<string>;
  publicTransport?: VerifiedValue<string>;
  routeNotes?: VerifiedValue<string>;
}

// ---------------------------------------------------------------- schedule

/** Consultation types are data, not code: the practice defines which exist. */
export type ConsultationTypeCode = "GENERAL" | "ACUTE" | "APPOINTMENT" | "HEALTHY_ONLY" | "OTHER";

export interface ConsultationType extends Verified {
  code: ConsultationTypeCode;
  /** Public label, e.g. "Akutsprechstunde". */
  label: string;
  /** Plain-language explanation for parents. */
  explanation?: string;
}

export interface OpeningHoursRule extends Verified {
  id: string;
  weekday: IsoWeekday;
  start: LocalTime;
  /** Must be after start; cross-midnight intervals are not supported (invalid → data error). */
  end: LocalTime;
  consultationType: ConsultationTypeCode;
  validFrom?: LocalDate;
  validUntil?: LocalDate;
  publicNote?: string;
}

/**
 * The weekly schedule as a whole. Closed weekdays must be confirmed explicitly:
 * a weekday without rules is NOT assumed closed.
 */
export interface WeeklySchedule extends Verified {
  rules: OpeningHoursRule[];
  confirmedClosedWeekdays: IsoWeekday[];
}

export type ExceptionKind = "SPECIAL_HOURS" | "CLOSED";

/** Changes the hours of one or more days (training day, holiday hours, changed hours). */
export interface OpeningHourException extends Verified {
  id: string;
  kind: ExceptionKind;
  startDate: LocalDate;
  endDate: LocalDate; // inclusive
  /** For SPECIAL_HOURS: the complete replacement intervals for each affected day. */
  intervals: { start: LocalTime; end: LocalTime; consultationType: ConsultationTypeCode }[];
  reason?: string;
  publicMessage?: string;
  /** Higher wins when exceptions overlap; equal priority + different content → conflict (UNKNOWN). */
  priority: number;
}

export type ClosureKind = "VACATION" | "TRAINING" | "SHORT_NOTICE" | "OTHER";

/** "Vacation" in the brief: any multi-day or planned absence, with replacement references. */
export interface Closure extends Verified {
  id: string;
  kind: ClosureKind;
  startDate: LocalDate;
  endDate: LocalDate; // inclusive; expiry is automatic after this date
  /** From this date the closure is announced as upcoming. */
  announceFrom?: LocalDate;
  publicMessage?: string;
  /** Ordered assignments; contact data lives only in ReplacementPractice. */
  replacements: { replacementPracticeId: string; from: LocalDate; until: LocalDate; note?: string }[];
  /** Optional reference to emergency entries to highlight during the closure. */
  emergencyInformationIds?: string[];
}

export interface ReplacementPractice extends Verified {
  id: string;
  practiceName: string;
  contactPersons: string[];
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email?: string;
  website?: string;
  publicNote?: string;
}

// ---------------------------------------------------------------- notices & emergency

export type AnnouncementCategory = "INFO" | "IMPORTANT" | "URGENT";

export interface Announcement extends Verified {
  id: string;
  category: AnnouncementCategory;
  title: string;
  shortText: string;
  fullText?: RichText;
  validFrom: LocalDate;
  /** Required unless explicitly open-ended. */
  validUntil: LocalDate | "OPEN_ENDED";
  priority: number;
  homepageHighlight: boolean;
  published: boolean;
}

export type EmergencyType =
  | "IMMEDIATE_EMERGENCY" // 112
  | "MEDICAL_ON_CALL" // 116117 / KV on-call service
  | "PAEDIATRIC_EMERGENCY_DEPARTMENT"
  | "POISON_CONTROL"
  | "PHARMACY_EMERGENCY"
  | "PRACTICE_CONTACT";

export interface EmergencyInformation extends Verified {
  id: string;
  type: EmergencyType;
  name: string;
  description?: string;
  whenToUse: string;
  phone?: string;
  address?: string;
  /** Structured where possible; free text only as supplement. */
  availability?: { always: boolean; text?: string };
  sourceUrl?: string;
  priority: number;
  publicVisible: boolean;
}

// ---------------------------------------------------------------- people

export interface ImageRef {
  mediaAssetId: string;
  alt: string;
}

export interface Doctor extends Verified {
  id: string;
  name: string;
  /** Exactly as legally held (LB-05). */
  professionalTitles: string[];
  specialties: string[];
  additionalQualifications: string[];
  role?: string;
  shortBio?: string;
  photo?: ImageRef;
  displayOrder: number;
  active: boolean;
  publicationConsent: VerifiedValue<boolean>;
}

export interface TeamMember extends Verified {
  id: string;
  name: string;
  role: string;
  jobTitle?: string;
  shortText?: string;
  photo?: ImageRef;
  displayOrder: number;
  active: boolean;
  publicationConsent: VerifiedValue<boolean>;
}

// ---------------------------------------------------------------- services & orientation

export type AgeGroupId = "0-2" | "3-6" | "7-12" | "13-17";

export interface AgeGroup {
  id: AgeGroupId;
  label: string; // "0–2 Jahre"
  minYears: number;
  maxYears: number;
  intro: string;
}

export interface Service extends Verified {
  id: string;
  name: string;
  plainDescription: string;
  ageGroups: AgeGroupId[];
  relatedPreventiveExaminationIds?: string[];
  relatedVaccinationIds?: string[];
  displayOrder: number;
}

/** Parent-language entry point on "Wobei können wir helfen?" — points to services, never diagnoses. */
export interface HelpTopic {
  id: string;
  label: string; // e.g. "Mein Kind ist krank"
  intro?: string;
  serviceIds: string[];
  /** Optional operational guidance target (e.g. Sprechzeiten / Anrufen) instead of services. */
  guidance?: "HOURS" | "CALL" | "EMERGENCY";
  displayOrder: number;
}

interface MedicalGoverned extends Verified {
  /** Physician of the practice who approved the curated text. */
  approvedBy?: string;
  sourceIds: string[];
}

export interface PreventiveExamination extends MedicalGoverned {
  id: string;
  name: string; // "U7"
  /** As stated by the official source; displayed verbatim. */
  officialAgeWindow: string;
  ageGroups: AgeGroupId[];
  shortExplanation: string;
  about?: RichText;
  /** F67: whether this practice performs it — separate verified flag. */
  offeredByPractice?: VerifiedValue<boolean>;
}

export interface VaccinationInformation extends MedicalGoverned {
  id: string;
  title: string;
  ageGroups: AgeGroupId[];
  protectsAgainst: string;
  whyAtThisAge: string;
  /** e.g. "STIKO-Empfehlungen 2026" — mirrors SourceReference.version for display. */
  sourceVersionLabel: string;
}

export interface HealthEducationArticle extends MedicalGoverned {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: RichText;
  ageGroups: AgeGroupId[];
  topic: string;
  published: boolean;
}

export type LearningChapterStatus = "AVAILABLE" | "IN_PREPARATION";

export interface LearningExperience extends MedicalGoverned {
  id: string;
  slug: string;
  title: string; // "Mein Arztbesuch"
  status: LearningChapterStatus;
  audienceAge: string;
  parentIntro: string;
  learningObjective: string;
  steps: { id: string; title: string; text: string; mediaAssetIds: string[]; audioAssetId?: string }[];
}

// ---------------------------------------------------------------- media

export type MediaClass = "REAL" | "PLACEHOLDER" | "AI_CONCEPTUAL";

export interface MediaAsset {
  id: string;
  class: MediaClass;
  kind: "IMAGE" | "AUDIO" | "VIDEO" | "MODEL_3D";
  purpose: string;
  file: string;
  alt?: string;
  caption?: string;
  credit?: string;
  rightsOwner: string;
  rightsUntil?: LocalDate;
  aiGenerated: boolean;
  /** True only for real photos of the actual practice, its rooms or its people. */
  depictsRealPractice: boolean;
  peopleDepicted: { name?: string; consent: "GIVEN" | "NOT_REQUIRED" | "MISSING" }[];
  internalNotes?: string;
}

// ---------------------------------------------------------------- additional types

/** One confirmed item of "Neu bei uns?" (what to bring, booking, arrival …). */
export interface FirstVisitItem extends Verified {
  id: string;
  block: "LOCATION" | "CONTACT" | "APPOINTMENTS" | "ARRIVAL" | "BRING" | "ACCESS" | "PEOPLE" | "CHILD";
  title: string;
  text: string;
  displayOrder: number;
}

/** Public holidays of Sachsen-Anhalt, maintained as data per year (source: official calendar). */
export interface HolidayCalendar extends Verified {
  id: string;
  year: number;
  region: "DE-ST";
  dates: { date: LocalDate; name: string }[];
}

export interface LegalText extends Verified {
  id: "impressum" | "datenschutz" | "barrierefreiheit";
  title: string;
  body: RichText;
  reviewedBy: string; // legal reviewer
}
