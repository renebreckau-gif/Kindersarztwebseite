// Feiertage (Phase 09.5H) — the practice-wide holiday rule and the upcoming holidays.
// Every role reads; only a DOCTOR chooses and confirms the rule (preview with the real engine →
// explicit checkbox → POST /intern/feiertage/bestaetigen). Holiday DATES are never edited here
// (ADMIN maintains the calendar). Single holidays are resolved in "Sonderöffnungszeiten" (09.5F).

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import type { HolidayCalendarDoc } from "@/data/payload-mapping";
import { berlinNow } from "@/cockpit/read-model";
import { fromSearch } from "@/cockpit/workflows/form";
import { BRIDGE_NOTE, OVERRIDE_NOTE, POLICY_CHECKBOX, POLICY_STALE, calendarFingerprint, holidayNames, parsePolicyMode, policyDraft } from "@/cockpit/workflows/holiday-policy";
import { POLICY_CHOICE, POLICY_LABEL, RESOLUTION_TEXT, holidayPolicyStatus, policyStateText, upcomingHolidays, type HolidayResolution } from "@/domain/holiday-policy";
import { compareDates, formatDayMonth, formatGermanDate } from "@/domain/time";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";

type Search = Promise<Record<string, string | string[] | undefined>>;
const MODES = ["REQUIRE_EXPLICIT_ENTRY", "CLOSED_ON_PUBLIC_HOLIDAYS"] as const;
const attention = (r: HolidayResolution) => r === "UNRESOLVED";

