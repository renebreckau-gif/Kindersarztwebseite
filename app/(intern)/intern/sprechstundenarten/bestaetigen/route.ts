// POST /intern/sprechstundenarten/bestaetigen — physician confirmation of a NON-ACUTE consultation type
// (Phase 09.5J). DOCTOR only (checked here, in confirmConsultationType, by the collection access and by the
// guard hook). The browser sends only the type slug, the wording, the fingerprint it was shown and the
// explicit checkbox — never a code string, provenance, role, change-set id or server context.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm } from "@/cockpit/workflows/form";
import { TYPE_DOCTOR_ONLY, confirmConsultationType } from "@/cockpit/workflows/publish";
import { TYPE_SLUG, codeOfSlug } from "@/cockpit/workflows/consultation-type";
import { activeRole } from "@/backend/access";
import { sameOrigin } from "../../../same-origin";

const to = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const VORGANG = { CREATE: "erst", CONFIRM: "erst", RECONFIRM: "erneut", CHANGE: "geaendert" } as const;

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
  if (activeRole(user as never) !== "DOCTOR") return new NextResponse(TYPE_DOCTOR_ONLY, { status: 403 });
  const form = fromForm(await req.formData());
  const code = codeOfSlug(form.get("art"));
  const input = { label: form.get("bezeichnung") ?? "", explanation: form.get("erklaerung") ?? "" };
  const result = await confirmConsultationType(payload, user as never, code, input, form.get("fingerprint") ?? "", form.get("bestaetigt") === "1");
  if (result.ok) return to(req, `/intern/sprechstundenarten/bestaetigt?${new URLSearchParams({ art: TYPE_SLUG[result.code], vorgang: VORGANG[result.mode] })}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  if (!code) return to(req, "/intern/sprechstundenarten");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `/intern/sprechstundenarten/${TYPE_SLUG[code]}?${new URLSearchParams({ bezeichnung: input.label, erklaerung: input.explanation, vorschau: "1", status })}#vorschau`);
}
