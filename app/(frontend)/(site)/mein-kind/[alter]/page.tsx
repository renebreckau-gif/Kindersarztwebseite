import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, GrowthScale, BigLinks, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { AGES, ageTopics, ageSectionTitle } from "@/content/site";

type Params = Promise<{ alter: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export function generateStaticParams() {
  return AGES.map((a) => ({ alter: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { alter } = await params;
  const a = AGES.find((x) => x.slug === alter);
  return a ? { title: `${a.label} Jahre – ${a.name}`, description: `Orientierung für Kinder von ${a.label} Jahren: Vorsorge, Impfungen und der Weg zur Praxis.` } : {};
}

export default async function Altersstufe({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { alter } = await params;
  const age = AGES.find((x) => x.slug === alter);
  if (!age) notFound();
  const puls = resolvePuls(await searchParams);
  return (
    <PageFrame current="mein-kind" puls={puls}>
      <PageIntro variant="growth" title={`${age.label} Jahre`} context={age.name} back={{ href: "/mein-kind", label: "Mein Kind" }} lede={age.intro} />
      <section className={u.growStage} aria-label="Altersstufen">
        <GrowthScale compact current={age.id} />
      </section>
      <Section id="themen" title={ageSectionTitle(age)} tone="paper">
        {/* Vorsorge/Impfungen carry ?alter= so the age range and the way back survive */}
        <BigLinks items={ageTopics(age)} />
      </Section>
      <Section id="fragen" title="Fragen zu Ihrem Kind?" tone="plaster">
        <p className={u.lead}>Ob eine Untersuchung oder Impfung gerade ansteht, klären Sie am besten direkt mit der Praxis. Diese Seiten geben Orientierung, keine individuelle Empfehlung.</p>
        <CallAction />
      </Section>
    </PageFrame>
  );
}
