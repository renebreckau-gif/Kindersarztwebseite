# Factual Practice Data

Crawl date: 2026-10-07. Source IDs refer to [source-inventory.md](source-inventory.md).

Rules applied:
- Only facts stated on the existing website are recorded. Original German wording is preserved in quotes where it matters.
- Nothing has been added, corrected or "improved". Suspected errors are flagged, not fixed.
- Anything not verifiable is marked **STATUS: TO BE CONFIRMED WITH PRACTICE**.

---

## 1. Practice identity

| Field | Value | Source | Notes |
|---|---|---|---|
| Practice name (public) | Kinderarztpraxis Probst & Böhme | S01, S08, site `<title>` | |
| Practice name (variant) | "Kinderarztpraxis BAG Probst/Böhme" | S07 | BAG = Berufsausübungsgemeinschaft. **STATUS: TO BE CONFIRMED WITH PRACTICE** — official legal name/form for Impressum. |
| Specialty | Kinder- und Jugendmedizin | S04, S07, S08 | |
| Location | Hettstedt (Sachsen-Anhalt) | S01, S07, S08 | |

## 2. Contact

| Field | Value | Source | Notes |
|---|---|---|---|
| Street | "Untere Bahnhofstraße 9" | S01, S07 | Impressum (S08) and the Google Maps embed spell it "Untere Bahnhofs**s**traße 9". **STATUS: TO BE CONFIRMED WITH PRACTICE** (correct spelling). |
| Postcode / city | 06333 Hettstedt | S01, S07, S08 | |
| Phone | 03476 851157 | S01, S07, S08 | Consistent on all pages. |
| Fax | 03476 854206 | S01, S07, S08 | Consistent on all pages. |
| Email | kinderarztpraxis-hettstedt@gmx.de | S01, S07, S08 | Consistent on all pages. |
| Phone availability hours | — | — | Not stated. **STATUS: TO BE CONFIRMED WITH PRACTICE** |

## 3. Physicians

| Name | Qualification (verbatim) | Source |
|---|---|---|
| Nadine Probst | "Fachärztin für Kinder- und Jugendmedizin" | S04, S07 |
| Dr. med. Elke Böhme | "Fachärztin für Kinder- und Jugendmedizin/Kinderchirurgie", "Naturheilverfahren" | S04, S07 |

Notes:
- "Kinderchirurgie" is listed after a slash; it is unclear whether this denotes a separate Facharzt title (Fachärztin für Kinderchirurgie). **STATUS: TO BE CONFIRMED WITH PRACTICE** (exact titles as they may be published).
- "Naturheilverfahren" is presumably an additional qualification (Zusatzbezeichnung). **STATUS: TO BE CONFIRMED WITH PRACTICE**
- Which physician is a partner/owner of the BAG: **STATUS: TO BE CONFIRMED WITH PRACTICE**

### Physicians in training ("Ärzte in Weiterbildung") — source S02

| Name | Period (verbatim) | Status as of 2026-10-07 |
|---|---|---|
| Frau Anne Horn | "Vom 01.01.2025 bis 30.06.2026" | Period ended. |
| Frau Firuza Rafiyeva | "Vom 01.03.2026 bis dato" | Presumably current. **STATUS: TO BE CONFIRMED WITH PRACTICE** |

Neither appears on the Team page (S04).

## 4. Staff — source S04 (heading on site: "Schwestern")

| Name | Role (verbatim) |
|---|---|
| Andrea Zahn | Arzthelferin |
| Steffi Christmann | Erzieherin / Arzthelferin |
| Katharina Weis | Arzthelferin |
| Anke Bettche | Arzthelferin |
| Peggy Kejs | Praxisassistentin |

Notes:
- 4 photos for 7 people; photos are from 2020 and not labelled with names. Mapping of photos to people: **STATUS: TO BE CONFIRMED WITH PRACTICE**
- Consent of each person for name/photo publication on a new site: **STATUS: TO BE CONFIRMED WITH PRACTICE**
- Current job titles (e.g. "Arzthelferin" vs. "Medizinische Fachangestellte"): **STATUS: TO BE CONFIRMED WITH PRACTICE** — do not modernise without approval.

## 5. Regular consultation hours ("Sprechzeiten") — source S01 (edited 2026-05-18)

Verbatim structure:

| Day | Hours | Restrictions stated |
|---|---|---|
| Montag | 08:00–11:00 and 14:00–17:00 | none stated |
| Dienstag | 08:00–11:00 and 14:00–16:00 | 08:00–10:00 "bitte nur gesunde Patienten"; 14:00–16:00 "nur Terminsprechstunde" |
| Mittwoch | 08:00–12:00 | 08:00–10:00 "bitte nur gesunde Patienten" |
| Donnerstag | 08:00–11:00 and 14:00–17:00 | 08:00–10:00 "bitte nur gesunde Patienten" |
| Freitag | 08:00–12:00 | 08:00–10:00 "bitte nur gesunde Patienten" |
| Samstag / Sonntag | — | not mentioned (closed implied) |

