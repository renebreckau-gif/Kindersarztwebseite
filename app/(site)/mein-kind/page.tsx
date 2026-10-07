import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, GrowthScale, BigLinks } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";

export const metadata: Metadata = {
  title: "Mein Kind",
  description: "Orientierung nach Alter: 0–2, 3–6, 7–12 und 13–17 Jahre. Vorsorge und Impfungen mit offiziellen Quellen – ohne Anmeldung.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function MeinKind({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  return (
    <PageFrame current="mein-kind" puls={puls}>
      <PageIntro variant="growth" title="Mein Kind" lede="Wählen Sie das Alter Ihres Kindes. Sie geben dabei nichts preis: kein Geburtsdatum, kein Konto, keine gespeicherten Daten." />
      <section className={u.growStage} aria-label="Altersstufen">
        <GrowthScale />
      </section>
      <Section id="themen" title="Für jedes Alter" tone="paper">
        <BigLinks
          items={[
            { label: "Vorsorge", text: "Was die U-Untersuchungen und die J1 sind – mit offiziellen Quellen", href: "/mein-kind/vorsorge" },
            { label: "Impfungen", text: "Wie Empfehlungen entstehen und wo sie gepflegt werden", href: "/mein-kind/impfungen" },
          ]}
        />
      </Section>
    </PageFrame>
  );
}
