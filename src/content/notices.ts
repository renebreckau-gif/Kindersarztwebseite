// Emergency information and notices — filtered by the domain publication rules.

import type { Announcement, EmergencyInformation } from "../domain/content-types.ts";
import { decideAnnouncement, selectPublicEmergency } from "../domain/publication.ts";
import { UNCONFIRMED } from "./practice.ts";

const EMERGENCY_112 = {
  status: "VERIFIED_CURRENT" as const,
  lastVerified: "2026-10-07",
  reviewDue: "2027-04-07",
  verifiedBy: "Projektrecherche (F56) – bundesweite Notrufnummer",
  sourceIds: ["S01"],
};

export const EMERGENCY: EmergencyInformation[] = [
  {
    id: "112",
    type: "IMMEDIATE_EMERGENCY",
    name: "Notruf",
    whenToUse: "Bei Lebensgefahr",
    phone: "112",
    availability: { always: true },
    priority: 1,
    publicVisible: true,
    verification: EMERGENCY_112, // F56 — always rendered (R7)
  },
  // F58–F65 (Giftnotruf, local KV on-call practices, clinics, pharmacies) stay
  // TO_BE_CONFIRMED: kept as records, omitted by `selectPublicEmergency` until verified.
  // F57 — 116117 is a nationwide official service fact, not a practice fact: verified
  // against the official source (KBV_116117) on 2026-10-07. Nothing practice-specific is
  // derived from it. Short review interval because emergency data has no grace period.
  {
    id: "116117",
    type: "MEDICAL_ON_CALL",
    name: "Ärztlicher Bereitschaftsdienst",
    description: "Deutschlandweit, ohne Vorwahl, rund um die Uhr. Der Anruf ist kostenfrei.",
    whenToUse: "Wenn die Praxis geschlossen ist und es nicht bis zum nächsten Praxistag warten kann – nicht bei Lebensgefahr.",
    phone: "116117",
    availability: { always: true, text: "24 Stunden am Tag, 7 Tage die Woche" },
    sourceUrl: "https://www.116117.de/de/aerztlicher-bereitschaftsdienst.php",
    priority: 2,
    publicVisible: true,
    verification: {
      status: "VERIFIED_CURRENT",
      lastVerified: "2026-10-07",
      reviewDue: "2027-01-07",
      verifiedBy: "Projektprüfung der offiziellen Quelle 116117.de (Phase 08)",
      sourceIds: ["KBV_116117"],
    },
  },
  { id: "giftnotruf", type: "POISON_CONTROL", name: "Giftnotruf", whenToUse: "Bei Verdacht auf Vergiftung", priority: 3, publicVisible: true, verification: UNCONFIRMED },
];

export const publicEmergency = (today: string) => selectPublicEmergency(EMERGENCY, today);

/**
 * Notices. The 2026 summer closure (F50–F52) is OUTDATED_DO_NOT_PUBLISH and stays
 * here only to prove the filter: it never renders.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "urlaub-sommer-2026",
    category: "IMPORTANT",
    title: "Praxisurlaub",
    shortText: "Die Praxis ist vom 20.07. bis 07.08.2026 geschlossen.",
    validFrom: "2026-07-01",
    validUntil: "2026-08-07",
    priority: 1,
    homepageHighlight: true,
    published: true,
    verification: { status: "OUTDATED_DO_NOT_PUBLISH", sourceIds: ["S01"] },
  },
];

export const activeAnnouncements = (today: string) =>
  ANNOUNCEMENTS.filter((a) => decideAnnouncement(a, today).visible).sort((a, b) => a.priority - b.priority);
