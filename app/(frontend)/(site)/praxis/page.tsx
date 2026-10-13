import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, BigLinks, PlaceholderFrame, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { publicAddress } from "@/content/practice";

export const metadata: Metadata = {
  title: "Praxis",
  description: "Die Kinderarztpraxis in Hettstedt: Ärztinnen, Team, erster Besuch und Kontakt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Praxis({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const addr = publicAddress();
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="editorial" title="Eine Kinderarztpraxis in Hettstedt." back={{ href: "/", label: "Start" }} lede="Wer wir sind, wie Sie uns erreichen und was Sie beim ersten Besuch erwartet.">
        <div className={u.introMedia}>
          <PlaceholderFrame label="Foto der Praxis – folgt mit echter Fotografie" />
        </div>
      </PageIntro>
      <Section id="bereiche" tone="paper" wide>
        <BigLinks
          numbered
          items={[
            { label: "Ärztinnen", text: "Wer Ihr Kind behandelt", href: "/praxis/aerztinnen" },
            { label: "Team", text: "Das Praxisteam", href: "/praxis/team" },
            { label: "Wobei können wir helfen?", text: "Vom Anliegen zur richtigen Seite", href: "/praxis/leistungen" },
            { label: "Neu bei uns?", text: "Der erste Kontakt mit der Praxis", href: "/praxis/neu-bei-uns" },
            { label: "Kontakt & Anfahrt", text: addr.street ? `${addr.street}, ${addr.cityLine}` : addr.cityLine, href: "/praxis/kontakt" },
          ]}
        />
      </Section>
      <Section id="anrufen" title="Am schnellsten erreichen Sie uns telefonisch." tone="plaster">
        <CallAction />
      </Section>
    </PageFrame>
  );
}
