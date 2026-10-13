import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, PlaceholderFrame, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { DOCTORS, publicPeople } from "@/content/people";

export const metadata: Metadata = {
  title: "Ärztinnen",
  description: "Die Ärztinnen der Kinderarztpraxis in Hettstedt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Aerztinnen({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const doctors = publicPeople(DOCTORS, puls.result.evaluatedAt.localDate, puls.mode === "PREVIEW");
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="editorial" title="Ärztinnen" back={{ href: "/praxis", label: "Praxis" }} lede="Die Menschen, die Ihr Kind untersuchen und begleiten." />
      {doctors.length ? (
        <section className={u.people} aria-label="Ärztinnen">
          {doctors.map((d) => (
            <article key={d.id} className={u.person}>
              {/* confirmed person without photo: neutral frame, no fake portrait (placeholder-system) */}
              <PlaceholderFrame shape="portrait" label="Porträt folgt" />
              <div>
                <h2 className={u.personName}>{d.name}</h2>
                {d.specialties.map((x) => (
                  <p key={x} className={u.personRole}>
                    {x}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <Section id="bald" tone="paper">
          <p className={u.emptyTitle}>Unsere Ärztinnen stellen sich hier vor, sobald Texte und Fotos freigegeben sind.</p>
          <p className={u.lead}>Bis dahin beantworten wir Ihre Fragen gern telefonisch.</p>
          <CallAction />
          <InternalNote>
            <p>Nadine Probst (F20/F21) und Dr. med. Elke Böhme (F22) sind bestätigt; die Einwilligung zur Veröffentlichung (LB-09) nicht. Qualifikationen von Dr. Böhme (F23) unbestätigt. Vorschau: ?vorschau=freigabe</p>
          </InternalNote>
        </Section>
      )}
    </PageFrame>
  );
}
