// Deterministic publication rules (docs/architecture/content-governance.md §3).
// Returns what the public may see and what the editor should be told — in German.

import type { Announcement, Doctor, EmergencyInformation, TeamMember } from "./content-types.ts";
import type { FactVerification, FreshnessCategory } from "./verification.ts";
import { evaluateFreshness } from "./verification.ts";
import type { LocalDate } from "./time.ts";
import { compareDates, daysBetween } from "./time.ts";
import type { PulsData } from "./practice-status.ts";

export type PublicationMode = "PUBLIC" | "PUBLIC_WITH_WARNING" | "FALLBACK" | "BLOCKED";

export interface PublicationDecision {
  mode: PublicationMode;
  visible: boolean;
  /** German, plain-language messages for the editor view. Never shown publicly. */
  editorMessages: string[];
}

const deDate = (d: LocalDate) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

/**
 * Generic decision from verification + freshness.
 * - OUTDATED → BLOCKED (never public)
 * - TO_BE_CONFIRMED → FALLBACK (not public as fact; slot renders its fallback)
 * - REVIEW_DUE (stale but not contradicted, within grace) → PUBLIC_WITH_WARNING
 * - REVIEW_EXPIRED → FALLBACK for high-risk categories
 */
export function decidePublication(v: FactVerification | undefined, category: FreshnessCategory, today: LocalDate): PublicationDecision {
  const f = evaluateFreshness(v, today, category);
  switch (f) {
    case "CURRENT":
      return { mode: "PUBLIC", visible: true, editorMessages: [] };
    case "REVIEW_DUE":
      return {
        mode: "PUBLIC_WITH_WARNING",
        visible: true,
        editorMessages: [`Prüfung fällig seit ${deDate(v!.reviewDue!)}. Bitte Angaben bestätigen.`],
      };
    case "REVIEW_EXPIRED":
      return {
        mode: "FALLBACK",
        visible: false,
        editorMessages: [`Nicht mehr öffentlich: Die Prüfung ist seit ${deDate(v!.reviewDue!)} überfällig.`],
      };
    case "UNVERIFIED":
      return { mode: "FALLBACK", visible: false, editorMessages: ["Noch nicht bestätigt – wird öffentlich nicht als Tatsache angezeigt."] };
    case "OUTDATED":
      return { mode: "BLOCKED", visible: false, editorMessages: ["Als veraltet markiert – wird nie veröffentlicht."] };
  }
}

export function decideAnnouncement(a: Announcement, today: LocalDate): PublicationDecision {
  const base = decidePublication(a.verification, "editorial", today);
  if (base.mode === "BLOCKED") return base;
  if (a.verification.status !== "VERIFIED_CURRENT") return base;
  if (!a.published) return { mode: "BLOCKED", visible: false, editorMessages: ["Entwurf – nicht veröffentlicht."] };
  if (compareDates(today, a.validFrom) < 0) {
    return { mode: "BLOCKED", visible: false, editorMessages: [`Wird ab ${deDate(a.validFrom)} angezeigt.`] };
  }
  if (a.validUntil !== "OPEN_ENDED" && compareDates(today, a.validUntil) > 0) {
    return { mode: "BLOCKED", visible: false, editorMessages: [`Abgelaufen am ${deDate(a.validUntil)} – wird nicht mehr angezeigt.`] };
  }
  const msg =
    a.validUntil === "OPEN_ENDED"
      ? "Diese Meldung hat kein Enddatum. Bitte regelmäßig prüfen."
      : `Diese Meldung endet automatisch am ${deDate(a.validUntil)}.`;
  return { ...base, editorMessages: [...base.editorMessages, msg] };
}

export function decidePerson(p: Doctor | TeamMember, today: LocalDate): PublicationDecision {
  if (!p.active) return { mode: "BLOCKED", visible: false, editorMessages: ["Nicht mehr aktiv – wird nicht als aktuelles Team angezeigt."] };
  const consent = p.publicationConsent;
  if (consent.verification.status !== "VERIFIED_CURRENT" || consent.value !== true) {
    return { mode: "BLOCKED", visible: false, editorMessages: ["Einwilligung zur Veröffentlichung fehlt oder ist nicht bestätigt."] };
  }
  return decidePublication(p.verification, "person", today);
}

export function decideEmergency(e: EmergencyInformation, today: LocalDate): PublicationDecision {
  if (!e.publicVisible) return { mode: "BLOCKED", visible: false, editorMessages: ["Öffentlich ausgeblendet."] };
  const d = decidePublication(e.verification, "emergency", today);
  const last = e.verification.lastVerified;
  if (last) {
    const age = daysBetween(last, today);
    if (age >= 90) d.editorMessages.push(`Diese Notfallinformation wurde seit ${age} Tagen nicht geprüft.`);
  }
  return d;
}

export function selectPublicEmergency(list: EmergencyInformation[], today: LocalDate): EmergencyInformation[] {
  return list.filter((e) => decideEmergency(e, today).visible).sort((a, b) => a.priority - b.priority);
}

export function replacementEditorMessage(v: FactVerification, today: LocalDate): string | null {
  const d = decidePublication(v, "replacementPractice", today);
  return d.visible ? null : "Diese Vertretungspraxis muss erneut bestätigt werden.";
}

/** Editor hint when acute rules exist but cannot be published. */
export function acuteEditorMessage(data: PulsData, today: LocalDate): string | null {
  const acuteRules = data.schedule?.rules.filter((r) => r.consultationType === "ACUTE") ?? [];
  if (acuteRules.length === 0) return null;
  const type = data.consultationTypes.find((t) => t.code === "ACUTE");
  const typeOk = !!type && decidePublication(type.verification, "consultationType", today).visible;
  const rulesOk = acuteRules.every((r) => decidePublication(r.verification, "openingHours", today).visible);
  return typeOk && rulesOk
    ? null
    : "Akutsprechstunden können nicht veröffentlicht werden, weil die Zeiten noch nicht bestätigt sind.";
}
