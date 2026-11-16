# Praxisangaben vom 16.11.2026 – Intake #1 (Phase 10.0B)

Eingang: **2026-11-16**. Die Angaben wurden dem Projektinhaber aus der Praxis übermittelt. **Eine namentlich bestätigende Person aus der Praxis ist nicht erfasst** – es wird keine erfunden. Quellenbezeichnung im Projekt: **„Praxisangabe, übermittelt durch Projektinhaber“** (Quell-ID `PI-2026-11-16`).

**Entscheidung des Projektinhabers (2026-11-16):** Diese Praxisangabe gilt für die **Kontaktdaten** (Praxisname, Anschrift, Telefon, Fax, E-Mail, Ärztinnennamen) als ausreichend → `VERIFIED_CURRENT` *als Arbeitsdaten*. Sie gilt **nicht** als formale Bestätigung der Feiertagsregel: Eine öffentliche Aussage „heute geschlossen“ braucht eine namentliche Bestätigung (source-policy §2 Rang 1, §6). Die namentliche Freigabe vor dem Launch (LB-00) bleibt offen.

Statusklassen in diesem Dokument:

| Klasse | Bedeutung |
|---|---|
| `CONFIRMED_CURRENT_INPUT` | aktuelle Praxisangabe; im Projekt als Arbeitsdaten übernommen (nur Kontaktdaten öffentlich) |
| `TO_BE_CONFIRMED` | Angabe liegt vor, aktuelle bzw. namentliche Bestätigung fehlt – nicht öffentlich |
| `STAGING_PLACEHOLDER_DO_NOT_PUBLISH` | vorläufiger Wert nur für Prüfansichten / Testdaten |
| `DEFERRED_DO_NOT_PUBLISH` | bewusst zurückgestellt – nicht widerlegt, aber vorerst nicht Teil der Website |
| `OUTDATED / EXCLUDED` | auf der Quelle gestrichen bzw. nicht mehr aktuell – nicht übernehmen |

---

## 1. Bestätigte / aktuelle Angaben

| Angabe | Wert | Fakt | Klasse | Öffentlich |
|---|---|---|---|---|
| Praxisname | Kinderarztpraxis Probst & Böhme | F01 | `CONFIRMED_CURRENT_INPUT` | ja |
| Anschrift | **Untere Bahnhofstraße 9**, 06333 Hettstedt | F13, F14 | `CONFIRMED_CURRENT_INPUT` | ja (Straße erstmals sichtbar) |
| Telefon | 03476 / 851157 | F15 | `CONFIRMED_CURRENT_INPUT` | ja (unverändert) |
| Fax | 03476 / 854206 | F16 | `CONFIRMED_CURRENT_INPUT` | wie bisher |
| E-Mail | kinderarztpraxis-hettstedt@gmx.de | F17 | `CONFIRMED_CURRENT_INPUT` | ja (Nutzung für Patientenanliegen F18 weiter offen) |
| Ärztinnen | Dr. med. Elke Böhme, Nadine Probst | F20, F22 | `CONFIRMED_CURRENT_INPUT` (Namen) | nur mit Einwilligung (F33) – weiterhin **nicht** |
| Reguläre Sprechzeiten | Mo 08–11 + 14–17 · Di 08–11 + 14–16 · Mi 08–12 · Do 08–11 + 14–17 · Fr 08–12 | F35–F39 | Inhalt identisch mit dem Projektstand → keine Strukturänderung; **Beleg**, keine namentliche Bestätigung → `reviewDue` der Arbeitsdaten **nicht** verlängert | ja (wie bisher) |

Falsch bzw. nicht verwenden: „Bahnhofsstraße“, „Bahnhofstraße 9“ ohne „Untere“.

Wochenende: Die Visitenkarte enthält keine Wochenendangabe. F40 (Sa/So geschlossen, Praxisbestätigung vom 11.10.2026) bleibt unverändert – nichts aus der Karte abgeleitet.

## 2. Aktuelle Teamliste (Arbeitsstand)

