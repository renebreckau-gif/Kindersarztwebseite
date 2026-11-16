# Impressum – Arbeitsstand und offene rechtliche Prüfung (Phase 10.0C)

Stand: **2026-11-16** · Baseline `85ea7e1` · **Keine rechtliche Freigabe.**

Dieses Dokument bereitet die spätere rechtliche Finalisierung vor. Es behauptet nicht, dass das Impressum rechtssicher, vollständig rechtlich geprüft oder datenschutzkonform ist. `/impressum` zeigt seit 10.0C nur Angaben, die bestätigt (VERIFIED_CURRENT) und gegen die offiziellen Quellen geprüft sind; alles andere bleibt offen und wird weder erfunden noch aus dem alten Text übernommen.

Quellen im Projekt: [Faktenregister](../research/fact-status-register.md) (F01–F18) · [Projekt-Blocker](../research/project-blockers.md) (LB-02, LB-04, LB-05, LB-07, LB-16, Legal gate) · [Praxisangabe 16.11.2026](practice-input-2026-11-16.md) · [Rückfragen an die Praxis](practice-confirmation-backlog.md) (§6, R1–R5) · Code: `src/content/impressum.ts`, `src/site/legal.tsx`.

## 1. KNOWN / VERIFIED – öffentlich angezeigt

| Angabe | Wert auf `/impressum` | Fakt | Grundlage |
|---|---|---|---|
| Praxisname | Kinderarztpraxis Probst & Böhme | F01 | Praxisangabe 16.11.2026 (Arbeitsstand; namentliche Freigabe LB-00 offen) |
| Adresse | Untere Bahnhofstraße 9, 06333 Hettstedt | F13–F15 | Praxisangabe 16.11.2026 – **nicht** die alte Schreibweise „Bahnhofsstraße“ |
| Telefon | 03476 / 851157 (tel-Link) | F16 | Praxisangabe 16.11.2026 |
| Fax | 03476 / 854206 (nur Text) | F17 | Praxisangabe 16.11.2026 |
| E-Mail | kinderarztpraxis-hettstedt@gmx.de (mailto ohne Vorausfüllung) | F18 | Praxisangabe 16.11.2026 (Nutzungshinweis für Patientenanliegen: LB-11 offen) |
| Zuständige Ärztekammer | Ärztekammer Sachsen-Anhalt, Doctor-Eisenbart-Ring 2, 39120 Magdeburg | F05 | offizielle Website, geprüft 2026-11-16 (Hausanschrift; Postanschrift PSF 1561, 39005 Magdeburg nicht angezeigt) |
| Zuständige KV | Kassenärztliche Vereinigung Sachsen-Anhalt, Doctor-Eisenbart-Ring 2, 39120 Magdeburg | F06 | offizielle Website, geprüft 2026-11-16 (Postfach PF 1664, 39006 Magdeburg nicht angezeigt) |
| Berufsrechtliche Regelung | Berufsordnung der Ärztekammer Sachsen-Anhalt, Link auf die offizielle Seite (keine lokale Kopie) | F07 | offizielle Website: „vom 08. November 1997; geändert am 26. April 2025“, geprüft 2026-11-16 |

Gestaltung: ruhige Utility-Seite im bestehenden System (`PageFrame`, `PageIntro`, `Section`), Überschrift schlicht „Impressum“ – **keine** Paragraphen-Überschrift. Externe Links sind benannt („Website der …“ + Domain), per Tastatur erreichbar und `rel="noopener noreferrer"`. Auf STAGING steht über `InternalNote` der Hinweis „Rechtliche Finalprüfung ausstehend: Rechtsform/Anbieter, verantwortliche Person(en) und vollständige Berufsbezeichnungen.“ – in PRODUCTION blendet `RELEASE.showInternalNotes` ihn aus; er ist kein Eltern-Inhalt.

## 2. OPEN – nicht angezeigt, nicht erfunden

