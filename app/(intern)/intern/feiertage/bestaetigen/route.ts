// POST /intern/feiertage/bestaetigen — physician confirmation of the holiday rule (Phase 09.5H).
// DOCTOR only (checked here, in confirmHolidayPolicy and by the global's access + hook). The browser
// sends only the chosen rule, the calendar fingerprint it was shown and the explicit checkbox.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm } from "@/cockpit/workflows/form";
import { confirmHolidayPolicy } from "@/cockpit/workflows/publish";
import { parsePolicyMode } from "@/cockpit/workflows/holiday-policy";
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
  if (activeRole(user as never) !== "DOCTOR") return new NextResponse("Die Feiertagsregel kann nur eine Ärztin oder ein Arzt bestätigen.", { status: 403 });
  const form = fromForm(await req.formData());
  const mode = parsePolicyMode(form.get("regel"));
  const result = await confirmHolidayPolicy(payload, user as never, mode, form.get("fingerprint") ?? "", form.get("bestaetigt") === "1");
  if (result.ok) return to(req, `/intern/feiertage/bestaetigt?art=${result.first ? "erst" : "geaendert"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `/intern/feiertage?${mode ? `regel=${mode}&` : ""}status=${status}`);
}
