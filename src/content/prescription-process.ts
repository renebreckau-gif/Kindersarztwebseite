// "Rezepte & E-Rezept" (Phase 10.3A) — approval preparation ONLY.
// Source: practice-staff feedback, October 2026 (families ask about E-Rezepte / Rezeptanfragen,
// possibly by e-mail; the practice already says something about it in e-mail replies; the
// health card may matter). The project does NOT know the practice's prescription process.
// Nothing is inferred from general German E-Rezept practice: not that repeat prescriptions can be
// requested remotely, not a card-reading rule, not a turnaround, not a channel, not the result.
// No patient request is modelled; no form exists or will exist on this website.
// Wording principle: "Rezept ANFRAGEN" (a request) is never "AUSSTELLUNG / FREIGABE" — the
// physician / practice decides whether a prescription is issued.

import type { ApprovalSection } from "./approval-review.ts";

export interface PrescriptionReviewSection extends ApprovalSection {
  id:
    | "welche"
    | "wer"
    | "wie"
    | "gesundheitskarte"
    | "bearbeitung"
    | "ergebnis"
    | "angaben"
    | "darstellung";
}

const REQUEST =
  "Hinweis aus dem Praxisteam (Oktober 2026): Rezeptanfragen und E-Rezepte kommen regelmäßig vor, möglicherweise auch per E-Mail.";

