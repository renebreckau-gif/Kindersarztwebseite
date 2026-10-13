"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form className="intern-form" action={action} noValidate>
      <div className="intern-field">
        <label htmlFor="email" className="intern-label">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="intern-input"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>
      <div className="intern-field">
        <label htmlFor="password" className="intern-label">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="intern-input"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>
      <div role="alert" aria-live="assertive">
        {state.error ? (
          <p id="login-error" className="intern-error">
            {state.error}
          </p>
        ) : null}
      </div>
      <button type="submit" className="intern-btn intern-btn-primary intern-btn-block" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Anmeldung läuft …" : "Anmelden"}
      </button>
    </form>
  );
}
