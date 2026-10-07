// Signature entry chrome (Phase 06): header, PRAXIS PULS statement, actions and
// the mobile dock. Server components — everything here works without JavaScript.

import s from "./signature.module.css";
import { Icon } from "@/design-system/icons";
import { StatusMark } from "@/design-system/components/primitives";
import type { DemoPuls } from "@/design-system/demo-fixtures";
import { PATHS, PHONE_DISPLAY, PHONE_HREF } from "../fixtures";

/** `links` connects the hero nav to real routes on the public start page; the lab keeps its previews. */
export function EntryHeader({ links, homeHref = "#inhalt", menuHref = "#menue" }: { links?: { id: string; label: string; href: string; current?: boolean }[]; homeHref?: string; menuHref?: string } = {}) {
  const items: { id: string; label: string; href: string; current?: boolean }[] = links ?? PATHS.map((p) => ({ id: p.id, label: p.label, href: `?pfad=${p.id}#pfade` }));
  return (
    <header className={s.header}>
      <a className={s.wordmark} href={homeHref}>
        <span>Kinderarztpraxis</span>
        <span>Probst &amp; Böhme</span>
      </a>
      <nav aria-label="Hauptnavigation" className={s.nav}>
        <ul>
          {items.map((p) => (
            <li key={p.id}>
              <a href={p.href} aria-current={p.current ? "page" : undefined}>
                {p.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className={s.menuButton} href={menuHref}>
        <Icon name="menu" size={20} />
        <span className="visually-hidden">Menü</span>
      </a>
    </header>
  );
}

const FOLLOW_UP: Partial<Record<DemoPuls["action"]["kind"], string>> = {
  hours: "#sprechzeiten",
  replacement: "#sprechzeiten",
  details: "#sprechzeiten",
};

/** PRAXIS PULS as typography on the sunlit wall: a statement, not a widget. */
export function PulsStatement({ puls, hoursHref, emergencyHref = "#notfall", tag = "Demo" }: { puls: DemoPuls; hoursHref?: string; emergencyHref?: string; tag?: string | null }) {
  const unknown = puls.indicator === "NONE";
  const follow = [puls.action, puls.secondary].find((a) => a && FOLLOW_UP[a.kind]);
  return (
    <section id="heute" className={s.puls} aria-label="Heute in der Praxis" data-indicator={puls.indicator}>
      <p className={s.status}>
        {unknown ? null : (
          <span className={s.statusMark}>
            <StatusMark indicator={puls.indicator} />
          </span>
        )}
        <span className={s.statusText}>
          <strong>{puls.headline}</strong>
          <span>{puls.detail}</span>
          {puls.reason ? <span className={s.statusReason}>{puls.reason}</span> : null}
        </span>
        {tag ? <span className={s.demo}>{tag}</span> : null}
      </p>
      <div className={s.actions}>
        <a className={s.call} href={PHONE_HREF}>
          <Icon name="phone" size={20} />
          <span>
            Anrufen <span className={s.num}>{PHONE_DISPLAY}</span>
          </span>
        </a>
        <a className={s.emergency} href={emergencyHref}>
          <Icon name="alert" size={20} />
          <span>Notfall</span>
        </a>
        {/* the state's follow-up sits beside Notfall when there is room */}
        {follow ? (
          <a className={s.follow} href={hoursHref ?? FOLLOW_UP[follow.kind]}>
            {follow.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Mobile dock: Menü · Heute · Notfall · Anrufen (order fixed, Phase 07.1). */
export function EntryDock({ puls }: { puls: DemoPuls }) {
  return (
    <nav aria-label="Schnellzugriff" className={s.dock}>
      <a href="#menue" className={s.dockCell}>
        <Icon name="menu" />
        <span>Menü</span>
      </a>
      <a href="#heute" className={s.dockCell}>
        <span className={s.dockToday}>
          <Icon name="today" />
          <span className={s.dockMark}>
            <StatusMark indicator={puls.indicator} inverse />
          </span>
        </span>
        <span>Heute</span>
      </a>
      <a href="#notfall" className={`${s.dockCell} ${s.dockEmergency}`}>
        <Icon name="alert" />
        <span>Notfall</span>
      </a>
      <a href={PHONE_HREF} className={s.dockCell}>
        <Icon name="phone" />
        <span>Anrufen</span>
      </a>
    </nav>
  );
}
