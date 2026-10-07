import type { Metadata } from "next";
import Link from "next/link";
import s from "./lab.module.css";

export const metadata: Metadata = { title: "Experience Lab" };

const PROTOTYPES = [
  { href: "/lab/a", name: "Prototyp A", title: "Funktionales Growing Mobile" },
  { href: "/lab/b", name: "Prototyp B", title: "Editorial Instrument" },
  { href: "/lab/c", name: "Prototyp C", title: "2D/3D-Hybrid" },
];

const STATES = [
  { q: "open", label: "Geöffnet" },
  { q: "closed", label: "Geschlossen" },
  { q: "unknown", label: "Unbekannt" },
];

export default function LabIndex() {
  return (
    <main className={s.lab}>
      <h1>Experience Lab</h1>
      <p className={s.note}>
        Interne Prototypen der Eingangserfahrung. Alle Statusangaben sind Demo-Daten und keine Praxisangaben.
      </p>
      <ul className={s.list}>
        {PROTOTYPES.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className={s.main}>
              <span>{p.name}</span>
              <span className={s.sub}>{p.title}</span>
            </Link>
            <span className={s.states}>
              {STATES.map((st) => (
                <Link key={st.q} href={`${p.href}?status=${st.q}`}>
                  {st.label}
                </Link>
              ))}
              <Link href={`${p.href}?3d=0`}>Ohne 3D</Link>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
