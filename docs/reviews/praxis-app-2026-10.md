# Praxis-App & digitale Services: Freigabevorbereitung (Phase 10.2A)

Stand: 2026-10-20 · Baseline `723e7c6` · STAGING, nicht indexiert

## Stand

- **Quelle:** Hinweis aus dem Praxisteam, Oktober 2026: Die Website soll die App der Praxis erwähnen und den Download erleichtern.
- **Wissensstand:** Ob es die App gibt und was sie kann, ist nicht ausreichend bestätigt. Es gibt keinen bestätigten Namen, Anbieter, keine Plattformen, Store-Links, Funktionen, keinen Zugangsweg und keine Angaben zur Datenverarbeitung. In den bisherigen Projektquellen ist keine App der Praxis erfasst.
- **Status:** Vorschlag. Die Fakten müssen von der Praxis bestätigt werden (Faktenregister F95–F100, alle `TO_BE_CONFIRMED`).
- **Öffentlich:** nichts. Es gibt keinen App-Namen, keine Store-Links, keine Badges und keinen QR-Code auf der Website.
- **Keine abgeleiteten Funktionen:** Aus „es gibt eine App“ wird keine Funktion abgeleitet. Die App wird auch nicht aus anderen Praxen, verbreiteten Kinderarzt-Apps oder Anbietern erschlossen.

## Umsetzung 10.2A

- **Fakten- und Fragenstruktur:** `src/content/digital-services.ts` (plain TypeScript). Sechs Abschnitte, jeweils mit **Bekannt / Unbestätigt / Offene Fragen**.
  - Funktionen erscheinen als Fragen; keine ist vorausgewählt.
  - Fehlende Links stehen als sichtbare Marker („App-Store-Link fehlt“), nie als Dummy-Link.
- **Künftiger Typ `DigitalService`:** Name, Art, eine Zeile Text, Links, Bestätigung. Er ist nur als Form für 10.2B definiert. Es gibt **noch keine Datensätze** (ein Eintrag braucht einen bestätigten Namen) und deshalb noch keinen öffentlichen Selektor. Er folgt in 10.2B nach dem Muster der übrigen Publikationsregeln.
- **Freigabeentwurf:** nur auf STAGING unter `/review/praxis-app`, nicht indexiert, verlinkt aus `/review` („Praxis-App – Freigabeentwurf“). Er erscheint nicht in der Navigation und nicht im Dock.

| Abschnitt | Register | Risiko |
|---|---|---|
| 1. App identifizieren | F95, F96 | mittel |
| 2. Download / Plattformen | F97 | mittel |
| 3. Funktionen | F98 | hoch |
| 4. Zugang / Registrierung | F99 | hoch |
| 5. Datenschutz / Hinweise | F100 | hoch |
| 6. Zukünftige Website-Platzierung | – | – |

## Grenzen

- **Rezepte / E-Rezept (10.3) bleiben getrennt.** Auch die Bestätigung „Rezepte können über die App angefragt werden“ reicht nicht für eine Anleitung auf der Website. 10.3 klärt:
  - welche Rezepte
  - Folgerezepte
  - Gesundheitskarte als Voraussetzung
  - Bearbeitungszeit
  - Abholung bzw. E-Rezept
  - mögliche Einschränkungen
- **E-Mail (F18) bleibt getrennt.** Kein „alternativ per App oder E-Mail“, solange nicht beide Wege bestätigt sind.
- **Datenschutz:** Es werden nur Sachfragen gestellt. Es gibt keine rechtliche Bewertung und keine Aussage zur DSGVO-Konformität. Die rechtliche Prüfung bleibt ein Launch-Thema.
- **Keine Patientendaten:** Kein Formular, kein eingebetteter App-Login, keine Rezeptanfragen über die Website.

## Späterer öffentlicher Ort (10.2B, erst nach Bestätigung)

- **Hauptort:** eine eigene Seite „Praxis-App“ im Bereich Praxis (z. B. `/praxis/praxis-app`), dazu eine kleine Service-Karte auf `/praxis`.
- **Gestaltung:** kompakt. Name, eine Zeile Nutzen, App Store / Google Play, optional „Mehr erfahren“. Kein großes App-Marketing, kein Handy-Mockup, kein QR-Code ohne bestätigtes Ziel.
- **Nicht auf** der Startseite (Variante B), im Praxis Puls oder im mobilen Dock.

## Fragen an die Praxis (zum Weiterleiten)

1. Wie heißt die Praxis-App genau, und von welchem Anbieter ist sie?
2. Gibt es Links für App Store und Google Play (oder eine Web-Version)?
3. Welche Funktionen nutzen Familien bei Ihnen tatsächlich (z. B. Termine, Nachrichten, Erinnerungen)?
4. Wie melden sich Familien an – brauchen sie einen Praxiscode, eine Einladung oder einen QR-Code?
5. Können Rezepte über die App angefragt werden? *(nur als Hinweis für das spätere Rezept-Thema)*

Die Fragen zu Betreiber, Datenverarbeitung und Datenschutzinformation stehen ausführlich im Freigabeentwurf (`/review/praxis-app`, Abschnitt 5).