export default async function Feiertage({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  let data;
  let calendar: HolidayCalendarDoc | null;
  try {
    const payload = await getPayload({ config });
    data = await new PayloadPracticeRepository(payload as unknown as PayloadReader).getPulsData();
    calendar = (await payload.findGlobal({ slug: "holidayCalendar", depth: 0, overrideAccess: true })) as unknown as HolidayCalendarDoc | null;
  } catch {
    return <Unavailable />;
  }
  const today = berlinNow(new Date()).date;
  const q = fromSearch(await searchParams);
  const names = holidayNames(calendar);
  const status = holidayPolicyStatus(data.holidayPolicy, today);
  const upcoming = upcomingHolidays(data, today, names);
  const doctor = staff.role === "DOCTOR";
  const chosen = doctor ? parsePolicyMode(q.get("regel")) : undefined;
  const draft = chosen ? policyDraft(data, chosen, today, names) : null;
  const notice = q.get("status");
  const label = (d: string) => names[d] ?? `Feiertag am ${formatDayMonth(d)}`;

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">Feiertage</h1>
          <p className="cp-intro">{OVERRIDE_NOTE}</p>
        </div>

        {notice === "veraltet" ? (
          <p className="cp-error" role="alert">
            {POLICY_STALE}
          </p>
        ) : notice === "blockiert" || notice === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            {notice === "blockiert" ? "Bitte eine Regel wählen und ausdrücklich bestätigen." : "Die Feiertagsregel konnte nicht gespeichert werden. Es wurde nichts verändert."}
          </p>
        ) : null}

        <section className="cp-panel" aria-labelledby="regel-title">
          <h2 id="regel-title" className="cp-h2">
            Allgemeine Feiertagsregel
          </h2>
          <p className={status.confirmed ? "cp-ok cp-dir-status" : "cp-dir-status cp-dir-attention"}>{policyStateText(status)}</p>
          {status.confirmed && status.lastVerified ? (
            <p className="cp-muted">
              Ärztlich bestätigt{status.verifiedBy ? ` von ${status.verifiedBy.split(",")[0]}` : ""} am {formatDayMonth(status.lastVerified, true)}
              {status.reviewDue ? ` · erneut prüfen bis ${formatDayMonth(status.reviewDue, true)}` : ""}
            </p>
          ) : null}
          {status.state === "EXPIRED" ? <p className="cp-muted">Zuletzt bestätigt: {POLICY_LABEL[status.mode]}{status.lastVerified ? ` (${formatDayMonth(status.lastVerified, true)})` : ""}.</p> : null}
          {!status.confirmed ? <p>Die allgemeine Feiertagsregel ist noch nicht ärztlich bestätigt. Bis dahin wird jeder Feiertag einzeln geklärt.</p> : status.mode === "REQUIRE_EXPLICIT_ENTRY" ? <p>Für jeden Feiertag ist weiterhin ein eigener Eintrag notwendig.</p> : null}
          {staff.role === "ADMIN" ? <p className="cp-muted">Die allgemeine Regel kann nur ärztlich bestätigt werden. Die Feiertagsdaten pflegt die Verwaltung.</p> : null}
          <p className="cp-muted">{BRIDGE_NOTE}</p>
        </section>

        {doctor ? (
          <form method="get" action="/intern/feiertage" className="cp-panel cp-form cp-policy-form">
            <fieldset className="cp-fieldset">
              <legend className="cp-h2">Welche Regel gilt in der Praxis?</legend>
              <div className="cp-choices-row">
                {MODES.map((m) => (
                  <label key={m} className="cp-choice">
                    <input type="radio" name="regel" value={m} defaultChecked={chosen === m} required />
                    <span>{POLICY_CHOICE[m]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="cp-btn cp-btn-secondary">
              Auswirkung anzeigen
            </button>
          </form>
        ) : null}

        {draft ? (
          <>
            <section className="cp-panel" aria-labelledby="wirkung-title">
              <h2 id="wirkung-title" className="cp-h2">
                Auswirkung auf die nächsten Feiertage
              </h2>
              {draft.rows.length ? (
                <ul className="cp-moments">
                  {draft.rows.map((r) => (
                    <li key={r.holiday.date} className="cp-moment">
                      <h3 className="cp-h3">{label(r.holiday.date)}</h3>
                      <p className="cp-muted">{formatGermanDate(r.holiday.date)}</p>
                      <dl className="cp-acute-points">
                        <div>
                          <dt>Aktuell in der Cockpit-Datenbank</dt>
                          <dd>{RESOLUTION_TEXT[r.holiday.resolution]}</dd>
                        </div>
                        <div>
                          <dt>Mit dieser Regel</dt>
                          <dd>{RESOLUTION_TEXT[r.after.resolution]}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cp-muted">Im Feiertagskalender sind für die nächsten zwölf Monate keine Feiertage eingetragen.</p>
              )}
            </section>
            <form method="post" action="/intern/feiertage/bestaetigen" className="cp-panel cp-publish">
              <p className="cp-effect">{draft.effect}</p>
              <input type="hidden" name="regel" value={draft.mode} />
              <input type="hidden" name="fingerprint" value={calendarFingerprint(calendar)} />
              <label className="cp-choice" htmlFor="bestaetigt">
                <input id="bestaetigt" name="bestaetigt" type="checkbox" value="1" required />
                <span>{POLICY_CHECKBOX}</span>
              </label>
              <p className="cp-muted">Die Regel wird in der Cockpit-Datenbank gespeichert und gilt rund sechs Monate bis zur erneuten Prüfung. Die öffentliche Website verwendet weiterhin die bisherigen Daten.</p>
              <button type="submit" className="cp-btn cp-btn-primary">
                {draft.actionLabel}
              </button>
            </form>
          </>
        ) : null}

        <section className="cp-panel" aria-labelledby="kommend-title">
          <h2 id="kommend-title" className="cp-h2">
            Kommende Feiertage
          </h2>
          {upcoming.length ? (
            <ul className="cp-dir-list">
              {upcoming.map((h) => (
                <li key={h.date} className="cp-dir-card cp-holiday">
                  <h3 className="cp-h3">{label(h.date)}</h3>
                  <p className="cp-muted">{formatGermanDate(h.date)}</p>
                  <p className={attention(h.resolution) ? "cp-dir-status cp-dir-attention" : "cp-dir-status"}>{RESOLUTION_TEXT[h.resolution]}</p>
                  {compareDates(h.date, today) > 0 && (h.resolution === "UNRESOLVED" || h.resolution === "POLICY_CLOSED") ? (
                    <Link href={`/intern/sonderzeiten?datum=${h.date}`} className="cp-btn cp-btn-secondary" aria-label={`${h.resolution === "UNRESOLVED" ? "Feiertag klären" : "Sonderöffnungszeit eintragen"}: ${label(h.date)}`}>
                      {h.resolution === "UNRESOLVED" ? "Feiertag klären" : "Sonderöffnungszeit eintragen"}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="cp-muted">Im Feiertagskalender sind für die nächsten zwölf Monate keine Feiertage eingetragen.</p>
          )}
        </section>
      </div>
    </CockpitFrame>
  );
}
