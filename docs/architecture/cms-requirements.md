# CMS Requirements

Phase: 04
Date: 2026-10-07
Model: [content-model.md](content-model.md). Governance: [content-governance.md](content-governance.md). Recommendation: [cms-comparison.md](cms-comparison.md).

Staff edit **content**, never layout, design, animation or component structure.

---

## 1. Principles

1. **German admin** — all labels, help texts, validation messages and navigation in German, plain language.
2. **Task-oriented navigation** — editors see tasks, not data types.
3. **Few required fields, safe defaults** — e.g. new announcements default to `validUntil = today + 14 days`, `published = false`; new facts default to "zu bestätigen".
4. **Preview before publish** — page preview and "PULS am {Datum}" preview.
5. **Automatic expiry** — nothing needs manual removal.
6. **The system catches mistakes** — conflicts block publishing; stale data warns and falls back.
7. **No technical model exposure** — editors never see "VerificationStatus" but "bestätigt / zu bestätigen / veraltet".

## 2. Admin navigation (German)

```
Heute
  Praxisstatus (Vorschau)          ← read-only PULS preview for any date/time
  Sonderöffnungszeiten
  Urlaub & Schließzeiten
  Aktuelle Meldungen
Sprechzeiten
  Wochenplan
  Sprechstundenarten
  Feiertage
Notfall                            ← restricted role
  Notfallinformationen
Vertretungspraxen
Praxis
  Praxisdaten & Anfahrt
  Ärztinnen
  Team
  Leistungen
  Wobei können wir helfen?
  Neu bei uns?
Mein Kind                          ← medical approval required
  Vorsorgeuntersuchungen
  Impfinformationen
  Altersgruppen
Entdecken                          ← medical approval required
  Lernkapitel
Medien
Quellen
Prüfliste                          ← everything due, overdue, unconfirmed
Rechtliches                        ← legal role
```

## 3. Core workflows

| Workflow (German UI) | Steps | Safeguards |
|---|---|---|
| **Praxisstatus ansehen** | Choose date/time → see exactly what the website shows | Read-only; shows reason when UNKNOWN ("Feiertag ohne Eintrag", "Widersprüchliche Sonderzeiten") |
| **Öffnungszeiten** | Week grid → add slot (Von/Bis/Art) → mark Ruhetage → confirm ("Von der Praxis bestätigt am …") | Overlaps rejected; slot end after start; future change via "gültig ab" |
| **Sonderöffnungszeiten** | Date(s) → "geschlossen" or slots → short message → confirm | Conflict check against other exceptions and closures |
| **Urlaub** | Zeitraum → Art → Ankündigen ab → Vertretung je Zeitraum aus Liste wählen → Vorschau | End date required; replacements only from the verified directory; warning if none verified |
| **Vertretung** | Directory entry → confirm with the replacement practice → date | Stale entries flagged; not selectable when unconfirmed |
| **Aktuelle Meldung** | Titel, Kurztext, gültig von/bis, Startseite ja/nein | End date required or "unbefristet" explicitly; "endet automatisch am …" |
| **Notfallinformationen** | Restricted; type, Wann nutzen?, Telefon, Quelle, geprüft am | 90-day warning; hidden after review date; 112 sentence always rendered |
| **Ärztinnen / Team** | Name, Rolle, Titel, Foto (from Medien), Einwilligung | Not public without consent; inactive hides immediately |
| **Leistungen** | Name, Beschreibung, Altersgruppen | Medical approval for medical wording |
| **Medizinische Inhalte** | Text + Quelle (from Quellen) + ärztliche Freigabe | Not public without approval and official source; reviewDue |

## 4. Required editor messages

Defined in [content-governance.md](content-governance.md) §6 (e.g. "Diese Meldung endet automatisch am 18.10.2026.", "Diese Notfallinformation wurde seit 180 Tagen nicht geprüft.", "Diese Vertretungspraxis muss erneut bestätigt werden.", "Akutsprechstunden können nicht veröffentlicht werden, weil die Zeiten noch nicht bestätigt sind.").

## 5. Roles and permissions

| Role (German) | Can edit | Cannot |
|---|---|---|
| Redaktion | Heute, Sprechzeiten, Praxis, Medien, Vertretungspraxen (data), Meldungen | Notfall, medical approval, legal texts, roles |
| Ärztliche Freigabe | Approve medical content, ENTDECKEN, emergency wording | Roles |
| Notfallpflege | Emergency information | Other areas |
| Recht | Legal texts | Operational content |
| Administration | Roles, structure, sources | — |

Every change is versioned with author and time (audit trail). At least two named people per critical role (holiday cover).

## 6. Validation requirements (server-side)

Implemented by reusing `src/domain/`:
- Exceptions: no equal-priority overlap with different content; SPECIAL_HOURS not inside an active closure.
- Opening rules: start < end; no overlaps per weekday; ACUTE inside opening hours.
- Closures: end date ≥ start date; replacements within closure period; referenced replacement practice exists.
- Announcements: `validUntil` or explicit OPEN_ENDED.
- High-risk entities: `VERIFIED_CURRENT` requires `lastVerified`, `verifiedBy`, `reviewDue`.
- People: consent required for publication; photos must be REAL media with consent.
- Media: PLACEHOLDER cannot be attached to published content; AI_CONCEPTUAL cannot be attached to Doctor/TeamMember/Location.

## 7. Non-requirements (V1)

No page builder, no layout/animation editing, no form builder, no newsletter, no comments, no user accounts for the public, no analytics dashboards, no AI writing assistant for medical content.

## 8. Acceptance criteria for the CMS phase

Measured with real practice staff (proposal, from success-criteria O1–O4):
- Enter a vacation with two replacement periods in ≤ 3 minutes.
- Add an announcement with end date in ≤ 1 minute.
- Preview PULS for a future date without help.
- Understand every warning message without explanation.
