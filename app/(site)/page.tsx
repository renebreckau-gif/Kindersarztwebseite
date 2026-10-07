import type { Metadata } from "next";
import s from "@/lab/final/signature.module.css";
import { EntryHeader, PulsStatement } from "@/lab/final/entry-chrome";
import { HeroStage } from "@/lab/final/hero-stage";
import { SiteDock, SiteFooter, PreviewBanner } from "@/site/chrome";
import { HomeChapters } from "@/site/home";
import { resolvePuls } from "@/content/puls";
import { PRIMARY } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: "Kinderarztpraxis Probst & Böhme – Kinderarzt in Hettstedt" },
  description: "Kinderarzt in Hettstedt: Sprechzeiten heute, direkt anrufen, Notfall-Hinweise und Orientierung nach dem Alter Ihres Kindes.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const ROUTES = { heute: "/heute", "mein-kind": "/mein-kind", praxis: "/praxis", entdecken: "/entdecken" } as const;

/** Start page: the approved Phase 06.2 hero (locked), connected to real routes and PRAXIS PULS. */
export default async function Start({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls({ vorschau: q.vorschau, zeit: q.zeit });
  return (
    <div className={s.page}>
      <a className={s.skip} href="#inhalt">
        Zum Inhalt springen
      </a>
      <EntryHeader links={PRIMARY.map((p) => ({ id: p.id, label: p.label, href: p.href }))} homeHref="/" />
      <SiteDock puls={puls} />
      <main id="inhalt">
        <HeroStage initial={null} routes={ROUTES}>
          <div className={s.headline}>
            <h1>Gesund groß werden.</h1>
            <p>Alles für heute auf einen Blick. Und Begleitung, die mit Ihrem Kind mitwächst.</p>
          </div>
          <PulsStatement puls={puls.view} hoursHref="/heute/sprechzeiten" emergencyHref="/notfall" tag={puls.mode === "PREVIEW" ? "Vorschau" : null} />
        </HeroStage>
        <PreviewBanner puls={puls} />
        <HomeChapters puls={puls} />
      </main>
      <SiteFooter />
    </div>
  );
}
