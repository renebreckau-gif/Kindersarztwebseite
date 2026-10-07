// Source references (docs/architecture/source-governance.md).
// Practice facts trace to the legacy site as WORKING source only; official medical
// sources were opened and checked on the date given in `lastChecked`.

import type { SourceReference } from "../domain/source.ts";

export const SOURCES = {
  // legacy practice website (working source, never authoritative on its own)
  S01: { id: "S01", type: "PRACTICE_WEBSITE_LEGACY", title: "Sprechzeiten (bisherige Website)", publisher: "Praxis (WordPress)", lastChecked: "2026-10-07", official: false },
  S04: { id: "S04", type: "PRACTICE_WEBSITE_LEGACY", title: "Team (bisherige Website)", publisher: "Praxis (WordPress)", lastChecked: "2026-10-07", official: false },
  S07: { id: "S07", type: "PRACTICE_WEBSITE_LEGACY", title: "Kontakt (bisherige Website)", publisher: "Praxis (WordPress)", lastChecked: "2026-10-07", official: false },

  // official medical / public-health sources (checked 2026-10-07)
  GBA_KINDER: {
    id: "GBA_KINDER",
    type: "OFFICIAL_MEDICAL",
    title: "Kinder-Richtlinie (Früherkennungsuntersuchungen U1–U9)",
    publisher: "Gemeinsamer Bundesausschuss (G-BA)",
    url: "https://www.g-ba.de/richtlinien/15/",
    lastChecked: "2026-10-07",
    official: true,
  },
  BIOEG_U: {
    id: "BIOEG_U",
    type: "OFFICIAL_MEDICAL",
    title: "Früherkennung und Vorsorge: U1–U9 und J1",
    publisher: "Bundesinstitut für Öffentliche Gesundheit (BIÖG) – kindergesundheit-info.de",
    url: "https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/frueherkennung-vorsorge/",
    lastChecked: "2026-10-07",
    official: true,
  },
  BIOEG_TERMINE: {
    id: "BIOEG_TERMINE",
    type: "OFFICIAL_MEDICAL",
    title: "Untersuchungstermine U1–U9 und J1",
    publisher: "BIÖG – kindergesundheit-info.de",
    url: "https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/untersuchungstermine/",
    lastChecked: "2026-10-07",
    official: true,
  },
  BIOEG_HEFT: {
    id: "BIOEG_HEFT",
    type: "OFFICIAL_MEDICAL",
    title: "Das Gelbe Heft",
    publisher: "BIÖG – kindergesundheit-info.de",
    url: "https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/das-gelbe-heft/",
    lastChecked: "2026-10-07",
    official: true,
  },
  BIOEG_J1: {
    id: "BIOEG_J1",
    type: "OFFICIAL_MEDICAL",
    title: "J1-Untersuchung",
    publisher: "BIÖG – kindergesundheit-info.de",
    url: "https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/j1-untersuchung/",
    lastChecked: "2026-10-07",
    official: true,
  },
  STIKO: {
    id: "STIKO",
    type: "OFFICIAL_MEDICAL",
    title: "Empfehlungen der Ständigen Impfkommission (STIKO)",
    publisher: "Robert Koch-Institut (RKI)",
    url: "https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Staendige-Impfkommission/Empfehlungen-der-STIKO/empfehlungen-der-stiko-node.html",
    lastChecked: "2026-10-07",
    official: true,
  },
  GESUND_IMPFEN: {
    id: "GESUND_IMPFEN",
    type: "OFFICIAL_MEDICAL",
    title: "Impfungen",
    publisher: "gesund.bund.de (Bundesministerium für Gesundheit)",
    url: "https://gesund.bund.de/impfungen",
    lastChecked: "2026-10-07",
    official: true,
  },
  BIOEG_IMPFEN: {
    id: "BIOEG_IMPFEN",
    type: "OFFICIAL_MEDICAL",
    title: "Impfen bei Kindern",
    publisher: "BIÖG – kindergesundheit-info.de",
    url: "https://www.kindergesundheit-info.de/themen/risiken-vorbeugen/impfen/",
    lastChecked: "2026-10-07",
    official: true,
  },
  INFEKTIONSSCHUTZ: {
    id: "INFEKTIONSSCHUTZ",
    type: "OFFICIAL_MEDICAL",
    title: "Impfen – Informationen für Familien",
    publisher: "BIÖG – infektionsschutz.de",
    url: "https://www.infektionsschutz.de/impfen/",
    lastChecked: "2026-10-07",
    official: true,
  },
  // official service: 116117 (checked 2026-10-07, Phase 08)
  KBV_116117: {
    id: "KBV_116117",
    type: "OFFICIAL_SERVICE",
    title: "Der ärztliche Bereitschaftsdienst 116117",
    publisher: "116117.de – Patientenservice der Kassenärztlichen Vereinigungen (KBV)",
    url: "https://www.116117.de/de/aerztlicher-bereitschaftsdienst.php",
    lastChecked: "2026-10-07",
    official: true,
    notes:
      "Wörtlich geprüft: „Die Telefonnummer 116117 funktioniert ohne Vorwahl und gilt deutschlandweit.“ · „rund um die Uhr erreichbar – 24 Stunden am Tag, 7 Tage die Woche“ · für Beschwerden, wenn Praxen geschlossen sind und die Behandlung nicht bis zum nächsten Tag warten kann · „In lebensbedrohlichen Fällen … Notrufnummer 112.“",
  },
  // official medical: new U10 decision (checked 2026-10-07, Phase 08)
  GBA_U10: {
    id: "GBA_U10",
    type: "OFFICIAL_MEDICAL",
    title: "Kinder-Richtlinie: Einführung einer neuen Früherkennungsuntersuchung für Kinder nach § 26 SGB V",
    publisher: "Gemeinsamer Bundesausschuss (G-BA)",
    url: "https://www.g-ba.de/beschluesse/7982/",
    publishedOn: "2026-08-20",
    lastChecked: "2026-10-07",
    official: true,
    notes: "Seite am 07.10.2026: Beschlussdatum 20.08.2026 · Inkrafttreten „noch nicht in Kraft“. Kein BMG-Datum und keine Bundesanzeiger-Fundstelle auf der Seite angegeben.",
  },
} satisfies Record<string, SourceReference>;

export type SourceId = keyof typeof SOURCES;

/** The date the official sources were last opened and checked (shown as "Stand"). */
export const OFFICIAL_SOURCES_CHECKED = "2026-10-07";
