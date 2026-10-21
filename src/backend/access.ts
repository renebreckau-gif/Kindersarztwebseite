// Server-side access rules for the Payload collections (pure functions, testable without Payload).
// UI hiding is never the only protection. No role gets a bypass around server validation.

import { STAFF_ROLES, type StaffRole } from "../domain/governance.ts";
import { isHolidayPolicyWrite, replacementVerifyMode } from "./server-context.ts";

/** Minimal shape of the authenticated Payload user (the `staff` auth collection). */
export interface StaffUserLike {
  id?: string | number;
  role?: string | null;
  active?: boolean | null;
}
type ArgsLike = { req: { user?: StaffUserLike | null; context?: Record<string, unknown> } };

/** Role of an active, signed-in staff account — or null (signed out, disabled, unknown role). */
export function activeRole(user: StaffUserLike | null | undefined): StaffRole | null {
  if (!user || user.active === false) return null;
  return STAFF_ROLES.includes(user.role as StaffRole) ? (user.role as StaffRole) : null;
}

export const signedIn = ({ req }: ArgsLike) => activeRole(req.user) !== null;
export const doctorOnly = ({ req }: ArgsLike) => activeRole(req.user) === "DOCTOR";
export const doctorOrAdmin = ({ req }: ArgsLike) => ["DOCTOR", "ADMIN"].includes(activeRole(req.user) ?? "");
export const adminOnly = ({ req }: ArgsLike) => activeRole(req.user) === "ADMIN";
/**
 * 09.5G replacement directory: ADMIN writes structural data; a DOCTOR may update ONLY through the
 * trusted server verification workflow (server context, never reachable over HTTP) — so a generic
 * REST write by a DOCTOR can never create verified data with browser-chosen content.
 */
/**
 * 09.5H holiday calendar (global): ADMIN maintains the calendar structurally; a DOCTOR may write ONLY
 * through the trusted physician policy workflow (server context) — never a generic REST update.
 */
export const adminOrDoctorHolidayPolicy = ({ req }: ArgsLike) => {
  const role = activeRole(req.user);
  return role === "ADMIN" || (role === "DOCTOR" && isHolidayPolicyWrite(req.context));
};

export const adminOrDoctorVerification = ({ req }: ArgsLike) => {
  const role = activeRole(req.user);
  return role === "ADMIN" || (role === "DOCTOR" && replacementVerifyMode(req.context) !== undefined);
};
/** History is kept: operational records are ended or replaced, never deleted through the API. */
export const never = () => false;

/** Staff accounts: admins manage; everyone else may read/update only their own record. */
export const adminOrSelf = ({ req, id }: ArgsLike & { id?: string | number }) => {
  const role = activeRole(req.user);
  if (role === "ADMIN") return true;
  return role !== null && id !== undefined && String(req.user?.id) === String(id);
};

/**
 * Collection access matrix (docs/architecture/backend-foundation.md §8).
 * Writes additionally pass the provenance hook (who may CONFIRM what) and the publish guard.
 */
export const ACCESS = {
  staff: { read: adminOrSelf, create: adminOnly, update: adminOrSelf, delete: never },
  weeklySchedules: { read: signedIn, create: doctorOnly, update: doctorOnly, delete: never },
  consultationTypes: { read: signedIn, create: doctorOnly, update: doctorOnly, delete: never },
  openingHourExceptions: { read: signedIn, create: signedIn, update: signedIn, delete: never },
  closures: { read: signedIn, create: signedIn, update: signedIn, delete: never },
  // ADMIN enters / corrects directory data (stays unverified); DOCTOR confirms it — only via the
  // trusted verification workflow (09.5G). Nobody deletes.
  replacementPractices: { read: signedIn, create: adminOnly, update: adminOrDoctorVerification, delete: never },
  announcements: { read: signedIn, create: signedIn, update: signedIn, delete: never },
  // Append-only: written by server hooks with overrideAccess only.
  auditEvents: { read: doctorOrAdmin, create: never, update: never, delete: never },
} as const;

export type AccessCollection = keyof typeof ACCESS;
