import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { resolvePuls } from "@/content/puls";
import { activeAnnouncements } from "@/content/notices";

export const metadata: Metadata = {
  title: "Aktuelles",
  description: "Aktuelle Hinweise der Kinderarztpraxis in Hettstedt – nur, was heute gilt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const deDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export default async function Aktuelles({ searchParams }: { searchParams: Search }) {
  const puls = resolvePuls(await searchParams);
  const notices = activeAnnouncements(puls.result.evaluatedAt.localDate);
  return (
    <PageFrame current="heute" puls={puls}>
      <PageIntro variant="utility" title="Aktuelles" back={{ href: "/heute", label: "Heute" }} lede="Hier steht nur, was heute gilt. Abgelaufene Hinweise verschwinden automatisch." />
      <Section id="liste" tone="paper">
        {notices.length ? (
          <ul className={u.notices}>
            {notices.map((n) => (
              <li key={n.id}>
                <strong>{n.title}</strong>
                <span>{n.shortText}</span>
                {n.validUntil !== "OPEN_ENDED" ? <span className={u.fine}>Gültig bis {deDate(n.validUntil)}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className={u.empty}>
            <p className={u.emptyTitle}>Derzeit gibt es keine besonderen Hinweise.</p>
            <p className={u.lead}>Bei Fragen erreichen Sie die Praxis telefonisch.</p>
            <CallAction />
          </div>
        )}
      </Section>
    </PageFrame>
  );
}