| Person | Rollenangabe (Intake) | Fakt | Klasse | Öffentlich |
|---|---|---|---|---|
| Dr. med. Elke Böhme | Ärztin | F22 | `CONFIRMED_CURRENT_INPUT` (Name) | nein (Einwilligung F33 offen) |
| Nadine Probst | Ärztin | F20 | `CONFIRMED_CURRENT_INPUT` (Name) | nein (Einwilligung F33 offen) |
| Steffi Christmann | Erzieherin | F27 | `TO_BE_CONFIRMED` (Rolle als Beleg) | nein |
| Andrea Zahn | MFA | F26 | `TO_BE_CONFIRMED` (Rolle als Beleg) | nein |
| Anke Bettche | **keine Rollenangabe** – nicht ergänzt | F29 | `TO_BE_CONFIRMED` | nein |
| Nicole Schulz | MFA | **F118 (neu)** | `TO_BE_CONFIRMED` | nein |
| Jana Brandt | Kinderkrankenschwester | **F119 (neu)** | `TO_BE_CONFIRMED` | nein |
| Peggy Kejs | Praxisassistentin | F30 | `TO_BE_CONFIRMED` (Rolle als Beleg) | nein |

Nicht in der aktuellen Liste (aus dem **aktuellen** Arbeitsstand entfernt, historisch erhalten, nicht gelöscht):

- Katharina Weis (F28): bisher aus der alten Website → `TO_BE_CONFIRMED`, Hinweis „nicht in der aktuellen Arbeitsliste vom 16.11.2026“.
- Firuza Rafiyeva (F24): bisher schon `TO_BE_CONFIRMED`, nicht in der aktuellen Liste.

Teamvollständigkeit (F31), Rollen (F32), Namens- (F33) und Fotoeinwilligung (F34) bleiben **offen**. Durch diesen Intake wird keine Person öffentlich (`publicationConsent` unverändert).

## 3. Feiertagsregel

| Angabe | Klasse | Wirkung |
|---|---|---|
| Gesetzliche Feiertage: Praxis geschlossen (entspricht `CLOSED_ON_PUBLIC_HOLIDAYS`) | `TO_BE_CONFIRMED` (F49) – **Praxisangabe liegt vor; formale namentliche Bestätigung noch offen** | statische Regel **unverändert** (`REQUIRE_EXPLICIT_ENTRY`, nicht bestätigt): Werktags-Feiertage bleiben öffentlich fail-safe „nicht sicher bestimmbar“ |
| Brückentage: in der Regel geöffnet, im Einzelfall separat | `TO_BE_CONFIRMED` (Teil von F49) | entspricht bereits dem Verhalten: Brückentage sind keine Feiertage → regulärer Wochenplan, solange keine Schließung / Sonderöffnungszeit eingetragen ist |

In der Cockpit-Datenbank wird keine Feiertagsregel eingetragen. Der vorgesehene Weg ist die ärztliche Bestätigung in `/intern/feiertage` (09.5H).

## 4. Vertretungsliste aus Praxisunterlage

Quelle: Praxisblatt „Vertretungs-Kontakte“, Empfangsvermerk **06.11.2025 14:36** (rund ein Jahr alt). Alle Einträge: **`TO_BE_CONFIRMED`** – Kandidaten für den Verifizierungs-Workflow (09.5G: Verwaltung erfasst, Ärztin bestätigt). **Nicht öffentlich, nicht als bestätigt erfasst, nicht in eine Datenbank übernommen.** F53 bleibt `TO_BE_CONFIRMED`.

| # | Praxis | Anschrift | Telefon | Fax | E-Mail |
|---|---|---|---|---|---|
| 1 | Dr. med. Steffi Reich | Hinter den Planken 4, 06333 Hettstedt | 03476 812088 | 03476 / 202355 | reich.praxis@t-online.de |
| 2 | Dr. med. Heike Teichler | Hallorenring 8, 06108 Halle/Saale | 0345 2906510 | 0345 2906511 | info@kinderarztpraxis-teichler.de |
| 3 | Dr. med. Csilla Bedi, Doceins MVZ Mitteldeutschland Nord | Eislebener Straße 5, 06449 Aschersleben | 03473 2212917 | 03473 2212918 | aschersleben.kinder@doceins.de |
| 4 | Dr. med. Christine Fuchs / Dr. Dorothea Kreuter | Leninplatz 3, 06420 Könnern | 034691 20320 | 034691 23337 | Kinderarzt-Fuchs@gmx.de |
| 5 | Gunther Jach | Unterstraße 17, 06493 Harzgerode | 039484 2313 | 039484 739573 | gunther.jach@mvz-harz.de |
| 6 | Dr. Paul Weihe | Johann-Gottfried-Boltze-Straße 1, 06198 Salztal | 034609 257777 | 034609 257778 | info@kinderarztpraxis-weihe.de |
| 7 | MVZ Kinderarztpraxis Sangerhausen | **Schützenplatz 2**, 06526 Sangerhausen (gedruckte Anschrift „Karl-Liebknecht-Straße 64“ ist durchgestrichen; „Schützenplatz 2“ handschriftlich ergänzt) | 03464 / 51 50 25 | **nicht übernommen** – handschriftlich, nicht eindeutig lesbar | gzmsh@uk-halle.de |
| 8 | MVZ Kinderarztpraxis Bodestraße | Bodestraße 9, 06122 Halle (Saale) | 0345 / 472 255 10 | keine belastbare Angabe | mvz-bodestrasse@uk-halle.de |

