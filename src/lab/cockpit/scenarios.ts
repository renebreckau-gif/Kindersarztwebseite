// LAB-ONLY test scenarios for the usability test (Phase 09.1.4). Each one "publishes earlier"
// a record by a mock person, so testers can practise edit vs. conflict. Never production code.

import { MOCK_DIRECTORY, ROLES, cutAt, dayMonth, entryVerification, rulesSegments, withAnnouncement, withClosure, withException, type CockpitData, type Role } from "./model.ts";
import type { ChangeInput } from "./state.ts";
import { addDays, weekdayOf, type LocalDate } from "../../domain/time.ts";

export interface Scenario {
  key: "A" | "B" | "C" | "D";
  label: string;
  hint: string;
  build: (d: CockpitData, today: LocalDate) => { next: CockpitData; entry: ChangeInput; actorRole: Role; time: string };
}

const nextFriday = (today: LocalDate) => {
  let d = today;
  while (weekdayOf(d) !== 5) d = addDays(d, 1);
  return d;
};

export const SCENARIOS: Scenario[] = [
  {
    key: "A",
    label: "Szenario A · Heute bis 15:00 Uhr",
    hint: "Für heute ist „bis 15:00 Uhr“ veröffentlicht. Aufgabe: auf 13:00 Uhr ändern.",
    build: (d, today) => {
      const segs = cutAt(rulesSegments(today), "15:00");
      return {
        next: withException(d, {
          id: "szenario-a-heute",
          kind: "SPECIAL_HOURS",
          startDate: today,
          endDate: today,
          intervals: segs.map((x) => ({ start: x.start, end: x.end, consultationType: x.type })),
          priority: 1,
          verification: entryVerification(ROLES.DOCTOR.person, "DOCTOR", today, today),
        }),
        entry: { title: "Heute um 15:00 Uhr schließen", detail: "Öffnungszeit heute geändert", before: "08:00–12:00 und 14:00–16:00", after: "08:00–12:00 und 14:00–15:00", undoSentence: "Die Praxis wäre heute wieder bis 16:00 geöffnet.", entityIds: ["szenario-a-heute"] },
        actorRole: "DOCTOR",
        time: "08:05",
      };
    },
  },
  {
    key: "B",
    label: "Szenario B · Urlaub 19.–23.10. mit Vertretung",
    hint: "Urlaub 19.–23. Oktober mit Praxis Beispiel A ist veröffentlicht. Aufgabe: bis 26.10. verlängern.",
    build: (d, today) => ({
      next: withClosure(d, {
        id: "szenario-b-urlaub",
        kind: "VACATION",
        startDate: "2026-10-19",
        endDate: "2026-10-23",
        announceFrom: "2026-10-05",
        publicMessage: "Die Praxis ist in diesem Zeitraum geschlossen.",
        replacements: [{ replacementPracticeId: MOCK_DIRECTORY[0].id, from: "2026-10-19", until: "2026-10-23" }],
        verification: entryVerification(ROLES.STAFF.person, "STAFF", "2026-10-23", today),
      }),
      entry: { title: "Urlaub vom 19.–23. Oktober eingetragen", detail: "Vertretung: Praxis Beispiel A (19.–23. Oktober)", before: "normale Sprechzeiten", after: "geschlossen 19.–23. Oktober", undoSentence: "Die Praxis wäre vom 19.–23. Oktober wieder mit den normalen Sprechzeiten auf der Website.", entityIds: ["szenario-b-urlaub"] },
      actorRole: "STAFF",
      time: "08:10",
    }),
  },
  {
    key: "C",
    label: "Szenario C · Hinweis bis Freitag",
    hint: "Ein Hinweis ist bis Freitag veröffentlicht. Aufgabe: bis Montag verlängern.",
    build: (d, today) => {
      const fri = nextFriday(today);
      return {
        next: withAnnouncement(d, {
          id: "szenario-c-hinweis",
          category: "INFO",
          title: "Geänderte Telefonzeiten (Test)",
          shortText: "Diese Woche erreichen Sie uns telefonisch von 8 bis 11 Uhr.",
          validFrom: today,
          validUntil: fri,
          priority: 2,
          homepageHighlight: false,
          published: true,
          verification: entryVerification(ROLES.STAFF.person, "STAFF", fri, today),
        }),
        entry: { title: "Hinweis veröffentlicht", detail: "„Geänderte Telefonzeiten (Test)“", before: "nicht sichtbar", after: `sichtbar bis ${dayMonth(fri)}`, undoSentence: "Der Hinweis wäre nicht mehr auf der Website.", entityIds: ["szenario-c-hinweis"] },
        actorRole: "STAFF",
        time: "08:15",
      };
    },
  },
  {
    key: "D",
    label: "Szenario D · Sondersprechstunde am 21.10.",
    hint: "Für Mittwoch, 21. Oktober ist eine Sondersprechstunde veröffentlicht. Aufgabe: Urlaub 19.–23.10. eintragen – das muss blockiert werden.",
    build: (d, today) => ({
      next: withException(d, {
        id: "szenario-d-sonder",
        kind: "SPECIAL_HOURS",
        startDate: "2026-10-21",
        endDate: "2026-10-21",
        intervals: [{ start: "09:00", end: "11:00", consultationType: "GENERAL" }],
        publicMessage: "Sondersprechstunde am Vormittag.",
        priority: 1,
        verification: entryVerification(ROLES.DOCTOR.person, "DOCTOR", "2026-10-21", today),
      }),
      entry: { title: "Sondersprechstunde eingetragen", detail: "Mittwoch, 21. Oktober", before: "08:00–12:00 und 14:00–16:00", after: "09:00–11:00", undoSentence: "Am 21. Oktober gälten wieder die regulären Sprechzeiten.", entityIds: ["szenario-d-sonder"] },
      actorRole: "DOCTOR",
      time: "08:20",
    }),
  },
];
