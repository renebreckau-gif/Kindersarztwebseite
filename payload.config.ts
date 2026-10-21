// Payload configuration — Praxis Cockpit backend (Phase 09.3: runtime + isolated local database).
//
// Imported only by the backend: app/(payload) (admin at /intern/admin, REST at /api), app/(intern),
// the Payload CLI (migrations) and server-side scripts/tests. The public website never imports it
// and never reads from the database (DATA_SOURCE = "STATIC").
// Reachability of /intern and /api is gated in proxy.ts (SITE_STAGE + configured database).
// See docs/architecture/backend-foundation.md.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import { COLLECTIONS, GLOBALS } from "./src/backend/collections.ts";
import { assertNoPatientFields } from "./src/backend/privacy.ts";
import { resilientPg } from "./src/backend/postgres-resilience.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Structural guard: the practice backend never stores patient data.
assertNoPatientFields(COLLECTIONS as unknown as Parameters<typeof assertNoPatientFields>[0]);

// `next build` evaluates route modules without initialising Payload. Only then are inert,
// unusable placeholders accepted (".invalid" can never resolve) so a deployment without a
// database still builds; proxy.ts keeps those routes unreachable at runtime. Everywhere else
// (CLI, scripts, tests, requests) a missing value fails loudly — no silent empty connection.
const BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
const BUILD_PLACEHOLDER = { PAYLOAD_SECRET: "build-placeholder-not-a-secret", DATABASE_URI: "postgresql://build-placeholder.invalid:5432/none" };
const requireEnv = (name: "PAYLOAD_SECRET" | "DATABASE_URI"): string => {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (BUILD_PHASE) return BUILD_PLACEHOLDER[name];
  throw new Error(`${name} is not set (see .env.example).`);
};

// Optional public origin of this deployment (e.g. http://localhost:3100). When set, cookie-based
// requests from any other origin are rejected (Payload CSRF allowlist).
const serverURL = process.env.PAYLOAD_SERVER_URL?.trim() || undefined;

export default buildConfig({
  secret: requireEnv("PAYLOAD_SECRET"),
  serverURL,
  csrf: serverURL ? [serverURL] : [],
  db: postgresAdapter({
    // 09.6B.1: node-postgres whose Pool attaches ONE `error` listener in its constructor — an idle pooled
    // connection dropped by a database outage is logged calmly instead of crashing the process
    // (documented adapter option "Optionally inject your own node-postgres"; src/backend/postgres-resilience.ts).
    pg: resilientPg,
    pool: { connectionString: requireEnv("DATABASE_URI") },
    // Never push schema automatically: every database (also local) is built from migrations.
    push: false,
    // Never create databases implicitly (the app role cannot, and must not, do so).
    disableCreateDatabase: true,
    migrationDir: path.resolve(dirname, "src/backend/migrations"),
  }),
  routes: { admin: "/intern/admin", api: "/api" },
  admin: {
    user: "staff",
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: " · Verwaltung (Testumgebung)" },
  },
  collections: COLLECTIONS,
  globals: GLOBALS,
  // No GraphQL surface (no route is mounted for it either).
  graphQL: { disable: true },
  telemetry: false,
  typescript: { autoGenerate: false, outputFile: path.resolve(dirname, "src/backend/payload-types.ts") },
});
