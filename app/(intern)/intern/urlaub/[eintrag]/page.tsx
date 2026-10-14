// 7.5 Urlaub / Schließzeit bearbeiten — the SAME record (domain record id in the path, never the
// database id). The server re-loads the ACTIVE record; RETIRED or ended records are not editable.

import { redirect } from "next/navigation";
import { RECORD_ID } from "@/cockpit/workflows/form";
import { internSession } from "../../../session";
import { Unavailable } from "../../../unavailable";
import { PlannedWorkflow } from "../planned-workflow";

type Params = Promise<{ eintrag: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function UrlaubBearbeiten({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { eintrag } = await params;
  const id = decodeURIComponent(eintrag);
  if (!RECORD_ID.test(id)) redirect("/intern");
  return <PlannedWorkflow staff={session.staff} raw={await searchParams} recordId={id} />;
}
