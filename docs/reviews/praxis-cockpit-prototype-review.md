# Praxis Cockpit – Prototyp-Test (Phase 09.1)

**Prototyp:** `/lab/praxis-cockpit` (nur Labor, nicht verlinkt, „PROTOTYP · keine echten Daten“)
**Stand:** 13.10.2026. Alle Namen, Praxen und Zeiten sind erfunden. Testzeit im Prototyp: Dienstag, 13. Oktober, 09:20 Uhr.
**Screenshots:** [praxis-cockpit-prototype/screenshots](praxis-cockpit-prototype/screenshots/). Sie sind Belege für das Review, **keine Freigabe**.

Dieses Blatt ist leer. Bitte erst während eines echten Tests ausfüllen. Keine Namen von Testpersonen eintragen, nur Rolle und Nummer.

---

## Was getestet wird

Die Frage lautet: Kann eine normale Mitarbeiterin oder ein normaler Mitarbeiter der Praxis die wichtigsten Änderungen schnell und richtig machen, ohne das System dahinter zu verstehen?

Ablauf je Testperson (ca. 20 Minuten):

1. Vor dem Test im Fußbereich „Testmodus (nur Labor)“ → „Prototyp zurücksetzen“ wählen. Rolle: Praxisteam.
2. Die Aufgabe vorlesen. Nicht helfen, nicht erklären. Die Person laut denken lassen.
3. Zeit stoppen: vom Vorlesen bis zur Erfolgsmeldung.
4. Nach jeder Aufgabe fragen: „Was zeigt die Website jetzt?“

## Aufgaben

| | Aufgabe (vorlesen) | Ziel |
|---|---|---|
| **A** | „Die Praxis schließt heute statt um 16 Uhr bereits um 13 Uhr.“ | ≤ 30 Sekunden |
| **B** | „Die Praxis ist nächste Woche fünf Tage im Urlaub und Praxis Beispiel A übernimmt die Vertretung.“ | ≤ 3 Minuten |
| **C** | „Prüfe, was Eltern am 25. Dezember auf der Website sehen würden.“ | ohne Hilfe |
| **D** | „Mach die letzte Änderung wieder rückgängig.“ | ≤ 15 Sekunden |

**Erfolgskriterien**

- **A:** Die Person nutzt „Heute früher schließen“, wählt 13:00 und sieht die Vorschau. Sie bestätigt mit „Heute um 13:00 schließen“ und versteht, dass die Nachmittagssprechstunde entfällt.
- **B:** Zeitraum Montag–Freitag nächster Woche, eine Vertretung „Praxis Beispiel A“ für den ganzen Zeitraum. Die Person liest die Vorschau, versteht das automatische Ende und veröffentlicht.
- **C:** Die Person findet „Was sieht die Website?“ (Startseite oder Navigation) oder den Punkt unter „Prüfen“. Sie kann sagen, dass Eltern keinen Status sehen, weil der Feiertag nicht geklärt ist.
- **D:** Die Person findet „Änderung zurücknehmen“ (Startseite oder Verlauf) und bestätigt die Rücknahme.

## Zusätzlich beobachten

- Werden Fehlermeldungen ohne Erklärung verstanden?
  - „Widersprüchliche Sonderzeiten“: Aufgabe A zweimal ausführen, oder Testmodus → Szenario.
  - „Feiertag noch nicht geklärt“
  - „Vertretung muss bestätigt werden“ (Praxis Beispiel C)
- Wird der Hinweis „Keine Patientendaten eingeben.“ wahrgenommen, ohne zu stören?
- Wird verstanden, warum es ohne Enddatum nur „Unbefristet veröffentlichen“ gibt?
- Rollen (Testmodus): Sieht Ärztin/Arzt die zusätzlichen Punkte, und versteht das Praxisteam, warum es Vertretung C nicht selbst bestätigen kann?

## Bekannte Punkte vor dem Test

- **Samstag-Feiertage** (31.10., 26.12.) erscheinen unter „Prüfen“. Die echte Praxis-Puls-Logik zeigt dort derzeit keinen Status, obwohl am Wochenende ohnehin geschlossen ist. Das muss entschieden werden (praxis-cockpit.md, Phase-09.1-Notiz).
- Nach „Heute früher schließen“ zeigt die Website-Vorschau den ganzen Tag „Geänderte Sprechzeit heute“ mit einzelnen Zeitblöcken, nicht „geöffnet bis …“ / „geschlossen“.
- Ein Neuladen der Seite setzt den Prototyp zurück.

---

## Beobachtungen

### Testperson 1 (Rolle: ……)

| Aufgabe | Zeit | Ohne Hilfe? | Fehler / Zögern | Zitat / Notiz |
|---|---|---|---|---|
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |

Allgemeine Notizen:

### Testperson 2 (Rolle: ……)

| Aufgabe | Zeit | Ohne Hilfe? | Fehler / Zögern | Zitat / Notiz |
|---|---|---|---|---|
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |

Allgemeine Notizen:

## Ergebnis (nach den Tests ausfüllen)

- Aufgaben erreicht: ……
- Wichtigste Änderungen am Ablauf: ……
- Getestet am: …… · Durchgeführt von: ……
