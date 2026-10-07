// Emergency information and notices — filtered by the domain publication rules.

import type { Announcement, EmergencyInformation } from "@/domain/content-types.ts";
import { decideAnnouncement, selectPublicEmergency } from "@/domain/publication.ts";
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
  // F57–F65 are TO_BE_CONFIRMED: kept as records so they appear automatically once
  // verified, but `selectPublicEmergency` omits them today.
  { id: "116117", type: "MEDICAL_ON_CALL", name: "Ärztlicher Bereitschaftsdienst", whenToUse: "Außerhalb der Sprechzeiten, wenn es nicht bis zum nächsten Praxistag warten kann", phone: "116117", priority: 2, publicVisible: true, verification: UNCONFIRMED },
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
