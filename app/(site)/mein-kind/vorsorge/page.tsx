import type { Metadata } from "next";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, SourceList, CallAction, Prose } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { EXAMINATIONS } from "@/content/site";
import { U10, publicDecisionStatement } from "@/content/examinations";

export const metadata: Metadata = {
  title: "Vorsorge – U-Untersuchungen und J1",
  description: "Kinderarzt Vorsorge in Hettstedt: Was die Früherkennungsuntersuchungen U1 bis U9 und die J1 sind – mit offiziellen Quellen.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Vorsorge({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  return (
    <PageFrame current="mein-kind" puls={puls}>
      <PageIntro
        variant="growth"
        title="Vorsorge"
        back={{ href: "/mein-kind", label: "Mein Kind" }}
        lede="Die Früherkennungsuntersuchungen begleiten Ihr Kind von der Geburt bis ins Jugendalter. Hier finden Sie die Übersicht und die offiziellen Quellen."
      />

      {/* the U/J series as a measuring line — names only; age windows follow physician approval */}
      <section className={u.examStage} aria-labelledby="reihe-t">
        <h2 id="reihe-t" className={u.examTitle}>
          Von U1 bis J1
        </h2>
        <ol className={u.examLine}>
          {EXAMINATIONS.map((x, i) => (
            <li key={x} style={{ ["--i" as string]: i }} id={x === "J1" ? "j1" : undefined}>
              <span className={u.examName}>{x}</span>
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
