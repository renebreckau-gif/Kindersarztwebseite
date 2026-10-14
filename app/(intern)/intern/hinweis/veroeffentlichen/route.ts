// POST /intern/hinweis/veroeffentlichen — the ONLY write entry of "Hinweis veröffentlichen" (09.5D).
// Same architecture as the other cockpit workflows: plain form post, same-origin check, Payload
// session, then publishAnnouncement (fingerprint + full revalidation + one transaction with
// provenance + audit + server-generated changeSetId). Only person-chosen fields are read
// (parseAnnouncement); published / category / priority / highlight are server rules.

import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse, type NextRequest } from "next/server";
import { announcementQuery, fromForm, parseAnnouncement } from "@/cockpit/workflows/form";
import { publishAnnouncement } from "@/cockpit/workflows/publish";
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
  const input = parseAnnouncement(form);
  if (input.recordId === "") return to(req, "/intern/hinweis");
  const back = `${input.recordId ? `/intern/hinweis/${encodeURIComponent(input.recordId)}` : "/intern/hinweis"}?${announcementQuery(input)}`;

  const result = await publishAnnouncement(payload, user as never, input, form.get("fingerprint") ?? "");
  if (result.ok) {
    // vorgang = the server-generated change-set id (used only to look up undo eligibility again on the server).
    return to(req, `/intern/hinweis/veroeffentlicht?eintrag=${encodeURIComponent(result.recordId)}&modus=${result.mode === "EDIT" ? "bearbeitet" : "neu"}&vorgang=${result.changeSetId}`);
  }
  if (result.code === "UNAUTHENTICATED") return to(req, "/intern/anmelden");
  const status = result.code === "STALE" ? "veraltet" : result.code === "BLOCKED" ? "blockiert" : "fehlgeschlagen";
  return to(req, `${back}&status=${status}`);
}
