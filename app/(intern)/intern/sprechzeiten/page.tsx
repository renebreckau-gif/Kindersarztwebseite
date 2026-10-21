// Regelmäßige Sprechzeiten (Phase 09.5I) — the physician-governed regular weekly plan.
// Every role READS the stored week; only a DOCTOR edits it — always the COMPLETE week (seven weekdays,
// each "Geöffnet" with intervals or "Geschlossen"), previewed with the real engine, confirmed with an
// explicit checkbox (POST /intern/sprechzeiten/bestaetigen). NON-ACUTE only: the Akutsprechstunde stays
// in /intern/akutsprechstunde (09.5E). Works without JavaScript: the GET form rebuilds draft + preview.

import config from "@payload-config";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { PayloadPracticeRepository, type PayloadReader } from "@/backend/payload-repository";
import { berlinNow } from "@/cockpit/read-model";
import { fromSearch, parseWeeklyPlan, weeklyPlanQuery } from "@/cockpit/workflows/form";
import { datasetFingerprint } from "@/cockpit/workflows/snapshot";
import {
  MAX_WEEK_ROWS,
  NOTHING_CHANGED,
  PLAN_CHECKBOX,
  PLAN_STALE,
  PUBLIC_STATIC_NOTE,
  READ_ONLY_TEXT,
  inputFromSchedule,
  regularTypeOptions,
  typeLabel,
  weeklyPlanDraft,
  type WeeklyPlanInput,
} from "@/cockpit/workflows/weekly-plan";
import { WEEKLY_DOCTOR_ONLY } from "@/cockpit/workflows/publish";
import { DAY_NAME, WEEKDAYS_ALL, acuteRulesOf, isWeekday, sortRules, weeklyPlanStatus, weeklyScheduleProblems } from "@/domain/weekly-plan";
import { formatGermanDate } from "@/domain/time";
import { CockpitFrame } from "../../cockpit-frame";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { statusWord } from "../akutsprechstunde/acute-parts";
import { AcuteNote, PlanStatusLine, WeekView, ruleLine } from "./week-parts";

type Search = Promise<Record<string, string | string[] | undefined>>;

const nonEmpty = (input: WeeklyPlanInput): WeeklyPlanInput =>
  Object.fromEntries(WEEKDAYS_ALL.map((wd) => [wd, { ...input[wd], rows: input[wd].rows.filter((r) => r.start || r.end || r.type) }])) as WeeklyPlanInput;

