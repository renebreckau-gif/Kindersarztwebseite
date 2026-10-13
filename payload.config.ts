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

// Fail loudly instead of signing sessions with an empty secret.
const secret = process.env.PAYLOAD_SECRET;
if (!secret) throw new Error("PAYLOAD_SECRET is not set (see .env.example).");

export default buildConfig({
  secret,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI ?? "" },
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
