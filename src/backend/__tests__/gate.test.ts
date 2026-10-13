// Phase 09.3 — availability gate, closed first-user registration, bootstrap input rules,
// staff guards (pure, no database).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendConfigured, internAvailable, isBackendPath, isClosedRegistrationPath } from "../gate.ts";
import { bootstrapInputProblems } from "../bootstrap.ts";
import { staffCreateGuard, staffOperationGuard } from "../hooks.ts";
import { SERVER_CONTEXT } from "../server-context.ts";

const DB = { DATABASE_URI: "postgresql://x@127.0.0.1:5433/db", PAYLOAD_SECRET: "s" };
const ROOT = join(import.meta.dirname, "..", "..", "..");
type Hook = (a: Record<string, unknown>) => unknown;

describe("backend availability gate (proxy.ts)", () => {
  test("only STAGING with a configured database exposes /intern and /api", () => {
    assert.equal(internAvailable("STAGING", DB), true);
    assert.equal(internAvailable("PRODUCTION", DB), false);
    assert.equal(internAvailable("STAGING", {}), false);
    assert.equal(internAvailable("STAGING", { DATABASE_URI: " ", PAYLOAD_SECRET: "s" }), false);
    assert.equal(backendConfigured({ DATABASE_URI: "x" }), false);
  });

  test("backend paths vs public paths", () => {
    for (const p of ["/intern", "/intern/anmelden", "/intern/admin", "/api/staff/login"]) assert.equal(isBackendPath(p), true, p);
    for (const p of ["/", "/heute", "/praxis", "/internet", "/apis", "/review", "/lab/praxis-cockpit"]) assert.equal(isBackendPath(p), false, p);
  });

  test("Payload's first-user registration view and endpoint are always closed", () => {
    for (const p of ["/intern/admin/create-first-user", "/intern/admin/create-first-user/", "/api/staff/first-register", "/API/STAFF/FIRST-REGISTER"]) assert.equal(isClosedRegistrationPath(p), true, p);
    for (const p of ["/intern/admin", "/intern/admin/login", "/api/staff/login"]) assert.equal(isClosedRegistrationPath(p), false, p);
  });

  test("proxy matches exactly the backend paths and applies both checks", () => {
    const src = readFileSync(join(ROOT, "proxy.ts"), "utf8");
    assert.match(src, /matcher: \["\/intern", "\/intern\/:path\*", "\/api", "\/api\/:path\*"\]/);
    assert.match(src, /if \(!internAvailable\(SITE_STAGE, process\.env\)\) return notFound\(\);/);
    assert.match(src, /if \(isClosedRegistrationPath\(req\.nextUrl\.pathname\)\) return notFound\(\);/);
  });
});

describe("first ADMIN bootstrap input", () => {
  test("no defaults, weak or missing input refused, password never echoed", () => {
    assert.ok(bootstrapInputProblems({}).length >= 3);
    assert.ok(bootstrapInputProblems({ email: "a@b.invalid", name: "Test", password: "kurz" }).length > 0);
    assert.ok(bootstrapInputProblems({ email: "a@b.invalid", name: "Test", password: "aaaaaaaaaaaaaaaaaaaaaaaa" }).length > 0);
    assert.ok(bootstrapInputProblems({ email: "verwaltung@b.invalid", name: "Test", password: "verwaltung-Passwort-2026!" }).length > 0);
    assert.deepEqual(bootstrapInputProblems({ email: "verwaltung@b.invalid", name: "Test Verwaltung", password: "Lang-und-Gemischt-2026!" }), []);
    const problems = bootstrapInputProblems({ email: "x@b.invalid", name: "T", password: "Geheim-Wort-123" }).join(" ");
    assert.doesNotMatch(problems, /Geheim-Wort-123/);
  });

  test("bootstrap script has no default credentials", () => {
    const src = readFileSync(join(ROOT, "scripts/bootstrap-admin.ts"), "utf8");
    assert.doesNotMatch(src, /BOOTSTRAP_ADMIN_PASSWORD\s*\|\|\s*["']/);
    assert.doesNotMatch(src, /console\.log\([^)]*password/i);
  });
});

describe("staff guards", () => {
  test("account creation: active ADMIN or the bootstrap context only", () => {
    const run = (req: Record<string, unknown>) => (staffCreateGuard as unknown as Hook)({ data: {}, operation: "create", req });
    assert.throws(() => run({ user: null, context: {} }), /nur von der Verwaltung/);
    assert.throws(() => run({ user: { role: "DOCTOR", active: true }, context: {} }));
    assert.throws(() => run({ user: { role: "ADMIN", active: false }, context: {} }));
    assert.doesNotThrow(() => run({ user: { role: "ADMIN", active: true }, context: {} }));
    assert.doesNotThrow(() => run({ user: null, context: { [SERVER_CONTEXT.BOOTSTRAP]: true } }));
    assert.throws(() => run({ user: null, context: { [SERVER_CONTEXT.BOOTSTRAP]: "true" } }));
  });

  test("self-service password reset is closed until an email adapter exists", () => {
    const run = (operation: string) => (staffOperationGuard as unknown as Hook)({ args: {}, operation });
    assert.throws(() => run("forgotPassword"));
    assert.throws(() => run("resetPassword"));
    assert.doesNotThrow(() => run("login"));
  });
});
