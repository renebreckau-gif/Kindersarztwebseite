// Step 22 of the clean-database proof (Phase 09.6B.1): PostgreSQL outage + recovery — LAST step, because it
// stops and restarts the isolated test cluster (127.0.0.1:5433 via scripts/db-dev.ps1 — never the system
// service on 5432). A REAL standalone Payload process (scripts/probe-db-resilience.ts, no process-wide
// exception handler) and the REAL Next server of this suite must survive the outage; reads fail closed
// while the database is down; the SAME processes recover (reads, a transactional write + audit, login)
// after the restart. Artificial data only.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { join } from "node:path";
import type { Payload } from "payload";
import { BASE, EMAIL, doc, http, restLogin, skipDb, skipHttp, testPayload } from "./helpers.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const skip = skipDb || (process.platform !== "win32" ? "scripts/db-dev.ps1 (Windows dev cluster) required" : false);
const db = (cmd: "stop" | "start") => execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(ROOT, "scripts", "db-dev.ps1"), cmd], { stdio: "ignore", timeout: 60_000 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Line = Record<string, unknown> & { pid: number; event: string };
let child: ChildProcess;
let exited: { code: number | null; signal: string | null } | null = null;
let stderr = "";
const lines: Line[] = [];
/** Pending waiters: each takes its line (returns true) or leaves it for others (false). */
const waiters: ((l: Line) => boolean)[] = [];
function deliver(l: Line) {
  const i = waiters.findIndex((w) => w(l));
  if (i >= 0) waiters.splice(i, 1);
  else lines.push(l);
}
function next(event: string, timeoutMs = 60_000): Promise<Line> {
  const have = lines.findIndex((l) => l.event === event);
  if (have >= 0) return Promise.resolve(lines.splice(have, 1)[0]);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`probe: no "${event}" within ${timeoutMs} ms (exited: ${JSON.stringify(exited)}; stderr: ${stderr.slice(-400)})`)), timeoutMs);
    waiters.push((l) => {
      if (l.event !== event) return false;
      clearTimeout(t);
      resolve(l);
      return true;
    });
  });
}
const ask = (cmd: string, event = cmd) => {
  child.stdin!.write(`${cmd}\n`);
  return next(event);
};

let payload: Payload;
const PW = `Erholung-${crypto.randomUUID()}`;

describe("PostgreSQL outage and recovery (09.6B.1)", { skip }, () => {
  before(async () => {
    payload = await testPayload();
    const admin = (await payload.find({ collection: "staff", where: { role: { equals: "ADMIN" } }, limit: 1, overrideAccess: true })).docs[0];
    await payload.create({ collection: "staff", data: { email: EMAIL("RECOVERY"), password: PW, name: "Test Erholung (künstlich)", role: "STAFF", active: true }, user: admin, overrideAccess: false });
    child = spawn(process.execPath, [join(ROOT, "scripts", "probe-db-resilience.ts")], { cwd: ROOT, env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    child.on("exit", (code, signal) => (exited = { code, signal }));
    child.stderr!.on("data", (d) => (stderr += String(d)));
    createInterface({ input: child.stdout! }).on("line", (raw) => {
      let l: Line;
      try {
        l = JSON.parse(raw) as Line;
      } catch {
        return; // Payload's own log lines
      }
      deliver(l);
    });
  });
  after(async () => {
    try {
      db("start");
    } catch {
      // already running
    }
    if (child && !exited) {
      child.stdin!.write("exit\n");
      await sleep(1500);
      if (!exited) child.kill();
    }
    await payload?.destroy();
  });

  test("standalone Payload process: survives the outage, reads fail closed, the SAME process recovers (reads, write + audit)", async () => {
    const ready = await next("READY");
    const pid = ready.pid;
    assert.deepEqual([ready.query, (ready.shadow as { state: string }).state, ready.poolErrorListeners], [{ ok: true }, "OK", 1], "one pool error listener from the start");
    const reinit = await ask("reinit");
    assert.deepEqual([reinit.sameInstance, reinit.poolErrorListeners], [true, 1], "repeated getPayload(): no listener leak");
    const many = await ask("many");
    assert.equal(many.fulfilled, 4);
    assert.ok(Number(many.total) >= 2, `several pooled connections (${many.total})`);
    if (BASE) assert.equal((await http("/intern/anmelden")).status, 200, "Next backend reachable before");

    db("stop");
    await sleep(3000);
    assert.equal(exited, null, `probe process still alive after the database stopped (stderr: ${stderr.slice(-300)})`);
    const down = await ask("stats");
    assert.equal(down.pid, pid);
    assert.ok(Number(down.handled) >= 1, `background pool error(s) consumed by the handler (${down.handled})`);
    assert.equal(down.poolErrorListeners, 1, "still exactly one listener");
    const failing = await ask("read");
    assert.equal((failing.query as { ok: boolean }).ok, false, "a real query rejects while the database is down");
    assert.deepEqual(failing.shadow, { source: "PAYLOAD", state: "FAILED", hasSchedule: false, announcements: 0 }, "shadow read fails closed (fail-safe, no announcements, no static)");
    assert.ok(Number(failing.queryMs) < 10_000 && Number(failing.shadowMs) < 10_000, `bounded failure (${failing.queryMs} / ${failing.shadowMs} ms)`);
    if (BASE) {
      for (const p of ["/", "/heute", "/heute/sprechzeiten"]) assert.equal((await http(p)).status, 200, `public ${p} during the outage`);
      const intern = await http("/intern/anmelden");
      assert.ok([200, 404, 503].includes(intern.status), `backend area answers calmly (${intern.status})`);
    }

    db("start");
    let back: Line | undefined;
    for (let i = 0; i < 15 && !(back && (back.query as { ok: boolean }).ok); i++) {
      if (i) await sleep(1000);
      back = await ask("read");
    }
    assert.equal(back!.pid, pid, "same process — no restart");
    assert.deepEqual([(back!.query as { ok: boolean }).ok, (back!.shadow as { state: string }).state], [true, "OK"], "reads recover");
    const w = await ask("write");
    assert.deepEqual([w.ok, w.auditEvents], [true, 1], "transactional write + audit after recovery");
    assert.equal(exited, null);
    assert.doesNotMatch(stderr, /Uncaught|Unhandled|UnhandledPromiseRejection|postgres(ql)?:\/\/|password/i, "no unhandled error, no secrets in the log");
  });

  test("Next server of this suite: survived the outage; backend and login recover without a restart", { skip: skipHttp }, async () => {
    let ok = 0;
    for (let i = 0; i < 15 && ok !== 200; i++) {
      if (i) await sleep(1000);
      ok = (await http("/intern/anmelden")).status;
    }
    assert.equal(ok, 200);
    const login = await restLogin(EMAIL("RECOVERY"), PW);
    assert.equal(login.status, 200, "login works again");
    assert.ok(login.cookie);
    assert.equal((await http("/api/consultationTypes", { cookie: login.cookie })).status, 200, "REST reads recover");
    assert.equal(doc<{ docs: unknown[] }>((await http("/api/consultationTypes", { cookie: login.cookie })).json).docs.length >= 0, true);
  });
});