`OUTDATED / EXCLUDED`: **Dr. med. Klaus Peter Werner** – auf der Quelle vollständig gestrichen. Nicht importieren; keine Kontaktangaben aus diesem Eintrag verwenden.

## 5. Notfallkontakte aus Praxisangabe

Hohes Risiko (source-policy §3: Institution **und** Praxisfreigabe nötig). Status: **`TO_BE_CONFIRMED` – von der Praxis genannte Kandidaten.** In 10.0B **nicht veröffentlicht**, keine Internetprüfung in dieser Phase. Öffentlich bleiben nur 112 (F56) und 116117 (F57).

| Einrichtung | Anschrift | Telefon | Fakt |
|---|---|---|---|
| AMEOS Klinikum Aschersleben | Eislebener Str. 7A, 06449 Aschersleben | +49 3473 970 | F61 |
| Helios Klinik Sangerhausen | Am Beinschuh 2a, 06526 Sangerhausen | +49 3464 660 | F62 |
| St. Elisabeth Krankenhaus | Mauerstraße 5, 06110 Halle | +49 345 2134310 | F63 |
| Universitätsklinikum Halle (Saale) | Ernst-Grube-Str. 40, 06120 Halle | +49 345 5572053 | F64 |
| Giftnotruf Erfurt | – | +49 361 730730 | F58 |

## 6. Vorläufige Staging-Annahmen

| Annahme | Wert | Klasse | Verwendet nur in |
|---|---|---|---|
| Akutsprechstunde (Beispiel) | **08:00–09:00 Uhr** (erste Stunde der Öffnungszeit; alle Öffnungstage beginnen um 08:00) | `STAGING_PLACEHOLDER_DO_NOT_PUBLISH` | Testdaten des Cockpit-Prototyps (`src/lab/cockpit/model.ts`). Nicht in `PULS_DATA`, nicht auf `/heute`, keine ärztliche Provenienz, F44/F45 unverändert. |
| Urlaub (Beispiel) | **24.12.2026 – 03.01.2027** | `STAGING_PLACEHOLDER_DO_NOT_PUBLISH` | Prüfansicht `/review/startseite?beispiel=urlaub` (markiert „Testdaten · vorläufig“). Nicht in statischen Daten, nicht in einer Datenbank, nicht im Faktenregister als bestätigt. |

## 7. Zurückgestellte / nicht zu veröffentlichende Angaben

| Angabe | Klasse | Umsetzung |
|---|---|---|
| „Nur gesunde Kinder“ (08:00–10:00, Di–Fr) | `DEFERRED_DO_NOT_PUBLISH` (Entscheidung Projektinhaber 2026-11-16 – fachlich nicht widerlegt) | aus der öffentlichen Darstellung entfernt; die Öffnungszeiten bleiben unverändert (z. B. Di 08:00–11:00 als reguläre Sprechstunde). F41/F42: Vermerk „Öffentliche Verwendung auf Wunsch des Projektinhabers vorerst zurückgestellt.“ Technische Unterstützung (Code `HEALTHY_ONLY`, Cockpit 09.5J) bleibt erhalten. |

## 8. Noch offene Bestätigungen

- Namentliche Bestätigung der Kontakt- und Sprechzeitdaten durch die Praxis vor dem Launch (LB-00).
- Feiertagsregel (F49): namentliche Bestätigung, danach Umstellung auf „an Feiertagen geschlossen“ (öffentlich erst dann).
- Team: Vollständigkeit (F31), Rollen (F32, u. a. Anke Bettche), Namens- (F33) und Fotoeinwilligung (F34).
- Vertretungspraxen: aktuelle Bestätigung jeder Praxis über den Workflow (F53).
- Notfallkontakte: Abgleich mit den Einrichtungen + Praxisfreigabe (F58–F64, LB-10).
- Akutsprechstunde: echte Zeiten (F44–F46) – bisher nur Staging-Beispiel.
- Urlaub 2026/2027: finale Daten (F54) – bisher nur Staging-Beispiel.
