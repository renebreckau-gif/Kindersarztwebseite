"use client";

// Mock login — VISUAL / INTERACTION PROTOTYPE ONLY. No real authentication, no cookies,
// no secrets: the test accounts live in the lab model, the session keeps only the mock role.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import s from "../cockpit.module.css";
import { useCockpit } from "../store";
import { useBusy } from "../ui";
import { MOCK_ACCOUNTS, mockLogin } from "../model";

export function Login() {
  const router = useRouter();
  const { signIn } = useCockpit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const { busy, run } = useBusy();
  const emailRef = useRef<HTMLInputElement>(null);
  const test = MOCK_ACCOUNTS[0];

  function submit() {
    if (!email.trim() || !password) {
      setError("Bitte E-Mail-Adresse und Passwort eingeben.");
      emailRef.current?.focus();
      return;
    }
    run(500, () => {
      const role = mockLogin(email, password);
      if (!role) {
        setError("E-Mail-Adresse oder Passwort stimmen nicht.");
        emailRef.current?.focus();
        return;
      }
      setError("");
      signIn(role);
      router.push("/lab/praxis-cockpit");
    });
  }

  return (
    <div className={s.loginPage}>
      <main className={s.loginMain} id="inhalt">
        <div className={s.loginCard}>
          <p className={s.loginBrand}>
            <span>Kinderarztpraxis</span>
            <span>Probst &amp; Böhme</span>
          </p>
          <h1 className={s.h1}>Praxis Cockpit</h1>
          <p className={s.intro}>Interner Bereich für das Praxisteam</p>

          <form
            className={s.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className={s.field}>
              <label htmlFor="login-email" className={s.label}>
                E-Mail-Adresse
              </label>
              <input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className={s.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="login-password" className={s.label}>
                Passwort
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={s.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div role="alert" aria-live="assertive">
              {error ? (
                <p id="login-error" className={s.loginError}>
                  {error}
                </p>
              ) : null}
            </div>
            <button type="submit" className={`${s.btnPrimary} ${s.btnBlock}`} disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Anmeldung läuft …" : "Anmelden"}
            </button>
            <button type="button" className={`${s.btnQuiet} ${s.loginForgot}`} aria-expanded={forgot} onClick={() => setForgot(!forgot)}>
              Passwort vergessen
            </button>
            {forgot ? (
              <p className={s.note}>Im echten Cockpit erhalten Sie einen Link an Ihre persönliche E-Mail-Adresse. Im Prototyp wird keine E-Mail verschickt.</p>
            ) : null}
          </form>

          <p className={s.loginFoot}>Nur für Mitarbeitende der Praxis.</p>
        </div>

        <aside className={s.loginTest} aria-label="Testzugang für den Prototyp">
          <p className={s.proto}>PROTOTYP · keine echten Konten</p>
          <p>
            Testzugang: <strong>{test.email}</strong> · Passwort <strong>{test.password}</strong>
          </p>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => {
              setEmail(test.email);
              setPassword(test.password);
              setError("");
            }}
          >
            Testzugang einsetzen
          </button>
        </aside>
      </main>
    </div>
  );
}
