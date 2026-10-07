// Site structure (docs/ux/information-architecture.md) and orientation copy.
// Navigation and parent-language entry points only — no medical claims, no services
// (F66–F74 are unconfirmed and therefore not listed anywhere).

import type { AgeGroupId } from "@/domain/content-types.ts";

export type PathKey = "heute" | "mein-kind" | "praxis" | "entdecken";

export const PRIMARY: { id: PathKey; label: string; href: string; text: string }[] = [
  { id: "heute", label: "Heute", href: "/heute", text: "Sprechzeiten, Telefon und Notfall" },
  { id: "mein-kind", label: "Mein Kind", href: "/mein-kind", text: "Orientierung nach Alter" },
  { id: "praxis", label: "Praxis", href: "/praxis", text: "Ärztinnen, Team und erster Besuch" },
  { id: "entdecken", label: "Entdecken", href: "/entdecken", text: "Für Kinder: So läuft ein Arztbesuch" },
];

export const SITEMAP: { label: string; href: string; children: { label: string; href: string }[] }[] = [
  { label: "Start", href: "/", children: [] },
  {
    label: "Heute",
    href: "/heute",
    children: [
      { label: "Sprechzeiten", href: "/heute/sprechzeiten" },
      { label: "Aktuelles", href: "/heute/aktuelles" },
      { label: "Notfall", href: "/notfall" },
    ],
  },
  {
    label: "Mein Kind",
    href: "/mein-kind",
    children: [
      { label: "0–2 Jahre", href: "/mein-kind/0-2-jahre" },
      { label: "3–6 Jahre", href: "/mein-kind/3-6-jahre" },
      { label: "7–12 Jahre", href: "/mein-kind/7-12-jahre" },
      { label: "13–17 Jahre", href: "/mein-kind/13-17-jahre" },
      { label: "Vorsorge", href: "/mein-kind/vorsorge" },
      { label: "Impfungen", href: "/mein-kind/impfungen" },
    ],
  },
  {
    label: "Praxis",
    href: "/praxis",
    children: [
      { label: "Ärztinnen", href: "/praxis/aerztinnen" },
      { label: "Team", href: "/praxis/team" },
      { label: "Wobei können wir helfen?", href: "/praxis/leistungen" },
      { label: "Neu bei uns?", href: "/praxis/neu-bei-uns" },
      { label: "Kontakt & Anfahrt", href: "/praxis/kontakt" },
    ],
  },
  { label: "Entdecken", href: "/entdecken", children: [{ label: "Mein Arztbesuch", href: "/entdecken#mein-arztbesuch" }] },
];

export const LEGAL = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
  { label: "Barrierefreiheit", href: "/barrierefreiheit" },
];

// ---------------------------------------------------------------- age ranges

export interface AgeRange {
  id: AgeGroupId;
  slug: string;
  label: string;
  name: string;
  intro: string;
  /** Relative "height" on the growth scale (0–1). */
  scale: number;
  topics: AgeTopic[];
}

export interface AgeTopic {
  label: string;
  href: string;
  text: string;
  /** Carries the age range along (?alter=<slug>) — Vorsorge/Impfungen only. */
  ageContext?: boolean;
}

const VORSORGE: AgeTopic = { label: "Vorsorge", href: "/mein-kind/vorsorge", text: "Was die U-Untersuchungen sind und wo Sie die offiziellen Zeiträume finden", ageContext: true };
const IMPFEN: AgeTopic = { label: "Impfungen", href: "/mein-kind/impfungen", text: "Wie Impfempfehlungen entstehen und wo sie gepflegt werden", ageContext: true };

