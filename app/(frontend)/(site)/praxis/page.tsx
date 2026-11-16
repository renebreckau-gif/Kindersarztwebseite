import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, BigLinks, PlaceholderFrame, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import p from "@/site/practice-pages.module.css";
import { loadPublicPage } from "@/site/operational";
import { PRAXIS_GROUPS } from "@/content/site";
import { publicFirstVisitItems } from "@/content/first-visit";

export const metadata: Metadata = {
  title: "Praxis",
  description: "Die Kinderarztpraxis in Hettstedt: erster Besuch, gut vorbereitet, Anliegen, Ärztinnen, Team und Kontakt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Praxis({ searchParams }: { searchParams: Search }) {
  const { puls } = await loadPublicPage(await searchParams);
  // Task groups (public-content-architecture.md §6): only published routes; an empty group is omitted.
  const firstVisitPublic = publicFirstVisitItems(puls.result.evaluatedAt.localDate).length > 0;
  const groups = PRAXIS_GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => l.requires !== "first-visit" || firstVisitPublic) })).filter((g) => g.links.length > 0);
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="editorial" title="Eine Kinderarztpraxis in Hettstedt." back={{ href: "/", label: "Start" }} lede="Wer wir sind, wie Sie uns erreichen und was Sie beim ersten Besuch erwartet.">
        <div className={u.introMedia}>
          <PlaceholderFrame label="Foto der Praxis – folgt mit echter Fotografie" />
        </div>
      </PageIntro>
      <Section id="bereiche" tone="paper" wide>
        <div className={p.groups}>
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`gruppe-${g.id}`}>
              <h2 id={`gruppe-${g.id}`} className={p.groupTitle}>
                {g.title}
              </h2>
              <BigLinks items={g.links} />
            </section>
          ))}
        </div>
      </Section>
      <Section id="anrufen" title="Am schnellsten erreichen Sie uns telefonisch." tone="plaster">
        <CallAction />
      </Section>
    </PageFrame>
  );
}
