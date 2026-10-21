// POST /intern/vertretungen/speichern — ADMIN structural create / correction (Phase 09.5G).
// Same-origin; session account from the server; one transaction; the entry is TO_BE_CONFIRMED
// afterwards (provenance hook). Only the structural fields, the edit target and its fingerprint are read.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm, parseReplacement, RECORD_ID, REPLACEMENT_PARAM } from "@/cockpit/workflows/form";
import { saveReplacement } from "@/cockpit/workflows/publish";
import { sameOrigin } from "../../../same-origin";

const to = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Nicht erlaubt", { status: 403 });
  let payload;
  try {
    payload = await getPayload({ config });
  } catch {
    return to(req, "/intern");
  }
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return to(req, "/intern/anmelden");
  const form = fromForm(await req.formData());
  const raw = parseReplacement(form);
  const eintrag = form.get("eintrag");
  const target = eintrag !== undefined ? { recordId: RECORD_ID.test(eintrag) ? eintrag : "-", fingerprint: form.get("fingerprint") ?? "" } : undefined;
  const result = await saveReplacement(payload, user as never, raw, target);
  if (result.ok) return to(req, `/intern/vertretungen/gespeichert?eintrag=${encodeURIComponent(result.recordId)}&art=${result.mode === "NEW" ? "neu" : "geaendert"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  const q = new URLSearchParams({ vorschau: "1" });
  for (const [k, param] of Object.entries(REPLACEMENT_PARAM)) q.set(param, String(raw[k as keyof typeof raw] ?? ""));
  q.set("status", result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen");
  return to(req, `${target ? `/intern/vertretungen/${encodeURIComponent(target.recordId)}` : "/intern/vertretungen/neu"}?${q}`);
}
