// "Team & Fotos" (Phase 10.5A) — approval preparation ONLY, staging review tooling.
// Shows the existing WORKING data (people.ts, fact register F20–F34, F11) so the practice can
// confirm it; this is not publication. The public gate stays decidePerson (consent F33).
// Nothing is inferred: no additional people from photos, no names from image metadata, no
// mapping of old photos to people, no role from uniforms, no leaving or trainee status from old
// content, no bios. No AI or synthetic portraits of real people (media policy) — the review
// uses a neutral initial, never a face. Name consent and photo consent are separate.

import { DOCTORS, TEAM } from "./people.ts";
import type { ApprovalSection } from "./approval-review.ts";

export type ReviewStatus = "UNCONFIRMED";

/** One question about one person; every answer is open. */
export interface PersonCheck {
  label: string;
  status: ReviewStatus;
}

export interface PersonReview {
  /** id in people.ts, or a register-only id for people not modelled as current. */
  id: string;
  name: string;
  factIds: string[];
  /** Working data exactly as in the sources — not approved wording. */
  workingData: { label: string; value: string }[];
  checks: PersonCheck[];
  questions?: string[];
}

export interface PeopleGroup {
  id: "aerztinnen" | "praxisteam" | "weitere";
  title: string;
  /** Visible label of the data state. */
  stateLabel: string;
  people: PersonReview[];
  questions?: string[];
  notes?: string[];
}

const open = (label: string): PersonCheck => ({ label, status: "UNCONFIRMED" });
const CONSENT_CHECKS = [
  open("Name veröffentlichen"),
  open("Foto veröffentlichen"),
];

