import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { TEAM, publicPeople } from "@/content/people";

export const metadata: Metadata = {
  title: "Team",
  description: "Das Praxisteam der Kinderarztpraxis in Hettstedt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Team({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const team = publicPeople(TEAM, puls.result.evaluatedAt.localDate, puls.mode === "PREVIEW");
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="editorial" title="Team" back={{ href: "/praxis", label: "Praxis" }} lede="Das Team der Praxis." />
      {team.length ? (
        <Section id="team" tone="paper" wide>
          <ul className={u.roster}>
            {team.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          <p className={u.fine}>Fotos folgen.</p>
        </Section>
      ) : (
        <Section id="bald" tone="paper">
          <p className={u.emptyTitle}>Das Team stellt sich hier vor, sobald die Freigaben vorliegen.</p>
          <CallAction />
          <InternalNote>
            <p>Fünf Namen sind als Arbeitsdaten bestätigt (F26–F30). Vollständigkeit (F31), Funktionsbezeichnungen (F32) und Einwilligung (F33/LB-09) fehlen. Vorschau: ?vorschau=freigabe</p>
          </InternalNote>
        </Section>
      )}
    </PageFrame>
  );
}
