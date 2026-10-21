// Payload collection definitions for the Praxis Cockpit backend (type-only Payload import).
// WEBSITE OPERATIONS ONLY — no patient data (enforced by privacy.ts at config build and in tests).
// Access: ACCESS matrix (access.ts). Who may CONFIRM what: provenance hook (governance.canConfirm).

import type { CollectionBeforeChangeHook, CollectionConfig, Field, GlobalConfig } from "payload";
import type { ConfirmableKind } from "../domain/governance.ts";
import { ACCESS, activeRole, adminOnly, adminOrDoctorHolidayPolicy, signedIn } from "./access.ts";
import { CONSULTATION_TYPE_OPTIONS, localDate, localTime, recordId, verification } from "./fields.ts";
import { acuteExceptionHook, announcementShapeHook, auditHook, globalAuditHook, holidayPolicyHook, provenanceHook, publishGuardHook, replacementGuardHook, retiredRecordGuard, staffCreateGuard, staffOperationGuard } from "./hooks.ts";
import { ANNOUNCEMENT_DEFAULT_PRIORITY, ANNOUNCEMENT_TEXT_MAX, ANNOUNCEMENT_TITLE_MAX } from "../domain/announcements.ts";
import { isLifecycleWrite, RejectedError } from "./server-context.ts";

const opts = (values: string[]) => values.map((v) => ({ label: v, value: v }));
const WEEKDAYS = [
  { label: "Montag", value: "1" },
  { label: "Dienstag", value: "2" },
  { label: "Mittwoch", value: "3" },
  { label: "Donnerstag", value: "4" },
  { label: "Freitag", value: "5" },
  { label: "Samstag", value: "6" },
  { label: "Sonntag", value: "7" },
];

/** Role and active flag: only ADMIN may change them (no self-promotion). */
const adminField = { create: adminOnly, update: adminOnly };

/**
 * Record lifecycle (Phase 09.5B) — separate from fact verification:
 *   ACTIVE  → part of the practice data the engine sees
 *   RETIRED → history only (SUPERSEDED by another record, or REVERTED by an undo); never deleted
 * Only the trusted cockpit lifecycle path (server context, never HTTP) may write these fields;
 * ordinary client writes to them are silently ignored by field-level access.
 */
const lifecycleOnly = { create: ({ req }: { req: { context?: Record<string, unknown> } }) => isLifecycleWrite(req.context), update: ({ req }: { req: { context?: Record<string, unknown> } }) => isLifecycleWrite(req.context) };
export const LIFECYCLE_FIELDS: Field[] = [
  {
    name: "recordState",
    label: "Status des Eintrags",
    type: "select",
    required: true,
    defaultValue: "ACTIVE",
    index: true,
    options: [
      { label: "aktiv", value: "ACTIVE" },
      { label: "archiviert", value: "RETIRED" },
    ],
    access: lifecycleOnly,
    admin: { readOnly: true, position: "sidebar" },
  },
  {
    name: "retiredReason",
    label: "Archiviert, weil",
    type: "select",
    options: [
      { label: "ersetzt", value: "SUPERSEDED" },
      { label: "zurückgenommen", value: "REVERTED" },
    ],
    access: lifecycleOnly,
    admin: { readOnly: true, position: "sidebar" },
  },
  { name: "retiredAt", label: "Archiviert am", type: "text", access: lifecycleOnly, admin: { readOnly: true, position: "sidebar" } },
  { name: "retiredByChangeSetId", label: "Archiviert durch Vorgang", type: "text", access: lifecycleOnly, admin: { readOnly: true, position: "sidebar" } },
  { name: "supersededByRecordId", label: "Ersetzt durch Eintrag", type: "text", access: lifecycleOnly, admin: { readOnly: true, position: "sidebar" } },
];

/** Common wiring of a provenance-tracked operational collection. */
function tracked(
  slug: keyof typeof ACCESS,
  kind: ConfirmableKind,
  fields: Field[],
  extra: { guard?: "openingHourExceptions" | "closures"; labels: { singular: string; plural: string }; lifecycle?: boolean; validate?: CollectionBeforeChangeHook[] },
): CollectionConfig {
  return {
    slug,
    labels: extra.labels,
    access: ACCESS[slug],
    admin: { group: "Praxis-Betrieb" },
    fields: [...fields, verification(), ...(extra.lifecycle ? LIFECYCLE_FIELDS : [])],
    hooks: {
      // Retired records are history; then provenance (generated verification), then the guard
      // evaluates the record as it will be stored.
      beforeChange: [...(extra.lifecycle ? [retiredRecordGuard] : []), ...(extra.validate ?? []), provenanceHook(kind), ...(extra.guard ? [publishGuardHook(extra.guard)] : [])],
      afterChange: [auditHook(slug)],
    },
  };
}

