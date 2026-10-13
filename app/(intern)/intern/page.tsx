// Authenticated shell of the future Praxis Cockpit. Operational workflows are NOT connected to
// the database yet; the daily-work UX reference remains the prototype at /lab/praxis-cockpit.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/domain/governance";
import { signOut } from "../actions";
import { internSession } from "../session";
import { Unavailable } from "../unavailable";

export default async function Intern() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_OUT") redirect("/intern/anmelden");
  const { staff } = session;
  return (
    <div className="intern-page">
      <main className="intern-main" id="inhalt">
        <div className="intern-card">
          <p className="intern-brand">
            <span>Kinderarztpraxis</span>
            <span>Probst &amp; Böhme</span>
          </p>
          <h1 className="intern-h1">Praxis Cockpit</h1>
          <p className="intern-status">Backend verbunden · Testumgebung</p>
          <dl className="intern-who">
            <dt>Angemeldet als</dt>
            <dd>{staff.name}</dd>
            <dt>Rolle</dt>
            <dd>{ROLE_LABEL[staff.role]}</dd>
          </dl>
          <p className="intern-note">Die Arbeitsabläufe (Öffnungszeiten, Urlaub, Hinweise) werden in einer späteren Phase angebunden. Bis dahin zeigt der Prototyp, wie sie aussehen werden.</p>
          <div className="intern-actions">
            <Link href="/lab/praxis-cockpit" className="intern-btn intern-btn-secondary">
              Praxis-Cockpit-Prototyp öffnen
            </Link>
            {staff.role === "ADMIN" ? (
              <a href="/intern/admin" className="intern-btn intern-btn-secondary">
                Verwaltung öffnen
              </a>
            ) : null}
            <form action={signOut}>
              <button type="submit" className="intern-btn intern-btn-primary intern-btn-block">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
