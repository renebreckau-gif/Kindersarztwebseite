# „Gut vorbereitet“: Freigabevorbereitung (Phase 10.1A)

Stand: 2026-10-20 · Baseline `7e401e4` · STAGING, nicht indexiert

## Stand

- **Quelle:** Hinweis aus dem Praxisteam (Sprachnachricht an das Projekt, Oktober 2026). Das ist wertvoller Produkt-Input, **keine** ärztliche Freigabe und keine bestätigte Praxisregel.
- **Status:** Vorschlag. Alle Punkte sind `TO_BE_CONFIRMED` (Faktenregister F91–F94).
- **Öffentlich:** nichts. Die Website zeigt keinen dieser Punkte, bevor die Praxis sie bestätigt hat.
- **Keine abgeleiteten Regeln:** Aus dem Hinweis wird keine medizinische oder organisatorische Regel abgeleitet. Ob etwas Pflicht oder Empfehlung ist, für wen und wann, beantwortet die Praxis.
- **Startseite unverändert:** Nach Variante B ist „Gut vorbereitet“ ein eigener Bereich, kein weiterer Block auf der Startseite.

## Umsetzung 10.1A

- **Inhaltsmodell:** das bestehende `FirstVisitItem` (`src/content/first-visit.ts`). Es gibt keinen neuen Typ und keine neue Collection.
  - **Vorschläge:** Gesundheitskarte (BRING), Impfpass mitbringen (BRING), Impfung nur mit Impfpass (BRING, getrennt), Bei Infekt (ARRIVAL).
  - **Freigabeangaben:** Wer freigibt, woher der Text stammt und welche Fragen offen sind, steht daneben in `FIRST_VISIT_APPROVALS`. Das sind Governance-Angaben, kein zweites Inhaltsmodell.
- **Öffentlicher Selektor für später:** `selectPublicFirstVisitItems` (neben den übrigen Publikationsregeln) gibt nur bestätigte, aktuelle Einträge zurück. Mit den heutigen Daten ist das Ergebnis leer.
- **Freigabeentwurf:** nur auf STAGING unter `/review/gut-vorbereitet`, nicht indexiert, verlinkt aus `/review`.
  - Jeder Vorschlag ist als „Textvorschlag“ markiert, nie als „Praxisregel“.
  - Jeder Vorschlag zeigt den Status (in Worten), wer freigeben muss, die Herkunft des Textes und die offenen Fragen.
- **„Neu bei uns?“:** Der interne Hinweis nennt jetzt das Arbeitspaket. Es wird keine Regel veröffentlicht.
- **Bewusst nicht aufgenommen:** U-Heft, Ausweis, Überweisung, Medikamentenliste, Versicherungsunterlagen, Einverständniserklärungen, Vorbefunde, Urkunden, Sorgerechtsnachweise. Sie wurden nicht angefragt und sind nicht bestätigt; das hier ist keine allgemeine Kinderarzt-Checkliste.

### Freigabestufen

| Punkt | Register | Freigabe durch |
|---|---|---|
| Gesundheitskarte mitbringen | F91 | Praxisteam (organisatorisch) |
| Impfpass zu Impfterminen mitbringen | F92 | Praxisteam (organisatorisch) |
| Ohne Impfpass keine Impfung | F93 | Ärztin / Arzt |
| Mundschutz / Infekt | F94 (vgl. F47) | Ärztin / Arzt |

Hinweis zu F94: Die bisherige Website enthält bereits die Aussage „Kinder über 6 Jahre … benötigen im Falle eines Infektes einen Mundschutz“ (F47, unbestätigt). Der Freigabeentwurf zeigt sie als **Formulierung der bisherigen Website**, nicht als geltende Regel.

## Späterer öffentlicher Ort (10.1B, erst nach Freigabe)

- **Hauptort:** `/praxis/gut-vorbereitet`; verlinkt aus `/praxis/neu-bei-uns`, später auch aus passenden Themenseiten.
- **Gestaltung:** kleine Karten mit Icon (z. B. Gesundheitskarte, Impfpass, Bei Infekt): kurzer Titel, eine knappe Zeile, optional ein weiterführender Link. Keine langen Texte.
- **Regel:** Es erscheinen nur bestätigte Einträge (über `selectPublicFirstVisitItems`).

## Fragen an die Praxis (zum Weiterleiten)

1. **Gesundheitskarte**
   Bei jedem Besuch mitbringen? Was gilt, wenn sie fehlt? Lieber „Gesundheitskarte“ oder „Versichertenkarte“?
2. **Impfpass**
   Zu Impfterminen immer mitbringen?
   Wird ohne Impfpass tatsächlich nicht geimpft? *(braucht ärztliche Bestätigung)*
3. **Mundschutz bei Infekt**
   Pflicht oder Empfehlung? Für wen (Alter, Begleitpersonen) und wann? Gilt der bisherige Satz „Kinder über 6 Jahre … Mundschutz“ noch? *(braucht ärztliche Bestätigung)*
