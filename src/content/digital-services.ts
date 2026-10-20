// "Praxis-App & digitale Services" (Phase 10.2A) — approval preparation ONLY.
// Source: practice-staff feedback, October 2026 ("there is an app; families should find it").
// Nothing about the app is verified: not that it exists, not its name, provider, platforms,
// links, functions, registration or data handling. Therefore there are NO service records yet
// (a record would need a confirmed name) and no public selector; the staging approval draft
// shows the fact candidates F95–F100 as questions. Never infer the app from other practices,
// vendors or common pediatric apps. Prescriptions / E-Rezept are a separate work package (10.3).

import type { Verified } from "../domain/content-types.ts";
import type { ApprovalRisk, ApprovalSection } from "./approval-review.ts";

/**
 * The future public shape (10.2B, only after confirmation) — intentionally minimal. A record is
 * created only with a confirmed name; links only with exact, verified store URLs.
 */
export interface DigitalService extends Verified {
  id: string;
  kind: "APP" | "WEB" | "OTHER";
  /** Exact public name as confirmed by the practice. */
  name: string;
  /** One line: what families can do with it (only confirmed functions). */
  shortText: string;
  links: { platform: "IOS" | "ANDROID" | "WEB"; url: string }[];
}

export type AppRisk = ApprovalRisk;

export interface AppReviewSection extends ApprovalSection {
  id:
    | "identitaet"
    | "plattformen"
    | "funktionen"
    | "zugang"
    | "datenschutz"
    | "platzierung";
}

const REQUEST =
  "Hinweis aus dem Praxisteam (Oktober 2026), dass die Website eine App der Praxis erwähnen und den Download erleichtern soll.";

export const APP_REVIEW: AppReviewSection[] = [
  {
    id: "identitaet",
    title: "App identifizieren",
    factIds: ["F95", "F96"],
    risk: "MEDIUM",
    known: [
      REQUEST,
      "In den bisherigen Projektquellen ist keine App der Praxis erfasst.",
    ],
    unconfirmed: [
      "Ob die Praxis aktuell eine App für Familien nutzt.",
      "Name der App.",
      "Anbieter / Plattform.",
    ],
    questions: [
      "Wie heißt die App genau?",
      "Von welchem Anbieter stammt sie?",
      "Wird sie aktuell noch aktiv von der Praxis genutzt?",
      "Gibt es einen Praxiscode, einen QR-Code oder einen Einladungslink?",
    ],
  },
  {
    id: "plattformen",
    title: "Download / Plattformen",
    factIds: ["F97"],
    risk: "MEDIUM",
    known: ["Es liegt kein Download-Link vor."],
    unconfirmed: [
      "Unterstützte Plattformen (iPhone / iOS, Android, Web).",
      "Store-Links.",
    ],
    questions: [
      "Gibt es die App für iPhone / iOS?",
      "Gibt es die App für Android?",
      "Gibt es direkte Store-Links?",
      "Gibt es eine Web-Version?",
    ],
    missing: [
      "App-Store-Link fehlt",
      "Google-Play-Link fehlt",
      "Web-Version: unbekannt",
    ],
  },
  {
    id: "funktionen",
    title: "Funktionen",
    factIds: ["F98"],
    risk: "HIGH",
    known: ["Es ist keine Funktion bestätigt."],
    unconfirmed: [
      "Jede Funktion der App, die die Praxis tatsächlich nutzt – auch dann, wenn es die App gibt.",
    ],
    questions: ["Bitte bestätigen, was die Praxis tatsächlich nutzt."],
    candidates: [
      "Termine anfragen / verwalten",
      "Praxisnachrichten erhalten",
      "Rezepte anfragen",
      "Dokumente erhalten",
      "Erinnerungen",
      "Videosprechstunde",
      "Sonstige Funktionen",
    ],
    notes: [
      "Rezepte / E-Rezept sind ein eigenes Arbeitspaket (10.3). Auch die Bestätigung „Rezepte können über die App angefragt werden“ reicht nicht für eine Anleitung auf der Website: welche Rezepte, Folgerezepte, Gesundheitskarte als Voraussetzung, Bearbeitungszeit, Abholung bzw. E-Rezept und mögliche Einschränkungen klärt 10.3. Der Rezeptablauf wird separat im Freigabeentwurf „Rezepte & E-Rezept“ geklärt.",
      "Die E-Mail-Nutzung für Patientenanliegen (F18) bleibt davon getrennt. Die Website sagt nicht „alternativ per App oder E-Mail“, solange beide Wege nicht bestätigt sind.",
    ],
  },
  {
    id: "zugang",
    title: "Zugang / Registrierung",
    factIds: ["F99"],
    risk: "HIGH",
    known: ["Es ist kein Zugangsweg bekannt."],
    unconfirmed: [
      "Ob Familien ein Konto brauchen und wie sie sich mit der Praxis verbinden.",
    ],
    questions: [
      "Brauchen Familien ein Konto?",
      "Gibt es einen Praxiscode?",
      "Gibt es eine Einladung durch die Praxis?",
      "Gibt es einen QR-Code in der Praxis?",
      "Gibt es weitere Schritte bei der Einrichtung?",
    ],
  },
  {
    id: "datenschutz",
    title: "Datenschutz / Hinweise",
    factIds: ["F100"],
    risk: "HIGH",
    known: ["Es liegen keine Angaben zur Datenverarbeitung der App vor."],
    unconfirmed: ["Welche Daten die App verarbeitet und wer sie betreibt."],
    questions: [
      "Werden personenbezogene Daten oder Gesundheitsdaten über die App verarbeitet?",
      "Gibt es eine Datenschutzinformation des Anbieters?",
      "Wird die App von der Praxis oder von einem Drittanbieter betrieben?",
      "Muss die Praxis einen Auftragsverarbeitungsvertrag oder eine bestehende Vereinbarung berücksichtigen?",
    ],
    notes: [
      "Das sind Sachfragen, keine rechtliche Bewertung. Die rechtliche Prüfung bleibt ein Thema vor dem Launch.",
    ],
  },
  {
    id: "platzierung",
    title: "Zukünftige Website-Platzierung",
    factIds: [],
    known: [
      "Die Startseite bleibt nach Variante B unverändert: keine App-Karte, keine Store-Badges, kein Eintrag im Praxis Puls oder im mobilen Dock.",
    ],
    unconfirmed: [
      "Alle Inhalte des späteren Blocks hängen an den Antworten oben.",
    ],
    questions: [
      "Soll die App auf der Website erwähnt werden, sobald die Angaben bestätigt sind?",
    ],
    notes: [
      "Vorschlag für später (10.2B): eine eigene Seite „Praxis-App“ im Bereich Praxis und eine kleine Service-Karte auf „Praxis“.",
      "Kompakt: Name, eine Zeile Nutzen, App Store / Google Play, optional „Mehr erfahren“. Kein großes App-Marketing, kein Handy-Mockup, kein QR-Code ohne bestätigtes Ziel.",
    ],
  },
];
