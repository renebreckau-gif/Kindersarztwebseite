// POST /intern/heute/veroeffentlichen — the ONLY write entry of the today workflows.
// Plain HTML form post (works without JavaScript). The server re-checks the session, rebuilds and
// revalidates the draft against the current database inside one transaction (publishWorkflow).
// Cross-site posts are refused (Origin must match this host; the session cookie is SameSite=Lax).

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { closedTodayQuery, earlyCloseQuery, fromForm, parseClosedToday, parseEarlyClose } from "@/cockpit/workflows/form";
import { publishWorkflow, type WorkflowRequest } from "@/cockpit/workflows/publish";

const to = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

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
  } else {
    return new NextResponse("Unbekannter Vorgang", { status: 400 });
  }

  const result = await publishWorkflow(payload, user as never, request, fingerprint);
  if (result.ok) return to(req, `/intern/heute/veroeffentlicht?art=${result.kind === "EARLY_CLOSE" ? "frueher" : "geschlossen"}&modus=${result.mode === "EDIT" ? "bearbeitet" : "neu"}`);
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `${back}&status=${status}`);
}
