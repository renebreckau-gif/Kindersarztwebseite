// POST /intern/akutsprechstunde/bestaetigen — the ONLY write entry of the physician acute baseline
// (Phase 09.5E-1). Same-origin form post; session account from the server; DOCTOR only (checked in
// publishAcuteBaseline and again by the provenance hook); revalidated in one transaction.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { acuteBaselineQuery, fromForm, parseAcuteBaseline } from "@/cockpit/workflows/form";
import { publishAcuteBaseline } from "@/cockpit/workflows/publish";
import { activeRole } from "@/backend/access";
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
  if (activeRole(user as never) !== "DOCTOR") return new NextResponse("Die Akutsprechstunde kann nur eine Ärztin oder ein Arzt bestätigen.", { status: 403 });

  const form = fromForm(await req.formData());
  const input = parseAcuteBaseline(form);
  const result = await publishAcuteBaseline(payload, user as never, input, form.get("fingerprint") ?? "");
  if (result.ok) return to(req, `/intern/akutsprechstunde/bestaetigt?vorgang=${result.changeSetId}&art=${result.first ? "erst" : "geaendert"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `/intern/akutsprechstunde/einrichten?${acuteBaselineQuery(input)}&status=${status}`);
}
