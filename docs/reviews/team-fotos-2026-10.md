# Team & Fotos: Wer soll wie auf der Website erscheinen? (Phase 10.5A)

Stand: 2026-10-20 · Baseline `b9651c8` · STAGING, nicht indexiert

## Stand

- **STATUS:** Freigabevorbereitung.
- **VERÖFFENTLICHUNG:** Die bestehenden Schutzregeln bleiben unverändert. Öffentlich erscheint eine Person nur, wenn sie aktiv ist, ihre Angaben bestätigt sind und ihre Einwilligung bestätigt ist (`decidePerson`). Heute erscheint deshalb niemand.
- **QUELLE:** bisherige Website und Recherche (S02, S04, S07, S08) sowie die vorhandenen Projektfakten. Es gibt keine neuen Faktennummern; genutzt werden F11 und F20–F34 (Register §16).

## Arbeitsstand – nicht zur Veröffentlichung freigegeben

Der folgende Stand dient nur der Bestätigung durch die Praxis. Er ist **nicht** freigegeben.

| Person | Arbeitsstand | Register | Freigegeben? |
|---|---|---|---|
| Nadine Probst | Fachärztin für Kinder- und Jugendmedizin | F20, F21 | nein (Einwilligung F33 fehlt) |
| Dr. med. Elke Böhme | bisherige Bezeichnung wörtlich „Fachärztin für Kinder- und Jugendmedizin/Kinderchirurgie“, „Naturheilverfahren“ – unbestätigt | F22, F23 | nein |
| Andrea Zahn | bisherige Website: „Arzthelferin“ | F26 | nein |
| Steffi Christmann | bisherige Website: „Erzieherin /Arzthelferin“ | F27 | nein |
| Katharina Weis | bisherige Website: „Arzthelferin“ | F28 | nein |
| Anke Bettche | bisherige Website: „Arzthelferin“ | F29 | nein |
| Peggy Kejs | bisherige Website: „Praxisassistentin“ | F30 | nein |
| Firuza Rafiyeva | Ärztin in Weiterbildung „vom 01.03.2026 bis dato“ – aktueller Status unbekannt | F24 | nein, getrennt geführt |

- **Vollständigkeit (F31):** nicht bestätigt. Die Liste stammt von der bisherigen Website.
- **Bezeichnungen (F32):** Die alten Bezeichnungen und die Überschrift „Schwestern“ werden nicht übernommen und nicht eigenmächtig modernisiert (etwa zu „MFA“).
- **F25:** historischer Eintrag (OUTDATED_DO_NOT_PUBLISH). Er wird nicht als aktuelle Person vorgeschlagen.

**Freigegeben für die Veröffentlichung ist derzeit niemand.**

## Was nicht abgeleitet wird

- keine weiteren Personen aus Fotos
- keine Namen aus Bild-Metadaten
- keine Zuordnung von Personen auf alten Fotos
- keine Rollen aus Kleidung
- kein Ausscheiden und kein Weiterbildungsstatus aus alten Inhalten („bis dato“ heißt nicht „heute noch“)

## Einwilligung: Name und Foto getrennt

- **A. Name veröffentlichen** und **B. Foto veröffentlichen** sind zwei verschiedene Einwilligungen (F33).
- Eine Person kann ohne Foto erscheinen.
- Ein Foto erscheint nur mit:
  - Einwilligung zur Person (`publicationConsent`)
  - Einwilligung zum Bild (`MediaAsset.peopleDepicted[].consent = GIVEN`)
  - geklärten Nutzungsrechten (F11)
- Die Regel steht jetzt auch im Code: `decidePersonPhoto` in `src/domain/publication.ts`.
  - Nur echte Fotos (`REAL`, nicht KI-erzeugt, echte Praxis) sind zulässig.
  - Ein Widerruf sperrt das Foto, ebenso abgelaufene Rechte.
  - Ohne Foto: neutraler Platzhalter ohne Gesicht oder kein Bild.
  - Die Regel wird erst in 10.5B von einer Seite genutzt.
- **Nicht als Einwilligung gilt:** Auftritt auf der bisherigen Website, ein vorhandenes Foto, Hinweise aus dem Team, das Arbeitsverhältnis oder Profile in sozialen Medien.

## Fotos

- **Bestand (F34):** vier Fotos von 2020 für sieben Personen, ohne Zuordnung und ohne Bildbeschreibung.
- **Rechte (F11):** Die bisherige Website nennt einen Fotografen, Linktext und Linkziel widersprechen sich. Das ist kein Nachweis.
- **In 10.5A:** Bestehende Fotos werden weder gezeigt noch einer Person zugeordnet. Der Freigabeentwurf zeigt neutrale Initialen.
- **Keine KI:** keine KI-Porträts, keine Montagen, keine geschönten Fassungen, kein konstruiertes Teamfoto (Media Policy).
- **Optionen** (keine ist ausgewählt):
  - A. Neue Einzelporträts
  - B. Neues Teamfoto
  - C. Bestehende Fotos verwenden – nur nach bestätigter Zuordnung, Nutzungsrechten und Einwilligung
