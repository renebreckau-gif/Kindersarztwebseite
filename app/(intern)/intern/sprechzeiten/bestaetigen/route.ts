// POST /intern/sprechzeiten/bestaetigen — physician confirmation of the regular weekly plan (Phase 09.5I).
// DOCTOR only (checked here, in confirmWeeklyPlan, by the collection access and by the guard hook). The
// browser sends only the seven weekday states, the interval rows, the dataset fingerprint it was shown
// and the explicit checkbox — never rule ids, provenance, dates or a server context.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm, parseWeeklyPlan, weeklyPlanQuery } from "@/cockpit/workflows/form";
import { WEEKLY_DOCTOR_ONLY, confirmWeeklyPlan } from "@/cockpit/workflows/publish";
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
  if (activeRole(user as never) !== "DOCTOR") return new NextResponse(WEEKLY_DOCTOR_ONLY, { status: 403 });
  const form = fromForm(await req.formData());
  const input = parseWeeklyPlan(form);
  const result = await confirmWeeklyPlan(payload, user as never, input, form.get("fingerprint") ?? "", form.get("bestaetigt") === "1");
  if (result.ok) return to(req, `/intern/sprechzeiten/bestaetigt?art=${result.mode === "FIRST" ? "erst" : result.mode === "RECONFIRM" ? "erneut" : "geaendert"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  const back = new URLSearchParams([["bearbeiten", "1"], ...weeklyPlanQuery(input), ["pruefen", "1"], ["status", status]]);
  return to(req, `/intern/sprechzeiten?${back}#vorschau`);
}
