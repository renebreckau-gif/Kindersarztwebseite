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

| **E** | „Melde dich im Praxis Cockpit an.“ (Testzugang: team@beispiel.test / test1234) | ohne Hilfe |
| **F** | „Trag Urlaub von Montag, 19., bis Freitag, 23. Oktober ein und wähle Praxis Beispiel A als Vertretung.“ | ≤ 3 Minuten |
| **G** | „Zeig mir, was Eltern während des Urlaubs auf der Website sehen.“ | ohne Hilfe |
| **H** | „Teile die Vertretung auf: Praxis Beispiel A bis Mittwoch, Praxis Beispiel B Donnerstag und Freitag.“ | ≤ 3 Minuten |

Hinweis zu F und H: Im Auftrag stand „20.–24. Oktober“ als Montag bis Freitag. 2026 ist der 20. Oktober aber ein Dienstag. Getestet wird deshalb die Woche Montag, 19., bis Freitag, 23. Oktober 2026.

**Erfolgskriterien**

- **A:** Die Person nutzt „Heute früher schließen“, wählt 13:00 und sieht die Vorschau. Sie versteht den Hinweis, dass die Praxis um 13:00 Uhr regulär schon geschlossen ist, und bestätigt mit „Nachmittagssprechzeit heute entfallen lassen“.
- **B:** Zeitraum Montag–Freitag nächster Woche, eine Vertretung „Praxis Beispiel A“ für den ganzen Zeitraum. Die Person liest die Vorschau, versteht das automatische Ende und veröffentlicht.
- **C:** Die Person findet die „Website-Vorschau“ (Startseite oder Navigation) oder den Punkt unter „Prüfen“. Sie kann sagen, dass Eltern keinen Status sehen, weil der Feiertag nicht geklärt ist.
- **D:** Die Person findet „Änderung zurücknehmen“ (Startseite oder Verlauf) und bestätigt die Rücknahme.

- **E:** Die Person meldet sich mit dem Testzugang an (selbst eingetippt oder mit „Testzugang einsetzen“) und landet auf der Cockpit-Startseite. Bei falschem Passwort versteht sie die Meldung.
- **F:** Zeitraum Montag bis Freitag, „Eine Vertretung für den ganzen Zeitraum“, Praxis Beispiel A. Die Person liest die Website-Vorschau („Mit dieser Änderung“) und das automatische Ende und veröffentlicht mit „Urlaub vom 19.–23. Oktober veröffentlichen“.
- **G:** Die Person öffnet „Ansicht auf der Website öffnen“ (oder „Ansehen“ → „Website-Vorschau“), tippt auf „Vertretung anzeigen“ und kann sagen, welche Praxis zuständig ist und wann die Praxis wieder öffnet.
- **H:** „Zeitraum aufteilen“: 19.–21. Praxis Beispiel A, 22.–23. Praxis Beispiel B. In der Elternansicht ist sofort klar, wer wann zuständig ist.
- Beobachten: Versucht die Person, Praxis Beispiel C zu wählen, und versteht sie die Erklärung?

## Fragen zur Website-Vorschau und zum automatischen Ende (Phase 09.1.3)

Nach Aufgabe A oder F stellen, **ohne die Antwort vorzugeben**:

1. „Verstehst du sofort, was rechts angezeigt wird?“
2. „Kannst du erkennen, wie deine Änderung die Website verändert?“
3. „Was erwartest du, was nach Ende des Urlaubs passiert?“
4. „Müsstest du deiner Meinung nach nach dem Urlaub noch etwas manuell ausschalten?“

Erwartetes Verständnis (nur zur Auswertung, nicht vorlesen): Nein, nach dem Enddatum gelten automatisch wieder die normalen Regeln.

| Testperson | Frage 1 | Frage 2 | Frage 3 | Frage 4 |
|---|---|---|---|---|
| | | | | |
| | | | | |

## Zusätzlich beobachten

- Werden Fehlermeldungen ohne Erklärung verstanden?
  - „Widersprüchliche Sonderzeiten“: Aufgabe A zweimal ausführen, oder Testmodus → Szenario.
  - „Feiertag noch nicht geklärt“
  - „Vertretung muss bestätigt werden“ (Praxis Beispiel C)
- Wird der Hinweis „Keine Patientendaten eingeben.“ wahrgenommen, ohne zu stören?
- Wird verstanden, warum es ohne Enddatum nur „Unbefristet veröffentlichen“ gibt?
- Rollen (Testmodus): Sieht Ärztin/Arzt die zusätzlichen Punkte, und versteht das Praxisteam, warum es Vertretung C nicht selbst bestätigen kann?

## Bekannte Punkte vor dem Test

- Seit Phase 09.1.1 gilt:
  - Feiertage am Samstag oder Sonntag (31.10., 26.12.) sind durch die Wochenendregel geklärt. Nur der 25.12. (Freitag) steht unter „Prüfen“.
  - An Tagen mit Sonderzeit sagt die Website zuerst „geöffnet“ oder „geschlossen“. „Geänderte Sprechzeit heute“ steht nur als Zusatz darunter.
- Liegt die gewählte Uhrzeit in der Mittagspause (z. B. 13:00 Uhr), erklärt das Cockpit, dass die Nachmittagssprechzeit entfällt. Der Knopf heißt dann „Nachmittagssprechzeit heute entfallen lassen“. Beobachten: Wird das verstanden?
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

### Aufgaben E–H

| Testperson | Aufgabe | Zeit | Ohne Hilfe? | Fehler / Zögern | Zitat / Notiz |
|---|---|---|---|---|---|
| | E | | | | |
| | F | | | | |
| | G | | | | |
| | H | | | | |

Allgemeine Notizen:

## Ergebnis (nach den Tests ausfüllen)

- Aufgaben erreicht: ……
- Wichtigste Änderungen am Ablauf: ……
- Getestet am: …… · Durchgeführt von: ……
