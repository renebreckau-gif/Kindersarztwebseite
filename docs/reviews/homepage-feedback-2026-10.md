# Startseite: Kundenfeedback Oktober 2026 (Phase 10.0A)

Stand: 2026-10-20 · Baseline `8a0404c` · STAGING (`SITE_STAGE = "STAGING"`, `DATA_SOURCE = "STATIC"`, nicht indexiert)

## Customer feedback decision

**Variante B ist freigegeben** („reduziert, priorisiert und näher am bestehenden Website-Design“).

Hierarchie der Startseite:

1. Praxisstatus / **Praxis Puls**
2. **sofortiger Kontakt**: Anrufen (primär), Notfall (Sicherheit), E-Mail (sekundär)
3. **höchstens ein** relevanter aktueller Hinweis, nur wenn es einen gibt
4. tiefere Service-Informationen leben in eigenen Bereichen, nicht auf der Startseite

**Variante A** („alles auf der Startseite“) wurde bewusst als **Überladungs-Vergleich** gezeigt und abgelehnt. Sie war kein Designvorschlag, sondern sollte sichtbar machen, was es kostet, alle gewünschten Informationen auf einen Bildschirm zu legen. Das ist keine allgemeine Aussage über die Gestaltung von Variante A.

Die Vergleichsbilder sind Kommunikationsmaterial, keine pixelgenaue Vorlage. Maßstab der Umsetzung ist die bestehende Website.

## Umgesetzt in 10.0A

- **E-Mail als zweite Kontaktmöglichkeit.** „E-Mail schreiben“ steht im Praxis Puls in einer ruhigen zweiten Zeile, neben dem jeweiligen Folge-Link („Sprechzeiten ansehen“). Es ist ein schlichter `mailto:`-Link auf `PRACTICE.email` (F17), ohne vorausgefüllten Betreff oder Text und ohne Formular. Die Adresse steht nicht zusätzlich im Hero.
- **Ein optionaler Hinweis unter dem Praxis Puls.**
  - **Quellen:**
    1. eine angekündigte **bevorstehende Schließung**: `upcomingClosure` des Engines (Closure + `announceFrom` + Bestätigung)
    2. ein Hinweis mit `homepageHighlight`, nach `selectPublicAnnouncements`
  - **Vorrang:** Schließung vor Hinweis.
  - **Mehrere hervorgehobene Hinweise:** Es zählt die bestehende Prioritätsreihenfolge, angezeigt wird genau einer.
  - **Laufende Schließung:** Während einer laufenden Schließung kommt keine Schließungskarte hinzu; das sagt bereits der Praxis Puls.
  - **Kein Hinweis:** Gibt es keinen Hinweis, wird nichts gerendert.
  - **Keine Doppelung:** Ein hervorgehobener Hinweis erscheint nicht noch einmal im Kapitel „Heute“.
- **Unverändert:** Mobile Dock (Menü · Heute · Notfall · Anrufen), Hero-Komposition, Kunstwerk, Überschrift, Navigation, Praxis-Puls-Logik und Kapitel unter dem Hero.
- **Reale Daten heute:** Die statischen öffentlichen Inhalte erzeugen **keinen** Startseiten-Hinweis, weil der einzige Hinweis veraltet ist. Es wurden keine Urlaubs- oder Fortbildungsdaten erfunden.
- **Sichtprüfung mit Testdaten:** Sie läuft nur über die Prüfansicht `/review/startseite?beispiel=urlaub|fortbildung|hinweis|keiner`. Diese ist nur auf STAGING erreichbar, nicht indexiert, als „Testdaten“ markiert und verwendet die echte Startseiten-Komposition.

Screenshots der echten Umsetzung liegen in [homepage-feedback-2026-10/](homepage-feedback-2026-10/):

| Datei | Inhalt |
|---|---|
| `A-startseite-1440.png`, `A-startseite-390.png` | Startseite ohne aktuellen Hinweis (reale statische Daten) |
| `B-urlaub-1440.png`, `B-urlaub-390.png` | Prüfansicht mit künstlichem Urlaub (Testdaten) |
| `D-hinweis-768.png` | Prüfansicht mit künstlichem hervorgehobenem Hinweis (Testdaten) |

## Freigabe-Grenzen (Nachvollziehbarkeit)

**FREIGEGEBEN:** die Hierarchie der Startseite nach Variante B (Platzierung und Gewichtung).

**NOCH NICHT ALS INHALT FREIGEGEBEN**, denn eine UX-Freigabe ist keine Faktenfreigabe:

- konkrete künftige Urlaubsinhalte (Zeiträume, Vertretungen)
- künftige Service-Informationen
- Details zur Praxis-App
- Preise
- Zahlungsregeln
- Formulierung zur Gesundheitskarte (Chipkarte)
- Formulierung zum Impfpass
- Formulierung zu Masken
- Ablauf für Rezepte / E-Rezept
- **Nutzung der E-Mail für Patientenanliegen (F18).** Die Adresse ist bestätigt (F17). Ob und wofür Familien sie nutzen sollen, ist weiterhin offen; deshalb gibt es keinen erklärenden Text dazu und kein Formular. Die Bestätigungsdaten von `PRACTICE.email` wurden nicht verändert.

## Zurückgestellte Wünsche (nicht auf die Startseite)

„Gut vorbereitet“, Praxis-App, Rezept / E-Rezept, Preisliste, Zahlungsarten, Erinnerung an die Gesundheitskarte, Impfpass-Regel, Masken- / Infekt-Hinweis, Team-Fotografie.

## Nächste Arbeitspakete (nur Planung, nicht umgesetzt)

| Paket | Inhalt | Voraussetzung |
|---|---|---|
| **10.1** „Gut vorbereitet“ | Was Familien zum Termin mitbringen (z. B. Gesundheitskarte, Impfpass), Masken- / Infekt-Hinweise; eigener Bereich, verlinkt aus „Praxis“ / „Neu bei uns“ | Wortlaut und Regeln von der Praxis bestätigt |
| **10.2** „Praxis-App & digitale Services“ | Welche App, wofür, Datenschutz, Links | Bestätigung, welche App die Praxis nutzt |
| **10.3** „Rezepte / E-Rezept / Kontaktprozesse“ | Folgerezepte, E-Rezept, wofür Telefon / E-Mail / App (inkl. F18) | Ablauf von der Praxis bestätigt |
| **10.4** „Kosten & Zahlungsarten“ | IGeL-Leistungen / Preise, Zahlungsarten | Preisliste und Zahlungsarten bestätigt |
| **10.5** „Team-Inhalte / Fotografie“ | Teamfotos, Vorstellung | Fotos, Einwilligungen |

Die Akutsprechstunde (09.5E) bleibt pausiert.
