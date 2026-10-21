// Phase 09.6B.1 — PostgreSQL pool error handler (no database). The real outage / recovery proof with a
// standalone process and the Next server is integration step 26 (22-db-resilience.test.ts).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { POOL_ERROR_MESSAGE, installPostgresPoolErrorHandler, poolErrorStats, resilientPg } from "../postgres-resilience.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SECRET_URI = "postgresql://kinderarzt_app:geheimesPasswort123@127.0.0.1:5433/kinderarzt_staging_test";

describe("pool error handler", () => {
  test("exactly one listener per pool, however often it is installed; separate pools each get their own", () => {
    const a = new EventEmitter();
    const b = new EventEmitter();
    const logs: unknown[] = [];
    assert.equal(installPostgresPoolErrorHandler(a, (e) => logs.push(e)), true);
    assert.equal(installPostgresPoolErrorHandler(a, (e) => logs.push(e)), false);
    for (let i = 0; i < 20; i++) installPostgresPoolErrorHandler(a);
    assert.equal(a.listenerCount("error"), 1);
    installPostgresPoolErrorHandler(b, () => {});
    assert.deepEqual([a.listenerCount("error"), b.listenerCount("error")], [1, 1]);
  });

  test("a background pool error is consumed: no throw, counted, logged calmly with the code only — never secrets", () => {
    const pool = new EventEmitter();
    const logs: Record<string, unknown>[] = [];
    installPostgresPoolErrorHandler(pool, (e) => logs.push(e));
    const err = Object.assign(new Error(`terminating connection due to administrator command (${SECRET_URI})`), { code: "57P01", client: { connectionParameters: { password: "geheimesPasswort123" } } });
    assert.doesNotThrow(() => pool.emit("error", err));
    pool.emit("error", new Error("Connection terminated unexpectedly"));
    assert.equal(poolErrorStats(pool).handled, 2);
    assert.deepEqual(logs, [{ level: "warn", msg: POOL_ERROR_MESSAGE, code: "57P01" }, { level: "warn", msg: POOL_ERROR_MESSAGE }]);
    assert.doesNotMatch(JSON.stringify(logs), /geheim|postgres(ql)?:\/\/|5433|kinderarzt/);
  });

  test("without the handler the same event would throw (the 09.6B failure mode)", () => {
    assert.throws(() => new EventEmitter().emit("error", new Error("Connection terminated unexpectedly")));
  });

  test("query errors are NOT swallowed: the handler only listens to the pool event", async () => {
    const pool = new EventEmitter();
    installPostgresPoolErrorHandler(pool, () => {});
    const query = () => Promise.reject(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }));
    await assert.rejects(query(), /ECONNREFUSED/);
    assert.equal(poolErrorStats(pool).handled, 0);
  });

  test("resilientPg: the Pool installs the handler in its constructor (no connection is opened); everything else is pg", async () => {
    const pool = new resilientPg.Pool({ connectionString: "postgresql://build-placeholder.invalid:5432/none" });
    assert.ok(pool instanceof pg.Pool);
    assert.equal(pool.listenerCount("error"), 1);
    assert.deepEqual([poolErrorStats(pool as never).installed, pool.totalCount], [true, 0], "no connection at construction");
    assert.equal(resilientPg.Client, pg.Client);
    assert.equal(resilientPg.types, pg.types);
    await pool.end();
  });
});

describe("wiring and guards", () => {
  test("payload.config.ts injects resilientPg through the documented adapter option; no pool tuning", () => {
    const cfg = readFileSync(join(ROOT, "payload.config.ts"), "utf8");
    assert.match(cfg, /postgresAdapter\(\{[\s\S]*pg: resilientPg,[\s\S]*pool: \{ connectionString: requireEnv\("DATABASE_URI"\) \}/);
    assert.doesNotMatch(cfg, /idleTimeoutMillis|connectionTimeoutMillis|max:|maxUses|maxLifetimeSeconds|transactionOptions/);
  });

  test("no process-wide exception swallowing and no process.exit in application code", () => {
    const files = (dir: string): string[] =>
      readdirSync(join(ROOT, dir)).flatMap((n) => {
        const p = join(dir, n);
        if (n === "__tests__" || n === "__integration__" || n === "node_modules") return [];
        return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
      });
    for (const f of [...files("src"), ...files("app"), "payload.config.ts"]) {
      const src = readFileSync(join(ROOT, f), "utf8");
      assert.doesNotMatch(src, /process\.on\(\s*["'](uncaughtException|unhandledRejection)/, f);
      assert.doesNotMatch(src, /process\.exit\(/, f);
    }
  });
});
