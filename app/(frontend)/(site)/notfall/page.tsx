import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { Section, CallAction, PageBackNav } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { publicEmergency } from "@/content/notices";
import { SOURCES } from "@/content/sources";

export const metadata: Metadata = {
  title: "Notfall",
  description: "Notfall-Hinweise der Kinderarztpraxis in Hettstedt: Bei Lebensgefahr 112. Wenn die Praxis geschlossen ist: ärztlicher Bereitschaftsdienst 116117. Während der Sprechzeiten: Praxis anrufen.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const deDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export default async function Notfall({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const today = puls.result.evaluatedAt.localDate;
  const list = publicEmergency(today);
  const immediate = list.find((e) => e.type === "IMMEDIATE_EMERGENCY");
  // tier 2: nationwide on-call service (116117) — official, verified; no local claims
  const onCall = list.find((e) => e.type === "MEDICAL_ON_CALL" && e.phone === "116117");
  const others = list.filter((e) => e.type !== "IMMEDIATE_EMERGENCY" && e !== onCall);
  const stand = list.map((e) => e.verification.lastVerified).filter(Boolean).sort()[0];

  return (
    <PageFrame puls={puls}>
      {/* 112 is unconditional (R7) — first, largest, no decoration */}
      <section className={u.emergencyHero} aria-labelledby="notfall-t">
        {/* secondary: neutral, small, above the title — never inside or near the 112 action */}
        <PageBackNav href="/" label="Start" />
        <h1 id="notfall-t" className={u.emergencyTitle}>
          Notfall
        </h1>
        <div className={u.emergency112}>
          <p className={u.e112When}>{immediate?.whenToUse ?? "Bei Lebensgefahr"}</p>
          <a className={u.e112Call} href="tel:112">
            <span className={u.e112Num}>112</span>
            <span>Notruf anrufen</span>
          </a>
        </div>
      </section>

      {onCall ? (
        <section className={u.onCall} aria-labelledby="bereitschaft-t">
          <h2 id="bereitschaft-t" className={u.onCallTitle}>
            Wenn die Praxis geschlossen ist
          </h2>
          <p className={u.onCallWhen}>Wenn es nicht bis zum nächsten Praxistag warten kann: der ärztliche Bereitschaftsdienst.</p>
          <a className={u.onCallCall} href={`tel:${onCall.phone}`} aria-label="116117 – ärztlichen Bereitschaftsdienst anrufen">
            <span className={u.onCallNum}>116117</span>
            <span>Anrufen</span>
          </a>
          <p className={u.onCallFacts}>{onCall.description}</p>
          <p className={u.onCallNot}>Nicht bei Lebensgefahr – dann immer 112.</p>
          <p className={u.fine}>
            Quelle: <a href={onCall.sourceUrl ?? SOURCES.KBV_116117.url}>{SOURCES.KBV_116117.publisher}</a>
            {onCall.verification.lastVerified ? `, geprüft am ${deDate(onCall.verification.lastVerified)}` : ""}.
          </p>
        </section>
      ) : null}

      <Section id="praxis" title="Während der Sprechzeiten" tone="paper">
        <p className={u.lead}>Rufen Sie die Praxis an. Wann wir erreichbar sind, steht unter <Link href="/heute/sprechzeiten">Sprechzeiten</Link>.</p>
        <CallAction label="Praxis anrufen" />
      </Section>

      {others.length ? (
        <Section id="weitere" title="Weitere Nummern" tone="plaster">
          <ul className={u.notices}>
            {others.map((e) => (
              <li key={e.id}>
                <strong>{e.name}</strong>
                <span>{e.whenToUse}</span>
                {e.phone ? <a href={`tel:${e.phone}`}>{e.phone}</a> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className={u.noteWrap}>
        {stand ? <p className={u.fine}>Stand der Notfallangaben: {deDate(stand)}</p> : null}
        <InternalNote>
          <p>
            116117 (F57) ist als bundesweite, offizielle Angabe geprüft (116117.de, 07.10.2026) – ohne Aussage zu Praxisvertretung oder örtlichen Bereitschaftspraxen. Giftnotruf (F58),
            KV-Bereitschaftspraxen vor Ort (F59, F60), Kliniken (F61–F64) und Apothekennotdienst (F65) sind unbestätigt. Sie erscheinen automatisch, sobald sie geprüft sind (LB-10). Die
            alten Angaben der WordPress-Seite werden nicht übernommen.
          </p>
        </InternalNote>
      </div>
    </PageFrame>
  );
}
