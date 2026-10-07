import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, SourceList, CallAction, Prose } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { EXAMINATIONS, AGE_PARAM, ageFromQuery, topicBack, ageContextLine } from "@/content/site";
import { U10, publicDecisionStatement } from "@/content/examinations";

type Search = Promise<Record<string, string | string[] | undefined>>;

const DESCRIPTION = "Kinderarzt Vorsorge in Hettstedt: Was die Früherkennungsuntersuchungen U1 bis U9 und die J1 sind – mit offiziellen Quellen.";

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const age = ageFromQuery((await searchParams)[AGE_PARAM]);
  // the age is navigation context only — the description stays generic (no age-specific claims)
  return { title: age ? `Vorsorge – ${age.label} Jahre` : "Vorsorge – U-Untersuchungen und J1", description: DESCRIPTION };
}

export default async function Vorsorge({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const puls = resolvePuls(q);
  // valid ?alter= only; anything else falls back to the generic page (never displayed)
  const age = ageFromQuery(q[AGE_PARAM]);
  return (
    <PageFrame current="mein-kind" puls={puls}>
      <PageIntro
        variant="growth"
        title="Vorsorge"
        back={topicBack(age)}
        context={age ? ageContextLine(age) : undefined}
        lede="Die Früherkennungsuntersuchungen begleiten Ihr Kind von der Geburt bis ins Jugendalter. Hier finden Sie die Übersicht und die offiziellen Quellen."
      />

      {/* The U/J series as a measuring line: information, not a selector. Names only, never
          filtered or highlighted by the chosen age range — age windows need an approved,
          sourced mapping first (source-policy §4). */}
      <section className={u.examStage} aria-labelledby="reihe-t">
        <h2 id="reihe-t" className={u.examTitle}>
          Von U1 bis J1
        </h2>
        <p className={u.examNote}>
          Sie sehen die gesamte Vorsorgereihe von U1 bis J1.
          {age ? ` Der Bereich ${age.label} Jahre dient hier nur zur Orientierung – welche Untersuchung ansteht, hängt vom genauen Alter Ihres Kindes ab.` : null}
        </p>
        <ol className={u.examLine}>
          {EXAMINATIONS.map((x, i) => (
            <li key={x} style={{ ["--i" as string]: i }} id={x === "J1" ? "j1" : undefined}>
              <span className={u.examName}>{x}</span>
              <span className={u.examTick} aria-hidden="true" />
            </li>
          ))}
        </ol>
        <p className={u.fine}>Die genauen Zeiträume stehen im Gelben Heft Ihres Kindes und in den offiziellen Übersichten unten.</p>
      </section>

      <Section id="was" title="Was ist das?" tone="paper">
        <Prose>
          <p>
            Die U-Untersuchungen U1 bis U9 und die Jugendgesundheitsuntersuchung J1 sind Früherkennungsuntersuchungen. Die U-Untersuchungen legt die Kinder-Richtlinie des Gemeinsamen
            Bundesausschusses fest, für die J1 gilt eine eigene Richtlinie.
          </p>
          <p>Die Ergebnisse werden im Gelben Heft dokumentiert.</p>
          {/* U10: only once verifiably in force AND physician-approved (examinations.ts) */}
          {publicDecisionStatement(U10) ? <p>{publicDecisionStatement(U10)}</p> : null}
          <p>Welche Untersuchung bei Ihrem Kind als Nächstes ansteht, können wir hier nicht wissen – fragen Sie die Praxis.</p>
        </Prose>
        <CallAction />
        <InternalNote>
          <p>
            Altersfenster und Erläuterungen pro Untersuchung erscheinen nach ärztlicher Freigabe (source-policy §4). Welche U/J die Praxis durchführt (F67), ist unbestätigt und wird nicht
            behauptet.
          </p>
          <p>
            U10 (G-BA-Beschluss {U10.decisionDate.split("-").reverse().join(".")}): Beschluss geprüft, laut G-BA „noch nicht in Kraft“ (Stand {U10.lastVerified.split("-").reverse().join(".")}).
            BMG-Nichtbeanstandung 30.09.2026 laut Auftrag – nicht selbst geprüft. Bundesanzeiger ausstehend. Keine ärztliche Text-Freigabe, Praxisangebot unbekannt. Öffentlich erscheint
            nichts, bis Inkrafttreten und Freigabe bestätigt sind.
          </p>
        </InternalNote>
      </Section>

      <section className={u.sourcesWrap}>
        <SourceList ids={["GBA_KINDER", "BIOEG_U", "BIOEG_TERMINE", "BIOEG_HEFT", "BIOEG_J1"]} />
      </section>
    </PageFrame>
  );
}