- **Gestaltungsempfehlung (keine Tatsache):**
  - echte Fotografie, warm und natürlich
  - gleiches Licht und gleicher Hintergrund
  - ruhig, nicht förmlich, keine Kittel-Stockfotos, nicht gestellt
  - Einzelporträts mit ähnlichem Ausschnitt und Maßstab
  - Teamfoto in der Praxis, wenn Rechte und Ablauf es erlauben
- **Falls neue Fotos (später, kein Auftrag in 10.5A):** Ein kurzes Foto-Briefing klärt:
  - Porträtliste und Teamfoto ja/nein
  - Ort, Ausrichtung und Ausschnitte
  - Rechteinhaber und schriftliche Einwilligung
  - Zuordnung der Bildbeschreibungen

## Umsetzung 10.5A

- **Inhaltsquelle:** `src/content/team-review.ts` liest Namen und Arbeitsdaten aus `src/content/people.ts`, ohne Kopie.
  - Personen erscheinen als einzelne Karten (`TeamReviewCard`). Jede Karte zeigt den Arbeitsstand, „Kein Foto zugeordnet“ und je Bestätigung „Noch nicht bestätigt“.
  - Die Themen 4–8 nutzen den gemeinsamen Baustein `ApprovalSections`.
- **Freigabeentwurf:** nur auf STAGING unter `/review/team`, nicht indexiert, verlinkt aus `/review` („Team & Fotos – Freigabeentwurf“). Er erscheint nicht in der Navigation und nicht im Dock.
- **Unverändert:**
  - `decidePerson`
  - `publicationConsent` (überall `false`, unbestätigt)
  - `/praxis/team` und `/praxis/aerztinnen`
  - Startseite
- `people.ts` importiert die Domain jetzt relativ statt über `@/`, damit die Tests es laden können. Das Verhalten ist gleich.

| Abschnitt | Register |
|---|---|
| 1. Ärztinnen | F20–F23 |
| 2. Praxisteam | F26–F31 |
| 3. Weitere aktuelle Personen | F24 (F25 nur als Hinweis) |
| 4. Rollen & Bezeichnungen | F32 |
| 5. Veröffentlichung von Namen | F33 |
| 6. Fotos | F34 |
| 7. Bildrechte | F11 |
| 8. Zukünftige Team-Seite | – |

## Spätere Team-Seite (10.5B, erst nach Bestätigung)

- Keine neue Route. `/praxis/team` und `/praxis/aerztinnen` bleiben bestehen.
- **Aufbau:** kurze Einleitung, dann eine Karte je Person mit:
  - freigegebenem echtem Foto (falls vorhanden)
  - Name
  - bestätigter Bezeichnung
  - optional einem sehr kurzen Text, nur wenn die Praxis ihn liefert
- **Aufteilung (voraussichtlich):** `/praxis/aerztinnen` für die Ärztinnen und ihre fachlichen Angaben, `/praxis/team` für das gesamte Praxisteam. Keine doppelten langen Texte. Die genaue Aufteilung folgt in 10.5B.
- **Keine erfundenen Inhalte:** keine Lebensläufe, Hobbys, Zitate, Berufsjahre oder privaten Angaben. Menschlich wirkt die Seite durch echte Fotos und knappe Sprache.

## Weitere Fragen (ausführlich, nicht für WhatsApp)

- Welche Überschrift für den Teambereich: „Praxisteam“, „Team“, „Assistenz“ oder ein anderer Begriff?
- Einzelporträts, Teamfoto oder beides?
- Wer hat die bestehenden Fotos aufgenommen, und liegt das Nutzungsrecht für die neue Website vor? Gibt es zeitliche oder mediale Einschränkungen?
- Wer ist Rechteinhaber neuer Fotos, und wie wird die Einwilligung zum Foto dokumentiert?
- Sollen Auszubildende bzw. Ärztinnen in Weiterbildung gezeigt werden, oder nur bestimmte Rollen?
- Wünschen Sie kurze Texte zu den Personen? Falls ja, bitte selbst formulieren bzw. freigeben.

## Fragen an die Praxis (zum Weiterleiten)

1. Ist die aktuelle Teamliste vollständig, oder fehlt jemand / ist jemand nicht mehr dabei?
2. Welche genaue Berufs-/Funktionsbezeichnung soll bei jeder Person stehen?
3. Ist Firuza Rafiyeva aktuell noch in der Praxis und soll sie auf die Teamseite?
4. Dürfen die Namen der Teammitglieder auf der Website veröffentlicht werden?
5. Dürfen Fotos veröffentlicht werden?
6. Möchten Sie lieber neue Fotos machen oder vorhandene Fotos verwenden? Falls vorhanden: Können Sie uns die Bilder und die Zuordnung schicken?

Für Dr. Böhme: Bitte die genaue gewünschte Berufs-/Zusatzbezeichnung bestätigen.
