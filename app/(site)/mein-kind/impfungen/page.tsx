import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, SourceList, CallAction, Prose } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { AGE_PARAM, ageFromQuery, topicBack, ageContextLine } from "@/content/site";

type Search = Promise<Record<string, string | string[] | undefined>>;

const DESCRIPTION = "Impfungen bei Kindern: wie Impfempfehlungen in Deutschland entstehen, wo sie gepflegt werden und wo Sie die offiziellen Informationen finden.";

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const age = ageFromQuery((await searchParams)[AGE_PARAM]);
  return { title: age ? `Impfungen – ${age.label} Jahre` : "Impfungen", description: DESCRIPTION };
}

export default async function Impfungen({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls(q);
  // navigation context only: the age range never selects vaccinations or recommendations
  const age = ageFromQuery(q[AGE_PARAM]);
  return (
    <PageFrame current="mein-kind" puls={puls}>
      <PageIntro
        variant="growth"
        title="Impfungen"
        back={topicBack(age)}
        context={age ? ageContextLine(age) : undefined}
        lede="Wie Impfempfehlungen entstehen, wo sie stehen – und warum das Gespräch mit der Praxis zählt."
      />

      <section className={u.trio} aria-label="Überblick">
        <div>
          <h2 className={u.trioTitle}>Worum es geht</h2>
          <p>Impfungen sollen vor bestimmten Infektionskrankheiten schützen. Bei Kindern werden sie deshalb regelmäßig besprochen.</p>
        </div>
        <div>
          <h2 className={u.trioTitle}>Wer empfiehlt</h2>
          <p>In Deutschland gibt die Ständige Impfkommission (STIKO) am Robert Koch-Institut die Impfempfehlungen heraus und überprüft sie regelmäßig.</p>
        </div>
        <div>
          <h2 className={u.trioTitle}>Wie das Alter zählt</h2>
          <p>Die Empfehlungen ordnen Impfungen bestimmten Altersabschnitten zu. Die aktuelle Fassung finden Sie bei den offiziellen Quellen.</p>
        </div>
      </section>

      <Section id="gespraech" title="Für Ihr Kind" tone="plaster">
        <Prose>
          <p>Welche Impfungen für Ihr Kind sinnvoll sind, klären Sie im Gespräch mit der Praxis. Diese Seite stellt keine Empfehlung für Ihr Kind aus und kennt seinen Impfstatus nicht.</p>
        </Prose>
        <CallAction />
        <InternalNote>
          <p>Kuratierte Erklärungen mit Altersangaben erscheinen erst nach ärztlicher Freigabe und mit Quellenstand (strategy-lock 2.3). Das Impfangebot der Praxis (F68) ist unbestätigt.</p>
        </InternalNote>
      </Section>

      <section className={u.sourcesWrap}>
        <SourceList ids={["STIKO", "GESUND_IMPFEN", "BIOEG_IMPFEN", "INFEKTIONSSCHUTZ"]} />
      </section>
    </PageFrame>
  );
}
