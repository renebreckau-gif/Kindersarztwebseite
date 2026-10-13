// Staging review hub (/review): one entry point for reviewers. Server-side switch only —
// never relies on robots.txt or obscurity. Default OFF; the final production deployment
// simply does not set the flag, and /review answers 404.

/** `REVIEW_HUB_ENABLED=true` (exact, server-side env) enables the hub; anything else disables it. */
export function isReviewHubEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.REVIEW_HUB_ENABLED === "true";
}

/** Mock test account shown on the hub (lab prototype only, no real account). */
export const REVIEW_TEST_ACCESS = { email: "team@beispiel.test", password: "test1234" } as const;

export interface ReviewCard {
  id: "cockpit" | "discovery" | "website";
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
    text: "Interner Bereich für Öffnungszeiten, Urlaub, Vertretungen und Hinweise.",
    status: "Prototyp",
    action: "Praxis Cockpit öffnen",
    href: "/lab/praxis-cockpit/anmelden",
  },
  {
    id: "discovery",
    title: "Mein Arztbesuch",
    text: "Review der sechs Szenen im Bereich Entdecken.",
    status: "Freigabe ausstehend",
    action: "Mein Arztbesuch öffnen",
    href: "/entdecken/mein-arztbesuch?vorschau=freigabe",
  },
  {
    id: "website",
    title: "Website",
    text: "Aktuellen Stand der öffentlichen Seiten auf Staging ansehen.",
    action: "Website öffnen",
    href: "/",
  },
];
