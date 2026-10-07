// Shared lab chrome: utility layer (desktop), dock (mobile), below-the-fold
// sections and the lab toolbar. Server components — work without JavaScript.

import Link from "next/link";
import s from "./chrome.module.css";
import { PATHS, PHONE_DISPLAY, PHONE_HREF, type DemoStatus, type PulsFixture } from "./fixtures";

type IconName = "phone" | "today" | "alert" | "menu";

export function Icon({ name }: { name: IconName }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "phone":
      return (
        <svg {...common}>
          <path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 3.5 21 19.5H3Z" />
          <path d="M12 10v4.2M12 17.1v.1" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
  }
}

export function StatusDot({ status }: { status: DemoStatus }) {
  if (status === "unknown") return null; // unknown never implies a state
  return <span className={status === "open" ? s.dotOpen : s.dotClosed} aria-hidden="true" />;
}

/** Desktop / landscape-tablet persistent utility layer. */
export function UtilityBar({ puls, name = "Kinderarztpraxis Probst & Böhme" }: { puls: PulsFixture; name?: string }) {
  return (
    <header className={s.util}>
      <a className="skip-link" href="#inhalt">
        Zum Inhalt springen
      </a>
      <span className={s.utilName}>{name}</span>
      <nav className={s.utilNav} aria-label="Schnellzugriff">
        <a href="#heute" className={s.utilStatus}>
          <StatusDot status={puls.status} />
          {puls.chip ? <span>{puls.chip}</span> : <span className={s.utilLink}>Sprechzeiten</span>}
          <span className={s.demoTag}>Demo</span>
        </a>
        <a href={PHONE_HREF} className={s.utilItem}>
          <Icon name="phone" />
          <span>
            Anrufen <span className={s.utilNum}>{PHONE_DISPLAY}</span>
          </span>
        </a>
        <a href="#notfall" className={`${s.utilItem} ${s.utilEmergency}`}>
          <Icon name="alert" />
          <span>Notfall</span>
        </a>
        <a href="#menue" className={s.utilItem}>
          <Icon name="menu" />
          <span>Menü</span>
        </a>
      </nav>
    </header>
  );
}

/** Mobile / portrait-tablet header: name only, not sticky. */
export function MobileTop({ name = "Kinderarztpraxis Probst & Böhme" }: { name?: string }) {
  return (
    <div className={s.mobileTop}>
      <a className="skip-link" href="#inhalt">
        Zum Inhalt springen
      </a>
      <span>{name}</span>
    </div>
  );
}

/** Persistent bottom dock (mobile). Order fixed by the brief. */
export function MobileDock({ puls }: { puls: PulsFixture }) {
  return (
    <nav className={s.dock} aria-label="Schnellzugriff">
      <a href={PHONE_HREF} className={s.dockItem}>
        <Icon name="phone" />
        <span>Anrufen</span>
      </a>
      <a href="#heute" className={s.dockItem}>
        <span className={s.dockToday}>
          <Icon name="today" />
          <StatusDot status={puls.status} />
        </span>
        <span>Heute</span>
      </a>
      <a href="#notfall" className={`${s.dockItem} ${s.dockEmergency}`}>
        <Icon name="alert" />
        <span>Notfall</span>
      </a>
      <a href="#menue" className={s.dockItem}>
        <Icon name="menu" />
        <span>Menü</span>
      </a>
    </nav>
  );
}

/** Below-the-fold targets for the utility links. Intentionally minimal. */
export function LabSections({ base }: { base: string }) {
  return (
    <div className={s.sections}>
      <section id="sprechzeiten" className={s.section} aria-labelledby="h-sprechzeiten">
        <h2 id="h-sprechzeiten">Sprechzeiten</h2>
        <p>Die Wochenansicht der Sprechzeiten ist nicht Teil dieses Prototyps.</p>
      </section>
      <section id="notfall" className={`${s.section} ${s.sectionEmergency}`} aria-labelledby="h-notfall">
        <h2 id="h-notfall">Notfall</h2>
        <p className={s.emergencyLine}>
          Bei Lebensgefahr: <a href="tel:112">112 anrufen</a>
        </p>
        <p>
          Weitere Notfallinformationen wie Bereitschaftsdienst und Kliniken werden derzeit mit der Praxis geprüft und
          erst nach Bestätigung veröffentlicht.
        </p>
      </section>
      <section id="menue" className={s.section} aria-labelledby="h-menue">
        <h2 id="h-menue">Menü</h2>
        <ul className={s.menuList}>
          {PATHS.map((p) => (
            <li key={p.id}>
              <Link href={`${base}?pfad=${p.id}`}>{p.label}</Link>
              <span>{p.preview}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Internal toolbar at the very end of the page: switch demo states without JS. */
export function LabToolbar({ base, label, status }: { base: string; label: string; status: DemoStatus }) {
  const states: { id: DemoStatus; label: string }[] = [
    { id: "open", label: "Geöffnet" },
    { id: "closed", label: "Geschlossen" },
    { id: "unknown", label: "Unbekannt" },
  ];
  return (
    <footer className={s.toolbar}>
      <p>
        <Link href="/lab">Experience Lab</Link> <span aria-hidden="true">/</span> {label}
      </p>
      <p>Alle Statusangaben sind Demo-Daten und keine Praxisangaben.</p>
      <ul aria-label="Demo-Status wählen">
        {states.map((st) => (
          <li key={st.id}>
            <Link href={`${base}?status=${st.id}`} aria-current={st.id === status ? "true" : undefined}>
              {st.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href={`${base}?status=${status}&3d=0`}>Ohne 3D</Link>
        </li>
      </ul>
    </footer>
  );
}
