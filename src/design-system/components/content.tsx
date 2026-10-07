// Content primitives. Most content is NOT boxed: rules, type and spacing carry
// structure. Boxes (cards/frames) only where grouping aids comprehension.

import type { ReactNode } from "react";
import s from "./content.module.css";
import { Icon } from "../icons";
import { Action, StatusMark } from "./primitives";

/** The "Messlinie": a measured hairline with ticks — the system's signature rule. */
export function Measure({ marks }: { marks?: string[] }) {
  return (
    <div className={s.measure} aria-hidden="true">
      {marks?.map((m, i) => (
        <span key={m} className={s.measureMark} style={{ left: `${(i / Math.max(marks.length - 1, 1)) * 100}%` }}>
          {m}
        </span>
      ))}
    </div>
  );
}

export function SectionIntro({ index, title, lede, id }: { index?: string; title: string; lede?: string; id?: string }) {
  return (
    <header className={s.intro} id={id}>
      <Measure />
      <div className={s.introGrid}>
        {index ? <span className={s.introIndex}>{index}</span> : null}
        <h2 className={s.introTitle}>{title}</h2>
        {lede ? <p className={s.introLede}>{lede}</p> : null}
      </div>
    </header>
  );
}

/** Unboxed information group: rule + label + content. */
export function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={s.info} aria-label={label}>
      <h3 className={s.infoLabel}>{label}</h3>
      <div className={s.infoBody}>{children}</div>
    </section>
  );
}

export function Notice({ kind = "info", title, children, validity }: { kind?: "info" | "warning"; title: string; children: ReactNode; validity?: string }) {
  return (
    <aside className={`${s.notice} ${kind === "warning" ? s.noticeWarning : ""}`} aria-label={kind === "warning" ? "Wichtiger Hinweis" : "Hinweis"}>
      <p className={s.noticeKind}>
        {kind === "warning" ? <StatusMark indicator="ATTENTION" /> : null}
        {kind === "warning" ? "Wichtiger Hinweis" : "Hinweis"}
      </p>
      <p className={s.noticeTitle}>{title}</p>
      <div className={s.noticeBody}>{children}</div>
      {validity ? <p className={s.noticeValidity}>{validity}</p> : null}
    </aside>
  );
}

/** Emergency: visually separate from every operational state. 112 is the only fixed fact. */
export function EmergencyBlock({ children }: { children?: ReactNode }) {
  return (
    <section className={s.emergency} aria-labelledby="ds-emergency-title" id="notfall">
      <p className={s.emergencyKind}>
        <Icon name="alert" size={20} />
        Notfall
      </p>
      <h3 id="ds-emergency-title" className={s.emergencyTitle}>
        Bei Lebensgefahr: 112
      </h3>
      <p className={s.emergencyAction}>
        <Action href="tel:112" variant="emergency" icon="phone">
          Notruf 112 anrufen
        </Action>
      </p>
      {children ? <div className={s.emergencyMore}>{children}</div> : null}
    </section>
  );
}

export function SourceNote({ checked, source }: { checked: string; source: string }) {
  return (
    <p className={s.source}>
      <span className={s.sourceTick} aria-hidden="true" />
      <span>
        Stand: {checked}
        <br />
        Quelle: {source}
      </span>
    </p>
  );
}

export function HelpTopicList({ items }: { items: { label: string; text: string }[] }) {
  return (
    <ul className={s.topics}>
      {items.map((t) => (
        <li key={t.label}>
          <a href="#">
            <span className={s.topicLabel}>{t.label}</span>
            <span className={s.topicText}>{t.text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Card is reserved for people (portrait + identity form one unit). */
export function PersonCard({ media, name, role, titles }: { media: ReactNode; name: string; role: string; titles: string[] }) {
  return (
    <article className={s.person}>
      {media}
      <h3 className={s.personName}>{name}</h3>
      <p className={s.personRole}>{role}</p>
      <ul className={s.personTitles}>
        {titles.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </article>
  );
}
