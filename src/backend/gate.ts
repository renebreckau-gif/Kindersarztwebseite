// Availability gate for the internal backend routes (/intern, /intern/admin, /api).
// Pure and edge-safe: used by proxy.ts before any Payload module is evaluated.
//
// Internal routes exist only where the REAL staff portal is available: a database is configured
// AND (STAGING, or PRODUCTION with RELEASE.staffPortalProductionEnabled). The same decision drives
// the footer entry /mitarbeiter (staffPortalAvailable), so the two can never contradict each other.
// Without a database (e.g. Vercel staging today) the routes answer 404 instead of failing — the
// public website never depends on the backend. The lab prototype and /review are NOT governed here
// (stageAllowsReview).

import { RELEASE, staffPortalAvailable, type SiteStage } from "../content/release.ts";
import { backendConfigured } from "../content/staff-entry.ts";

export { backendConfigured };

type Env = Record<string, string | undefined>;

export const internAvailable = (stage: SiteStage, env: Env, release: { staffPortalProductionEnabled: boolean } = RELEASE): boolean =>
  staffPortalAvailable(stage, backendConfigured(env), release);

/** Paths served by the backend (custom intern shell, Payload admin, Payload REST). */
export const isBackendPath = (pathname: string): boolean => /^\/(intern|api)(\/|$)/.test(pathname);

/**
 * Payload's built-in first-user registration (admin view + REST endpoint). Always 404: the only
 * way to create the first ADMIN is scripts/bootstrap-admin.ts. (staffCreateGuard additionally
 * rejects such a write server-side.)
 */
export const isClosedRegistrationPath = (pathname: string): boolean => /^\/intern\/admin\/create-first-user\/?$|^\/api\/staff\/first-register\/?$/.test(pathname.toLowerCase());