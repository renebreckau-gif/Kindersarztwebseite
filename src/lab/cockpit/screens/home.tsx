"use client";

import Link from "next/link";
import s from "../cockpit.module.css";
import { useClock, useCockpit } from "../store";
import { Glyph, LinkButton, StatusWord } from "../ui";
import { ROLES, blocks, checks, longDate, nowStatus, pastRecords, plannedSegments, typeLabel, upcoming } from "../model";
import { parseTime } from "@/domain/time";

const QUICK = [
  { href: "/lab/praxis-cockpit/frueher-schliessen", label: "Heute früher schließen" },
  { href: "/lab/praxis-cockpit/geschlossen", label: "Heute geschlossen" },
  { href: "/lab/praxis-cockpit/akutsprechstunde", label: "Akutsprechstunde ändern" },
  { href: "/lab/praxis-cockpit/urlaub", label: "Urlaub eintragen" },
  { href: "/lab/praxis-cockpit/hinweis", label: "Hinweis veröffentlichen" },
];

export function Home() {
  const { state } = useCockpit();
  const { data, role } = state;
  const who = ROLES[role];
  const { today, now: nowTime } = useClock();
  const result = nowStatus(data, today, nowTime);
  const segs = plannedSegments(data, today);
  const now = parseTime(nowTime);
  const greeting = now < parseTime("11:00") ? "Guten Morgen" : now < parseTime("18:00") ? "Guten Tag" : "Guten Abend";
  const past = pastRecords(data, today);
  const current = segs.find((x) => parseTime(x.start) <= now && now < parseTime(x.end));
  const next = segs.find((x) => parseTime(x.start) > now && (!current || x.type !== current.type || parseTime(x.start) > parseTime(current.end)));
  const items = upcoming(data, today);
  const todo = checks(data, role, today);
  // Quick undo only on the day of the change; older changes are reachable in the Verlauf.
  const last = state.audit.find((e) => e.snapshot && !e.revertedBy && !e.revertOf && e.date === today);

  return (
    <div className={s.home}>
      <div className={s.greet}>
        <h1 className={s.h1}>
          {greeting}, {who.greeting}
        </h1>
        <p className={s.intro}>{longDate(today)}</p>
      </div>

      {last ? (
        <div className={s.lastChange} role="status">
          <p>
            <span className={s.lastLabel}>Letzte Änderung · {last.time} Uhr</span>
            <span className={s.lastTitle}>{last.title}</span>
          </p>
          <Link href={`/lab/praxis-cockpit/verlauf/${last.id}?ruecknahme=1`} className={s.btnQuiet}>
            <Glyph name="undo" size={18} />
            Änderung zurücknehmen
          </Link>
        </div>
      ) : null}

      <div className={s.homeGrid}>
        <section className={`${s.panel} ${s.today}`} aria-labelledby="heute-title">
          <h2 id="heute-title" className={s.h2}>
            Praxis heute
          </h2>
          <StatusWord result={result} />
          <p className={s.todayDetail}>{result.detail}</p>
          {segs.length ? (
            <ul className={s.hours} aria-label="Sprechzeiten heute">
              {blocks(segs).map((b) => (
                <li key={b.start}>
                  {b.start}–{b.end}
                </li>
              ))}
            </ul>
          ) : null}
          {current || next ? (
          <dl className={s.nowNext}>
            {current ? (
              <div>
                <dt>Jetzt</dt>
                <dd>{typeLabel(current.type)}</dd>
              </div>
            ) : null}
            {next ? (
              <div>
                <dt>Als Nächstes</dt>
                <dd>
                  {typeLabel(next.type)} ab {next.start}
                </dd>
              </div>
            ) : null}
          </dl>
          ) : null}
          <LinkButton href="/lab/praxis-cockpit/website">
            <Glyph name="eye" size={20} />
            Website-Vorschau
          </LinkButton>
        </section>

        <section className={`${s.panel} ${s.quick}`} aria-labelledby="quick-title">
          <h2 id="quick-title" className={s.h2}>
            Schnellaktionen
          </h2>
          <ul className={s.quickList}>
            {QUICK.map((q) => (
              <li key={q.href}>
                <Link href={q.href} className={s.quickLink}>
                  <span>{q.label}</span>
                  <Glyph name="chevron" />
                </Link>
              </li>
            ))}
          </ul>
          {role !== "STAFF" ? (
            <div className={s.more}>
              <h3 className={s.h3}>Nur für {role === "DOCTOR" ? "Ärztin / Arzt" : "Verwaltung"}</h3>
              <ul className={s.quickList}>
                <li>
                  <Link href="/lab/praxis-cockpit/bereich/sprechzeiten" className={s.quickLinkQuiet}>
                    <span>Sprechzeiten bestätigen</span>
                    <Glyph name="chevron" />
                  </Link>
                </li>
                {role === "ADMIN" ? (
                  <li>
                    <Link href="/lab/praxis-cockpit/bereich/benutzer" className={s.quickLinkQuiet}>
                      <span>Benutzer &amp; Einstellungen</span>
                      <Glyph name="chevron" />
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </section>

        <section className={`${s.panel} ${s.upcoming}`} aria-labelledby="termine-title">
          <h2 id="termine-title" className={s.h2}>
            Nächste Termine
          </h2>
          {items.length ? (
            <ul className={s.dates}>
              {items.map((i) => (
                <li key={`${i.date}-${i.note}`} className={s.dateRow}>
                  <span className={s.dateLabel}>{i.label}</span>
                  {i.closure ? (
                    <span className={s.dateClosure}>
                      <span className={s.dateTitle}>{i.note}</span>
                      <span className={s.dateNote}>Vertretung: {i.closure.replacement}</span>
                      <span className={s.published}>
                        <Glyph name="check" size={16} />
                        Auf der Website veröffentlicht
                      </span>
                      {i.endsOn ? <span className={s.dateNote}>Endet automatisch: {longDate(i.endsOn)} · keine Aktion nötig</span> : null}
                      <span className={s.dateActions}>
                        <Link href={`/lab/praxis-cockpit/urlaub/${encodeURIComponent(i.closure.id)}`} className={s.textLink}>
                          Ansehen<span className="visually-hidden">: {i.note} {i.label}</span>
                        </Link>
                        <Link href={`/lab/praxis-cockpit/urlaub?bearbeiten=${encodeURIComponent(i.closure.id)}`} className={s.textLink}>
                          Ändern<span className="visually-hidden">: {i.note} {i.label}</span>
                        </Link>
                      </span>
                    </span>
                  ) : (
                    <span className={s.dateClosure}>
                      <span className={s.dateNote}>
                        {i.attention ? <span className={s.dot} aria-hidden="true" /> : null}
                        {i.note}
                      </span>
                      {i.endsOn ? <span className={s.dateNote}>Endet automatisch: {longDate(i.endsOn)}</span> : null}
                      {i.editHref ? (
                        <span className={s.dateActions}>
                          <Link href={i.editHref} className={s.textLink}>
                            {i.editLabel}
                            <span className="visually-hidden">: {i.note}</span>
                          </Link>
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.muted}>In den nächsten Wochen ist nichts Besonderes eingetragen.</p>
          )}
          {past.length ? (
            <Link href="/lab/praxis-cockpit/verlauf" className={s.textLink}>
              {past.length === 1 ? "1 abgelaufener Eintrag" : `${past.length} abgelaufene Einträge`} im Verlauf
            </Link>
          ) : null}
        </section>

        <section className={`${s.panel} ${s.checks}`} aria-labelledby="pruefen-title">
          <h2 id="pruefen-title" className={s.h2}>
            Prüfen
          </h2>
          {todo.length ? (
            <>
              <p className={s.checkCount}>
                <span className={s.count}>{todo.length}</span>
                {todo.length === 1 ? "Angabe braucht Aufmerksamkeit" : "Angaben brauchen Aufmerksamkeit"}
              </p>
              <ul className={s.checkList}>
                {todo.map((c) => (
                  <li key={c.id} className={s.checkItem}>
                    <h3 className={s.h3}>{c.title}</h3>
                    <p>{c.text}</p>
                    <LinkButton href={c.href}>{c.action}</LinkButton>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={s.allGood}>
              <Glyph name="check" />
              Alles geklärt.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