export const PRESCRIPTION_REVIEW: PrescriptionReviewSection[] = [
  {
    id: "welche",
    title: "Welche Rezepte?",
    factIds: ["F101", "F102"],
    risk: "HIGH",
    known: [
      REQUEST,
      "Auf der bisherigen Website ist kein Rezeptablauf beschrieben (F80).",
    ],
    unconfirmed: [
      "Ob Rezepte ohne persönlichen Arztkontakt angefragt werden können.",
      "Welche Rezeptarten dafür in Frage kommen.",
    ],
    questions: [
      "Welche Rezeptarten dürfen Familien ohne persönlichen Arztkontakt anfragen?",
      "Gilt das nur für bereits bekannte bzw. regelmäßig verordnete Medikamente?",
      "Gibt es Rezeptarten, die ausdrücklich nicht per E-Mail, App oder Telefon angefragt werden dürfen?",
    ],
    toClarify: [
      "Wiederholungsrezept / Folgerezept",
      "Neues Medikament / Erstverordnung",
      "E-Rezept",
      "Papierrezept, wo es das noch gibt",
      "Andere Anliegen rund um Rezepte",
    ],
    notes: [
      "F101 und F102 präzisieren F80 („Folgerezepte / Überweisungen / Bescheinigungen“). Eine Liste von Medikamenten oder Rezeptarten wird nicht vom Projekt erstellt.",
    ],
  },
  {
    id: "wer",
    title: "Wer darf anfragen?",
    factIds: ["F109"],
    risk: "HIGH",
    known: ["Es ist keine Regel bekannt, wer eine Rezeptanfrage stellen darf."],
    unconfirmed: [
      "Ob nur bekannte Patientinnen und Patienten anfragen können und wer für sie anfragen darf.",
    ],
    questions: [
      "Nur bestehende Patientinnen und Patienten der Praxis?",
      "Nur Kinder, die aktuell in der Praxis behandelt werden?",
      "Dürfen Eltern bzw. Sorgeberechtigte anfragen?",
      "Dürfen Jugendliche selbst anfragen?",
      "Gibt es eine Anforderung, wie sich die anfragende Person ausweist oder berechtigt?",
    ],
    notes: [
      "Die Website erhebt dafür keine Identitätsdaten. Hier wird nur der Ablauf geklärt.",
    ],
  },
  {
    id: "wie",
    title: "Wie anfragen?",
    factIds: ["F103", "F104"],
    risk: "HIGH",
    known: [
      "Die E-Mail-Adresse der Praxis ist bestätigt (F17); ihre Nutzung für Patientenanliegen ist es nicht (F18).",
      "Laut Praxisteam wird zu Rezepten bereits in E-Mail-Antworten bzw. in der Signatur etwas mitgeteilt. Der Wortlaut liegt dem Projekt nicht vor.",
    ],
    unconfirmed: ["Jeder Kanal für Rezeptanfragen."],
    channels: [
      {
        id: "telefon",
        label: "Telefon",
        status: "UNCONFIRMED",
        question: "Werden Rezeptanfragen telefonisch angenommen?",
      },
      {
        id: "email",
        label: "E-Mail",
        status: "UNCONFIRMED",
        question: "Werden Rezeptanfragen per E-Mail angenommen?",
        related: "F104 präzisiert F18 für Rezeptanfragen",
      },
      {
        id: "app",
        label: "Praxis-App",
        status: "UNCONFIRMED",
        question: "Werden Rezeptanfragen über die Praxis-App angenommen?",
        related: "hängt mit F98 zusammen (Funktionen der App)",
      },
      {
        id: "vor-ort",
        label: "Vor Ort",
        status: "UNCONFIRMED",
        question: "Muss etwas persönlich in der Praxis beantragt werden?",
      },
    ],
    questions: [
      "Falls E-Mail: Sind Rezeptanfragen eine vorgesehene Nutzung der E-Mail-Adresse?",
      "Falls E-Mail: Welche Angaben sollen mindestens enthalten sein, und welche ausdrücklich nicht?",
      "Falls E-Mail: Sollen medizinische Einzelheiten vermieden werden?",
      "Falls E-Mail: Wie und wann antwortet die Praxis?",
      "Können Sie uns den Text aus Ihrer E-Mail-Antwort bzw. Signatur zu Rezepten schicken?",
    ],
    notes: [
      "F104 präzisiert F18 nur für Rezeptanfragen; F18 bleibt für andere Anliegen offen.",
      "Die Praxis-App beantwortet nur, ob sie Rezeptanfragen technisch unterstützt (F98, Arbeitspaket 10.2). Wie der Ablauf in der Praxis ist, klärt dieses Arbeitspaket.",
      "Kein Kanal wird als „verfügbar“ bezeichnet, solange die Praxis ihn nicht bestätigt hat. Es gibt keinen E-Mail-Rezept-Button und keinen App-Link.",
    ],
  },
  {
    id: "gesundheitskarte",
    title: "Gesundheitskarte",
    factIds: ["F105"],
    risk: "HIGH",
    known: [
      "Laut Praxisteam könnte die Karte („Chipkarte“) für Rezepte eine Rolle spielen.",
    ],
    unconfirmed: [
      "Ob die Karte vor einer Rezeptausstellung eingelesen sein muss, und nach welcher Regel.",
    ],
    questions: [
      "Muss die Gesundheitskarte vor einer Rezeptausstellung eingelesen sein?",
      "Wenn ja: bei jedem Rezept, einmal pro Quartal oder nach einer anderen Regel?",
      "Gilt das für alle Versicherten gleich?",
      "Was passiert, wenn die Karte noch nicht eingelesen wurde?",
      "Muss die Karte dafür persönlich in die Praxis gebracht werden?",
      "Welcher Begriff soll auf der Website stehen: „Gesundheitskarte“, „Versichertenkarte“ oder „Chipkarte“?",
    ],
    notes: [
      "F105 betrifft nur Rezepte. Es bestätigt nicht automatisch F91 („Gesundheitskarte zu jedem Besuch mitbringen“, Freigabeentwurf „Gut vorbereitet“) – und umgekehrt.",
      "Das Praxisteam sagte „Chipkarte“. Der Begriff wird nicht automatisch der Website-Begriff.",
    ],
  },
  {
    id: "bearbeitung",
    title: "Bearbeitung",
    factIds: ["F106"],
    risk: "HIGH",
    known: ["Es ist keine Bearbeitungszeit bekannt."],
    unconfirmed: ["Jede Zeitangabe zur Bearbeitung."],
    questions: [
      "Wann kann ein Rezept nach der Anfrage genutzt bzw. abgeholt werden?",
      "Gibt es eine feste Bearbeitungszeit?",
      "Können Anfragen am selben Tag bearbeitet werden?",
      "Gibt es eine Uhrzeit, bis zu der Anfragen eingehen müssen?",
      "Bekommen Familien eine Bestätigung?",
      "Soll die Website ausdrücklich sagen, dass eine Anfrage noch keine Zusage ist?",
    ],
    notes: [
      "Auf der Website erscheint keine Zeitangabe (etwa „innerhalb von 24 Stunden“), bevor die Praxis sie bestätigt hat.",
    ],
  },
  {
    id: "ergebnis",
    title: "E-Rezept / Abholung",
    factIds: ["F107"],
    risk: "HIGH",
    known: [
      "Es ist nicht bekannt, wie Familien ein angefragtes Rezept erhalten.",
    ],
    unconfirmed: [
      "Ob das Rezept als E-Rezept bereitgestellt wird, und ob es Papierrezepte oder Abholung gibt.",
    ],
    questions: [
      "Wird das Rezept als E-Rezept bereitgestellt?",
      "Wie erfahren Familien, dass es bereit ist?",
      "Kann es direkt mit der Gesundheitskarte in der Apotheke eingelöst werden?",
      "Gibt es Fälle mit Papierrezept?",
      "Muss etwas in der Praxis abgeholt werden?",
    ],
  },
  {
    id: "angaben",
    title: "Welche Angaben brauchen Sie?",
    factIds: ["F108"],
    risk: "HIGH",
    known: [
      "Es ist nicht bekannt, welche Angaben die Praxis für eine Rezeptanfrage braucht.",
    ],
    unconfirmed: [
      "Jede Angabe, die Familien in einer Anfrage machen sollen oder nicht machen sollen.",
    ],
    questions: [
      "Welche Angaben benötigt die Praxis, damit eine Rezeptanfrage eindeutig zugeordnet und bearbeitet werden kann?",
      "Welche Angaben sollen Familien ausdrücklich nicht schicken?",
    ],
    notes: [
      "Das Projekt legt keine Pflichtangaben fest. Die Website fragt solche Angaben nie ab: kein Formular, kein Upload, keine Eingabefelder.",
    ],
  },
  {
    id: "darstellung",
    title: "Spätere Website-Darstellung",
    factIds: [],
    known: [
      "Die Startseite bleibt nach Variante B unverändert. „E-Mail schreiben“ dort ist eine allgemeine Kontaktmöglichkeit und kein Rezeptweg.",
    ],
    unconfirmed: [
      "Alle Inhalte der späteren Seite hängen an den Antworten oben.",
    ],
    questions: [
      "Soll die Website den Rezeptablauf erklären, sobald er bestätigt ist?",
    ],
    notes: [
      "Vorschlag für später (10.3B): eine eigene Seite „Rezepte“ im Bereich Praxis mit fünf Fragen: Kann ich ein Rezept anfragen? Wie kann ich es anfragen? Was muss vorher erledigt sein? Wann ist es verfügbar? Wie erhalte ich es?",
      "Eine Absicht, ein Tipp: Es erscheinen nur bestätigte Wege, etwa „Praxis anrufen“, „E-Mail schreiben“ oder „In der Praxis-App öffnen“.",
      "Formulierung: „Rezept anfragen“ statt „Rezept bestellen“. Eine Anfrage ist keine Ausstellung; ob ein Rezept ausgestellt wird, entscheidet die Praxis bzw. die Ärztin oder der Arzt.",
      "Nicht auf der Startseite. Vorübergehende Hinweise rund um Rezepte könnten das bestehende Hinweis-System nutzen; ein dauerhafter Ablauf wird kein Startseiten-Hinweis.",
    ],
  },
];
