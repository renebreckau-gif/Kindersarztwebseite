import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { Section, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { publicEmergency } from "@/content/notices";

export const metadata: Metadata = {
  title: "Notfall",
  description: "Notfall-Hinweise der Kinderarztpraxis in Hettstedt: Bei Lebensgefahr 112. Während der Sprechzeiten: Praxis anrufen.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const deDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export default async function Notfall({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const today = puls.result.evaluatedAt.localDate;
  const list = publicEmergency(today);
  const immediate = list.find((e) => e.type === "IMMEDIATE_EMERGENCY");
  const others = list.filter((e) => e.type !== "IMMEDIATE_EMERGENCY");
  const stand = list.map((e) => e.verification.lastVerified).filter(Boolean).sort()[0];

  return (
    <PageFrame puls={puls}>
      {/* 112 is unconditional (R7) — first, largest, no decoration */}
      <section className={u.emergencyHero} aria-labelledby="notfall-t">
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
            Ärztlicher Bereitschaftsdienst 116117 (F57), Giftnotruf (F58), KV-Bereitschaftsdienste (F59, F60), Kliniken (F61–F64) und Apothekennotdienst (F65) sind unbestätigt. Sie erscheinen
            automatisch, sobald sie geprüft sind (LB-10). Die alten Angaben der WordPress-Seite werden nicht übernommen.
          </p>
        </InternalNote>
      </div>
    </PageFrame>
  );
}
