import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, Steps, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { PRACTICE, publicAddress } from "@/content/practice";
import { typeSummary } from "@/content/schedule";

export const metadata: Metadata = {
  title: "Neu bei uns?",
  description: "Erster Besuch in der Kinderarztpraxis in Hettstedt: anrufen, Sprechzeiten kennen, den Weg finden.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NeuBeiUns({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
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
                    Bitte nur mit gesunden Kindern: {typeSummary("HEALTHY_ONLY").join("; ")}. Nur Terminsprechstunde: {typeSummary("APPOINTMENT").join("; ")}.
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
      </Section>
      <Section id="fragen" title="Weitere Fragen beantworten wir gern telefonisch." tone="sun">
        <p className={u.lead}>
          Telefon <a href={PRACTICE.phone.value.href}>{PRACTICE.phone.value.display}</a>
        </p>
        <InternalNote>
          <p>
            Nicht veröffentlicht, weil unbestätigt: Terminvereinbarung (F48), Aufnahme neuer Familien, Was mitbringen, Ankommen und Empfang, Barrierefreiheit, Kinderwagen, Parken, Nahverkehr
            (F77–F88), Straße und Hausnummer (F13).
          </p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
