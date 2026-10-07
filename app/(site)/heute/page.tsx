import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, InternalNote } from "@/site/chrome";
import { PageIntro, Section, StatusStatement, CallAction, EmergencyLink, DayRuler, BigLinks } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { activeAnnouncements } from "@/content/notices";
import { publicAddress } from "@/content/practice";
import { WEEKDAYS } from "@/content/schedule";
import { RELEASE } from "@/content/release";
import { weekdayOf, type IsoWeekday } from "@/domain/time.ts";

export const metadata: Metadata = {
  title: "Heute",
  description: "Ist die Kinderarztpraxis in Hettstedt heute geöffnet? Status, Sprechzeiten heute, Telefon und Notfall-Hinweise.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Heute({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const r = puls.result;
  const today = r.evaluatedAt.localDate;
  const wd = weekdayOf(today) as IsoWeekday;
  const day = WEEKDAYS.find((d) => d.id === wd);
  const minutes = Number(r.evaluatedAt.localTime.slice(0, 2)) * 60 + Number(r.evaluatedAt.localTime.slice(3, 5));
  const notices = activeAnnouncements(today);
  const addr = publicAddress();

  return (
    <PageFrame current="heute" puls={puls}>
      <PageIntro variant="utility" title="Heute in der Praxis" back={{ href: "/", label: "Start" }}>
        <StatusStatement puls={puls} />
        <div className={u.actions}>
          <CallAction />
          <EmergencyLink />
        </div>
      </PageIntro>

      {!RELEASE.pulsPracticeSignOff && puls.mode === "LIVE" ? (
        <div className={u.noteWrap}>
          <InternalNote>
            <p>
              Der Live-Status bleibt neutral, bis die Praxis die Sprechzeiten freigegeben hat (LB-00). Vorschau mit Status: ?vorschau=freigabe&amp;zeit=2026-10-06T09:30
            </p>
          </InternalNote>
        </div>
      ) : null}

      <Section id="heute-zeiten" title={day ? `Sprechzeiten am ${day.name}` : "Sprechzeiten"} tone="paper">
        {day ? <DayRuler weekday={wd} nowMinutes={minutes} /> : <p className={u.lead}>Die regulären Sprechzeiten finden Sie in der Wochenübersicht.</p>}
        <p className={u.fine}>
          Das sind die regulären Zeiten. An Feiertagen und bei kurzfristigen Änderungen gilt der Status oben. <Link href="/heute/sprechzeiten">Wochenübersicht</Link>
        </p>
      </Section>

      <Section id="akutsprechstunde" title="Akutsprechstunde" tone="plaster">
        <p className={u.lead}>Aktuelle Informationen zur Akutsprechstunde werden geprüft. Bitte kontaktieren Sie die Praxis.</p>
        <CallAction />
      </Section>

      <Section id="hinweise" title="Aktuelle Hinweise" tone="paper">
        {notices.length ? (
          <ul className={u.notices}>
            {notices.map((n) => (
              <li key={n.id}>
                <strong>{n.title}</strong>
                <span>{n.shortText}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={u.lead}>Derzeit gibt es keine besonderen Hinweise.</p>
        )}
      </Section>

      <Section id="wege" title="So erreichen Sie uns" tone="sun">
        <BigLinks
          items={[
            { label: "Kontakt & Anfahrt", text: addr.street ? `${addr.street}, ${addr.cityLine}` : addr.cityLine, href: "/praxis/kontakt" },
            { label: "Sprechzeiten der Woche", text: "Alle regulären Zeiten im Überblick", href: "/heute/sprechzeiten" },
            { label: "Notfall", text: "Bei Lebensgefahr: 112", href: "/notfall" },
          ]}
        />
      </Section>
    </PageFrame>
  );
}
