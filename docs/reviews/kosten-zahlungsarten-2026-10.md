# Kosten & Zahlungsarten: Klärung der Praxisangaben (Phase 10.4A)

Stand: 2026-10-20 · Baseline `2a5897c` · STAGING, nicht indexiert

## Stand

- **QUELLE:** Hinweis aus dem Praxisteam, Oktober 2026.
  - Für ausgewählte Leistungen sollen Preise auf der Website stehen. Als Beispiel wurden Kita-Tauglichkeit bzw. Bescheinigungen genannt, nach denen Familien regelmäßig fragen.
  - Die Zahlungsarten sollen genannt werden. Möglicherweise ist Barzahlung nicht möglich.
- **STATUS:** Vorschlag. Bestätigung durch die Praxis erforderlich (Faktenregister F110–F117, alle `TO_BE_CONFIRMED`).
- **ÖFFENTLICH:** nichts.
- **Das Projekt hat derzeit keine bestätigte Preisliste der Praxis.** Preise werden nicht abgeleitet aus:
  - üblichen Preisen anderer Kinderarztpraxen
  - Beispielen aus der GOÄ
  - Websuchen
  - alten Websites anderer Praxen
  - allgemeinen Gebühren für Bescheinigungen
- Ebenso unbekannt: welche Leistungen privat bezahlt werden, ob Preise fest oder variabel sind, welche Zahlungsarten gelten, ob Barzahlung wirklich ausgeschlossen ist, wann bezahlt wird und wer die Preise pflegt.

## Umsetzung 10.4A

- **Inhaltsquelle:** `src/content/pricing-review.ts` (plain TypeScript, gemeinsamer Typ `ApprovalSection`). Acht Abschnitte, jeweils mit **Bekannt / Unbestätigt / Offene Fragen**.
  - Kita-Tauglichkeit steht nur als „Beispiel aus dem Praxisteam, zu bestätigen“ da, ohne Betrag.
  - Die Zahlungsarten-Matrix (Girocard / Karte, Kreditkarte, Barzahlung, Rechnung, Überweisung, Sonstiges) steht durchgehend auf „Noch nicht bestätigt“. Keine Logos, keine angehakten Kästchen.
  - Es gibt keine Preis-Datensätze, keine Payload-Collection und keine Bezahlfunktion.
- **Gemeinsame Darstellung:** `app/(frontend)/review/approval-sections.tsx` bekam zwei optionale Felder: eine eigene Überschrift für die Matrix (`channelsTitle`) und Beispiele aus dem Praxisteam (`examples`). Die Entwürfe zu App und Rezepten sehen unverändert aus.
- **Freigabeentwurf:** nur auf STAGING unter `/review/kosten`, nicht indexiert, verlinkt aus `/review` („Kosten & Zahlungsarten – Freigabeentwurf“). Er erscheint nicht in der Navigation und nicht im Dock.

| Abschnitt | Register | Risiko |
|---|---|---|
| 1. Welche Leistungen? | F111, F113 | hoch |
| 2. Aktuelle Preisliste | F110, F112 | mittel / hoch |
| 3. Wie Preise anzeigen? | (zu F112) | – |
| 4. Zahlungsarten | F114 | mittel |
| 5. Barzahlung | F115 | mittel |
| 6. Zahlungsablauf | F116 | mittel |
| 7. Pflege der Preise | F117 | mittel |
| 8. Spätere Website-Darstellung | – | – |

Die Begründung der Risiken steht im Faktenregister, §15. Die vorgeschlagenen Risikostufen wurden unverändert übernommen.

## Beziehung zu den Leistungen