export const Staff: CollectionConfig = {
  slug: "staff",
  labels: { singular: "Praxis-Konto", plural: "Praxis-Konten" },
  // Payload's built-in auth: hashed passwords (no custom crypto), HttpOnly session cookie,
  // server-side sessions (logout revokes), lockout after repeated failures. Password reset needs
  // an email adapter (none yet) and is closed by staffOperationGuard until then.
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
    useAPIKey: false,
    // Secure stays on everywhere: browsers treat http://localhost as a secure context.
    cookies: { secure: true, sameSite: "Lax" },
  },
  access: {
    ...ACCESS.staff,
    unlock: adminOnly,
    // The generic Payload admin (/intern/admin) is structural administration: ADMIN only.
    admin: ({ req }) => activeRole(req.user) === "ADMIN",
  },
  admin: { useAsTitle: "name", group: "Verwaltung" },
  fields: [
    { name: "name", label: "Anzeigename", type: "text", required: true, maxLength: 80 },
    { name: "role", label: "Rolle", type: "select", required: true, defaultValue: "STAFF", options: opts(["STAFF", "DOCTOR", "ADMIN"]), access: adminField, saveToJWT: true },
    { name: "active", label: "Konto aktiv", type: "checkbox", defaultValue: true, access: adminField, saveToJWT: true },
  ],
  hooks: {
    beforeLogin: [
      ({ user }) => {
        // Disabled accounts cannot sign in, even with a correct password (generic message, no hint).
        if ((user as { active?: boolean }).active === false) throw new RejectedError("Anmeldung nicht möglich.", 401);
        return user;
      },
    ],
    beforeOperation: [staffOperationGuard],
    beforeChange: [staffCreateGuard],
    afterChange: [auditHook("staff")],
  },
};

export const WeeklySchedules = tracked(
  "weeklySchedules",
  "WEEKLY_SCHEDULE",
  [
    {
      name: "rules",
      label: "Sprechzeiten",
      type: "array",
      required: true,
      fields: [
        { name: "ruleId", type: "text", required: true },
        { name: "weekday", label: "Wochentag", type: "select", required: true, options: WEEKDAYS },
        localTime("start", "Von"),
        localTime("end", "Bis"),
        { name: "consultationType", label: "Sprechstundenart", type: "select", required: true, options: CONSULTATION_TYPE_OPTIONS },
        localDate("validFrom", "Gültig ab", false),
        localDate("validUntil", "Gültig bis", false),
        { name: "publicNote", label: "Öffentlicher Hinweis", type: "text", maxLength: 160 },
        verification(),
      ],
    },
    { name: "confirmedClosedWeekdays", label: "Bestätigt geschlossene Wochentage", type: "select", hasMany: true, options: WEEKDAYS },
  ],
  { labels: { singular: "Wochenplan", plural: "Wochenpläne" } },
);

export const ConsultationTypes = tracked(
  "consultationTypes",
  "CONSULTATION_TYPE",
  [
    { name: "code", type: "select", required: true, unique: true, options: CONSULTATION_TYPE_OPTIONS },
    { name: "label", label: "Bezeichnung", type: "text", required: true, maxLength: 80 },
    { name: "explanation", label: "Erklärung", type: "textarea", maxLength: 400 },
  ],
  { labels: { singular: "Sprechstundenart", plural: "Sprechstundenarten" } },
);

export const OpeningHourExceptions = tracked(
  "openingHourExceptions",
  "EXCEPTION",
  [
    recordId,
    { name: "kind", label: "Art", type: "select", required: true, options: opts(["SPECIAL_HOURS", "CLOSED"]) },
    localDate("startDate", "Von"),
    localDate("endDate", "Bis"),
    {
      name: "intervals",
      label: "Geänderte Zeiten",
      type: "array",
      fields: [localTime("start", "Von"), localTime("end", "Bis"), { name: "consultationType", type: "select", required: true, options: CONSULTATION_TYPE_OPTIONS }],
    },
    { name: "reason", label: "Grund (intern)", type: "text", maxLength: 120 },
    { name: "publicMessage", label: "Öffentlicher Text", type: "text", maxLength: 200 },
    { name: "priority", type: "number", required: true, defaultValue: 10 },
  ],
  // 09.5E: ACUTE intervals need a READY physician baseline on every write path.
  { guard: "openingHourExceptions", lifecycle: true, validate: [acuteExceptionHook], labels: { singular: "Geänderte Öffnungszeit", plural: "Geänderte Öffnungszeiten" } },
);

export const Closures = tracked(
  "closures",
  "CLOSURE",
  [
    recordId,
    { name: "kind", label: "Art", type: "select", required: true, options: opts(["VACATION", "TRAINING", "SHORT_NOTICE", "OTHER"]) },
    localDate("startDate", "Von"),
    localDate("endDate", "Bis"),
    localDate("announceFrom", "Ankündigen ab", false),
    // 280: "Hinweis für die Website" of a planned closure (09.5C). Validation only — no schema change.
    { name: "publicMessage", label: "Öffentlicher Text", type: "text", maxLength: 280 },
    {
      name: "replacements",
      label: "Vertretungen",
      type: "array",
      fields: [
        { name: "replacementPracticeId", type: "text", required: true },
        localDate("from", "Von"),
        localDate("until", "Bis"),
        { name: "note", type: "text", maxLength: 160 },
      ],
    },
    { name: "emergencyInformationIds", type: "array", fields: [{ name: "emergencyId", type: "text", required: true }] },
  ],
  { guard: "closures", lifecycle: true, labels: { singular: "Schließung", plural: "Schließungen" } },
);