const doctor = (id: string) => {
  const d = DOCTORS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown doctor ${id}`);
  return d;
};

/** Role labels of the previous website (F26–F30, S04) — shown for confirmation, never adopted. */
const PREVIOUS_LABEL: Record<string, string> = {
  "Andrea Zahn": "Arzthelferin",
  "Steffi Christmann": "Erzieherin /Arzthelferin",
  "Katharina Weis": "Arzthelferin",
  "Anke Bettche": "Arzthelferin",
  "Peggy Kejs": "Praxisassistentin",
};

export const WORKING_STATE =
  "Arbeitsstand · noch nicht zur Veröffentlichung freigegeben";
export const TEAM_LIST_STATE =
  "Arbeitsstand aus bisheriger Website – Vollständigkeit noch nicht bestätigt";

export const PEOPLE_REVIEW: PeopleGroup[] = [
  {
    id: "aerztinnen",
    title: "Ärztinnen",
    stateLabel: WORKING_STATE,
    people: [
      {
        id: "probst",
        name: doctor("probst").name,
        factIds: ["F20", "F21"],
        workingData: [
          {
            label: "Bezeichnung (Arbeitsstand)",
            value: doctor("probst").specialties.join(", "),
          },
        ],
        checks: [
          open("Name exakt so korrekt"),
          open("Berufsbezeichnung exakt so gewünscht"),
          ...CONSENT_CHECKS,
        ],
        questions: [
          "Ist der Name exakt so öffentlich korrekt?",
          "Ist die Berufsbezeichnung exakt so gewünscht?",
          "Soll „Fachärztin für Kinder- und Jugendmedizin“ öffentlich gezeigt werden?",
          "Gibt es weitere Qualifikationen, die öffentlich genannt werden sollen?",
          "Darf der Name veröffentlicht werden?",
          "Darf ein Foto veröffentlicht werden?",
        ],
      },
      {
        id: "boehme",
        name: doctor("boehme").name,
        factIds: ["F22", "F23"],
        workingData: [
          {
            label: "Bisherige Website (wörtlich)",
            value:
              "„Fachärztin für Kinder- und Jugendmedizin/Kinderchirurgie“, „Naturheilverfahren“",
          },
          {
            label: "Status der Bezeichnung",
            value: "unbestätigt (F23) – wird nicht umformuliert",
          },
        ],
        checks: [
          open("Berufs-/Facharztbezeichnung"),
          open("Zusatzbezeichnung"),
          ...CONSENT_CHECKS,
        ],
        questions: [
          "Welche Berufs-/Facharztbezeichnung soll exakt auf der Website stehen?",
          "Ist „Kinderchirurgie“ ein eigener Facharzttitel oder anders zu formulieren?",
          "Soll „Naturheilverfahren“ genannt werden, und mit welcher exakten Bezeichnung?",
          "Darf der Name veröffentlicht werden?",
          "Darf ein Foto veröffentlicht werden?",
        ],
      },
    ],
  },
  {
    id: "praxisteam",
    title: "Praxisteam",
    stateLabel: TEAM_LIST_STATE,
    people: TEAM.map((m, i) => ({
      id: m.id,
      name: m.name,
      factIds: [`F${26 + i}`],
      workingData: [
        {
          label: "Bisherige Website",
          value: `„${PREVIOUS_LABEL[m.name] ?? "–"}“ – nicht automatisch übernommen`,
        },
      ],
      checks: [
        open("Aktuell im Team"),
        open("Öffentliche Bezeichnung"),
        ...CONSENT_CHECKS,
      ],
    })),
    questions: [
      "Ist diese Teamliste vollständig?",
      "Fehlt jemand?",
      "Ist jemand nicht mehr dabei?",
      "Sollen Auszubildende bzw. Ärztinnen in Weiterbildung gezeigt werden?",
      "Soll das gesamte Team öffentlich erscheinen oder nur bestimmte Rollen?",
      "Für jede Person: Ist sie aktuell noch Teil des Teams? Wie lautet die öffentliche Funktions- bzw. Berufsbezeichnung? Darf der Name veröffentlicht werden? Darf ein Foto veröffentlicht werden?",
    ],
    notes: [
      "Die Liste gilt erst als vollständig, wenn die Praxis F31 bestätigt.",
    ],
  },
  {
    id: "weitere",
    title: "Weitere aktuelle Personen",
    stateLabel:
      "Weitere Person aus bisherigen Informationen – aktueller Status unbestätigt",
    people: [
      {
        id: "f24",
        name: "Firuza Rafiyeva",
        factIds: ["F24"],
        workingData: [
          {
            label: "Bisherige Information (wörtlich)",
            value:
              "Ärztin in Weiterbildung „vom 01.03.2026 bis dato“ – daraus folgt nicht, dass sie heute noch in der Praxis ist",
          },
        ],
        checks: [
          open("Aktuell in der Praxis tätig"),
          open("Öffentliche Rolle / Bezeichnung"),
          open("Auf der Teamseite zeigen"),
          ...CONSENT_CHECKS,
        ],
        questions: [
          "Ist Firuza Rafiyeva aktuell noch in der Praxis tätig?",
          "Falls ja: welche genaue öffentliche Rolle bzw. Bezeichnung?",
          "Soll sie auf der Teamseite erscheinen?",
          "Darf ihr Name veröffentlicht werden?",
          "Darf ein Foto veröffentlicht werden?",
        ],
      },
    ],
    notes: [
      "Ein weiterer Eintrag aus den bisherigen Informationen (F25) ist historisch – nicht als aktuell vorgeschlagen.",
    ],
  },
];

export const TEAM_TOPICS: ApprovalSection[] = [
  {
    id: "rollen",
    title: "Rollen & Bezeichnungen",
    factIds: ["F32"],
    known: [
      "Die bisherige Website nutzt „Arzthelferin“, „Erzieherin /Arzthelferin“ und „Praxisassistentin“ unter der Überschrift „Schwestern“.",
    ],
    unconfirmed: [
      "Jede öffentliche Bezeichnung und die Überschrift des Teambereichs.",
    ],
    questions: [
      "Welche genaue Bezeichnung soll bei jeder Person stehen?",
      "Welche Überschrift wünschen Sie für den Teambereich?",
    ],
    toClarify: [
      "Praxisteam",
      "Team",
      "Assistenz",
      "Ein anderer Begriff der Praxis",
    ],
    notes: [
      "Alte Bezeichnungen werden nicht automatisch übernommen und nicht eigenmächtig modernisiert (etwa zu „MFA“ oder „Medizinische Fachangestellte“).",
    ],
  },
  {
    id: "namen",
    title: "Veröffentlichung von Namen",
    factIds: ["F33"],
    risk: "HIGH",
    known: [
      "Öffentlich erscheint eine Person nur mit bestätigter Einwilligung (F33). Bis dahin zeigt die Website keine Namen des Teams.",
    ],
    unconfirmed: [
      "Die Einwilligung jeder einzelnen Person, ihren Namen zu veröffentlichen.",
    ],
    questions: [
      "Dürfen die Namen der Teammitglieder auf der Website veröffentlicht werden?",
      "Liegt die Einwilligung jeder Person vor, und wo ist sie dokumentiert?",
    ],
    notes: [
      "Name und Foto sind getrennte Einwilligungen. Eine Person kann ohne Foto erscheinen. Ein Foto erscheint nur mit Einwilligung zur Person, Einwilligung zum Bild und geklärten Nutzungsrechten.",
      "Nicht als Einwilligung gilt: Auftritt auf der bisherigen Website, ein vorhandenes Foto, Hinweise aus dem Team, das Arbeitsverhältnis oder Profile in sozialen Medien.",
    ],
  },
  {
    id: "fotos",
    title: "Fotos",
    factIds: ["F34"],
    known: [
      "Es gibt vier ältere Fotos (2020) für sieben Personen, ohne Zuordnung und ohne Bildbeschreibung (F34).",
    ],
    unconfirmed: [
      "Welche Fotos künftig verwendet werden und wer darauf zu sehen ist.",
    ],
    questions: [
      "Möchten Sie lieber neue Fotos machen oder vorhandene Fotos verwenden?",
      "Einzelporträts, Teamfoto oder beides?",
    ],
    candidates: [
      "Neue Einzelporträts",
      "Neues Teamfoto",
      "Bestehende Fotos verwenden – nur nach bestätigter Zuordnung, Nutzungsrechten und Einwilligung",
    ],
    notes: [
      "Gestaltungsempfehlung, keine Tatsache: echte Fotografie, warm und natürlich, gleiches Licht und gleicher Hintergrund, ruhig, nicht förmlich, keine Kittel-Stockfotos, nicht gestellt. Einzelporträts mit ähnlichem Ausschnitt und Maßstab; ein Teamfoto in der Praxis, wenn Rechte und Ablauf es erlauben.",
      "Keine KI-Porträts, keine Montagen, keine geschönten Fassungen echter Personen. Ohne freigegebenes Foto: neutraler Platzhalter ohne Gesicht oder kein Bild.",
      "Falls neue Fotos: Später folgt ein kurzes Foto-Briefing (Porträtliste, Teamfoto ja/nein, Ort, Ausschnitte, Rechteinhaber, schriftliche Einwilligung, Bildbeschreibungen).",
    ],
  },
  {
    id: "bildrechte",
    title: "Bildrechte",
    factIds: ["F11"],
    known: [
      "Die bisherige Website nennt einen Fotografen; Linktext und Linkziel widersprechen sich. Das ist kein Nachweis von Nutzungsrechten.",
    ],
    unconfirmed: [
      "Urheber, Nutzungsrecht für die neue Website und Zuordnung der Personen.",
    ],
    questions: [
      "Wer hat die bestehenden Fotos aufgenommen?",
      "Liegt das Nutzungsrecht für die neue Website vor?",
      "Welche Person ist auf welchem Bild?",
      "Gibt es zeitliche oder mediale Einschränkungen?",
      "Sollen diese Bilder überhaupt noch verwendet werden?",
    ],
    notes: [
      "Bestehende Fotos werden in 10.5A weder gezeigt noch einer Person zugeordnet.",
    ],
  },
  {
    id: "teamseite",
    title: "Zukünftige Team-Seite",
    factIds: [],
    known: [
      "Die Seiten „Team“ und „Ärztinnen“ gibt es bereits. Sie zeigen Personen erst nach bestätigter Einwilligung.",
    ],
    unconfirmed: ["Alle Inhalte hängen an den Antworten oben."],
    questions: [
      "Wünschen Sie kurze Texte zu den Personen? Falls ja, bitte selbst formulieren bzw. freigeben.",
    ],
    notes: [
      "Vorschlag für später (10.5B): kurze Einleitung, danach eine Karte je Person mit freigegebenem Foto (falls vorhanden), Name und bestätigter Bezeichnung. Ein kurzer Text nur, wenn die Praxis ihn liefert.",
      "„Ärztinnen“ für die Ärztinnen und ihre fachlichen Angaben, „Team“ für das gesamte Praxisteam – ohne doppelte lange Texte. Die genaue Aufteilung folgt in 10.5B.",
      "Keine erfundenen Lebensläufe, Hobbys, Zitate, Berufsjahre oder privaten Angaben. Menschlich wirkt die Seite durch echte Fotos und knappe Sprache.",
    ],
  },
];
