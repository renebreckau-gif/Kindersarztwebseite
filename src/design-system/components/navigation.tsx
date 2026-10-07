// Navigation chrome: desktop header, mobile dock, menu sheet (static mock), footer.
// Header and dock are real, working primitives; the sheet is a documentation mock.

import s from "./navigation.module.css";
import { Icon } from "../icons";
import { PulsChip, StatusMark } from "./primitives";
import { DEMO_PHONE, type DemoPuls } from "../demo-fixtures";

export const PATHS = [
  { id: "heute", label: "Heute", href: "#puls" },
  { id: "mein-kind", label: "Mein Kind", href: "#mein-kind" },
  { id: "praxis", label: "Praxis", href: "#inhalte" },
  { id: "entdecken", label: "Entdecken", href: "#entdecken" },
] as const;

/** Outside the header so it also exists on mobile, where the header is hidden. */
export function SkipLink() {
  return (
    <a className={s.skip} href="#inhalt">
      Zum Inhalt springen
    </a>
  );
}

export function SiteHeader({ puls, current = "heute" }: { puls: DemoPuls; current?: string }) {
  return (
    <header className={s.header}>
      <a href="#top" className={s.brand}>
        Kinderarztpraxis Probst &amp; Böhme
      </a>
      <nav aria-label="Hauptnavigation" className={s.paths}>
        <ul>
          {PATHS.map((p) => (
            <li key={p.id}>
              <a href={p.href} aria-current={p.id === current ? "page" : undefined}>
                {p.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={s.utilities}>
        <PulsChip puls={puls} />
        <a className={s.utility} href={DEMO_PHONE.href}>
          <Icon name="phone" size={20} />
          <span>
            Anrufen <span className={s.num}>{DEMO_PHONE.display}</span>
          </span>
        </a>
        <a className={`${s.utility} ${s.emergency}`} href="#notfall">
          <Icon name="alert" size={20} />
          <span>Notfall</span>
        </a>
      </div>
    </header>
  );
}

export function MobileDock({ puls, fixed = true }: { puls: DemoPuls; fixed?: boolean }) {
  return (
    <nav aria-label="Schnellzugriff" className={`${s.dock} ${fixed ? s.dockFixed : s.dockStatic}`}>
      <a href={DEMO_PHONE.href} className={s.cell}>
        <Icon name="phone" />
        <span>Anrufen</span>
      </a>
      <a href="#heute" className={s.cell}>
        <span className={s.cellIcon}>
          <Icon name="today" />
          <span className={s.cellMark}>
            <StatusMark indicator={puls.indicator} inverse />
          </span>
        </span>
        <span>Heute</span>
      </a>
      <a href="#notfall" className={`${s.cell} ${s.cellEmergency}`}>
        <Icon name="alert" />
        <span>Notfall</span>
      </a>
      <a href="#menue" className={s.cell}>
        <Icon name="menu" />
        <span>Menü</span>
      </a>
    </nav>
  );
}

const MENU = [
  { label: "Heute", sub: ["Sprechzeiten", "Aktuelle Hinweise", "Notfall"] },
  { label: "Mein Kind", sub: ["0–2 Jahre", "3–6 Jahre", "7–12 Jahre", "13–17 Jahre", "Vorsorgeuntersuchungen", "Impfungen", "Neugeboren"] },
  { label: "Praxis", sub: ["Ärztinnen", "Team", "Wobei können wir helfen?", "Neu bei uns?", "Kontakt & Anfahrt"] },
  { label: "Entdecken", sub: ["Mein Arztbesuch"] },
];

/** Static documentation of the mobile menu sheet (not interactive here). */
export function MenuSheetMock() {
  return (
    <div className={s.sheet} id="menue" role="group" aria-label="Beispiel: Menü auf dem Smartphone">
      <div className={s.sheetHead}>
        <span className={s.sheetTitle}>Menü</span>
        <span className={s.sheetClose}>
          <Icon name="close" size={20} />
          Schließen
        </span>
      </div>
      <ol className={s.sheetList}>
        {MENU.map((m) => (
          <li key={m.label}>
            <span className={s.sheetPath}>{m.label}</span>
            <ul>
              {m.sub.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerContact}>
        <p className={s.footerName}>Kinderarztpraxis Probst &amp; Böhme</p>
        <p>Adresse folgt nach Bestätigung</p>
        <p>
          Telefon <span className={s.num}>{DEMO_PHONE.display}</span> <span className={s.footerDemo}>(Demo)</span>
        </p>
      </div>
      <nav aria-label="Seitenübersicht" className={s.footerNav}>
        {MENU.map((m) => (
          <div key={m.label}>
            <p className={s.footerHead}>{m.label}</p>
            <ul>
              {m.sub.map((x) => (
                <li key={x}>
                  <a href="#">{x}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className={s.footerLegal}>
        <a href="#">Impressum</a>
        <a href="#">Datenschutz</a>
        <a href="#">Barrierefreiheit</a>
      </p>
    </footer>
  );
}
