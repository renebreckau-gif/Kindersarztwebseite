// Hinweis bearbeiten — the SAME record (domain record id in the path, never the database id).
// The server re-loads the ACTIVE announcement; RETIRED or expired ones are not editable.

import { redirect } from "next/navigation";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { AnnouncementWorkflow } from "../announcement-workflow";

type Params = Promise<{ eintrag: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function HinweisBearbeiten({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { eintrag } = await params;
  const id = decodeURIComponent(eintrag);
  if (!RECORD_ID.test(id)) redirect("/intern/hinweis");
  return <AnnouncementWorkflow staff={session.staff} raw={await searchParams} recordId={id} />;
}
