// Staff entry ("Mitarbeiterbereich"): the stable, human entry point for the practice team.
//
// PUBLIC WEBSITE → footer "Mitarbeiterbereich" → /mitarbeiter → the right cockpit.
// /mitarbeiter stays the permanent footer destination; the implementation routes behind it
// (/lab/…, /intern/…) may change. The footer placement is a UX choice for a staff-only tool —
// it is NOT a security mechanism. Security is authentication + roles + server-side access.
//
// /review is something else: project review tooling for developers and reviewers.

import { RELEASE, staffPortalAvailable, type SiteStage } from "./release.ts";

export const STAFF_ENTRY = { label: "Mitarbeiterbereich", href: "/mitarbeiter" } as const;

type Env = Record<string, string | undefined>;

/** A real backend (database + secret) is configured for this deployment. */
export const backendConfigured = (env: Env): boolean => Boolean(env.DATABASE_URI?.trim() && env.PAYLOAD_SECRET?.trim());

export interface StaffEntryAction {
  id: "PROTOTYPE" | "BACKEND";
  /** Card title. */
  title: string;
  /** What the user gets — shown under the title so nobody has to guess. */
  tag: string;
  label: string;
  href: string;
}

export const PROTOTYPE_ACTION: StaffEntryAction = {
  id: "PROTOTYPE",
  title: "Praxis Cockpit Prototyp",
  tag: "Testdaten · vollständige Workflow-Vorschau",
  label: "Praxis Cockpit öffnen",
  href: "/lab/praxis-cockpit/anmelden",
};

export const BACKEND_ACTION: StaffEntryAction = {
  id: "BACKEND",
  title: "Backend-Test",
  tag: "Echte Anmeldung · Datenbank-Testumgebung",
  label: "Echte Backend-Anmeldung",
  href: "/intern/anmelden",
};

/**
 * What /mitarbeiter offers.
 * STAGING:    prototype always (works without any backend); real login only where a database is configured.
 * PRODUCTION: the real login only — and only when the staff portal is released for production
 *             (RELEASE.staffPortalProductionEnabled, the SAME decision the request gate uses).
 *             The lab prototype is never offered. Otherwise: no action (calm "nicht verfügbar").
 */
export function staffEntryActions(stage: SiteStage, backend: boolean, release: { staffPortalProductionEnabled: boolean } = RELEASE): StaffEntryAction[] {
  const portal = staffPortalAvailable(stage, backend, release);
  if (stage === "PRODUCTION") return portal ? [{ ...BACKEND_ACTION, title: "Praxis Cockpit", tag: "Anmeldung für das Praxisteam", label: "Anmelden" }] : [];
  return portal ? [PROTOTYPE_ACTION, BACKEND_ACTION] : [PROTOTYPE_ACTION];
}

/** The quiet test-environment note on /mitarbeiter (never in PRODUCTION). */
export const stagingNote = (stage: SiteStage): string | null => (stage === "STAGING" ? "Testumgebung · keine echten Daten" : null);
