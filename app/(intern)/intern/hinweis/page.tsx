// "Hinweis veröffentlichen" — REAL workflow (Phase 09.5D). See announcement-workflow.tsx.

import { redirect } from "next/navigation";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { AnnouncementWorkflow } from "./announcement-workflow";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function HinweisVeroeffentlichen({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  return <AnnouncementWorkflow staff={session.staff} raw={await searchParams} />;
}
