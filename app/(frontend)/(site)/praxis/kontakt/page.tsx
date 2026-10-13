import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { PRACTICE, publicAddress } from "@/content/practice";

export const metadata: Metadata = {
  title: "Kontakt & Anfahrt",
  description: "Kontakt zur Kinderarztpraxis in Hettstedt: Telefon, Fax und E-Mail.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Kontakt({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const addr = publicAddress();
  return (
    <PageFrame current="praxis" puls={puls}>
      <PageIntro variant="editorial" title="Kontakt & Anfahrt" back={{ href: "/praxis", label: "Praxis" }}>
        <CallAction />
      </PageIntro>
      <Section id="kontakt" tone="paper" wide>
        <dl className={u.contact}>
          <div>
            <dt>Telefon</dt>
            <dd>
              <a href={PRACTICE.phone.value.href}>{PRACTICE.phone.value.display}</a>
            </dd>
          </div>
          <div>
            <dt>Fax</dt>
            <dd>{PRACTICE.fax.value}</dd>
          </div>
          <div>
            <dt>E-Mail</dt>
            <dd>
              <a href={`mailto:${PRACTICE.email.value}`}>{PRACTICE.email.value}</a>
            </dd>
          </div>
          <div>
            <dt>Ort</dt>
            <dd>
              {addr.street ? (
                <>
                  {addr.street}
                  <br />
                </>
              ) : null}
              {addr.cityLine}
            </dd>
          </div>
        </dl>
        <p className={u.fine}>
          Sprechzeiten: <Link href="/heute/sprechzeiten">Wochenübersicht</Link> · Bei Lebensgefahr: <a href="tel:112">112</a>
        </p>
      </Section>
      <Section id="anfahrt" title="Anfahrt" tone="plaster">
        <p className={u.lead}>Die Wegbeschreibung folgt hier – ohne eingebettete Karte, damit Ihre Daten nicht ungefragt an Kartendienste gehen. Bis dahin helfen wir Ihnen gern telefonisch weiter.</p>
        <InternalNote>
          <p>
            Straße und Hausnummer (F13) sind unbestätigt (Schreibweise in den Quellen uneinheitlich) – deshalb noch keine Adresse und kein Routen-Link (LB-03). Parken, Nahverkehr, Eingang,
            Barrierefreiheit und Kinderwagen (F77–F88) sind unbestätigt. Nutzung der E-Mail für Patientenanliegen (F18) unbestätigt.
          </p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
