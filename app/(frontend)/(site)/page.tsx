import type { Metadata } from "next";
import { StartPage } from "@/site/start-page";
import { loadPublicPage } from "@/site/operational";
import { selectHomepageHighlight } from "@/content/homepage-highlight";

export const metadata: Metadata = {
  title: { absolute: "Kinderarztpraxis Probst & Böhme – Kinderarzt in Hettstedt" },
  description: "Kinderarzt in Hettstedt: Sprechzeiten heute, direkt anrufen, Notfall-Hinweise und Orientierung nach dem Alter Ihres Kindes.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Start page: the approved Phase 06.2 hero (locked), connected to real routes and PRAXIS PULS.
 *  ONE operational snapshot (static in 09.6B, DATA_SOURCE = "STATIC") drives status, highlight and the
 *  chapters: the highlight comes from the engine's upcomingClosure and the SAME snapshot's announcements. */
export default async function Start({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const { snapshot, puls } = await loadPublicPage({ vorschau: q.vorschau, zeit: q.zeit });
  const highlight = selectHomepageHighlight({ result: puls.result, announcements: snapshot.announcements, today: puls.result.evaluatedAt.localDate });
  return <StartPage puls={puls} snapshot={snapshot} highlight={highlight} />;
}
