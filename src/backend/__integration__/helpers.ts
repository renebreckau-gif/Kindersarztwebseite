// Shared helpers for the database integration tests (run by scripts/test-db-clean.ps1).
// Only artificial data. Refuses any database that is not a loopback *_test database.

import { getPayload, type Payload } from "payload";

export const TEST_URI = process.env.TEST_DATABASE_URI;
export const BASE = process.env.E2E_BASE_URL?.replace(/\/$/, "");
export const skipDb = TEST_URI ? false : "TEST_DATABASE_URI not set — integration tests skipped";
export const skipHttp = TEST_URI && BASE ? false : "E2E_BASE_URL not set — HTTP checks skipped";

if (TEST_URI) {
  const u = new URL(TEST_URI);
  if (!/^(127\.0\.0\.1|localhost)$/.test(u.hostname) || !u.pathname.endsWith("_test")) throw new Error("Refusing: TEST_DATABASE_URI must be a loopback *_test database.");
  process.env.DATABASE_URI = TEST_URI; // payload.config.ts reads DATABASE_URI
}

export async function testPayload(): Promise<Payload> {
  const { default: config } = await import("../../../payload.config.ts");
  return getPayload({ config });
}

/** Cast a Payload document to the shape a test inspects. */
export const doc = <T>(x: unknown) => x as T;

export const EMAIL = (k: string) => `${k.toLowerCase()}@integration-test.invalid`;

/** Keys that must never appear anywhere in an audit payload (recursive). */
const SECRET_KEY = /password|hash|salt|token|secret|session|refresh|apikey|_sid|loginattempts|lockuntil/i;
export function secretKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => secretKeys(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [...(SECRET_KEY.test(k) ? [`${path}.${k}`] : []), ...secretKeys(v, `${path}.${k}`)]);
  }
  return [];
}

// ------------------------------------------------------------------ HTTP (running Next server)

export interface HttpResult {
  status: number;
  location: string | null;
  setCookie: string[];
  body: string;
  json: unknown;
}

export async function http(path: string, init: { method?: string; cookie?: string; body?: unknown } = {}): Promise<HttpResult> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    redirect: "manual",
    headers: {
      ...(init.cookie ? { Cookie: init.cookie } : {}),
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      Origin: BASE!,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(body);
  } catch {
    json = null;
  }
  return { status: res.status, location: res.headers.get("location"), setCookie: res.headers.getSetCookie(), body, json };
}

/** REST login (same Payload login operation and cookie generator as the /intern server action). */
export async function restLogin(email: string, password: string) {
  const r = await http("/api/staff/login", { method: "POST", body: { email, password } });
  const raw = r.setCookie.find((c) => c.startsWith("payload-token="));
  return { ...r, raw, cookie: raw ? raw.split(";")[0] : undefined };
}