| Thema | Fakt / Blocker | Warum offen | Frage an die Praxis |
|---|---|---|---|
| Rechtsform / Anbieterbezeichnung | F02 · LB-02 | Aus „Kinderarztpraxis Probst & Böhme“ lässt sich weder BAG, Gemeinschaftspraxis, GbR, Partnerschaft noch Einzelpraxis ableiten. Bei einer Personengesellschaft verlangen § 5 DDG und § 18 Abs. 1 MStV ggf. weitere Angaben (Rechtsform, Vertretungsberechtigte). | R1 |
| Anbieter / Verantwortliche | F03 · LB-04 | Niemand wird als Anbieter oder verantwortliche Person benannt, solange es nicht bestätigt ist. | R2 |
| Gesetzliche Berufsbezeichnungen + Verleihungsstaat | F04 · LB-05 (F21, F23) | § 5 Abs. 1 Nr. 5 DDG verlangt bei reglementierten Berufen u. a. die gesetzliche Berufsbezeichnung und den Staat, in dem sie verliehen wurde. Der alte Text nennt eine Bezeichnung im Singular für zwei Ärztinnen. F21 (Nadine Probst, „Fachärztin für Kinder- und Jugendmedizin“) ist bestätigt, F23 (Dr. med. Elke Böhme) nicht – eine Angabe nur für eine Ärztin wäre unvollständig und missverständlich, daher vorerst **keine** Berufsbezeichnung auf der Seite. | R3, R4 |
| § 18 Abs. 2 MStV | LB-16 | Gilt nur für journalistisch-redaktionell gestaltete Angebote. Rechtsfrage: „Ist die Website ein journalistisch-redaktionell gestaltetes Angebot, für das eine Verantwortlichenangabe nach § 18 Abs. 2 MStV erforderlich ist?“ – **nicht** automatisch JA; keine Person benannt. | R5 (nur falls erforderlich) |
| Datenschutzerklärung | F10 · LB-07 | Echte Hosting-, Logging- und Dienstleisterdaten fehlen; `/datenschutz` bleibt der kontrollierte Platzhalter. | R6 |

Rechtsgrundlage (Stand dieser Phase, sachlich, keine Freigabe): Das Digitale-Dienste-Gesetz (DDG) ist am 14.05.2024 in Kraft getreten; **§ 5 DDG** („Allgemeine Informationspflichten“) ist die einschlägige allgemeine Informationspflicht anstelle von § 5 TMG. **§ 18 MStV** enthält zusätzliche Informationspflichten (Abs. 1 Name/Anschrift, bei juristischen Personen Vertretungsberechtigte; Abs. 2 nur für journalistisch-redaktionelle Angebote). Ob die Seite später eine Paragraphen-Überschrift („Angaben gemäß § 5 DDG“) trägt, entscheidet die rechtliche Prüfung – bis dahin bewusst nicht.

## 3. OUTDATED – nicht übernommen

| Inhalt (alter Impressumstext) | Status | Begründung |
|---|---|---|
| „Pflichtangaben nach § 5 Telemediengesetz / § 55 Rundfunkstaatsvertrag“ | F08 · OUTDATED_DO_NOT_PUBLISH | TMG durch DDG abgelöst, RStV durch MStV; nicht bloß Text austauschen und als geprüft ausgeben. |
| Alter langer Haftungsausschluss | LEGAL_REVIEW_REQUIRED, nicht veröffentlicht | Historische Standardklausel ohne aktuelle juristische Prüfung; keine Pflicht, sie weiterzuführen. |
| Alter Datenschutzabsatz („Die Nutzung unserer Webseite ist ohne Angabe personenbezogener Daten möglich …“) | F09 · OUTDATED_DO_NOT_PUBLISH | Ersetzt keine Datenschutzerklärung; wird nicht übernommen. |
| Schreibweise „Untere Bahnhofsstraße 9“ | veraltet | Aktuell: „Untere Bahnhofstraße 9“ (Praxisangabe 16.11.2026). |
| Berufsbezeichnung im Singular | F04 · TO_BE_CONFIRMED | siehe §2. |

