// Vertretungspraxen (Phase 09.5G) — pure directory rules. No Payload, no React, no practice facts.
//
// Authority: ADMIN enters / corrects the STRUCTURAL data (always unverified afterwards); a DOCTOR
// verifies exactly the stored data; STAFF read and use usable entries. Usability is decided only by
// evaluateFreshness(…, "replacementPractice") + isUsable — no second staleness algorithm.

import type { ReplacementPractice } from "./content-types.ts";

/** Fields whose change invalidates a physician confirmation (everything the public could see or dial). */
export const STRUCTURAL_FIELDS = ["practiceName", "street", "postalCode", "city", "phone", "email", "website", "publicNote", "contactPersons"] as const;
export type StructuralField = (typeof STRUCTURAL_FIELDS)[number];

export const REPLACEMENT_LIMITS = { practiceName: 120, street: 120, postalCode: 10, city: 80, phone: 40, publicNote: 160, email: 120, website: 200 } as const;

export interface ReplacementInput {
  practiceName: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email?: string;
  website?: string;
  publicNote?: string;
}

export const FIELD_LABEL: Record<keyof ReplacementInput, string> = {
  practiceName: "Praxisname",
  street: "Straße",
  postalCode: "PLZ",
  city: "Ort",
  phone: "Telefon",
  email: "E-Mail",
  website: "Webseite",
  publicNote: "Öffentlicher Hinweis",
};

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Trimmed input; empty optional fields become absent. */
export function normalizeReplacement(raw: Partial<Record<keyof ReplacementInput, unknown>>): ReplacementInput {
  const opt = (v: unknown) => clean(v) || undefined;
  return {
    practiceName: clean(raw.practiceName),
    street: clean(raw.street),
    postalCode: clean(raw.postalCode),
    city: clean(raw.city),
    phone: clean(raw.phone),
    email: opt(raw.email),
    website: opt(raw.website),
    publicNote: opt(raw.publicNote),
  };
}

/** Only http(s) URLs with a host — never javascript:, data: or relative links. */
export function safeWebsite(v: string | undefined): string | undefined {
  if (!v) return undefined;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export interface FieldProblem {
  field: keyof ReplacementInput;
  message: string;
}

/** Server validation (cockpit workflow AND collection hook). Plain German, one problem per field. */
export function replacementProblems(i: ReplacementInput): FieldProblem[] {
  const out: FieldProblem[] = [];
  const req = (f: keyof ReplacementInput) => {
    if (!i[f]) out.push({ field: f, message: `Bitte ${FIELD_LABEL[f]} angeben.` });
  };
  (["practiceName", "street", "postalCode", "city", "phone"] as const).forEach(req);
  for (const f of Object.keys(REPLACEMENT_LIMITS) as (keyof typeof REPLACEMENT_LIMITS)[]) {
    const v = i[f];
    if (v && v.length > REPLACEMENT_LIMITS[f] && !out.some((p) => p.field === f)) out.push({ field: f, message: `${FIELD_LABEL[f]}: höchstens ${REPLACEMENT_LIMITS[f]} Zeichen.` });
  }
  if (i.postalCode && !/^[0-9A-Za-z][0-9A-Za-z -]{2,9}$/.test(i.postalCode) && !out.some((p) => p.field === "postalCode")) out.push({ field: "postalCode", message: "Bitte eine gültige Postleitzahl angeben." });
  if (i.phone && !/^[0-9+()/ .-]{4,40}$/.test(i.phone) && !out.some((p) => p.field === "phone")) out.push({ field: "phone", message: "Bitte eine Telefonnummer aus Ziffern angeben (auch + ( ) / - und Leerzeichen)." });
  if (i.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) out.push({ field: "email", message: "Bitte eine gültige E-Mail-Adresse angeben." });
  if (i.website && !safeWebsite(i.website)) out.push({ field: "website", message: "Bitte eine vollständige Webadresse mit https:// angeben." });
  return out;
}

/** Stable comparison of the structural content of a stored document / domain record. */
export function structuralKey(doc: object): string {
  const x = doc as Partial<Record<StructuralField, unknown>>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((c) => (typeof c === "string" ? c : String((c as { name?: string })?.name ?? ""))) : []);
  return JSON.stringify(STRUCTURAL_FIELDS.map((f) => (f === "contactPersons" ? list(x[f]) : clean(x[f]) || null)));
}

/** Field-by-field differences between the stored record and the proposed input (for the ADMIN preview). */
export function structuralChanges(current: ReplacementPractice | undefined, next: ReplacementInput): { field: keyof ReplacementInput; before?: string; after?: string }[] {
  return (Object.keys(FIELD_LABEL) as (keyof ReplacementInput)[])
    .map((f) => ({ field: f, before: current ? (current[f] as string | undefined) || undefined : undefined, after: next[f] || undefined }))
    .filter((c) => (c.before ?? "") !== (c.after ?? ""));
}
