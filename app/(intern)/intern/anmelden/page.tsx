// Real staff sign-in (Payload auth). No self-registration, no test credentials on this page.

import { redirect } from "next/navigation";
import { internSession } from "../../session";
import { Unavailable } from "../../unavailable";
import { LoginForm } from "./login-form";

export default async function Anmelden() {
  const session = await internSession();
  if (session.state === "UNAVAILABLE") return <Unavailable />;
  if (session.state === "SIGNED_IN") redirect("/intern");
  return (
    <div className="intern-page">
      <main className="intern-main" id="inhalt">
        <div className="intern-card">
          <p className="intern-brand">
            <span>Kinderarztpraxis</span>
            <span>Probst &amp; Böhme</span>
          </p>
          <h1 className="intern-h1">Praxis Cockpit</h1>
          <p className="intern-intro">Interner Bereich für das Praxisteam</p>
          <LoginForm />
          <p className="intern-foot">Nur für Mitarbeitende der Praxis. Zugang erhalten Sie über die Verwaltung.</p>
        </div>
      </main>
    </div>
  );
}
