// Review hub (/review): a convenience overview for reviewers — it unlocks nothing. Available
// while SITE_STAGE is "STAGING" (src/content/release.ts); in PRODUCTION /review answers 404.

import { stageAllowsReview, type SiteStage } from "../content/release.ts";

export const isReviewHubEnabled = (stage?: SiteStage) =>
  stageAllowsReview(stage);

/** Mock test account shown on the hub (lab prototype only, no real account). */
export const REVIEW_TEST_ACCESS = {
  email: "team@beispiel.test",
  password: "test1234",
} as const;

export interface ReviewCard {
  id:
    | "cockpit"
    | "discovery"
    | "website"
    | "gut-vorbereitet"
    | "praxis-app"
    | "rezepte"
    | "kosten"
    | "team";
  title: string;
  text: string;
  status?: string;
  action: string;
  href: string;
}

export const REVIEW_CARDS: ReviewCard[] = [
  {
    id: "cockpit",
    title: "Praxis Cockpit",
    text: "Prototyp-Review mit Testdaten: alle Arbeitsabläufe für Öffnungszeiten, Urlaub, Vertretungen und Hinweise. Der normale Zugang für das Praxisteam ist der „Mitarbeiterbereich“ im Footer der Website.",
    status: "Prototyp · Testdaten",
    action: "Praxis Cockpit öffnen",
    href: "/lab/praxis-cockpit/anmelden",
  },
  {
    id: "discovery",
    title: "Mein Arztbesuch",
    text: "Die sechs Szenen im Bereich Entdecken – so, wie sie auf der Website erscheinen.",
    status: "Veröffentlicht",
    action: "Mein Arztbesuch öffnen",
    href: "/entdecken/mein-arztbesuch",
  },
  {
    id: "gut-vorbereitet",
    title: "Gut vorbereitet – Freigabeentwurf",
    text: "Vorschläge aus dem Praxisteam (Gesundheitskarte, Impfpass, Mundschutz bei Infekt) mit den offenen Fragen zur Freigabe. Noch nicht öffentlich.",
    status: "Freigabeentwurf",
    action: "Freigabeentwurf öffnen",
    href: "/review/gut-vorbereitet",
  },
  {
    id: "praxis-app",
    title: "Praxis-App – Freigabeentwurf",
    text: "Was zur App der Praxis noch bestätigt werden muss: Name, Anbieter, Plattformen, Funktionen, Zugang und Datenverarbeitung. Noch nicht öffentlich.",
    status: "Freigabeentwurf",
    action: "Freigabeentwurf öffnen",
    href: "/review/praxis-app",
  },
  {
    id: "rezepte",
    title: "Rezepte & E-Rezept – Freigabeentwurf",
    text: "Wie läuft eine Rezeptanfrage in der Praxis ab? Welche Rezepte, über welche Wege, Gesundheitskarte, Bearbeitung, E-Rezept und nötige Angaben. Noch nicht öffentlich.",
    status: "Freigabeentwurf",
    action: "Freigabeentwurf öffnen",
    href: "/review/rezepte",
  },
  {
    id: "kosten",
    title: "Kosten & Zahlungsarten – Freigabeentwurf",
    text: "Welche Leistungen mit Preis erscheinen sollen, ob eine aktuelle Preisliste vorliegt und welche Zahlungsarten gelten. Noch nicht öffentlich.",
    status: "Freigabeentwurf",
    action: "Freigabeentwurf öffnen",
    href: "/review/kosten",
  },
  {
    id: "team",
    title: "Team & Fotos – Freigabeentwurf",
    text: "Wer soll wie auf der Website erscheinen? Teamliste, Bezeichnungen, Einwilligung zu Namen und Fotos, Bildrechte. Noch nicht öffentlich.",
    status: "Freigabeentwurf",
    action: "Freigabeentwurf öffnen",
    href: "/review/team",
  },
  {
    id: "website",
    title: "Website",
    text: "Aktuellen Stand der öffentlichen Seiten auf Staging ansehen.",
    action: "Website öffnen",
    href: "/",
  },
];
