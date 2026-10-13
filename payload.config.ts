// Payload configuration — Praxis Cockpit backend FOUNDATION (Phase 09.2).
//
// Not imported by the public app and no Payload routes are mounted: the admin UI and REST/GraphQL
// endpoints (app/(payload)/…) arrive with the production auth phase (09.3). Until then Payload is
// used only through the Local API (scripts, integration tests against a local/isolated database).
// See docs/architecture/backend-foundation.md.

import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import { COLLECTIONS, GLOBALS } from "./src/backend/collections.ts";
import { assertNoPatientFields } from "./src/backend/privacy.ts";

// Structural guard: the practice backend never stores patient data.
assertNoPatientFields(COLLECTIONS as unknown as Parameters<typeof assertNoPatientFields>[0]);

// Evaluated only when Payload itself is initialised (CLI, Local API scripts, future Payload
// routes) — the public site never imports this file. Fail loudly instead of signing sessions
// with an empty secret or silently connecting with an empty connection string.
const requireEnv = (name: "PAYLOAD_SECRET" | "DATABASE_URI"): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set (see .env.example).`);
  return value;
};

export default buildConfig({
  secret: requireEnv("PAYLOAD_SECRET"),
  db: postgresAdapter({
    pool: { connectionString: requireEnv("DATABASE_URI") },
    // Schema push only for a local development database; every shared database uses migrations.
    push: false,
    migrationDir: "./src/backend/migrations",
  }),
  admin: { user: "staff" },
  collections: COLLECTIONS,
  globals: GLOBALS,
  // No public GraphQL surface. REST is not mounted in 09.2 either.
  graphQL: { disable: true },
  telemetry: false,
  typescript: { autoGenerate: false, outputFile: "./src/backend/payload-types.ts" },
});