export default async function Sprechzeiten({ searchParams }: { searchParams: Search }) {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  let data;
  try {
    data = await new PayloadPracticeRepository((await getPayload({ config })) as unknown as PayloadReader).getPulsData();
  } catch {
    return <Unavailable />;
  }
  const today = berlinNow(new Date()).date;
  const q = fromSearch(await searchParams);
  const doctor = staff.role === "DOCTOR";
  const status = weeklyPlanStatus(data.schedule, today);
  const editing = doctor && Boolean(data.schedule) && q.get("bearbeiten") === "1";
  const notice = q.get("status");

  // Editor input: what was submitted, else the stored week. "Weitere Zeit" / "Entfernen" only reshape rows.
  const submitted = WEEKDAYS_ALL.some((wd) => q.get(`t${wd}`) !== undefined);
  const input = submitted ? parseWeeklyPlan(q) : inputFromSchedule(data.schedule);
  const more = Number(q.get("mehr"));
  const removeParts = (q.get("entfernen") ?? "").split("-").map(Number);
  if (isWeekday(removeParts[0]) && Number.isInteger(removeParts[1])) input[removeParts[0]].rows.splice(removeParts[1], 1);
  const reshaping = isWeekday(more) || isWeekday(removeParts[0]);
  const draft = editing && q.get("pruefen") === "1" && !reshaping ? weeklyPlanDraft(data, today, input, datasetFingerprint(data)) : null;
  const options = regularTypeOptions(data, today);
  const currentProblems = data.schedule ? weeklyScheduleProblems(data.schedule, data.consultationTypes, today) : [];
  const dayErr = (wd: number) => (draft && !draft.ok ? draft.dayProblems[wd as 1] : undefined);
  const rowErr = (wd: number, i: number) => (draft && !draft.ok ? draft.rowProblems.find((p) => p.weekday === wd && p.index === i)?.message : undefined);
  const reconfirmHref = `/intern/sprechzeiten?${new URLSearchParams([["bearbeiten", "1"], ...weeklyPlanQuery(inputFromSchedule(data.schedule)), ["pruefen", "1"]])}#vorschau`;

  return (
    <CockpitFrame staff={staff} current="/intern">
      <div className="cp-home cp-workflow">
        <div>
          <Link href={editing ? "/intern/sprechzeiten" : "/intern"} className="cp-back">
            {editing ? "Zurück zum Wochenplan" : "Zur Übersicht"}
          </Link>
          <h1 className="cp-h1">{editing ? "Regelmäßige Sprechzeiten ändern" : "Regelmäßige Sprechzeiten"}</h1>
          <p className="cp-intro">
            {editing
              ? "Bitte legen Sie für jeden Wochentag fest, ob die Praxis regelmäßig geöffnet oder geschlossen ist. Geprüft und bestätigt wird immer die ganze Woche."
              : "Der regelmäßige Wochenplan aus der Cockpit-Datenbank. Einzelne Tage (Sonderöffnungszeiten, Urlaub, Feiertage) haben an ihrem Datum Vorrang."}
          </p>
        </div>

        {notice === "veraltet" ? (
          <p className="cp-error" role="alert">
            {PLAN_STALE}
          </p>
        ) : notice === "blockiert" || notice === "fehlgeschlagen" ? (
          <p className="cp-error" role="alert">
            {notice === "blockiert" ? "Bitte prüfen Sie den Wochenplan und bestätigen Sie ihn ausdrücklich." : "Der Wochenplan konnte nicht gespeichert werden. Es wurde nichts verändert."}
          </p>
        ) : null}

        {!editing ? (
          <>
            <section className="cp-panel" aria-labelledby="status-title">
              <h2 id="status-title" className="cp-h2">
                Ärztliche Bestätigung
              </h2>
              <PlanStatusLine status={status} />
              {currentProblems.length ? (
                <div className="cp-note" role="note">
                  <p className="cp-note-title">Der Wochenplan muss ärztlich geprüft werden:</p>
                  <ul className="cp-check-list">
                    {[...new Set(currentProblems.map((p) => p.message))].map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {doctor && data.schedule ? (
                <div className="cp-actions-row">
                  <Link href="/intern/sprechzeiten?bearbeiten=1" className={status.state === "CURRENT" ? "cp-btn cp-btn-secondary" : "cp-btn cp-btn-primary"}>
                    Regelmäßige Sprechzeiten ändern
                  </Link>
                  {status.state !== "CURRENT" && !currentProblems.length ? (
                    <Link href={reconfirmHref} className="cp-btn cp-btn-secondary">
                      Unveränderten Wochenplan erneut bestätigen
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="cp-muted">{staff.role === "STAFF" ? WEEKLY_DOCTOR_ONLY : READ_ONLY_TEXT}</p>
              )}
            </section>
            <section className="cp-panel" aria-labelledby="woche-title">
              <h2 id="woche-title" className="cp-h2">
                Wochenplan
              </h2>
              <WeekView data={data} today={today} />
              <AcuteNote data={data} />
              <p className="cp-muted">{PUBLIC_STATIC_NOTE}</p>
            </section>
          </>
        ) : (
          <form method="get" action="/intern/sprechzeiten" className="cp-form cp-week-form">
            <input type="hidden" name="bearbeiten" value="1" />
            {/* Enter in a field = "Auswirkung prüfen" (the first submit button of the form), never "Weitere Zeit". */}
            <button type="submit" name="pruefen" value="1" className="cp-sr" tabIndex={-1} aria-hidden="true">
              Auswirkung prüfen
            </button>
            <AcuteNote data={data} />
            {WEEKDAYS_ALL.map((wd) => {
              const day = input[wd];
              const acute = data.schedule ? sortRules(acuteRulesOf(data.schedule, wd)) : [];
              const shown = Math.min(MAX_WEEK_ROWS, Math.max(day.rows.length, 1) + (more === wd ? 1 : 0));
              const derr = dayErr(wd);
              return (
                <fieldset key={wd} className="cp-panel cp-fieldset cp-week-edit" aria-describedby={derr ? `tag-${wd}-fehler` : undefined}>
                  <legend className="cp-h2">{DAY_NAME[wd]}</legend>
                  {derr ? (
                    <p id={`tag-${wd}-fehler`} className="cp-field-error">
                      {derr}
                    </p>
                  ) : null}
                  <div className="cp-choices-row">
                    <label className="cp-choice">
                      <input type="radio" name={`t${wd}`} value="offen" defaultChecked={day.state === "OPEN"} />
                      <span>Geöffnet</span>
                    </label>
                    <label className="cp-choice">
                      <input type="radio" name={`t${wd}`} value="geschlossen" defaultChecked={day.state === "CLOSED"} />
                      <span>Geschlossen</span>
                    </label>
                  </div>
                  {acute.length ? <p className="cp-muted">{`Akutsprechstunde ${acute.map((a) => `${a.start}–${a.end}`).join(", ")} Uhr – wird separat verwaltet.`}</p> : null}
                  <div className="cp-week-rows">
                    <p className="cp-help">Nur bei „Geöffnet“. Leere Zeilen werden nicht berücksichtigt.</p>
                    {Array.from({ length: shown }, (_, i) => {
                      const r = day.rows[i] ?? { start: "", end: "", type: "" };
                      const err = rowErr(wd, i);
                      const errId = err ? `w${wd}-${i}-fehler` : undefined;
                      const rowOptions = r.type && !options.some((o) => o.code === r.type) ? [...options, { code: r.type, label: typeLabel(data, r.type), usable: false, note: "nicht vorhanden" }] : options;
                      return (
                        <fieldset key={i} className="cp-period cp-acute-row" aria-describedby={errId}>
                          <legend className="cp-label">{`Sprechzeit ${i + 1}`}</legend>
                          <div className="cp-acute-fields cp-special-fields">
                            <div className="cp-field">
                              <label htmlFor={`w${wd}_${i}_von`} className="cp-label">
                                Von
                              </label>
                              <input id={`w${wd}_${i}_von`} name={`w${wd}_${i}_von`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.start} aria-invalid={err ? true : undefined} aria-describedby={errId} />
                            </div>
                            <div className="cp-field">
                              <label htmlFor={`w${wd}_${i}_bis`} className="cp-label">
                                Bis
                              </label>
                              <input id={`w${wd}_${i}_bis`} name={`w${wd}_${i}_bis`} type="time" step={300} className="cp-input cp-input-time" defaultValue={r.end} aria-invalid={err ? true : undefined} aria-describedby={errId} />
                            </div>
                            <div className="cp-field">
                              <label htmlFor={`w${wd}_${i}_art`} className="cp-label">
                                Sprechstundenart
                              </label>
                              <select id={`w${wd}_${i}_art`} name={`w${wd}_${i}_art`} className="cp-input cp-select" defaultValue={r.type} aria-invalid={err ? true : undefined} aria-describedby={errId}>
                                <option value="">–</option>
                                {rowOptions.map((o) => (
                                  <option key={o.code} value={o.code} disabled={!o.usable}>
                                    {o.usable ? o.label : `${o.label} (${o.note})`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {err ? (
                            <p id={errId} className="cp-field-error">
                              {err}
                            </p>
                          ) : null}
                          <button type="submit" name="entfernen" value={`${wd}-${i}`} className="cp-btn cp-btn-quiet cp-week-remove" aria-label={`${DAY_NAME[wd]}, Sprechzeit ${i + 1} entfernen`}>
                            Entfernen
                          </button>
                        </fieldset>
                      );
                    })}
                    {shown < MAX_WEEK_ROWS ? (
                      <button type="submit" name="mehr" value={String(wd)} className="cp-btn cp-btn-secondary cp-week-add" aria-label={`${DAY_NAME[wd]}: weitere Zeit hinzufügen`}>
                        Weitere Zeit hinzufügen
                      </button>
                    ) : null}
                  </div>
                </fieldset>
              );
            })}
            <div className="cp-panel">
              <button type="submit" name="pruefen" value="1" className="cp-btn cp-btn-primary">
                Auswirkung prüfen
              </button>
            </div>
          </form>
        )}

        {draft && !draft.ok ? (
          <div id="vorschau" className={draft.code === "NO_CHANGE" ? "cp-note" : "cp-error"} role={draft.code === "NO_CHANGE" ? "status" : "alert"}>
            <p className="cp-alert-text">{draft.code === "NO_CHANGE" ? NOTHING_CHANGED : draft.message}</p>
            {draft.code === "ACUTE" ? (
              <Link href="/intern/akutsprechstunde" className="cp-btn cp-btn-secondary">
                Zur Akutsprechstunde
              </Link>
            ) : null}
          </div>
        ) : null}

        {draft && draft.ok ? (
          <>
            <section id="vorschau" className="cp-panel" aria-labelledby="vergleich-title">
              <h2 id="vergleich-title" className="cp-h2">
                Aktueller und neuer Wochenplan
              </h2>
              <p className="cp-effect">{draft.effect}</p>
              <ul className="cp-dir-list cp-week">
                {draft.days.map((d) => (
                  <li key={d.weekday} className="cp-dir-card cp-week-day cp-moment">
                    <h3 className="cp-h3">
                      {DAY_NAME[d.weekday]}
                      {d.changed ? <span className="cp-badge cp-week-badge">geändert</span> : null}
                    </h3>
                    <dl className="cp-acute-points">
                      <div>
                        <dt>Aktueller Wochenplan</dt>
                        <dd>{d.before.closed ? "Geschlossen" : d.before.rows.length ? d.before.rows.map((r) => ruleLine(data, r)).join("; ") : "Nicht festgelegt"}</dd>
                      </div>
                      <div>
                        <dt>Neuer Wochenplan</dt>
                        <dd>
                          {d.after.closed
                            ? "Geschlossen"
                            : d.after.rows.map((r, i) => (
                                <span key={r.id} className="cp-week-line">
                                  {i ? "; " : ""}
                                  {ruleLine(data, r)}
                                  {d.after.fresh.has(r.id) ? " (neu)" : ""}
                                </span>
                              ))}
                        </dd>
                      </div>
                      {d.removed.length ? (
                        <div>
                          <dt>Entfällt</dt>
                          <dd>{d.removed.map((r) => ruleLine(data, r)).join("; ")}</dd>
                        </div>
                      ) : null}
                      {d.acute.length ? (
                        <div>
                          <dt>Akutsprechstunde (unverändert)</dt>
                          <dd>{d.acute.map((a) => `${a.start}–${a.end} Uhr`).join(", ")}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
            <section className="cp-panel" aria-labelledby="engine-title">
              <h2 id="engine-title" className="cp-h2">
                Prüfung mit der Statuslogik
              </h2>
              <p className="cp-muted">Je Wochentag der nächste gewöhnliche Termin (ohne Feiertag, Urlaub oder Sonderöffnungszeit).</p>
              <ul className="cp-moments">
                {draft.checks.map((c) => (
                  <li key={c.weekday} className="cp-moment">
                    <h3 className="cp-h3">{DAY_NAME[c.weekday]}</h3>
                    {c.date ? (
                      <>
                        <p className="cp-muted">Geprüft am {formatGermanDate(c.date)}</p>
                        <dl className="cp-acute-points">
                          {c.points.map((p) => (
                            <div key={p.label}>
                              <dt>
                                {p.label} ({p.time} Uhr)
                              </dt>
                              <dd>{statusWord(p.status)}</dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p className="cp-muted">In den nächsten vier Wochen kein gewöhnlicher Termin.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <form method="post" action="/intern/sprechzeiten/bestaetigen" className="cp-panel cp-publish">
              <p className="cp-effect">{draft.effect}</p>
              {[...weeklyPlanQuery(nonEmpty(input))].map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input type="hidden" name="fingerprint" value={draft.fingerprint} />
              <label className="cp-choice" htmlFor="bestaetigt">
                <input id="bestaetigt" name="bestaetigt" type="checkbox" value="1" required />
                <span>{PLAN_CHECKBOX}</span>
              </label>
              <p className="cp-muted">Der Wochenplan wird in der Cockpit-Datenbank gespeichert und gilt rund sechs Monate bis zur erneuten Prüfung. {PUBLIC_STATIC_NOTE}</p>
              <button type="submit" className="cp-btn cp-btn-primary">
                {draft.actionLabel}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </CockpitFrame>
  );
}
