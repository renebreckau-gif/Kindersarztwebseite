// Phase 09.6B.1 — PostgreSQL resilience probe (manually invoked or spawned by the resilience test).
//
//   node scripts/probe-db-resilience.ts        (needs TEST_DATABASE_URI + PAYLOAD_SECRET; *_test on loopback only)
//
// A long-lived standalone Payload process that a controller drives over stdin, one command per line:
//   read     one real Payload query (find) + the 09.6B safe shadow read
//   many     several parallel queries (opens more than one pooled connection)
//   write    one artificial trusted write in a transaction (unpublished notice + its audit event), committed
//   stats    pid + pool counters + handled pool errors
//   reinit   getPayload() three more times (cached instance; listener count must stay 1)
//   exit
// Every answer is ONE JSON line. Never prints connection strings, passwords or data values — only
// states, counts, durations and error codes. It installs NO process-wide exception handler: if a
// pool error were unhandled, this process would die (that is what the test checks).

import { createInterface } from "node:readline";
import type { Payload } from "payload";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import { testPayload } from "../src/backend/__integration__/helpers.ts";
import { readPayloadOperationalDataSafely, type TransactionalReader } from "../src/backend/public-operational-snapshot.ts";
import { poolErrorStats } from "../src/backend/postgres-resilience.ts";
import { SERVER_CONTEXT } from "../src/backend/server-context.ts";
import { announcementToDoc } from "../src/data/payload-mapping.ts";

const say = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify({ pid: process.pid, ...o })}\n`);
const code = (e: unknown) => {
  const err = e as { code?: unknown; name?: unknown; message?: unknown } | null;
  const message = typeof err?.message === "string" ? err.message.replace(/postgres(ql)?:\/\/\S+/gi, "[uri]").slice(0, 120) : "";
  return { code: typeof err?.code === "string" ? err.code : undefined, name: typeof err?.name === "string" ? err.name : undefined, message };
};

const payload: Payload = await testPayload();
const pool = (payload.db as unknown as { pool?: import("pg").Pool }).pool;

async function read() {
  const t0 = Date.now();
  let query: Record<string, unknown>;
  try {
    await payload.find({ collection: "consultationTypes", limit: 1, depth: 0, overrideAccess: true });
    query = { ok: true };
  } catch (e) {
    query = { ok: false, ...code(e) };
  }
  const queryMs = Date.now() - t0;
  const t1 = Date.now();
  const s = await readPayloadOperationalDataSafely(payload as unknown as TransactionalReader);
  return { query, queryMs, shadow: { source: s.meta.source, state: s.meta.state, hasSchedule: Boolean(s.puls.schedule), announcements: s.announcements.length }, shadowMs: Date.now() - t1 };
}

async function write() {
  const req = await createLocalReq({ context: { [SERVER_CONTEXT.SEED]: true } }, payload);
  const t0 = Date.now();
  try {
    await initTransaction(req);
    const id = `probe-${Date.now()}`;
    // An UNPUBLISHED artificial notice: never public, no operational effect — only proves write + audit.
    const notice = { id, category: "INFO" as const, title: "Probe (künstlich)", shortText: "Technischer Erholungstest.", validFrom: "2030-01-07", validUntil: "2030-01-08", priority: 9, homepageHighlight: false, published: false, verification: { status: "TO_BE_CONFIRMED" as const, sourceIds: [] } };
    await payload.create({ collection: "announcements", data: announcementToDoc(notice as never) as never, overrideAccess: true, req, context: req.context });
    await commitTransaction(req);
    const audit = await payload.count({ collection: "auditEvents", where: { entityId: { equals: id } }, overrideAccess: true });
    return { ok: true, auditEvents: audit.totalDocs, ms: Date.now() - t0 };
  } catch (e) {
    await killTransaction(req);
    return { ok: false, ...code(e), ms: Date.now() - t0 };
  }
}

const stats = () => ({ poolErrorListeners: pool?.listenerCount("error") ?? null, total: pool?.totalCount ?? null, idle: pool?.idleCount ?? null, waiting: pool?.waitingCount ?? null, handled: pool ? poolErrorStats(pool).handled : null });

say({ event: "READY", ...(await read()), ...stats() });
for await (const line of createInterface({ input: process.stdin })) {
  const cmd = line.trim();
  if (cmd === "read") say({ event: "read", ...(await read()), ...stats() });
  else if (cmd === "many") {
    const res = await Promise.allSettled(Array.from({ length: 4 }, () => payload.find({ collection: "auditEvents", limit: 1, depth: 0, overrideAccess: true })));
    say({ event: "many", fulfilled: res.filter((x) => x.status === "fulfilled").length, ...stats() });
  } else if (cmd === "write") say({ event: "write", ...(await write()), ...stats() });
  else if (cmd === "stats") say({ event: "stats", ...stats() });
  else if (cmd === "reinit") {
    const again = [await testPayload(), await testPayload(), await testPayload()];
    say({ event: "reinit", sameInstance: again.every((p) => p === payload), ...stats() });
  }
  else if (cmd === "exit") {
    await payload.destroy();
    say({ event: "bye" });
    process.exit(0);
  }
}
