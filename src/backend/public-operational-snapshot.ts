// Payload SHADOW reader of the public operational snapshot (Phase 09.6B) — tests / internal diagnostics
// ONLY. Never imported by public frontend code; the public site stays STATIC (src/data/public-operational.ts).
//
// Consistency: PulsData AND announcements are read inside ONE PostgreSQL transaction opened with
// `isolation level repeatable read read only` — one snapshot for every Local API read, so a cockpit
// transaction committing in between can never produce a mixed result (proven against PostgreSQL in
// integration step 3). Uses only documented / typed Payload surface: `payload.db.beginTransaction(options)`
// (options = drizzle PgTransactionConfig in the installed @payloadcms/drizzle), the transaction id carried
// on `req.transactionID`, `commitTransaction` / `rollbackTransaction`. The adapter's global
// `transactionOptions` (used by every cockpit WRITE) is untouched.

import { failedOperationalSnapshot, type PublicOperationalSnapshot } from "../data/public-operational.ts";
import { PayloadPracticeRepository, type PayloadReader } from "./payload-repository.ts";

/** The read snapshot's transaction settings — fixed here, never taken from input. */
export const SNAPSHOT_TRANSACTION = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

type TransactionId = string | number;
export interface TransactionalReader extends PayloadReader {
  db: {
    beginTransaction(options?: Record<string, unknown>): Promise<TransactionId | null>;
    commitTransaction(id: TransactionId): Promise<void>;
    rollbackTransaction(id: TransactionId): Promise<void>;
  };
}

/**
 * Run `read` inside one REPEATABLE READ, READ ONLY transaction and close it in every case (commit on
 * success, rollback on failure). No transaction → refuse (never silently fall back to per-statement
 * READ COMMITTED reads).
 */
export async function withConsistentRead<T>(payload: TransactionalReader, read: (req: { transactionID: TransactionId }) => Promise<T>): Promise<T> {
  const id = await payload.db.beginTransaction({ ...SNAPSHOT_TRANSACTION });
  if (id === null || id === undefined) throw new Error("Konsistentes Lesen nicht möglich: keine Datenbanktransaktion.");
  try {
    const out = await read({ transactionID: id });
    await payload.db.commitTransaction(id);
    return out;
  } catch (e) {
    try {
      await payload.db.rollbackTransaction(id);
    } catch {
      // the original error wins; the session is gone either way
    }
    throw e;
  }
}

/** The complete operational snapshot from Payload — one consistent read; throws on ANY failure. */
export async function readPayloadOperationalSnapshot(payload: TransactionalReader, now: Date = new Date()): Promise<PublicOperationalSnapshot> {
  return withConsistentRead(payload, async (req) => {
    const repo = new PayloadPracticeRepository(payload, req);
    const puls = await repo.getPulsData();
    const announcements = await repo.getAnnouncements();
    return { puls, announcements, meta: { source: "PAYLOAD", state: "OK", readAt: now.toISOString() } };
  });
}

/**
 * Fail-closed wrapper: any failure (connection, part of the snapshot, transaction) → the WHOLE snapshot is
 * FAILED: FAIL_SAFE_PULS_DATA (engine UNKNOWN) and no announcements — never PULS_DATA / ANNOUNCEMENTS.
 * Keeps no state: the next call reads again (recovery without restart).
 */
export async function readPayloadOperationalDataSafely(payload: TransactionalReader, now: Date = new Date()): Promise<PublicOperationalSnapshot> {
  try {
    return await readPayloadOperationalSnapshot(payload, now);
  } catch {
    return failedOperationalSnapshot("PAYLOAD", now);
  }
}
