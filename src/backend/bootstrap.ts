// Controlled creation of the very first ADMIN account (server-side only).
// Payload's built-in first-user registration is closed (staffCreateGuard); this is the only way
// to create the first account. It refuses as soon as any account exists.

import type { Payload } from "payload";
import { SERVER_CONTEXT } from "./server-context.ts";

export interface BootstrapInput {
  email: string;
  password: string;
  name: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Input problems in plain German (empty = valid). Never echoes the password. */
export function bootstrapInputProblems(input: Partial<BootstrapInput>): string[] {
  const problems: string[] = [];
  const email = input.email?.trim() ?? "";
  const password = input.password ?? "";
  const name = input.name?.trim() ?? "";
  if (!EMAIL.test(email)) problems.push("E-Mail-Adresse fehlt oder ist ungültig.");
  if (name.length < 2 || name.length > 80) problems.push("Anzeigename fehlt (2–80 Zeichen).");
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length < 16) problems.push("Passwort zu kurz (mindestens 16 Zeichen).");
  else if (classes < 3 && password.length < 24) problems.push("Passwort zu schwach (mindestens 3 Zeichenarten oder 24 Zeichen).");
  if (/^(.)\1+$/.test(password)) problems.push("Passwort zu schwach (nur ein Zeichen wiederholt).");
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) problems.push("Passwort darf die E-Mail-Adresse nicht enthalten.");
  return problems;
}

export class BootstrapRefused extends Error {}

export async function createFirstAdmin(payload: Payload, input: BootstrapInput): Promise<{ id: string | number }> {
  const problems = bootstrapInputProblems(input);
  if (problems.length) throw new BootstrapRefused(problems.join(" "));
  const { totalDocs } = await payload.count({ collection: "staff", overrideAccess: true });
  if (totalDocs > 0) throw new BootstrapRefused("Es gibt bereits Konten. Das Einrichtungsskript legt nur das allererste Konto an; weitere Konten legt die Verwaltung an.");
  const doc = await payload.create({
    collection: "staff",
    data: { email: input.email.trim().toLowerCase(), password: input.password, name: input.name.trim(), role: "ADMIN", active: true },
    overrideAccess: true,
    context: { [SERVER_CONTEXT.BOOTSTRAP]: true },
  });
  return { id: doc.id };
}
