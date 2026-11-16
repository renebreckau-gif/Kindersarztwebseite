import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, Steps, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { loadPublicPage } from "@/site/operational";
import { PRACTICE, publicAddress } from "@/content/practice";
import { typeSummary } from "@/content/schedule";

export const metadata: Metadata = {
  title: "Neu bei uns?",
  description: "Erster Besuch in der Kinderarztpraxis in Hettstedt: anrufen, Sprechzeiten kennen, den Weg finden.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NeuBeiUns({ searchParams }: { searchParams: Search }) {
  const { snapshot, puls } = await loadPublicPage(await searchParams);
  const addr = publicAddress();
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="guidance" title="Neu bei uns?" back={{ href: "/praxis", label: "Praxis" }} lede="Drei Schritte zum ersten Kontakt. Alles Weitere besprechen wir am Telefon." />
      <Section id="schritte" tone="paper" wide>
        <Steps
          steps={[
            {
              title: "Anrufen",
              body: (
                <>
                  <p>Melden Sie sich telefonisch in der Praxis.</p>
                  <CallAction />
                </>
              ),
            },
            {
              title: "Sprechzeiten kennen",
              body: (
                <>
                  <p>
                    Nur Terminsprechstunde: {typeSummary("APPOINTMENT", snapshot.puls).join("; ")}.
                  </p>
                  <p>
                    <Link href="/heute/sprechzeiten">Alle Sprechzeiten</Link>
                  </p>
                </>
              ),
            },
            {
              title: "Den Weg finden",
              body: (
                <>
                  <p className={u.place}>
                    {addr.street ? (
                      <>
                        {addr.street}
                        <br />
                      </>
                    ) : null}
                    {addr.cityLine}
                  </p>
                  <p>
                    <Link href="/praxis/kontakt">Kontakt & Anfahrt</Link>
                  </p>
                </>
              ),
            },
          ]}
        />
        <p className={u.lead}>
          Was Sie zum Besuch mitbringen: <Link href="/praxis/gut-vorbereitet">Gut vorbereitet</Link>
        </p>
      </Section>
      <Section id="fragen" title="Weitere Fragen beantworten wir gern telefonisch." tone="sun">
        <p className={u.lead}>
          Telefon <a href={PRACTICE.phone.value.href}>{PRACTICE.phone.value.display}</a>
        </p>
        <InternalNote>
          <p>
            Nicht veröffentlicht, weil unbestätigt: Ankommen und Empfang, Barrierefreiheit, Kinderwagen, Parken, Nahverkehr (F85–F88). „Was mitbringen“ steht auf „Gut vorbereitet“ (F91–F94, Arbeitsstand 16.11.2026).
            Zur Aufnahme neuer Familien und zu Terminen liegt eine Praxisangabe vor (vorher telefonisch klären; Termine am besten telefonisch, F77, F48) – noch nicht namentlich bestätigt und daher hier nicht ausgebaut.
          </p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