export const ReplacementPractices = tracked(
  "replacementPractices",
  "REPLACEMENT_PRACTICE",
  [
    recordId,
    { name: "practiceName", label: "Praxisname", type: "text", required: true, maxLength: 120 },
    { name: "contactPersons", label: "Ansprechpersonen", type: "array", fields: [{ name: "name", type: "text", required: true, maxLength: 80 }] },
    { name: "street", label: "Straße", type: "text", required: true },
    { name: "postalCode", label: "PLZ", type: "text", required: true },
    { name: "city", label: "Ort", type: "text", required: true },
    { name: "phone", label: "Telefon", type: "text", required: true },
    { name: "email", label: "E-Mail", type: "email" },
    { name: "website", label: "Webseite", type: "text" },
    { name: "publicNote", label: "Öffentlicher Hinweis", type: "text", maxLength: 160 },
  ],
  // 09.5G: ADMIN = structural data (always unverified afterwards), DOCTOR = confirmation of the stored data.
  { validate: [replacementGuardHook], labels: { singular: "Vertretungspraxis", plural: "Vertretungspraxen" } },
);

export const Announcements = tracked(
  "announcements",
  "ANNOUNCEMENT",
  [
    recordId,
    { name: "category", label: "Kategorie", type: "select", required: true, options: opts(["INFO", "IMPORTANT", "URGENT"]) },
    { name: "title", label: "Titel", type: "text", required: true, maxLength: ANNOUNCEMENT_TITLE_MAX },
    { name: "shortText", label: "Kurztext", type: "textarea", required: true, maxLength: ANNOUNCEMENT_TEXT_MAX },
    localDate("validFrom", "Gültig ab"),
    localDate("validUntil", "Gültig bis", false),
    { name: "openEnded", label: "Ohne Enddatum", type: "checkbox", defaultValue: false },
    { name: "priority", type: "number", required: true, defaultValue: ANNOUNCEMENT_DEFAULT_PRIORITY },
    { name: "homepageHighlight", type: "checkbox", defaultValue: false },
    { name: "published", type: "checkbox", defaultValue: false },
  ],
  // 09.5D: same ACTIVE / RETIRED lifecycle as closures and exceptions; invariants on every write path.
  { lifecycle: true, validate: [announcementShapeHook], labels: { singular: "Hinweis", plural: "Hinweise" } },
);

/** Append-only audit trail. Written only by server hooks (overrideAccess); never updated or deleted. */
export const AuditEvents: CollectionConfig = {
  slug: "auditEvents",
  labels: { singular: "Protokolleintrag", plural: "Protokoll" },
  access: ACCESS.auditEvents,
  admin: { group: "Verwaltung", useAsTitle: "entityId" },
  fields: [
    { name: "eventId", type: "text", required: true, unique: true, index: true },
    { name: "at", type: "text", required: true, index: true },
    { name: "actorId", type: "text", required: true, index: true },
    { name: "actorName", type: "text", required: true },
    { name: "actorRole", type: "text", required: true },
    { name: "entityType", type: "text", required: true, index: true },
    { name: "entityId", type: "text", required: true, index: true },
    { name: "operation", type: "text", required: true },
    { name: "publishState", type: "text", required: true },
    { name: "changeSetId", type: "text", index: true },
    { name: "revertOf", type: "text" },
    { name: "previous", type: "json" },
    { name: "next", type: "json" },
  ],
};

export const HolidayCalendar: GlobalConfig = {
  slug: "holidayCalendar",
  label: "Feiertagskalender",
  // 09.5H: ADMIN maintains the calendar; a DOCTOR only via the trusted physician policy workflow.
  access: { read: signedIn, update: adminOrDoctorHolidayPolicy },
  admin: { group: "Verwaltung" },
  hooks: { beforeChange: [holidayPolicyHook], afterChange: [globalAuditHook] },
  fields: [
    { name: "holidays", label: "Feiertage", type: "array", fields: [localDate("date", "Datum"), { name: "name", type: "text" }] },
    {
      name: "policy",
      label: "Regel",
      type: "select",
      required: true,
      defaultValue: "REQUIRE_EXPLICIT_ENTRY",
      options: opts(["REQUIRE_EXPLICIT_ENTRY", "CLOSED_ON_PUBLIC_HOLIDAYS"]),
      // The holiday policy is physician-confirmed data (09.5H: /intern/feiertage). Unconfirmed or
      // expired, the engine never treats a holiday as closed (fail-safe).
    },
    verification("policyVerification", "Bestätigung der Regel"),
  ],
};

export const COLLECTIONS: CollectionConfig[] = [Staff, WeeklySchedules, ConsultationTypes, OpeningHourExceptions, Closures, ReplacementPractices, Announcements, AuditEvents];
export const GLOBALS: GlobalConfig[] = [HolidayCalendar];
