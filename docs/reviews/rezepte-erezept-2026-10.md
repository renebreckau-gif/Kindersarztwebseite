# Rezepte & E-Rezept: Klärung des Praxisablaufs (Phase 10.3A)

Stand: 2026-10-20 · Baseline `8fba8a1` · STAGING, nicht indexiert

## Stand

- **QUELLE:** Hinweis aus dem Praxisteam, Oktober 2026.
  - Rezeptanfragen und E-Rezepte kommen regelmäßig vor, möglicherweise auch per E-Mail.
  - Die Praxis teilt dazu schon etwas in E-Mail-Antworten bzw. der Signatur mit; der Wortlaut liegt dem Projekt nicht vor.
  - Die Gesundheitskarte („Chipkarte“) könnte eine Rolle spielen.
- **STATUS:** Ablaufvorschlag. Bestätigung durch die Praxis erforderlich (Faktenregister F101–F109, alle `TO_BE_CONFIRMED`).
- **ÖFFENTLICH:** nichts.
- **Das Projekt kennt den genauen Rezeptablauf der Praxis derzeit nicht.** Er wird nicht aus allgemeinen E-Rezept-Abläufen abgeleitet. Ausdrücklich nicht angenommen werden:
  - Folgerezepte ohne Termin
  - Einlesen der Karte einmal pro Quartal
  - sofortige Verfügbarkeit
  - Anfrage per App oder per E-Mail mit medizinischen Angaben
  - gleiche Abläufe für alle Versicherten oder Medikamente

## Umsetzung 10.3A

- **Inhaltsquelle:** `src/content/prescription-process.ts` (plain TypeScript). Acht Abschnitte, jeweils mit **Bekannt / Unbestätigt / Offene Fragen**.
  - Rezeptarten stehen nur als „zu klären“ da.
  - Die Kanal-Matrix (Telefon, E-Mail, Praxis-App, Vor Ort) steht durchgehend auf „Noch nicht bestätigt“.
  - Es gibt keine Payload-Collection, kein Formular und kein Modell von Patientenanfragen.
- **Gemeinsame Darstellung mit dem App-Entwurf:** Die Typen liegen in `src/content/approval-review.ts`, die Darstellung in `app/(frontend)/review/approval-sections.tsx`.
- **Freigabeentwurf:** nur auf STAGING unter `/review/rezepte`, nicht indexiert, verlinkt aus `/review` („Rezepte & E-Rezept – Freigabeentwurf“). Er erscheint nicht in der Navigation und nicht im Dock.
  - Es gibt keinen E-Mail-Rezept-Button, keinen App-Link und kein Eingabefeld.
  - Der App-Entwurf verweist auf diesen Entwurf, ohne die Fragen zu doppeln.

| Abschnitt | Register | Risiko |
|---|---|---|
| 1. Welche Rezepte? | F101, F102 | mittel / hoch |
| 2. Wer darf anfragen? | F109 | hoch |
| 3. Wie anfragen? (Kanäle) | F103, F104 | hoch |
| 4. Gesundheitskarte | F105 | hoch |
| 5. Bearbeitung | F106 | hoch |
| 6. E-Rezept / Abholung | F107 | hoch |
| 7. Welche Angaben brauchen Sie? | F108 | hoch |
| 8. Spätere Website-Darstellung | – | – |

Die Begründung der Risiken steht im Faktenregister, §14.

## Beziehungen zu bestehenden Fakten

- **F104** präzisiert **F18** nur für Rezeptanfragen. Die E-Mail-Adresse ist bestätigt (F17), ihre Nutzung für Patientenanliegen nicht. Es gibt keine Aussage, dass E-Mail sicher ist, und keinen Hinweis, Gesundheitsdaten unverschlüsselt zu senden.
- **F105** gilt nur für Rezepte. Es bestätigt nicht **F91** („Gesundheitskarte zu jedem Besuch“, Freigabeentwurf „Gut vorbereitet“), und umgekehrt.
- **F103 (Kanal App)** hängt mit **F98** (Funktionen der App, 10.2) zusammen. Die App-Klärung beantwortet „Kann die App das?“, diese Klärung beantwortet „Wie ist der Ablauf in der Praxis?“.
- **F101 / F102** präzisieren **F80** (Folgerezepte / Überweisungen / Bescheinigungen).

## Grundsätze für die spätere Darstellung (10.3B, erst nach Bestätigung)

- **Ort:** eine eigene Seite „Rezepte“ im Bereich Praxis (z. B. `/praxis/rezepte`).
- **Aufbau aus Sicht der Familien:**
  1. Kann ich ein Rezept anfragen?
  2. Wie kann ich es anfragen?
  3. Was muss vorher erledigt sein?
  4. Wann ist es verfügbar?
  5. Wie erhalte ich es?

  Kein Aufsatz über E-Rezept-Technik.
- **Eine Absicht, ein Tipp:** Es erscheinen nur bestätigte Wege, z. B. „Praxis anrufen“, „E-Mail schreiben“ oder „In der Praxis-App öffnen“. Diese Buttons werden erst gebaut, wenn der Weg bestätigt ist.
- **Anfrage ist nicht Ausstellung.** „Rezept anfragen“, nicht „Rezept bestellen“. Ob ein Rezept ausgestellt wird, entscheidet die Praxis bzw. die Ärztin oder der Arzt.
- **Startseite unverändert (Variante B).** „E-Mail schreiben“ bleibt eine allgemeine Kontaktmöglichkeit, kein Rezeptweg. Es gibt keinen „Rezepte per E-Mail“-Banner. Vorübergehende Hinweise könnten das bestehende Hinweis-System nutzen; ein dauerhafter Ablauf wird kein Startseiten-Hinweis.
- **Datenschutz:** Gestellt werden nur Sachfragen. Es gibt keine rechtliche Bewertung und keine Aussage zu DSGVO oder Datenschutz. Die rechtliche Prüfung folgt, sobald der Ablauf bestätigt ist.

## Fragen an die Praxis (zum Weiterleiten)

1. Welche Rezepte dürfen Familien bei Ihnen ohne persönlichen Termin anfragen?
2. Über welche Wege: Telefon, E-Mail, App oder nur vor Ort?
3. Muss die Gesundheitskarte vorher eingelesen sein? Wenn ja: wann bzw. wie oft?
4. Welche Angaben brauchen Sie bei einer Rezeptanfrage?
5. Wann kann das Rezept in der Regel genutzt oder abgeholt werden?
6. Wird es als E-Rezept bereitgestellt, oder gibt es auch Papierrezept / Abholung?

Gern auch den Text, den Sie zu Rezepten in E-Mail-Antworten bzw. in der Signatur verwenden.
