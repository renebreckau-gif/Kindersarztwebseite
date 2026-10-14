// "Hinweis veröffentlichen" — REAL workflow against the cockpit database (Phase 09.5D).
// Deliberately small: Titel, Kurzer Hinweis, Gültig ab, Gültig bis ODER Ohne Enddatum. Category,
// homepage highlight and priority are NOT offered (the public site does not show them yet); they
// are set (new) or preserved (edit) on the server. Works without JavaScript: the GET form only
// rebuilds the draft and preview; the single write is the POST to /intern/hinweis/veroeffentlichen.

import config from "@payload-config";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPayload } from "payload";
import { ANNOUNCEMENTS } from "@/content/notices";
import { selectPublicAnnouncements } from "@/domain/publication";
import { ANNOUNCEMENT_TEXT_MAX, ANNOUNCEMENT_TITLE_MAX } from "@/domain/announcements";
import type { Announcement } from "@/domain/content-types";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { announcementFingerprint } from "@/cockpit/workflows/snapshot";
import { announcementDraft, formDefaults, inputFromAnnouncement, isEditableAnnouncement, noticeState, OPEN_ENDED_NOTE, validityText, type AnnouncementInput, type AnnouncementResult, type AnnouncementSection } from "@/cockpit/workflows/announcement";
import { announcementQuery, fromSearch, parseAnnouncement } from "@/cockpit/workflows/form";
import { berlinNow } from "@/cockpit/read-model";
import { PRIVACY_HINT, STAGING_PUBLISHED } from "@/cockpit/workflows/wording";
import { NoticeList } from "@/site/notice-list";
import { CockpitFrame } from "../../cockpit-frame";
import type { InternStaff } from "../../session";
import { Unavailable } from "../../unavailable";
import { StatusNotice } from "../heute/workflow-parts";

type Raw = Record<string, string | string[] | undefined>;

const SECTION_TITLE: Record<AnnouncementSection, string> = { titel: "Titel", text: "Kurzer Hinweis", zeitraum: "Zeitraum" };

