// POST /intern/heute/veroeffentlichen — the ONLY write entry of the today workflows.
// Plain HTML form post (works without JavaScript). The server re-checks the session, rebuilds and
// revalidates the draft against the current database inside one transaction (publishWorkflow).
// Cross-site posts are refused (Origin must match this host; the session cookie is SameSite=Lax).

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { acuteTodayQuery, closedTodayQuery, earlyCloseQuery, fromForm, parseAcuteToday, parseClosedToday, parseEarlyClose } from "@/cockpit/workflows/form";
import { publishWorkflow, type WorkflowRequest } from "@/cockpit/workflows/publish";
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
  const fingerprint = form.get("fingerprint") ?? "";
  const workflow = form.get("workflow");
  let request: WorkflowRequest;
  let back: string;
  if (workflow === "EARLY_CLOSE") {
    const input = parseEarlyClose(form);
    request = { kind: "EARLY_CLOSE", input };
    back = `/intern/heute/frueher-schliessen?${earlyCloseQuery(input)}`;
  } else if (workflow === "CLOSED_TODAY") {
    const input = { ...parseClosedToday(form), mode: "NOW" as const };
    request = { kind: "CLOSED_TODAY", input };
    back = `/intern/heute/geschlossen?${closedTodayQuery(input)}`;
  } else if (workflow === "ACUTE_TODAY") {
    // 09.5E-2: one-day acute change; the server re-checks the physician baseline (draft + collection guard).
    const input = parseAcuteToday(form);
    request = { kind: "ACUTE_TODAY", input };
    back = `/intern/akutsprechstunde/heute?${acuteTodayQuery(input)}`;
  } else {
    return new NextResponse("Unbekannter Vorgang", { status: 400 });
  }

  const result = await publishWorkflow(payload, user as never, request, fingerprint);
  if (result.ok) {
    const modus = result.mode === "EDIT" ? "bearbeitet" : result.mode === "SUPERSEDE" ? "ersetzt" : "neu";
    // vorgang = the server-generated change-set id (used only to look up undo eligibility again on the server).
    const art = result.kind === "EARLY_CLOSE" ? "frueher" : result.kind === "ACUTE_TODAY" ? "akut" : "geschlossen";
    return to(req, `/intern/heute/veroeffentlicht?art=${art}&modus=${modus}&vorgang=${result.changeSetId}`);
  }
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `${back}&status=${status}`);
}
