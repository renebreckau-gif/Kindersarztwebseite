import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, WeekHours, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { weekdayOf, type IsoWeekday } from "@/domain/time.ts";

export const metadata: Metadata = {
  title: "Sprechzeiten",
  description: "Sprechzeiten der Kinderarztpraxis in Hettstedt: alle regulären Zeiten der Woche, Zeiten nur für gesunde Kinder und die Terminsprechstunde.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Sprechzeiten({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const wd = weekdayOf(puls.result.evaluatedAt.localDate) as IsoWeekday;

  return (
    <PageFrame current="heute" puls={puls}>
      <PageIntro variant="utility" title="Sprechzeiten" back={{ href: "/heute", label: "Heute" }} lede="Die regulären Zeiten der Woche. Ob die Praxis gerade geöffnet ist, sehen Sie unter Heute." />

      <Section id="woche" tone="paper" wide>
        <WeekHours today={wd} />
        <dl className={u.legend}>
          <div>
            <dt>
              <span className={u.swHealthy} aria-hidden="true" /> Bitte nur gesunde Kinder
            </dt>
            <dd>In diesen Zeiten bitte nur mit gesunden Kindern kommen.</dd>
          </div>
          <div>
            <dt>
              <span className={u.swAppointment} aria-hidden="true" /> Nur Terminsprechstunde
            </dt>
            <dd>Nur mit vereinbartem Termin.</dd>
          </div>
        </dl>
      </Section>

      <Section id="akutsprechstunde" title="Akutsprechstunde" tone="plaster">
        <p className={u.lead}>Aktuelle Informationen zur Akutsprechstunde werden geprüft. Bitte kontaktieren Sie die Praxis.</p>
        <CallAction />
        <InternalNote>
          <p>Akutzeiten (F44–F46) und die Bedeutung von „nur gesunde Patienten“ (F42) sind unbestätigt und werden nicht veröffentlicht.</p>
        </InternalNote>
      </Section>

      <Section id="besondere-zeiten" title="Feiertage und Änderungen" tone="paper">
        <p className={u.lead}>
          An Feiertagen, Brückentagen und bei kurzfristigen Änderungen erfragen Sie die Zeiten bitte telefonisch. Außerhalb der Sprechzeiten: <Link href="/notfall">Notfall-Hinweise</Link>.
        </p>
        <InternalNote>
          <p>Wochenende (F40), Feiertage (F49), Telefonzeiten (F19) und kommende Schließungen (F54) sind unbestätigt. Die Zeiten oben sind bestätigt; PRAXIS PULS nutzt sie seit der Freigabe LB-00 (07.10.2026) live.</p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
