// Signature entry chrome (Phase 06): header, PRAXIS PULS statement, actions and
// the mobile dock. Server components — everything here works without JavaScript.

import s from "./signature.module.css";
import { Icon } from "@/design-system/icons";
import { StatusMark } from "@/design-system/components/primitives";
import type { DemoPuls } from "@/design-system/demo-fixtures";
import { PATHS, PHONE_DISPLAY, PHONE_HREF } from "../fixtures";

export function EntryHeader() {
  return (
    <header className={s.header}>
      <a className={s.wordmark} href="#inhalt">
        <span>Kinderarztpraxis</span>
        <span>Probst &amp; Böhme</span>
      </a>
      <nav aria-label="Hauptnavigation" className={s.nav}>
        <ul>
          {PATHS.map((p) => (
            <li key={p.id}>
              <a href={`?pfad=${p.id}#pfade`}>{p.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <a className={s.menuButton} href="#menue">
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
export function PulsStatement({ puls }: { puls: DemoPuls }) {
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
        <span className={s.demo}>Demo</span>
      </p>
      <div className={s.actions}>
        <a className={s.call} href={PHONE_HREF}>
          <Icon name="phone" size={20} />
          <span>
            Anrufen <span className={s.num}>{PHONE_DISPLAY}</span>
          </span>
        </a>
        <a className={s.emergency} href="#notfall">
          <Icon name="alert" size={20} />
          <span>Notfall</span>
        </a>
        {/* the state's follow-up sits beside Notfall when there is room */}
        {follow ? (
          <a className={s.follow} href={FOLLOW_UP[follow.kind]}>
            {follow.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Mobile dock: Anrufen · Heute · Notfall · Menü (order fixed). */
export function EntryDock({ puls }: { puls: DemoPuls }) {
  return (
    <nav aria-label="Schnellzugriff" className={s.dock}>
      <a href={PHONE_HREF} className={s.dockCell}>
        <Icon name="phone" />
        <span>Anrufen</span>
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
      <a href="#menue" className={s.dockCell}>
        <Icon name="menu" />
        <span>Menü</span>
      </a>
    </nav>
  );
}
