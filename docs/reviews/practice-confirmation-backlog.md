# Offene Fragen an die Praxis – gesammelter Stand

Stand: **2026-11-16** (nach Praxisangabe #1, Phase 10.0B; Recht/Impressum ergänzt in 10.0C; nach Inhaltsarchitektur gruppiert in 10.0D; Gut vorbereitet erledigt in 10.1B; erstellt in 09.6A am 2026-10-21). **Nur vorbereitet, nicht verschickt.** Dieses Dokument ist die eine Sammelliste, um Antworten der Praxis einzuholen. Es ändert keinen Faktenstatus. Was mit der Praxisangabe vom 16.11.2026 beantwortet ist, steht in [practice-input-2026-11-16.md](practice-input-2026-11-16.md). Details stehen in den verlinkten Dokumenten; hier steht jede Frage nur kurz.

Quellen:
- [Faktenregister](../research/fact-status-register.md) · [Projekt-Blocker](../research/project-blockers.md) · [Readiness-Gate](../architecture/public-data-cutover-readiness.md) · [Praxisangabe 16.11.2026](practice-input-2026-11-16.md)
- Gut vorbereitet: [gut-vorbereitet-2026-10.md](gut-vorbereitet-2026-10.md) · Praxis-App: [praxis-app-2026-10.md](praxis-app-2026-10.md) · Rezepte: [rezepte-erezept-2026-10.md](rezepte-erezept-2026-10.md) · Kosten: [kosten-zahlungsarten-2026-10.md](kosten-zahlungsarten-2026-10.md) · Team & Fotos: [team-fotos-2026-10.md](team-fotos-2026-10.md)

---

## 0. Erledigt / aktueller Input (Praxisangabe 16.11.2026)

Als aktuelle Praxisangabe übernommen (Quelle „Praxisangabe, übermittelt durch Projektinhaber“; eine namentliche Bestätigung durch die Praxis vor dem Launch bleibt offen – siehe H1):

- Praxisname „Kinderarztpraxis Probst & Böhme“ (F01, LB-01)
- Anschrift **Untere Bahnhofstraße 9**, 06333 Hettstedt (F13, F14, LB-03)
- Telefon 03476 / 851157, Fax 03476 / 854206, E-Mail kinderarztpraxis-hettstedt@gmx.de (F15–F17)
- Ärztinnennamen Dr. med. Elke Böhme und Nadine Probst (F20, F22)
- Reguläre Sprechzeiten Mo–Fr (F35–F39; unverändert)
- Feiertage grundsätzlich geschlossen, Brückentage grundsätzlich normal geöffnet / Einzelfall (F49 – Praxisangabe liegt vor; siehe H1)
- Aktuelle Team-Arbeitsliste (F26, F27, F29, F30, neu F118, F119; Katharina Weis F28 nicht mehr in der Liste)
- Gut vorbereitet: Gesundheitskarte und Impfpass zu jedem Besuch, keine Impfung ohne Impfpass, Bitte um Mundschutz bei Infekt (F91–F94; seit 10.1B öffentlich in der Testumgebung)

Die Gruppen folgen der festgelegten Inhaltsarchitektur ([public-content-architecture.md](../architecture/public-content-architecture.md), 10.0D): jede Gruppe gehört zu dem Seitenbereich, für den die Antworten gebraucht werden. Nummern (H…, K…) sind unverändert, damit bestehende Verweise gültig bleiben.

## 1. Operative Daten (Heute / Praxis Puls / Notfall)

| # | Frage | Fakten / Blocker |
|---|---|---|
| H1 | **Namentliche Bestätigung** der Praxisangabe vom 16.11.2026: Wer aus der Praxis bestätigt Sprechzeiten, Kontaktdaten und die Feiertagsregel (Name, Datum)? Erst dann wird die Feiertagsregel öffentlich angewendet („an Feiertagen geschlossen“) und die Prüffrist der Sprechzeiten verlängert. | F35–F39, F43, F49 · LB-00 |
| H5 | Notfall- und Klinikangaben: Die Praxis hat fünf Kontakte genannt (AMEOS Aschersleben, Helios Sangerhausen, St. Elisabeth Halle, Uniklinikum Halle, Giftnotruf Erfurt). Wir prüfen sie bei den Einrichtungen; danach braucht es die Freigabe der Praxis. | F58, F61–F64 · LB-10 |
| P1 | Gibt es eine Akutsprechstunde? An welchen Tagen und genau von wann bis wann? *Vorläufiger Staging-Wert vorhanden (08:00–09:00 Uhr, nur Testdaten), finale Praxisbestätigung noch offen.* | F44–F46 · FB-01–03 |
| P4 | Welche Urlaube und Schließzeiten sind für 2026/2027 geplant? *Vorläufiger Staging-Wert vorhanden (24.12.2026–03.01.2027, nur Prüfansicht), finale Praxisbestätigung noch offen.* | F54 · FB-07 |
| P5 | Vertretungspraxen: Die Liste vom 06.11.2025 (8 Praxen; ein Eintrag gestrichen) ist rund ein Jahr alt. Für jede Praxis bitte aktuell ärztlich bestätigen (im Praxis Cockpit unter „Vertretungen“) – und die Faxnummer der MVZ Sangerhausen (handschriftlich, nicht lesbar). | F53 · FB-10 |
| P6 | Wer pflegt künftig Schließzeiten, Vertretungen und Hinweise im Praxis Cockpit, und wer bestätigt als Ärztin? | FB-09 |
| P7 | Wann ist die Praxis telefonisch erreichbar? | F19 · FB-08 |
| P9 | Welche Sprechstundenarten (Bezeichnung und kurze Erklärung) sollen auf der Website stehen? (Wird ärztlich bestätigt.) Derzeit öffentlich: „Sprechstunde“ und „Nur Terminsprechstunde“. | F43 |

H1 und H5 haben hohe Priorität vor dem Start.

## 2. Gut vorbereitet / Neu bei uns (`/praxis/gut-vorbereitet`, `/praxis/neu-bei-uns`)

**Als Arbeitsstand erledigt (Praxisangabe 16.11.2026, seit 10.1B in der Testumgebung veröffentlicht):** Gesundheitskarte zu jedem Besuch mitbringen (F91) · Impfpass zu jedem Besuch mitbringen (F92) · keine Impfung ohne Impfpass (F93) · Mundschutz bei Infekt als Bitte, ohne Altersgrenze (F94; ersetzt die frühere Regel F47). Früher K6 und P8.

**Vor dem Livegang:** eine namentliche Bestätigung dieser vier Punkte – F91/F92 durch die Praxis, F93/F94 durch eine Ärztin (LB-00). Keine neue inhaltliche Frage.

| # | Frage | Fakten / Blocker |
|---|---|---|
| K3 | Nehmen Sie neue Patientinnen und Patienten auf? Unter welchen Bedingungen? Wie läuft der erste Besuch bzw. der Besuch mit einem Neugeborenen ab? *Praxisangabe 16.11.2026: Aufnahme vorher telefonisch klären, allgemeine Anfrage auch per E-Mail möglich – namentliche Bestätigung offen, noch nicht veröffentlicht.* | F77–F79 · FB-14/15 |
| K2 | Wie vereinbart man einen Termin (Telefon, App, online)? *Praxisangabe 16.11.2026: am besten telefonisch – namentliche Bestätigung offen, noch nicht veröffentlicht.* | F48 · FB-13 |

## 3. Leistungen (`/praxis/leistungen`)

| # | Frage | Fakten / Blocker |
|---|---|---|
| Z3 | Welches Leistungsspektrum gilt heute (Liste von 2020, inkl. U10/U11/J2 und DMP)? | F66–F74 · FB-12 |

## 4. Rezepte / Praxis-App (`/praxis/rezepte`, `/praxis/praxis-app`)

| # | Frage | Fakten / Blocker |
|---|---|---|
| K5 | Rezepte: Welche können ohne Termin angefragt werden, und über welchen Weg? Muss die Karte vorher eingelesen sein? Welche Angaben braucht die Praxis, und wann ist das Rezept da? Gibt es E-Rezept und/oder Papier? Wer darf anfragen? | F101–F109 · 10.3B |
| K4 | Praxis-App: Name und Anbieter? Download-Links? Welche Funktionen nutzen Familien tatsächlich? Wie melden sie sich an? | F95–F100 · 10.2B |

## 5. Kosten (`/praxis/kosten`)

| # | Frage | Fakten / Blocker |
|---|---|---|
| Z1 | Welche Leistungen sollen mit Preis auf die Website? Gibt es eine aktuelle Preisliste (z. B. Kita-Tauglichkeitsbescheinigung)? Wer hält sie aktuell? | F110–F113, F117 · 10.4B |
| Z2 | Welche Zahlungsarten gibt es? Stimmt „keine Barzahlung“? Wird vor Ort oder per Rechnung bezahlt? | F114–F116 · 10.4B |

## 6. Kontakt (`/praxis/kontakt`)

| # | Frage | Fakten / Blocker |
|---|---|---|
| K1 | Wofür dürfen Familien die E-Mail-Adresse nutzen, und wofür nicht? | F18 · LB-11 |
| K7 | Soll die Faxnummer weiter angezeigt werden? | F16 · NH-13 |

K1 entscheidet auch, ob E-Mail auf der Rezepte-Seite als Weg genannt werden darf (F104).

## 7. Team / Fotos (`/praxis/aerztinnen`, `/praxis/team`)

| # | Frage | Fakten / Blocker |
|---|---|---|
| T1 | Ist die aktuelle Liste (2 Ärztinnen + Steffi Christmann, Andrea Zahn, Anke Bettche, Nicole Schulz, Jana Brandt, Peggy Kejs) vollständig? Bitte bestätigen, dass Katharina Weis und Firuza Rafiyeva nicht mehr in der Praxis sind. | F24, F28, F31 · LB-08 |
| T2 | Welche öffentliche Bezeichnung soll bei jeder Person stehen? Für Anke Bettche fehlt eine Angabe. Überschrift des Teambereichs? Welche Titel hat Dr. Böhme genau? | F23, F32 · LB-05 |
| T3 | Dürfen die Namen veröffentlicht werden? Bitte für jede Person einzeln und schriftlich. | F33 · LB-09 |
| M1 | Dürfen Fotos der Teammitglieder veröffentlicht werden? Bitte für jede Person einzeln und schriftlich, getrennt von der Namenseinwilligung. | F33, F34 · LB-09 |
| M2 | Neue Fotos machen oder vorhandene verwenden? Falls vorhanden: Bilder, Zuordnung und Rechte (Fotograf/in). | F11, F34 · LB-12 |
| M3 | Gibt es ein Logo, und dürfen wir es verwenden? | F12 · LB-12 |

## 8. Legal (Footer: Impressum, Datenschutz)

### Impressum

Stand 10.0C: `/impressum` zeigt nur bestätigte Angaben (Praxis, Kontakt, Ärztekammer, KVSA, Berufsordnung). Offen ist der Rest; Details und Quellen: [impressum-legal-review-2026-11.md](impressum-legal-review-2026-11.md).

| # | Frage | Fakten / Blocker |
|---|---|---|
| R1 | Wie lautet die rechtliche Praxisform / Anbieterbezeichnung genau? | F02 · LB-02 |
| R2 | Wer ist rechtlich Anbieter bzw. verantwortlich für die Website? | F03 · LB-04 |
| R3 | Welche Berufsbezeichnung soll für Nadine Probst im Impressum stehen? | F04, F21 · LB-05 |
| R4 | Welche vollständige Berufs-/Zusatzbezeichnung soll für Dr. med. Elke Böhme stehen? | F04, F23 · LB-05 |
| R5 | Falls erforderlich (rechtliche Prüfung klärt das zuerst): Wer soll Verantwortliche(r) nach § 18 Abs. 2 MStV sein? | LB-16 |

### Datenschutz / Betrieb

| # | Frage | Fakten / Blocker |
|---|---|---|
| R6 | Für die Datenschutzerklärung: Verantwortliche, Datenschutzbeauftragte(r), Dienstleister (Hosting, später Datenbank und E-Mail). | F10 · LB-07 |
| R7 | Wer schließt die Auftragsverarbeitungsverträge (AVV) mit Datenbank-, Hosting- und E-Mail-Anbieter ab? | LB-15 |
| R8 | Zugang zum bisherigen Webhost, zum Domain-Registrar und zur DNS-Verwaltung: Wer hat ihn? | LB-13, LB-14 |

## DEFERRED / vorerst nicht veröffentlichen

| Thema | Stand |
|---|---|
| „Nur gesunde Kinder“ (08:00–10:00, Di–Fr) | Auf Wunsch des Projektinhabers vorerst zurückgestellt (16.11.2026) – keine aktive Rückfrage. Nicht widerlegt; die technische Unterstützung bleibt. (F41, F42 · FB-04) |

---

**Umfang:** 31 offene Fragen (10.1B: K6 und P8 als Arbeitsstand erledigt; in 10.0D nach der Inhaltsarchitektur gruppiert, keine neue Frage): Operative Daten 8 (davon 2 hohe Priorität), Gut vorbereitet / Neu bei uns 2 (+ Livegang-Bestätigung), Leistungen 1, Rezepte / Praxis-App 2, Kosten 2, Kontakt 2, Team / Fotos 6, Legal 8. Mit der Praxisangabe vom 16.11.2026 erledigt bzw. ersetzt: H2, H3, H4, P3 (Inhalt liegt vor; namentliche Bestätigung → H1); zurückgestellt: P2. Nicht enthalten: Mein Arztbesuch (eigene Freigabedokumente: [discovery-approval-package.md](discovery-approval-package.md), [discovery-ai-child-publication-decision.md](discovery-ai-child-publication-decision.md)) und Nice-to-have-Angaben (NH-01–NH-12).
