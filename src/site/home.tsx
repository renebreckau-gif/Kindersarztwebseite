// Start page chapters below the approved hero (Phase 07).
// Rhythm: HEUTE (function) → MEIN KIND (growth, expressive) → HELFEN (calm, typographic)
// → PRAXIS (human, warm) → NEU BEI UNS (guidance) → ENTDECKEN (night, curious).

import Link from "next/link";
import s from "./home.module.css";
import { DayRuler, GrowthScale, BigLinks, CallAction, PlaceholderFrame } from "./blocks";
import { InternalNote } from "./chrome";
import { NEEDS } from "@/content/site";
import { PRACTICE, publicAddress } from "@/content/practice";
import { WEEKDAYS, blocksFor } from "@/content/schedule";
import { activeAnnouncements } from "@/content/notices";
import { DOCTORS, publicPeople } from "@/content/people";
import { formatGermanDate, weekdayOf } from "@/domain/time.ts";
import type { PulsView } from "@/content/puls";
import type { IsoWeekday } from "@/domain/time.ts";

export function HomeChapters({ puls }: { puls: PulsView }) {
  const today = puls.result.evaluatedAt.localDate;
  const wd = weekdayOf(today);
  const minutes = Number(puls.result.evaluatedAt.localTime.slice(0, 2)) * 60 + Number(puls.result.evaluatedAt.localTime.slice(3, 5));
  const notices = activeAnnouncements(today);
  const doctors = publicPeople(DOCTORS, today, puls.mode === "PREVIEW");
  const addr = publicAddress();
  const weekday = WEEKDAYS.find((d) => d.id === wd);

  return (
    <>
      {/* 01 HEUTE — function, continuing the floor light of the hero */}
      <section className={s.today} aria-labelledby="c-heute">
        <div className={s.todayDate}>
          <h2 id="c-heute" className={s.todayDay}>
            {weekday ? weekday.name : formatGermanDate(today).split(",")[0]}
          </h2>
          <p className={s.todayFull}>{formatGermanDate(today)}</p>
          <div className={s.todayActions}>
            <CallAction />
            <Link className={s.textLink} href="/heute/sprechzeiten">
              Alle Sprechzeiten
            </Link>
          </div>
        </div>
        <div className={s.todayHours}>
          {weekday ? (
            <DayRuler weekday={wd as IsoWeekday} caption={`Reguläre Sprechzeiten am ${weekday.name}`} nowMinutes={minutes} />
          ) : (
            <p className={s.todayNote}>Die regulären Sprechzeiten finden Sie in der Wochenübersicht.</p>
          )}
          <ol className={s.weekStrip} aria-label="Sprechzeiten der Woche">
            {WEEKDAYS.map((d) => (
              <li key={d.id} data-today={d.id === wd ? "" : undefined}>
                <span className={s.stripDay}>{d.short}</span>
                <span className={s.stripTimes}>{blocksFor(d.id).map((b) => `${b.start}–${b.end}`).join(" · ")}</span>
              </li>
            ))}
          </ol>
          <p className={s.todayFine}>
            Ob wir heute kranke Kinder ohne Termin sehen können, erfahren Sie telefonisch. An Feiertagen und bei Änderungen gelten die Hinweise unter{" "}
            <Link href="/heute">Heute</Link>.
          </p>
          {notices.map((n) => (
            <p key={n.id} className={s.notice}>
              <strong>{n.title}</strong> {n.shortText}
            </p>
          ))}
        </div>
      </section>

      {/* 02 MEIN KIND — growth: the most expressive chapter after the hero */}
      <section className={s.grow} aria-labelledby="c-kind">
        <div className={s.growHead}>
          <h2 id="c-kind" className={s.growTitle}>
            Mein Kind
          </h2>
          <p className={s.growLede}>Kinder wachsen – und mit ihnen die Fragen. Wählen Sie ein Alter und finden Sie Orientierung, ohne Anmeldung und ohne Daten.</p>
        </div>
        <GrowthScale />
        <p className={s.growFoot}>
          <Link href="/mein-kind/vorsorge">Vorsorge</Link>
          <Link href="/mein-kind/impfungen">Impfungen</Link>
        </p>
      </section>

      {/* 03 WOBEI KÖNNEN WIR HELFEN? — calm, typographic navigation */}
      <section className={s.help} aria-labelledby="c-hilfe">
        <div className={s.helpHead}>
          <h2 id="c-hilfe" className={s.helpTitle}>
            Wobei können wir helfen?
          </h2>
          <p className={s.helpLede}>Wählen Sie, was gerade passt. Diese Übersicht führt zu Informationen – sie ersetzt keine ärztliche Einschätzung. Im Zweifel: anrufen.</p>
        </div>
        <div className={s.helpList}>
          <BigLinks items={NEEDS} />
        </div>
      </section>

      {/* 04 PRAXIS — human, warm, editorial; no invented photography */}
      <section className={s.practice} aria-labelledby="c-praxis">
        <div className={s.practiceText}>
          <h2 id="c-praxis" className={s.practiceTitle}>
            Eine Kinderarztpraxis in&nbsp;Hettstedt.
          </h2>
          {doctors.length ? (
            <ul className={s.names}>
              {doctors.map((d) => (
                <li key={d.id}>
                  <span className={s.name}>{d.name}</span>
                  {d.specialties[0] ? <span className={s.nameRole}>{d.specialties[0]}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.practiceLede}>Die Ärztinnen und das Team stellen sich hier mit echten Fotos vor, sobald die Praxis Texte und Bilder freigegeben hat.</p>
          )}
          <p className={s.practiceLinks}>
            <Link href="/praxis/aerztinnen">Ärztinnen</Link>
            <Link href="/praxis/team">Team</Link>
            <Link href="/praxis">Die Praxis</Link>
          </p>
          {!doctors.length ? (
            <InternalNote>
              <p>Namen (F20, F22) sind bestätigt, die Einwilligung zur Veröffentlichung (F33/LB-09) nicht. Vorschau mit Namen: ?vorschau=freigabe</p>
            </InternalNote>
          ) : null}
        </div>
        <div className={s.practiceMedia}>
          <PlaceholderFrame label="Foto der Praxis – folgt mit echter Fotografie" />
        </div>
      </section>

      {/* 05 NEU BEI UNS? — guidance along a thread */}
      <section className={s.newHere} aria-labelledby="c-neu">
        <h2 id="c-neu" className={s.newTitle}>
          Neu bei uns?
        </h2>
        <ol className={s.path}>
          <li>
            <span className={s.pathStep}>Anrufen</span>
            <a className={s.pathValue} href={PRACTICE.phone.value.href}>
              {PRACTICE.phone.value.display}
            </a>
          </li>
          <li>
            <span className={s.pathStep}>Sprechzeiten</span>
            <Link className={s.pathValue} href="/heute/sprechzeiten">
              Wochenübersicht ansehen
            </Link>
          </li>
          <li>
            <span className={s.pathStep}>Ort</span>
            <Link className={s.pathValue} href="/praxis/kontakt">
              {addr.street ? `${addr.street}, ` : ""}
              {addr.cityLine}
            </Link>
          </li>
        </ol>
        <p className={s.newFoot}>
          Weitere Fragen beantworten wir gern telefonisch. <Link href="/praxis/neu-bei-uns">Erster Besuch</Link>
        </p>
      </section>

      {/* 06 ENTDECKEN — night, curious, the future child-facing world */}
      <section className={s.discover} aria-labelledby="c-entdecken">
        <div className={s.orbs} aria-hidden="true">
          <span className={s.orbCobalt} />
          <span className={s.orbCoral} />
          <span className={s.orbYellow} />
          <span className={s.orbRing} />
        </div>
        <div className={s.discoverText}>
          <h2 id="c-entdecken" className={s.discoverTitle}>
            Entdecken
          </h2>
          <p className={s.discoverLede}>Ein eigener Bereich für Kinder: Was passiert beim Arztbesuch? Was macht die Ärztin mit dem Stethoskop?</p>
          <p className={s.discoverChapter}>
            <span className={s.chapterName}>Mein Arztbesuch</span>
            <span className={s.chapterState}>In Vorbereitung</span>
          </p>
          <Link className={s.discoverLink} href="/entdecken">
            Mehr über Entdecken
          </Link>
        </div>
      </section>
    </>
  );
}