- Ein Preis-Eintrag braucht **beides**: eine bestätigte **Leistung** (F66–F74 bzw. F111) **und** einen bestätigten, aktuellen **Preis** (F112).
- Ein bestätigter Preis macht eine unbestätigte Leistung nicht öffentlich.
- Eine bestätigte Leistung ohne bestätigten Preis kann später im Leistungsbereich erscheinen, aber ohne Preis.
- Die Bestätigungen bleiben getrennt.
- **F69** (Bescheinigungen, Unfälle, Reiseberatung, Jugendarbeitsschutz; die alte Website nannte auch „Kindergartentauglichkeit“, Stand 2020) bestätigt nicht, dass eine bestimmte kostenpflichtige Leistung angeboten wird.
- Ein Preis allein macht eine Leistung nicht zur „Selbstzahlerleistung“. Ob eine Leistung privat bezahlt oder von der Krankenkasse übernommen wird, fragt der Entwurf nur zur Einordnung ab. Veröffentlicht wird dazu nichts ohne gesonderte Prüfung.

## Keine Aussagen zu Abrechnung, Steuer und Erstattung

Der Entwurf macht keine Aussagen zu Umsatzsteuer, GOÄ, Erstattung durch private oder gesetzliche Krankenversicherung, Kassenleistung oder steuerlicher Absetzbarkeit. Er gibt keine Abrechnungshinweise. Falls solche Angaben später gewünscht sind, braucht es vorher eine fachliche bzw. rechtliche Prüfung.

## Späteres Preismodell (nur Skizze, nicht umgesetzt)

```
PriceItem {
  serviceId      // stabile Kennung einer bestätigten Leistung
  publicLabel
  priceText      // z. B. fester Preis, „ab“-Preis, „Preis nach Aufwand“, nur wenn bestätigt
  verification   // Bestätigung, lastVerified, reviewDue
  displayOrder
}
```

- Welche Form der Preisangabe gilt, entscheidet die Praxis je Leistung. Das Projekt legt keine fest und erfindet keine Spannen.
- **Pflege (Vorschlag, noch keine Regel):** jeder Preis mit Bestätigung, Datum der letzten Prüfung und Wiedervorlage. Prüfung mindestens jährlich oder sobald die Praxis ihre Preise ändert.

## Spätere Darstellung (10.4B, erst nach Bestätigung)

- **Ort:** eigene Seite im Bereich Praxis (z. B. `/praxis/kosten`), verlinkt von „Wobei können wir helfen?“ (`/praxis/leistungen`). Eine kleine Karte auf der Praxis-Übersicht erst in 10.4B.
- **Aufbau:** „Kosten & Selbstzahlerleistungen“ mit je Leistung Name, kurzer Erläuterung und Preis, danach „Zahlungsarten“.
- **Mobil:** eine Leistung pro Zeile bzw. Karte, keine breite Tabelle. Zahlungsarten als kurze Textliste, Symbole nur zusätzlich zum Text und erst nach Bestätigung.
- **Ton:** schlicht und sachlich. Keine Preistabellen-Effekte, keine Tarif-Karten. Eine Kinderarztpraxis, kein Software-Abo.
- **Nicht auf die Startseite** (Variante B bleibt): keine Preise, keine Zahlungsarten, kein „keine Barzahlung“, keine Selbstzahler-Karte.
- **Keine Bezahlfunktion:** kein Checkout, kein Online-Bezahlen, kein Bezahl-Link, keine Kartendaten, kein Rechnungs-Workflow.
- **Formulierungen:** „Unsere Preise“ oder „Preisliste“ erst, wenn eine aktuelle Liste der Praxis vorliegt.

## Fragen an die Praxis (zum Weiterleiten)

1. Welche Leistungen sollen mit Preis auf die Website?
2. Gibt es eine aktuelle Preisliste, die Sie uns schicken können?
3. Ist z. B. die Kita-Tauglichkeitsbescheinigung dabei – und wie heißt die Leistung genau?
4. Welche Zahlungsarten akzeptieren Sie?
5. Stimmt es, dass keine Barzahlung möglich ist?
6. Werden die Leistungen direkt vor Ort bezahlt oder später per Rechnung?