### Acute consultation ("Akutsprechstunde") — source S01

Verbatim: "bitte Beachten Sie die Akutsprechstundenzeit: Montag – ganztags / Dienstag – Freitag ab 10:00 Uhr!"

Derived (for later modelling, **not** to be published without confirmation):
- Monday: acute patients during all opening hours.
- Tue–Fri: acute patients from 10:00 until end of morning session (Tue/Thu 11:00, Wed/Fri 12:00).
- Tuesday afternoon: appointment-only — so presumably no acute patients.
- Thursday afternoon 14:00–17:00: whether acute patients are seen is **not stated**.

**STATUS: TO BE CONFIRMED WITH PRACTICE** — exact acute-consultation windows per day, especially Monday/Thursday afternoons.

### Infection-related rule — source S01

Verbatim: "Des Weiteren achten Sie bitte darauf, dass Kinder über 6 Jahre im Falle eines Infektes einen Mundschutz benötigen!"

## 6. Appointment consultation

- Tuesday 14:00–16:00 is "nur Terminsprechstunde" (S01).
- 08:00–10:00 Tue–Fri reserved for healthy patients (S01). The 2020 Corona notice (S02) describes the morning session as reserved for "Vorsorge, Impfungen, Gewichtskontrollen etc."
- How to book (phone only? email? online?): not stated. **STATUS: TO BE CONFIRMED WITH PRACTICE**

## 7. Services ("Leistungen") — source S05 (last edited 2020-05-09)

Recorded verbatim, grouped as on the site. **STATUS: TO BE CONFIRMED WITH PRACTICE** that this list is still complete and current.

**Allgemein kinderärztliche Sprechstunde**
- Behandlung akuter und chronischer Erkrankungen im Kindes- und Jugendalter
- Vorsorgeuntersuchungen U2 – U9 und Jugendvorsorge J1; zusätzlich U10, U11, J2 (krankenkassenabhängig)
- Impfungen: Indikationsimpfungen, Reiseimpfungen, empfohlene Impfungen laut STIKO
- Versorgung und Aufnahme von Kindergarten- und Schulunfällen
- Reisemedizinische Beratung
- Jugendarbeitsschutzuntersuchungen (entsprechende Formulare erhalten Sie beim Einwohnermeldeamt)
- Kindergartentauglichkeitsbescheinigung, Sporttauglichkeitsuntersuchungen (außer Tauchen)
- Labordiagnostik
- Naturheilverfahren
- "Wunderversorgung" (sic — almost certainly "Wundversorgung"; confirm before correcting)

**Pulmologie und Allergologie**
- Diagnostik allergologischer Erkrankungen (Pricktest)
- Lungenfunktionsdiagnostik
- Hyposensibilisierungsbehandlung (SLIT / SCIT)
- DMP Asthma bronchiale
- Neurodermitisberatung und -therapie

**Ultraschalluntersuchungen im Kindes- und Jugendalter**
- Hüftscreening bis zur 8. Lebenswoche
- Sonographie der Bauchorgane und Nieren

**Diagnostik und Therapie bei Harninkontinenz / Bettnässen**

**Psychosomatische Grundversorgung**
- Auffälligkeiten in der seelischen Entwicklung (z. B. Schulschwierigkeiten, Ängste, Essstörungen, Aufmerksamkeitsprobleme, Ticstörungen, Einnässen, Probleme des Sozialverhaltens, Depressionen)
- "im Bedarfsfall arbeiten wir eng mit den entsprechenden Fachkollegen zusammen"

## 8. Emergency information

### Life-threatening emergencies — S06
- "Bei lebensbedrohlichen Notfällen wählen Sie bitte die 112!"

### Poison emergency — S01, S06
- Giftnotruf Erfurt: 0361 730730 (S06: "0361 730 730"; S01: "+49 361 730730"). S06: "ganztägig erreichbar".

### KV emergency service Hettstedt — S06 (last edited 2020-05-05)
- Location: Helios Klinik, Robert-Koch-Straße 8, 06333 Hettstedt
- Times: Mi 17.00–20.00, Fr 17.00–20.00, Sa 09.00–12.00 und 17.00–20.00, So 09.00–12.00 und 17.00–20.00
- **STATUS: TO BE CONFIRMED WITH PRACTICE** — 6+ years old; location and times must be re-verified (ideally against KV Sachsen-Anhalt).

### KV emergency service Halle — S06
- Location: St. Elisabeth Krankenhaus, Mauerstr. 5, 06110 Halle; Tel. 0345 213 4310
- Times: Mo 19–23, Di 19–23, Mi 16–23, Do 19–23, Fr 16–23, Sa 08–23, So 08–23
- **STATUS: TO BE CONFIRMED WITH PRACTICE** (6+ years old)

