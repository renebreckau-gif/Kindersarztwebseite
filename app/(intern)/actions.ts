"use server";

// Sign-in / sign-out for /intern through Payload's official Next.js auth functions
// (@payloadcms/next/auth): they set and delete Payload's own HttpOnly session cookie.
// No custom session system, no custom crypto.

import config from "@payload-config";
import { login, logout } from "@payloadcms/next/auth";
import { redirect } from "next/navigation";

export interface SignInState {
  error?: string;
}

/** One message for every failure (unknown email, wrong password, disabled, locked): no account hints. */
const GENERIC = "Anmeldung nicht möglich. Bitte prüfen Sie Ihre Angaben.";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Bitte E-Mail-Adresse und Passwort eingeben." };
  try {
    await login({ collection: "staff", config, email, password });
  } catch {
    return { error: GENERIC };
  }
  redirect("/intern");
}

export async function signOut(): Promise<void> {
  // Ends the server-side session (revocation) and deletes the cookie.
  await logout({ config });
  redirect("/intern/anmelden");
}