## 4. OFFICIAL SOURCES (geprüft 2026-11-16)

| Quelle | URL | Ergebnis |
|---|---|---|
| § 5 DDG (gesetze-im-internet.de) | https://www.gesetze-im-internet.de/ddg/__5.html | „Allgemeine Informationspflichten“; Abs. 1 Nr. 5: Kammer, gesetzliche Berufsbezeichnung + verleihender Staat, berufsrechtliche Regelungen und Zugang |
| DDG, Gesamttext | https://www.gesetze-im-internet.de/ddg/BJNR0950B0024.html | Ausfertigung 06.05.2024, in Kraft 14.05.2024; zuletzt geändert durch Art. 26 Abs. 2 G v. 25.3.2026 |
| Medienstaatsvertrag (amtliche Landesveröffentlichung, BRAVORS Brandenburg) | https://bravors.brandenburg.de/vertraege/mstv/2 | § 18 Abs. 1 Name/Anschrift (juristische Personen: Vertretungsberechtigte); Abs. 2 nur journalistisch-redaktionelle Angebote |
| Ärztekammer Sachsen-Anhalt – Impressum | https://www.aeksa.de/www/website/ServiceNavigation/impressum | Hausanschrift Doctor-Eisenbart-Ring 2, 39120 Magdeburg |
| Berufsordnung der Ärztekammer Sachsen-Anhalt | https://www.aeksa.de/www/website/PublicNavigation/arzt/arztundrecht/rechtsquellen/ordnungensatzungen/berufsordnung/ | „vom 08. November 1997; geändert am 26. April 2025“ (Entwurf einer weiteren Änderung war 2026 in Abstimmung – Stand bei Finalisierung erneut prüfen) |
| KV Sachsen-Anhalt – Impressum | https://www.kvsa.de/impressum.html | Doctor-Eisenbart-Ring 2, 39120 Magdeburg |

## 5. Production gate

Siehe [project-blockers.md](../research/project-blockers.md) „Legal gate“: Ein Wechsel auf `SITE_STAGE = "PRODUCTION"` gilt **nicht** als legal-ready, solange F02, F03, F04 oder F10 offen sind oder LB-16 unbeantwortet ist. Im Code: reine Funktion `legalLaunchReady(LEGAL_STATE)` (`src/domain/legal-readiness.ts`, Zustand in `src/content/impressum.ts`) – aktuell `ready: false`, offen: F02, F03, F04, F10, LB-16. Test `src/domain/__tests__/legal-readiness.test.ts`: aktueller Stand → nicht bereit; künstlicher Vollstand → bereit; Release-Guard schlägt fehl, falls `SITE_STAGE` auf PRODUCTION stünde, solange nicht bereit; `LEGAL_STATE` muss dem Faktenregister entsprechen. STAGING rendert unabhängig davon. `SITE_STAGE` bleibt `STAGING`; der Faktenstatus (F02–F10) wird durch diese Implementierung nicht verändert.

## 6. Prüfung (10.0C)

- Unit: `src/domain/__tests__/legal-readiness.test.ts` (Gate); `src/content/__tests__/impressum.test.ts` (nur bestätigte Angaben, nichts erfunden, keine Altrechtsgrundlagen, keine Compliance-Behauptung, keine Payload-Abhängigkeit).
- Integration: Schritt 26 `23-impressum.test.ts` (HTTP-Inhalt, Links, verbotene Texte, keine doppelten IDs, Datenschutz-Platzhalter); Schritt 27 (DB-Ausfall) prüft `/impressum` und `/datenschutz` mit gestoppter Datenbank.
- Screenshots 390 / 768 / 1440: `docs/reviews/phase-10-0c/screenshots/`.
