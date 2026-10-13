// Availability gate for the internal backend routes (/intern, /intern/admin, /api).
// Pure and edge-safe: used by proxy.ts before any Payload module is evaluated.
//
// Internal routes exist only while SITE_STAGE allows staging tools AND a database is
// configured for this deployment. Without a database (e.g. Vercel staging today) they answer
// 404 instead of failing — the public website never depends on the backend.

import { stageAllowsReview, type SiteStage } from "../content/release.ts";

type Env = Record<string, string | undefined>;

export const backendConfigured = (env: Env): boolean => Boolean(env.DATABASE_URI?.trim() && env.PAYLOAD_SECRET?.trim());

export const internAvailable = (stage: SiteStage, env: Env): boolean => stageAllowsReview(stage) && backendConfigured(env);

/** Paths served by the backend (custom intern shell, Payload admin, Payload REST). */
export const isBackendPath = (pathname: string): boolean => /^\/(intern|api)(\/|$)/.test(pathname);

/**
 * Payload's built-in first-user registration (admin view + REST endpoint). Always 404: the only
 * way to create the first ADMIN is scripts/bootstrap-admin.ts. (staffCreateGuard additionally
 * rejects such a write server-side.)
 */
export const isClosedRegistrationPath = (pathname: string): boolean => /^\/intern\/admin\/create-first-user\/?$|^\/api\/staff\/first-register\/?$/.test(pathname.toLowerCase());