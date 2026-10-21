// Seeds the LOCAL development database with ARTIFICIAL data only.
//
//   npm run db:seed-dev
//
// - Refuses unless DATABASE_URI points at a *_dev database on localhost.
// - Test accounts (STAFF, DOCTOR, disabled STAFF, ADMIN) use ".invalid" addresses (can never
//   receive mail) and generated passwords that are written ONLY to the git-ignored .env.local
//   (DEV_TEST_* keys) — never printed.
// - Operational test data comes from the invented lab dataset ("Praxis Beispiel A", …) and is
//   written THROUGH the test accounts, so provenance and audit are generated exactly as in real
//   use. No real practice facts, no patient data.

import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { getPayload, type Payload } from "payload";
import { createFirstAdmin } from "../src/backend/bootstrap.ts";
import { SERVER_CONTEXT } from "../src/backend/server-context.ts";
import { docsFromPulsData, announcementToDoc } from "../src/data/payload-mapping.ts";
import { initialState, pulsDataOf } from "../src/lab/cockpit/model.ts";

const uri = new URL(process.env.DATABASE_URI ?? "postgresql://missing/none");
if (!/^(127\.0\.0\.1|localhost)$/.test(uri.hostname) || !uri.pathname.endsWith("_dev")) {
  console.error("Abgebrochen: DATABASE_URI muss auf eine lokale *_dev-Datenbank zeigen.");
  process.exit(1);
}

const ACCOUNTS = [
  { key: "ADMIN", email: "verwaltung@praxis-test.invalid", name: "Test Verwaltung (künstlich)", role: "ADMIN", active: true },
  { key: "DOCTOR", email: "aerztin@praxis-test.invalid", name: "Test Ärztin (künstlich)", role: "DOCTOR", active: true },
  { key: "STAFF", email: "team@praxis-test.invalid", name: "Test Praxisteam (künstlich)", role: "STAFF", active: true },
  { key: "DISABLED", email: "deaktiviert@praxis-test.invalid", name: "Test Deaktiviert (künstlich)", role: "STAFF", active: false },
] as const;

// Generated test passwords: persisted only in .env.local.
const envFile = path.resolve(import.meta.dirname, "..", ".env.local");
const missing = ACCOUNTS.filter((a) => !process.env[`DEV_TEST_${a.key}_PASSWORD`]);
if (missing.length) {
  const lines = missing.map((a) => {
    const pw = `${randomBytes(18).toString("base64url")}-Aa1`;
    process.env[`DEV_TEST_${a.key}_PASSWORD`] = pw;
    return `DEV_TEST_${a.key}_EMAIL=${a.email}\nDEV_TEST_${a.key}_PASSWORD=${pw}`;
  });
  appendFileSync(envFile, `\n# Artificial local test accounts (scripts/seed-dev.ts). Never real people.\n${lines.join("\n")}\n`);
}
const pw = (key: string) => process.env[`DEV_TEST_${key}_PASSWORD`]!;

const { default: config } = await import("../payload.config.ts");
const payload: Payload = await getPayload({ config });

const userOf = async (email: string) => (await payload.find({ collection: "staff", where: { email: { equals: email } }, overrideAccess: true, limit: 1 })).docs[0];

try {
  if ((await payload.count({ collection: "staff", overrideAccess: true })).totalDocs === 0) {
    await createFirstAdmin(payload, { email: ACCOUNTS[0].email, name: ACCOUNTS[0].name, password: pw("ADMIN") });
  }
  const admin = await userOf(ACCOUNTS[0].email);
  for (const a of ACCOUNTS.slice(1)) {
    if (await userOf(a.email)) continue;
    await payload.create({ collection: "staff", data: { email: a.email, password: pw(a.key), name: a.name, role: a.role, active: a.active }, user: admin, overrideAccess: false });
  }
  const doctor = await userOf(ACCOUNTS[1].email);
  const staff = await userOf(ACCOUNTS[2].email);

  if ((await payload.count({ collection: "weeklySchedules", overrideAccess: true })).totalDocs === 0) {
    const data = initialState().data;
    const docs = docsFromPulsData(pulsDataOf(data));
    const as = (user: typeof admin) => ({ user, overrideAccess: false as const });
    // 09.5I: the weekly plan is written only by the physician workflows (no generic create) — the
    // artificial lab week is imported as a trusted seed with its documented (lab) provenance.
    await payload.create({ collection: "weeklySchedules", data: docs.schedule!, overrideAccess: true, context: { [SERVER_CONTEXT.SEED]: true } });
    // 09.5J: consultation types are written only by the physician workflows — imported as trusted seed.
    for (const t of docs.consultationTypes) await payload.create({ collection: "consultationTypes", data: t, overrideAccess: true, context: { [SERVER_CONTEXT.SEED]: true } });
    for (const p of docs.replacementPractices) await payload.create({ collection: "replacementPractices", data: p, ...as(doctor) });
    for (const x of docs.exceptions) await payload.create({ collection: "openingHourExceptions", data: x, ...as(staff) });
    for (const c of docs.closures) await payload.create({ collection: "closures", data: c, ...as(staff) });
    for (const a of data.announcements) await payload.create({ collection: "announcements", data: announcementToDoc(a), ...as(staff) });
  }
  const counts = await Promise.all(["staff", "weeklySchedules", "consultationTypes", "replacementPractices", "openingHourExceptions", "closures", "announcements", "auditEvents"].map(async (c) => `${c}=${(await payload.count({ collection: c as "staff", overrideAccess: true })).totalDocs}`));
  console.log(`Testdaten bereit (künstlich): ${counts.join(", ")}. Zugangsdaten nur in .env.local.`);
} finally {
  await payload.destroy();
}
process.exit(0);
