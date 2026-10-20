// "Kosten & Zahlungsarten" (Phase 10.4A) — approval preparation ONLY.
// Source: practice-staff feedback, October 2026 (a price list for selected services, e.g.
// Kita-Tauglichkeit / Bescheinigungen; information on payment methods; possibly "no cash").
// The project has NO verified price list and knows no accepted payment method. Nothing is
// inferred from other practices, fee schedules, web searches or generic certificate fees.
// No amount, no payment method, no "keine Barzahlung", no insurance / tax / billing statement.
// A future price item needs BOTH a confirmed service (F66–F74, F111) AND a confirmed current
// price (F112); a confirmed price never makes an unconfirmed service public.
// No price records, no Payload collection, no payment functionality.

import type { ApprovalSection } from "./approval-review.ts";

export interface PricingReviewSection extends ApprovalSection {
  id:
    | "leistungen"
    | "preisliste"
    | "anzeige"
    | "zahlungsarten"
    | "barzahlung"
    | "ablauf"
    | "pflege"
    | "darstellung";
}

const REQUEST =
  "Hinweis aus dem Praxisteam (Oktober 2026): Preise für ausgewählte Leistungen und die Zahlungsarten sollen auf der Website stehen.";

export const PRICING_REVIEW: PricingReviewSection[] = [
  {
    id: "leistungen",
    title: "Welche Leistungen?",
    factIds: ["F111", "F113"],
    risk: "HIGH",
    known: [
      REQUEST,
      "Die Leistungsliste der bisherigen Website (F66–F74, Stand 2020) ist unbestätigt. Sie nennt unter anderem Bescheinigungen und Tauglichkeitsuntersuchungen (F69).",
    ],
    unconfirmed: [
      "Welche Leistungen die Praxis anbietet und welche davon Familien selbst bezahlen.",
      "Ob es die genannten Bescheinigungen gibt und wie die Leistung genau heißt.",
    ],
    questions: [
      "Welche Leistungen möchten Sie mit Preis auf der Website zeigen?",
      "Welche davon sind Selbstzahlerleistungen?",
      "Welche Bescheinigungen haben feste Preise?",
      "Gibt es Leistungen, deren Preis individuell berechnet wird?",
      "Gibt es Leistungen, die bewusst nicht mit Preis auf der Website erscheinen sollen?",
      "Welche Leistungen zahlen Familien selbst, welche übernimmt die Krankenkasse? (Nur zur Einordnung; auf der Website erscheint dazu nichts ohne gesonderte Prüfung.)",
    ],
    examples: ["Kita-Tauglichkeit / Bescheinigung"],
    notes: [
      "F69 bestätigt nicht, dass eine bestimmte kostenpflichtige Leistung angeboten wird. Das Projekt erstellt keine eigene Leistungs- oder Preisliste.",
      "Ein Preis allein macht eine Leistung nicht zur Selbstzahlerleistung.",
    ],
  },
  {
    id: "preisliste",
    title: "Aktuelle Preisliste",
    factIds: ["F110", "F112"],
    risk: "HIGH",
    known: ["Eine aktuelle Preisliste der Praxis liegt dem Projekt nicht vor."],
    unconfirmed: [
      "Ob es eine aktuelle Preisliste gibt und welcher Stand gilt.",
      "Jeder einzelne Preis.",
    ],
    questions: [
      "Gibt es eine aktuelle Preisliste?",
      "Welches Datum bzw. welcher Stand gilt?",
      "Wer pflegt sie?",
      "Kann die Praxis uns die aktuelle Liste als Datei oder Foto geben?",
    ],
    missing: ["Aktuelle Preisliste – noch nicht vorliegend"],
    notes: [
      "Als Quelle gilt nur eine aktuelle Liste der Praxis (Datei, interne Liste oder schriftliche Bestätigung). Alte oder erinnerte Preise werden nicht übernommen.",
    ],
  },
  {
    id: "anzeige",
    title: "Wie Preise anzeigen?",
    factIds: [],
    known: [
      "Es ist nicht bekannt, ob die Preise fest sind oder vom Aufwand abhängen.",
    ],
    unconfirmed: ["Die Form jeder Preisangabe."],
    questions: [
      "Sind die angegebenen Preise feste Endpreise?",
      "Gibt es „ab“-Preise?",
      "Gibt es Leistungen, deren Preis vom Aufwand abhängt?",
      "Soll die Website bei variablen Leistungen nur auf Nachfrage verweisen?",
    ],
    toClarify: [
      "Fester Preis",
      "„ab“-Preis",
      "Preis nach Aufwand",
      "Nur auf Nachfrage",
    ],
    notes: [
      "Welche Form gilt, entscheidet die Praxis je Leistung (gehört zu F112). Es werden keine Spannen oder Beispielbeträge angenommen.",
    ],
  },
  {
    id: "zahlungsarten",
    title: "Zahlungsarten",
    factIds: ["F114"],
    risk: "MEDIUM",
    known: ["Laut Praxisteam sollen die Zahlungsarten auf der Website stehen."],
    unconfirmed: ["Jede einzelne Zahlungsart."],
    channelsTitle: "Mögliche Zahlungsarten",
    channels: [
      {
        id: "karte",
        label: "Girocard / Karte",
        status: "UNCONFIRMED",
        question: "Ist Kartenzahlung (Girocard) möglich?",
      },
      {
        id: "kreditkarte",
        label: "Kreditkarte",
        status: "UNCONFIRMED",
        question: "Werden Kreditkarten angenommen?",
      },
      {
        id: "bar",
        label: "Barzahlung",
        status: "UNCONFIRMED",
        question: "Ist Barzahlung möglich?",
        related: "eigener Abschnitt „Barzahlung“ (F115)",
      },
      {
        id: "rechnung",
        label: "Rechnung",
        status: "UNCONFIRMED",
        question: "Wird eine Rechnung gestellt?",
      },
      {
        id: "ueberweisung",
        label: "Überweisung",
        status: "UNCONFIRMED",
        question: "Kann per Überweisung bezahlt werden?",
      },
      {
        id: "sonstiges",
        label: "Sonstiges",
        status: "UNCONFIRMED",
        question: "Gibt es andere Zahlungsarten?",
      },
    ],
    questions: ["Welche Zahlungsarten akzeptieren Sie?"],
    notes: [
      "Keine Zahlungsart gilt als angenommen, bevor die Praxis sie bestätigt. Keine Logos von Kartenanbietern, auch nicht später ohne Bestätigung.",
      "Die Website bleibt informativ: keine Online-Zahlung, kein Bezahl-Link, keine Kartendaten.",
    ],
  },
  {
    id: "barzahlung",
    title: "Barzahlung",
    factIds: ["F115"],
    risk: "MEDIUM",
    known: ["Laut Praxisteam ist Barzahlung möglicherweise nicht möglich."],
    unconfirmed: ["Ob Barzahlung tatsächlich ausgeschlossen ist."],
    questions: [
      "Ist Barzahlung tatsächlich ausgeschlossen?",
      "Für alle Selbstzahlerleistungen?",
      "Gibt es Ausnahmen?",
      "Welche Zahlungsart soll stattdessen genutzt werden?",
    ],
    notes: [
      "Ein Satz wie „Keine Barzahlung möglich“ erscheint nicht, bevor die Praxis ihn bestätigt hat.",
    ],
  },
  {
    id: "ablauf",
    title: "Zahlungsablauf",
    factIds: ["F116"],
    risk: "MEDIUM",
    known: ["Es ist nicht bekannt, wann und wo bezahlt wird."],
    unconfirmed: ["Jeder Schritt des Zahlungsablaufs."],
    questions: [
      "Wann wird bezahlt: direkt nach der Leistung, vorher oder später per Rechnung?",
      "Gibt es einen Beleg bzw. eine Rechnung?",
      "Muss etwas an der Anmeldung bezahlt werden?",
    ],
    notes: ["Das Projekt legt keinen Ablauf fest."],
  },
  {
    id: "pflege",
    title: "Pflege der Preise",
    factIds: ["F117"],
    risk: "MEDIUM",
    known: [
      "Preise können veralten. Wer die Liste in der Praxis pflegt, ist nicht bekannt.",
    ],
    unconfirmed: ["Zuständigkeit und Turnus der Prüfung."],
    questions: [
      "Wer in der Praxis ist für die Preise zuständig?",
      "Wann ändern sich Preise üblicherweise?",
      "Wie erfahren wir von einer Änderung?",
    ],
    notes: [
      "Vorschlag, noch keine Regel: jeder Preis bekommt Bestätigung, Datum der letzten Prüfung und Wiedervorlage. Geprüft wird mindestens jährlich oder sobald die Praxis ihre Liste ändert.",
    ],
  },
  {
    id: "darstellung",
    title: "Spätere Website-Darstellung",
    factIds: [],
    known: [
      "Die Startseite bleibt nach Variante B unverändert. Preise und Zahlungsarten gehören in einen eigenen Bereich.",
    ],
    unconfirmed: [
      "Alle Inhalte der späteren Seite hängen an den Antworten oben.",
    ],
    questions: [
      "Soll die Website Preise und Zahlungsarten zeigen, sobald sie bestätigt sind?",
    ],
    notes: [
      "Vorschlag für später (10.4B): eine eigene Seite „Kosten & Selbstzahlerleistungen“ im Bereich Praxis (z. B. /praxis/kosten), verlinkt von „Wobei können wir helfen?“. Je Leistung: Name, kurze Erläuterung, Preis. Danach die Zahlungsarten.",
      "Auf dem Handy eine Leistung pro Zeile, keine breite Tabelle. Zahlungsarten als kurze Textliste, erst nach Bestätigung.",
      "Schlicht und sachlich: keine Preistabellen-Effekte, keine Tarif-Karten.",
      "Kein Preis, keine Zahlungsart und kein Hinweis zur Barzahlung auf der Startseite oder auf der Praxis-Übersicht.",
    ],
  },
];
