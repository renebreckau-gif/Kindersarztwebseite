import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, BigLinks, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { NEEDS } from "@/content/site";

export const metadata: Metadata = {
  title: "Wobei können wir helfen?",
  description: "Vom Anliegen zur richtigen Information: Sprechzeiten, Notfall, Vorsorge, Impfungen, erster Besuch und Kontakt der Kinderarztpraxis in Hettstedt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Leistungen({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro
        variant="editorial"
        title="Wobei können wir helfen?"
        back={{ href: "/praxis", label: "Praxis" }}
        lede="Wählen Sie, was gerade passt. Diese Seite führt zu Informationen – sie stellt keine Diagnose und ersetzt keine ärztliche Einschätzung."
      />
      <Section id="anliegen" tone="paper" wide>
        <BigLinks items={NEEDS} />
      </Section>
      <Section id="angebot" title="Unser Angebot" tone="plaster">
        <p className={u.lead}>Ob eine bestimmte Untersuchung oder Behandlung bei uns möglich ist, erfahren Sie telefonisch.</p>
        <CallAction />
        <InternalNote>
          <p>Die Leistungsliste der bisherigen Website (F66–F74, Stand 2020) ist unbestätigt und wird nicht übernommen. Bestätigte Leistungen erscheinen hier als eigene Einträge (FB-12).</p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