export async function AnnouncementWorkflow({ staff, raw, recordId }: { staff: InternStaff; raw: Raw; recordId?: string }) {
  const q = fromSearch(raw);
  const submitted = q.get("titel") !== undefined;
  const base = recordId ? `/intern/hinweis/${encodeURIComponent(recordId)}` : "/intern/hinweis";
  const now = new Date();
  const today = berlinNow(now).date;

  let result: AnnouncementResult;
  let current: Announcement[] = [];
  let input: AnnouncementInput;
  try {
    const payload = await getPayload({ config });
    // ACTIVE database announcements (never the static website list).
    const announcements = await new PayloadPracticeRepository(payload as unknown as PayloadReader).getAnnouncements();
    const editing = recordId ? announcements.find((a) => a.id === recordId) : undefined;
    input = submitted ? parseAnnouncement(q) : editing ? inputFromAnnouncement(editing) : formDefaults(today);
    // The record id comes from the PATH only; the new page never edits.
    input = recordId ? { ...input, recordId } : (({ recordId: _r, ...rest }) => rest)(input);
    result = announcementDraft(announcements, now, input, announcementFingerprint(announcements));
    current = announcements.filter((a) => isEditableAnnouncement(a, today)).sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  } catch {
    return <Unavailable />;
  }

  const { draft, details } = result;
  const notEditable = !draft.ok && draft.blocked.code === "NOT_EDITABLE";
  const problems = submitted ? details.problems : details.problems.filter((p) => p.code === "NOT_EDITABLE");
  const msgs = (s: AnnouncementSection) => problems.filter((p) => p.section === s).map((p) => p.message);
  const editing = details.editing;

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow cp-planned">
        <div>
          <Link href="/intern" className="cp-back">
            Zur Übersicht
          </Link>
          <h1 className="cp-h1">{editing ? "Hinweis bearbeiten" : "Hinweis veröffentlichen"}</h1>
          <p className="cp-intro">{editing ? `Sie bearbeiten „${editing.title}“. Die bisherige Fassung bleibt im Verlauf erhalten.` : "Ein kurzer Hinweis für „Aktuelle Hinweise“ auf der Website. Er endet automatisch am letzten Tag."}</p>
        </div>

        <StatusNotice status={q.get("status")} />

        {notEditable ? (
          <div className="cp-error" role="alert">
            <p className="cp-alert-text">{!draft.ok ? draft.blocked.message : ""}</p>
            <Link href="/intern/hinweis" className="cp-btn cp-btn-secondary">
              Zu den Hinweisen
            </Link>
          </div>
        ) : (
          <>
            {!recordId ? <CurrentNotices list={current} today={today} /> : null}

            {problems.length ? (
              <div className="cp-error cp-summary" role="alert" aria-labelledby="probleme-title">
                <p id="probleme-title" className="cp-alert-text">
                  {problems.length === 1 ? "Bitte prüfen:" : `Bitte prüfen (${problems.length}):`}
                </p>
                <ul>
                  {problems.map((p, i) => (
                    <li key={i}>
                      {p.section ? (
                        <>
                          <a href={`#abschnitt-${p.section}`} className="cp-text-link">
                            {SECTION_TITLE[p.section]}
                          </a>
                          {": "}
                        </>
                      ) : null}
                      {p.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form method="get" action={base} className="cp-panel cp-form">
              <Section id="titel" no={1} title="Inhalt" errors={[...msgs("titel"), ...msgs("text")]}>
                <div className="cp-field" id="abschnitt-titel">
                  <label htmlFor="titel" className="cp-label">
                    Titel
                  </label>
                  <input id="titel" name="titel" type="text" maxLength={ANNOUNCEMENT_TITLE_MAX} className="cp-input" defaultValue={input.title} aria-invalid={msgs("titel").length > 0 || undefined} aria-describedby={["titel-hilfe", msgs("titel").length ? "fehler-titel" : ""].filter(Boolean).join(" ")} />
                  <p id="titel-hilfe" className="cp-help">
                    {`Höchstens ${ANNOUNCEMENT_TITLE_MAX} Zeichen, z. B. „Telefon am Freitag eingeschränkt“.`}
                  </p>
                </div>
                <div className="cp-field" id="abschnitt-text">
                  <label htmlFor="text" className="cp-label">
                    Kurzer Hinweis
                  </label>
                  <textarea id="text" name="text" rows={4} maxLength={ANNOUNCEMENT_TEXT_MAX} className="cp-input cp-textarea" defaultValue={input.shortText} aria-invalid={msgs("text").length > 0 || undefined} aria-describedby={["text-hilfe", msgs("text").length ? "fehler-titel" : ""].filter(Boolean).join(" ")} />
                  <p id="text-hilfe" className="cp-help">
                    {`Höchstens ${ANNOUNCEMENT_TEXT_MAX} Zeichen. ${PRIVACY_HINT}`}
                  </p>
                </div>
              </Section>

              <Section id="zeitraum" no={2} title="Zeitraum" errors={msgs("zeitraum")}>
                <div className="cp-field">
                  <label htmlFor="ab" className="cp-label">
                    Gültig ab
                  </label>
                  <input id="ab" name="ab" type="date" className="cp-input cp-input-date" defaultValue={input.validFrom} min={editing ? undefined : today} aria-invalid={msgs("zeitraum").length > 0 || undefined} aria-describedby={msgs("zeitraum").length ? "fehler-zeitraum" : undefined} />
                </div>
                <div role="radiogroup" aria-label="Ende des Hinweises">
                  <label className="cp-choice">
                    <input type="radio" name="ende" value="datum" defaultChecked={input.mode !== "OPEN"} />
                    Mit Enddatum
                  </label>
                  <div className="cp-field cp-indent">
                    <label htmlFor="bis" className="cp-label">
                      Gültig bis <span className="cp-optional">(bei „Mit Enddatum“)</span>
                    </label>
                    <input id="bis" name="bis" type="date" className="cp-input cp-input-date" defaultValue={input.validUntil} min={input.validFrom || today} aria-invalid={msgs("zeitraum").length > 0 || undefined} aria-describedby="bis-hilfe" />
                    <p id="bis-hilfe" className="cp-help">
                      Vorschlag: zwei Wochen. Der Hinweis verschwindet nach dem letzten Tag automatisch.
                    </p>
                  </div>
                  <label className="cp-choice">
                    <input type="radio" name="ende" value="offen" defaultChecked={input.mode === "OPEN"} aria-describedby="offen-hilfe" />
                    Ohne Enddatum
                  </label>
                  <p id="offen-hilfe" className="cp-help cp-indent">
                    {`${OPEN_ENDED_NOTE} Das Cockpit erinnert nach 30 Tagen unter „Prüfen“.`}
                  </p>
                </div>
              </Section>

              <button type="submit" className="cp-btn cp-btn-secondary">
                Vorschau aktualisieren
              </button>
            </form>

            <Preview result={result} />

            {draft.ok ? (
              <form method="post" action="/intern/hinweis/veroeffentlichen" className="cp-panel cp-publish" aria-labelledby="veroeffentlichen-title">
                <h2 id="veroeffentlichen-title" className="cp-h2 cp-step">
                  <span className="cp-step-no" aria-hidden="true">
                    4
                  </span>{" "}
                  Veröffentlichen
                </h2>
                <p className="cp-effect">{draft.effect}</p>
                <p className="cp-muted">{STAGING_PUBLISHED.storedNote}</p>
                {[...new URLSearchParams(announcementQuery(input))].map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                {editing ? <input type="hidden" name="eintrag" value={editing.id} /> : null}
                <input type="hidden" name="fingerprint" value={draft.fingerprint} />
                <button type="submit" className="cp-btn cp-btn-primary">
                  {draft.actionLabel}
                </button>
              </form>
            ) : submitted ? (
              <section className="cp-panel" aria-labelledby="veroeffentlichen-title">
                <h2 id="veroeffentlichen-title" className="cp-h2 cp-step">
                  <span className="cp-step-no" aria-hidden="true">
                    4
                  </span>{" "}
                  Veröffentlichen
                </h2>
                <p className="cp-muted">Noch nicht möglich – bitte zuerst die Hinweise oben klären und die Vorschau aktualisieren.</p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </CockpitFrame>
  );
}

function Section({ id, no, title, errors, children }: { id: AnnouncementSection; no: number; title: string; errors: string[]; children: ReactNode }) {
  return (
    <fieldset id={id === "zeitraum" ? "abschnitt-zeitraum" : undefined} className="cp-fieldset cp-section" aria-describedby={errors.length ? `fehler-${id}` : undefined}>
      <legend className="cp-h2 cp-step">
        <span className="cp-step-no" aria-hidden="true">
          {no}
        </span>{" "}
        {title}
      </legend>
      {errors.length ? (
        <div id={`fehler-${id}`} className="cp-field-error">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      ) : null}
      {children}
    </fieldset>
  );
}

/** Current and upcoming ACTIVE notices from the database, with their state by the publication rule. */
function CurrentNotices({ list, today }: { list: Announcement[]; today: string }) {
  return (
    <section className="cp-panel" aria-labelledby="bestehend-title">
      <h2 id="bestehend-title" className="cp-h2">
        Aktuelle und geplante Hinweise
      </h2>
      {list.length ? (
        <ul className="cp-dates">
          {list.map((a) => {
            const state = noticeState(a, today);
            return (
              <li key={a.id} className="cp-date-row">
                <span className="cp-date-label">{a.title}</span>
                <span className="cp-date-note">{validityText(a)}</span>
                <span className="cp-date-title">{state.attention ? <span className="cp-badge cp-badge-attention">{state.label}</span> : <span className="cp-badge">{state.label}</span>}</span>
                <Link href={`/intern/hinweis/${encodeURIComponent(a.id)}`} className="cp-btn cp-btn-quiet cp-date-edit" aria-label={`Hinweis „${a.title}“ bearbeiten`}>
                  Bearbeiten
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="cp-muted">In der Cockpit-Datenbank ist derzeit kein aktueller oder geplanter Hinweis eingetragen.</p>
      )}
    </section>
  );
}

/** 3. Website-Vorschau: database (with the change) vs. the current static website — same selection rule. */
function Preview({ result }: { result: AnnouncementResult }) {
  const { details } = result;
  return (
    <section className="cp-panel" aria-labelledby="vorschau-title">
      <h2 id="vorschau-title" className="cp-h2 cp-step">
        <span className="cp-step-no" aria-hidden="true">
          3
        </span>{" "}
        Website-Vorschau
      </h2>
      {details.moments.length ? (
        <>
          <p className="cp-muted">„Aktuelle Hinweise“ an diesen Tagen – links aus der Cockpit-Datenbank mit dieser Änderung, rechts die aktuelle Website (fest hinterlegte Daten). Unterschiede sind in der Testumgebung erwartet.</p>
          <ul className="cp-moments cp-moments-wide" aria-live="polite">
            {details.moments.map((m) => (
              <li key={m.date} className="cp-moment">
                <h3 className="cp-h3">{m.label}</h3>
                <p className={m.decision.visible ? "cp-ok" : "cp-diff"}>
                  {m.decision.visible ? "Dieser Hinweis ist sichtbar." : "Dieser Hinweis ist nicht sichtbar."}
                  {m.decision.editorMessages.length ? ` ${m.decision.editorMessages.join(" ")}` : ""}
                </p>
                <div className="cp-compare">
                  <div>
                    <h4 className="cp-label">Cockpit-Datenbank</h4>
                    {m.after.length ? <NoticeList notices={m.after} showValidity /> : <p className="cp-muted">Keine Hinweise.</p>}
                  </div>
                  <div>
                    <h4 className="cp-label">Aktuelle Website</h4>
                    <StaticNotices date={m.date} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="cp-muted">Sobald Titel, Text und Zeitraum gültig sind, zeigt die Vorschau „Aktuelle Hinweise“ heute, am ersten und letzten Tag und am Tag danach (ohne Enddatum: am Prüfdatum).</p>
      )}
    </section>
  );
}

function StaticNotices({ date }: { date: string }) {
  const list = selectPublicAnnouncements(ANNOUNCEMENTS, date);
  return list.length ? <NoticeList notices={list} showValidity /> : <p className="cp-muted">Keine Hinweise.</p>;
}
