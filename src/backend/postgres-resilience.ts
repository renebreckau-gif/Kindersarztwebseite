// PostgreSQL pool resilience (Phase 09.6B.1) — infrastructure, not request logic.
//
// Failure mode (node-postgres / pg-pool 8.x): an IDLE pooled client whose connection is terminated
// (database stopped, restarted, network cut) emits `error`; pg-pool's idle listener removes the client
// and re-emits the error on the POOL (`pool.emit("error", err, client)`). A pool without an `error`
// listener makes EventEmitter throw → uncaught exception → a standalone Node process dies.
//
// Fix: exactly ONE `error` listener per pool, attached when the pool is constructed. It logs calmly
// (error code only — never the connection string, credentials or config) and does NOT rethrow, does NOT
// exit the process and does NOT retry: the pool has already dropped the dead client; the next query
// opens a new connection. Query errors are untouched — they still reject (this is a pool EVENT handler,
// not a promise handler), so fail-safe readers keep failing closed.
//
// Wiring: payload.config.ts injects `resilientPg` through the documented `postgresAdapter({ pg })` option
// ("Optionally inject your own node-postgres"); the adapter creates its pools with `new pg.Pool(...)`.

import type { Pool } from "pg";
import type { postgresAdapter } from "@payloadcms/db-postgres";
import pg from "pg";

export interface PoolLike {
  on(event: "error", listener: (err: Error) => void): unknown;
  listenerCount(event: "error"): number;
}

export const POOL_ERROR_MESSAGE = "PostgreSQL-Verbindung im Pool wurde unterbrochen.";

type Log = (entry: { level: "warn"; msg: string; code?: string }) => void;
const defaultLog: Log = (entry) => console.warn(JSON.stringify(entry));

const installed = new WeakMap<PoolLike, { handled: number }>();

/** Attach the pool error handler once (idempotent per pool). Returns true when newly installed. */
export function installPostgresPoolErrorHandler(pool: PoolLike, log: Log = defaultLog): boolean {
  if (installed.has(pool)) return false;
  const state = { handled: 0 };
  installed.set(pool, state);
  pool.on("error", (err) => {
    state.handled++;
    const raw = (err as unknown as { code?: unknown } | null)?.code;
    const code = typeof raw === "string" ? raw : undefined;
    log({ level: "warn", msg: POOL_ERROR_MESSAGE, ...(code ? { code } : {}) });
  });
  return true;
}

/** Diagnostics: whether the handler is installed and how many background pool errors it consumed. */
export function poolErrorStats(pool: PoolLike): { installed: boolean; handled: number } {
  const s = installed.get(pool);
  return { installed: Boolean(s), handled: s?.handled ?? 0 };
}

/** Pool that installs the handler in its constructor — before any connection exists. */
class ResilientPool extends pg.Pool {
  constructor(config?: ConstructorParameters<typeof pg.Pool>[0]) {
    super(config);
    installPostgresPoolErrorHandler(this as unknown as Pool);
  }
}

/** The adapter's own `pg` option type (it bundles a newer @types/pg than the project; the runtime pg is one 8.20.0). */
type AdapterPg = NonNullable<Parameters<typeof postgresAdapter>[0]["pg"]>;

/** node-postgres with the resilient Pool, for `postgresAdapter({ pg: resilientPg })`. Everything else is pg itself. */
export const resilientPg = Object.assign(Object.create(pg) as typeof pg, { Pool: ResilientPool }) as unknown as AdapterPg;
