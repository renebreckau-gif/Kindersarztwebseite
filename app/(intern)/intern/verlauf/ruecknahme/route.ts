// POST /intern/verlauf/ruecknahme — the ONLY write entry for undo (Phase 09.5B).
// Same protection as publishing: same-origin, server session, one transaction. The browser sends
// only the change-set id and the preview fingerprint; the server loads the history, validates the
// relationship and builds the revert itself.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { fromForm } from "@/cockpit/workflows/form";
import { revertChange } from "@/cockpit/workflows/publish";
import { sameOrigin } from "../../../same-origin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
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
  const vorgang = form.get("vorgang") ?? "";
  if (!UUID.test(vorgang)) return new NextResponse("Unbekannter Vorgang", { status: 400 });
  const result = await revertChange(payload, user as never, vorgang, form.get("fingerprint") ?? "");
  if (result.ok) return to(req, "/intern/verlauf/zurueckgenommen");
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `/intern/verlauf/${vorgang}/zuruecknehmen?status=${status}`);
}
