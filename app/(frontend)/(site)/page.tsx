import type { Metadata } from "next";
import { StartPage } from "@/site/start-page";
import { resolvePuls } from "@/content/puls";
import { ANNOUNCEMENTS } from "@/content/notices";
import { selectHomepageHighlight } from "@/content/homepage-highlight";

export const metadata: Metadata = {
  title: { absolute: "Kinderarztpraxis Probst & Böhme – Kinderarzt in Hettstedt" },
  description: "Kinderarzt in Hettstedt: Sprechzeiten heute, direkt anrufen, Notfall-Hinweise und Orientierung nach dem Alter Ihres Kindes.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Start page: the approved Phase 06.2 hero (locked), connected to real routes and PRAXIS PULS.
 *  STATIC data only (DATA_SOURCE = "STATIC"): the highlight comes from the engine's
 *  upcomingClosure and the static announcements — never from the database. */
export default async function Start({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls({ vorschau: q.vorschau, zeit: q.zeit });
  const highlight = selectHomepageHighlight({ result: puls.result, announcements: ANNOUNCEMENTS, today: puls.result.evaluatedAt.localDate });
  return <StartPage puls={puls} highlight={highlight} />;
}
