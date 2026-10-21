// POST /intern/vertretungen/bestaetigen — physician confirmation of the STORED data, or
// "Nicht mehr als Vertretung verwenden" (Phase 09.5G). DOCTOR only (checked here, in
// verifyReplacement and by collection access + hooks). The browser sends no data — only the entry,
// the record fingerprint it was shown, the explicit checkbox and the action.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm, RECORD_ID } from "@/cockpit/workflows/form";
import { verifyReplacement } from "@/cockpit/workflows/publish";
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
  if (activeRole(user as never) !== "DOCTOR") return new NextResponse("Diese Angabe kann nur eine Ärztin oder ein Arzt bestätigen.", { status: 403 });
  const form = fromForm(await req.formData());
  const eintrag = form.get("eintrag") ?? "";
  if (!RECORD_ID.test(eintrag)) return new NextResponse("Unbekannter Eintrag", { status: 400 });
  const mode = form.get("aktion") === "zurueckziehen" ? "WITHDRAW" : "VERIFY";
  const result = await verifyReplacement(payload, user as never, eintrag, form.get("fingerprint") ?? "", form.get("bestaetigt") === "1", mode);
  if (result.ok) return to(req, `/intern/vertretungen/gespeichert?eintrag=${encodeURIComponent(eintrag)}&art=${mode === "VERIFY" ? "bestaetigt" : "zurueckgezogen"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  if (result.code === "NOT_ALLOWED") return new NextResponse(result.message, { status: 403 });
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `/intern/vertretungen/${encodeURIComponent(eintrag)}?status=${status}`);
}
