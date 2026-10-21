import type { Metadata } from "next";
import { PageFrame } from "@/site/chrome";
import { PageIntro, Section, CallAction } from "@/site/blocks";
import u from "@/site/pages.module.css";
import { loadPublicPage } from "@/site/operational";
import { activeAnnouncements } from "@/content/notices";
import { NoticeList } from "@/site/notice-list";

export const metadata: Metadata = {
  title: "Aktuelles",
  description: "Aktuelle Hinweise der Kinderarztpraxis in Hettstedt – nur, was heute gilt.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function Aktuelles({ searchParams }: { searchParams: Search }) {
  const { snapshot, puls } = await loadPublicPage(await searchParams);
  const notices = activeAnnouncements(puls.result.evaluatedAt.localDate, snapshot.announcements);
  return (
    <PageFrame current="heute" puls={puls}>
      <PageIntro variant="utility" title="Aktuelles" back={{ href: "/heute", label: "Heute" }} lede="Hier steht nur, was heute gilt. Abgelaufene Hinweise verschwinden automatisch." />
      <Section id="liste" tone="paper">
        {notices.length ? (
          <NoticeList notices={notices} showValidity />
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