### Facilities with 24/7 paediatric service (per site)

| Facility | Address | Phone | Source | Stated service |
|---|---|---|---|---|
| AMEOS Klinikum Aschersleben | Eislebener Str. 7A, 06449 Aschersleben | +49 3473 970 | S01, S06 | 24/7 "kinderärztlicher Bereitschaftsdienst" |
| Helios Klinik Sangerhausen | Am Beinschuh 2a, 06526 Sangerhausen | +49 3464 660 | S01, S06 | 24/7 "kinderärztlicher Bereitschaftsdienst" |
| St. Elisabeth Krankenhaus Halle | Mauerstraße 5, 06110 Halle | +49 345 2134310 | S01, S06 | 24/7 paediatric + paediatric-surgical (Kinderambulanz) |
| Universitätsklinikum Halle (Saale), Kröllwitz | Ernst-Grube-Str. 40, 06120 Halle | +49 345 5572053 | S01, S06 | 24/7 paediatric + paediatric-surgical (phone only on S01) |

**STATUS: TO BE CONFIRMED WITH PRACTICE** for all of the above — must be re-verified before publication; emergency data is safety-critical.

### Pharmacy emergency service — S06
- Link to aponet.de emergency pharmacy search for 06333 Hettstedt.

### Not mentioned anywhere on the site
- Ärztlicher Bereitschaftsdienst 116117. **STATUS: TO BE CONFIRMED WITH PRACTICE** whether to include.

## 9. Closures / holidays / replacement — S02 (expired)

Last published closure: "vom 20.07.2026 bis 07.08.2026 geschlossen" (Urlaub). Replacement practices listed per week:

| Period | Replacement 1 | Replacement 2 |
|---|---|---|
| 20.07.–24.07.2026 | Frau Dr. med. Dorothea Kreuter, Leninplatz 1, 06420 Könnern, Tel. 034691 20320, kinderarzt-fuchs@gmx.de | Dr. med. Heike Teichler, Hallorenring 8, 06108 Halle/Saale, Tel. 0345 2906510, info@kinderarztpraxis-teichler.de |
| 27.07.–31.07.2026 | Frau Dr. med. Chr. Fuchs, Leninplatz 1, 06420 Könnern, Tel. 034691 20320, kinderarzt-fuchs@gmx.de | Dr. med. Heike Teichler (as above) |
| 03.08.–07.08.2026 | Herr Gunther Jach, Unterstraße 17, 06493 Harzgerode, Tel. 039484 2313, gunther.jach@mvz-harz.de | Frau Dr. med. Steffi Reich, "Hinter den Planken 1" (no postcode/city), Tel. 03476 812088, reich.praxis@t-online.de |
| (unassigned) | Frau Dr. med. Chr. Fuchs listed a further time after week 3 — association unclear | |

Instruction: "Bitte melden Sie Ihr Kind vorher per E-Mail oder Telefon an!"

These are **historical records only** and illustrate the data structure. They must not be republished as current.

## 10. Legal information — S08

| Field | Value |
|---|---|
| Legal basis cited | "§ 5 Telemediengesetz § 55 Rundfunkstaatsvertrag (RStV)" (outdated references — see audit) |
| Berufsbezeichnung | "Ärztin, Fachärztin für Kinder und Jugendmedizin (verliehen in der Bundesrepublik Deutschland)" |
| Ärztekammer | Ärztekammer Sachsen-Anhalt, Doctor-Eisenbart-Ring 2, 39120 Magdeburg, www.aeksa.de |
| Kassenärztliche Vereinigung | KV Sachsen-Anhalt (KVSA), Doctor-Eisenbart-Ring 2, 39120 Magdeburg, www.kvsa.de |
| Berufsrecht | Berufsordnung der Landesärztekammer Sachsen-Anhalt |
| Photo credit | Thomas Reinhardt (text "www.thomasreinhardt.de", link points to pexels.com) |
| Responsible persons named | **None** — **STATUS: TO BE CONFIRMED WITH PRACTICE** |

## 11. Privacy information — S08, S10

- Only a 3-sentence "Datenschutz" paragraph inside the Impressum ("Die Nutzung unserer Webseite ist ohne Angabe personenbezogener Daten möglich…").
- No standalone privacy policy (`/datenschutz/` → 404).
- Data protection officer, controller details, hosting provider, third-party services: not stated. **STATUS: TO BE CONFIRMED WITH PRACTICE**

## 12. Not available on the site (all **STATUS: TO BE CONFIRMED WITH PRACTICE**)

Parking · wheelchair accessibility · stroller access · floor/lift · public transport · new-patient acceptance · first-visit requirements (insurance card, U-Heft, Impfpass) · appointment booking channels · telephone hours · prescription/referral ordering · sick-note rules · insurance (GKV/private) rules · languages spoken · holiday calendar beyond the last closure. See [missing-information.md](missing-information.md).