export const AGES: AgeRange[] = [
  {
    id: "0-2",
    slug: "0-2-jahre",
    label: "0–2",
    name: "Die ersten Jahre",
    intro: "Wachsen, schlafen, staunen – und viele erste Male. Hier finden Sie Orientierung für die ersten Lebensjahre.",
    scale: 0.32,
    topics: [VORSORGE, IMPFEN, { label: "Neu bei uns?", href: "/praxis/neu-bei-uns", text: "Der erste Kontakt mit der Praxis" }],
  },
  {
    id: "3-6",
    slug: "3-6-jahre",
    label: "3–6",
    name: "Kindergartenjahre",
    intro: "Fragen stellen, Dinge verstehen wollen. Hier finden Sie Orientierung für die Kindergartenzeit.",
    scale: 0.52,
    topics: [VORSORGE, IMPFEN, { label: "Mein Arztbesuch", href: "/entdecken#mein-arztbesuch", text: "Für Kinder erklärt – in Vorbereitung" }],
  },
  {
    id: "7-12",
    slug: "7-12-jahre",
    label: "7–12",
    name: "Schuljahre",
    intro: "Mehr Selbstständigkeit, neue Fragen. Hier finden Sie Orientierung für die Schulzeit.",
    scale: 0.74,
    topics: [VORSORGE, IMPFEN, { label: "Mein Arztbesuch", href: "/entdecken#mein-arztbesuch", text: "Für Kinder erklärt – in Vorbereitung" }],
  },
  {
    id: "13-17",
    slug: "13-17-jahre",
    label: "13–17",
    name: "Jugendliche",
    intro: "Eigene Wege, eigene Fragen. Hier finden Sie Orientierung für das Jugendalter.",
    scale: 1,
    topics: [{ label: "J1", href: "/mein-kind/vorsorge#j1", text: "Die Jugendgesundheitsuntersuchung – mit offizieller Quelle", ageContext: true }, IMPFEN],
  },
];

// ---------------------------------------------------------------- age context (Phase 08.1)
// The age range a parent chose is NAVIGATIONAL context only: it labels pages and keeps the
// way back. It never selects examinations, vaccinations or recommendations.

export const AGE_PARAM = "alter";

/** A valid age range for a query value, or null (unknown, empty, repeated → generic page). */
export function ageFromQuery(value: string | string[] | undefined): AgeRange | null {
  if (typeof value !== "string") return null;
  return AGES.find((a) => a.slug === value) ?? null;
}

/** Topic URL as linked from an age page: Vorsorge/Impfungen keep ?alter=, others stay plain. */
export function ageTopicHref(age: AgeRange, topic: AgeTopic): string {
  if (!topic.ageContext) return topic.href;
  const [path, hash] = topic.href.split("#");
  return `${path}?${AGE_PARAM}=${age.slug}${hash ? `#${hash}` : ""}`;
}

export const ageTopics = (age: AgeRange): AgeTopic[] => age.topics.map((t) => ({ ...t, href: ageTopicHref(age, t) }));

export interface BackTarget {
  href: string;
  label: string;
  ariaLabel: string;
}

/** Deterministic parent for Vorsorge/Impfungen: the age page if a valid context exists. */
export function topicBack(age: AgeRange | null): BackTarget {
  return age
    ? { href: `/mein-kind/${age.slug}`, label: `${age.label} Jahre`, ariaLabel: `Zurück zu ${age.label} Jahre` }
    : { href: "/mein-kind", label: "Mein Kind", ariaLabel: "Zurück zu Mein Kind" };
}

export const ageSectionTitle = (age: AgeRange) => `Orientierung für ${age.label} Jahre`;
/** Context line under the H1 of Vorsorge/Impfungen. */
export const ageContextLine = (age: AgeRange) => `Orientierung für ${age.label} Jahre · ${age.name}`;

// ---------------------------------------------------------------- "Wobei können wir helfen?"

/** Parent-language needs → verified destinations. Navigation, never diagnosis or triage. */
export const NEEDS: { label: string; text: string; href: string }[] = [
  { label: "Mein Kind ist heute krank", text: "Sprechzeiten heute – und direkt anrufen", href: "/heute" },
  { label: "Es ist abends oder am Wochenende", text: "Was Sie außerhalb der Sprechzeiten tun können", href: "/notfall" },
  { label: "Vorsorgeuntersuchungen", text: "Orientierung zu U1 bis J1 mit offiziellen Quellen", href: "/mein-kind/vorsorge" },
  { label: "Impfungen", text: "Wie Empfehlungen entstehen und wo sie stehen", href: "/mein-kind/impfungen" },
  { label: "Wir sind neu hier", text: "Der erste Kontakt mit der Praxis", href: "/praxis/neu-bei-uns" },
  { label: "Kontakt und Anfahrt", text: "Telefon, Fax, E-Mail und Ort", href: "/praxis/kontakt" },
];

/** Official U/J programme names (G-BA Kinder-Richtlinie) — names only, no age windows until physician approval. */
export const EXAMINATIONS = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U7a", "U8", "U9", "J1"];
