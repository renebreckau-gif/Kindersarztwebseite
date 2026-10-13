// Server-side session lookup for /intern — Payload auth (HttpOnly cookie, server-side session).
// The role is read from the database-backed user, never from the browser. A database outage is
// reported as UNAVAILABLE (calm page), never as a crash and never as "signed in".

import config from "@payload-config";
import { headers } from "next/headers";
import pg from "pg";
import { getPayload } from "payload";
import { activeRole } from "@/backend/access";
import type { StaffRole } from "@/domain/governance";

export interface InternStaff {
  id: string;
  name: string;
  role: StaffRole;
}

export type InternSession = { state: "SIGNED_IN"; staff: InternStaff } | { state: "SIGNED_OUT" } | { state: "UNAVAILABLE" };

let payloadStarted = false;

/**
 * Before Payload is initialised in this process, probe the database with a short, separate
 * connection. Payload is started only when the database answers — a failed first initialisation
 * would otherwise stay cached in the adapter until the process restarts.
 */
async function databaseReachable(): Promise<boolean> {
  if (payloadStarted) return true;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URI, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function internSession(): Promise<InternSession> {
  try {
    if (!(await databaseReachable())) return { state: "UNAVAILABLE" };
    const payload = await getPayload({ config });
    payloadStarted = true;
    // Reachability check: Payload's auth treats a failed session lookup as "signed out".
    await payload.count({ collection: "staff", overrideAccess: true });
    const { user } = await payload.auth({ headers: await headers() });
    if (!user || user.collection !== "staff") return { state: "SIGNED_OUT" };
    const role = activeRole(user as { role?: string | null; active?: boolean | null });
    if (!role) return { state: "SIGNED_OUT" };
    return { state: "SIGNED_IN", staff: { id: String(user.id), name: String((user as { name?: string }).name ?? ""), role } };
  } catch {
    return { state: "UNAVAILABLE" };
  }
}
