// Undo preview (Phase 09.5B; announcements 09.5D): what the cockpit database shows now vs. after
// undoing this change — Praxis Puls cards for opening data, "Aktuelle Hinweise" lists for notices.
// Nothing happens on GET; the final authenticated POST goes to /intern/verlauf/ruecknahme.

import config from "@payload-config";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { resolvePuls } from "@/content/puls";
import { previewUndo } from "@/cockpit/workflows/publish";
import { groupChanges, recentEvents, relativeTime } from "@/cockpit/history";
import { STAGING_PUBLISHED, STALE_UNDO } from "@/cockpit/workflows/wording";
import { zonedParts } from "@/domain/time";
import type { PayloadReader } from "@/backend/payload-repository";
import { StatusStatement } from "@/site/blocks";
import { announcementDates, dayDiffs } from "@/cockpit/facts";
import { selectPublicAnnouncements } from "@/domain/publication";
import { NoticeList } from "@/site/notice-list";
import { dayMonth } from "@/cockpit/workflows/wording";
import { DayDiffList } from "../../../facts-parts";
import { CockpitFrame } from "../../../../cockpit-frame";
import { internSession } from "../../../../session";
import { Unavailable } from "../../../../unavailable";

type Params = Promise<{ vorgang: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function Zuruecknehmen({ params, searchParams }: { params: Params; searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { vorgang } = await params;
  const q = await searchParams;
  if (!UUID.test(vorgang)) redirect("/intern");

  const now = new Date();
  let view;
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: await headers() });
    view = await previewUndo(payload, user as never, vorgang, now);
    const groups = groupChanges(await recentEvents(payload as unknown as PayloadReader, 100), zonedParts(now).date);
    view = { ...view, group: groups.find((g) => g.key === vorgang) };
  } catch {
    return <Unavailable />;
  }
  const { plan, data, fingerprint, group } = view;

  return (
    <CockpitFrame staff={session.staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Änderung zurücknehmen</h1>
          {group ? (
            <p className="cp-intro">
              <strong>{group.title}</strong> · von {group.actorName} · {relativeTime(group.at, now)}
            </p>
          ) : null}
        </div>

        {q.status === "veraltet" ? (
          <p className="cp-error" role="alert">
            {STALE_UNDO}
          </p>
        ) : null}
        {q.status === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            Die Änderung konnte nicht zurückgenommen werden. Es wurde nichts verändert.
          </p>
        ) : null}

        {!plan.ok ? (
          <div className="cp-error" role="alert">
            <p className="cp-alert-text">{plan.message}</p>
            <Link href="/intern" className="cp-btn cp-btn-secondary">
              Zur Übersicht
            </Link>
          </div>
        ) : (
          <>
            {plan.touches.puls ? (
            <>
            <div className="cp-grid cp-grid-preview" aria-live="polite">
              <section className="cp-panel" aria-labelledby="jetzt-title">
                <h2 id="jetzt-title" className="cp-h2">
                  Aktuell in der Cockpit-Datenbank
                </h2>
                <StatusStatement puls={resolvePuls({}, now, data)} />
              </section>
              <section className="cp-panel cp-panel-after" aria-labelledby="danach-title">
                <h2 id="danach-title" className="cp-h2">
                  Nach dem Zurücknehmen
                </h2>
                <StatusStatement puls={resolvePuls({}, now, plan.after)} />
              </section>
            </div>
            {/* 09.5C: identical headlines can hide different hours, closures or replacements — show the facts. */}
            <DayDiffList diffs={dayDiffs(data, plan.after, zonedParts(now).date)} />
            </>
            ) : null}
            {plan.touches.announcements ? (
              <section className="cp-panel" aria-labelledby="hinweise-title">
                <h2 id="hinweise-title" className="cp-h2">
                  Aktuelle Hinweise
                </h2>
                <ul className="cp-moments cp-moments-wide">
                  {announcementDates(plan.announcementsBefore, plan.announcementsAfter, zonedParts(now).date).map((d) => {
                    const today = zonedParts(now).date;
                    const nowList = selectPublicAnnouncements(plan.announcementsBefore, d);
                    const afterList = selectPublicAnnouncements(plan.announcementsAfter, d);
                    return (
                      <li key={d} className="cp-moment">
                        <h3 className="cp-h3">{d === today ? `Heute (${dayMonth(d)})` : `Ab ${dayMonth(d)}`}</h3>
                        <div className="cp-compare">
                          <div>
                            <h4 className="cp-label">Aktuell in der Cockpit-Datenbank</h4>
                            {nowList.length ? <NoticeList notices={nowList} showValidity /> : <p className="cp-muted">Keine Hinweise.</p>}
                          </div>
                          <div>
                            <h4 className="cp-label">Nach dem Zurücknehmen</h4>
                            {afterList.length ? <NoticeList notices={afterList} showValidity /> : <p className="cp-muted">Keine Hinweise.</p>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <form method="post" action="/intern/verlauf/ruecknahme" className="cp-panel cp-publish">
              <p className="cp-effect">Der vorherige Stand wird wiederhergestellt. Nichts wird gelöscht: Die Änderung und ihre Rücknahme bleiben im Verlauf.</p>
              <p className="cp-muted">{STAGING_PUBLISHED.website}</p>
              <input type="hidden" name="vorgang" value={vorgang} />
              <input type="hidden" name="fingerprint" value={fingerprint} />
              <button type="submit" className="cp-btn cp-btn-primary">
                Änderung zurücknehmen
              </button>
            </form>
          </>
        )}
      </div>
    </CockpitFrame>
  );
}
