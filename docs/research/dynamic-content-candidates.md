# Dynamic Content Candidates — input for PRAXIS PULS

Date: 2026-10-07. Source IDs refer to [source-inventory.md](source-inventory.md).

Purpose: identify which existing information is *operational* (changes over time, has a validity window, or depends on the current day/time) and should therefore be administered as structured data rather than page text. This document describes **data**, not UI, and does not choose an implementation.

Evidence for the need: on the current site, operational information is maintained as free text on Home and Aktuell (the only pages edited in 2026), and stale items remain online because nothing expires (closure from July 2026 and a 2020 Corona notice are still the first content on "Aktuell").

All German labels below are proposals for editor/UI labels and must be confirmed during the CMS phase.

---

## 1. Regular opening hours ("Sprechzeiten")

- **Current source:** S01 (free text list).
- **Why dynamic:** basis for any "open now / closed now / opens at …" status; changes occasionally.
- **Suggested shape:** per weekday, 0..n time slots; each slot has a consultation type.
- **Example from current data:**
  - Di 08:00–10:00 → type "nur gesunde Patienten"
  - Di 10:00–11:00 → type "Akutsprechstunde" (derived — confirm)
  - Di 14:00–16:00 → type "Terminsprechstunde"
- **Open question:** C3, C4, C6 in [missing-information.md](missing-information.md).

## 2. Consultation types ("Sprechstundenarten")

- **Current source:** S01, S02.
- **Observed types:** "Akutsprechstunde", "Terminsprechstunde", "nur gesunde Patienten" (Vorsorge, Impfungen, Gewichtskontrollen per 2020 notice).
- **Why dynamic:** a time slot's type determines what a parent should do right now (come in vs. call vs. book). Should be a small editable list referenced by time slots, each with a short German explanation text.

## 3. Acute consultation ("Akutsprechstunde")

- **Current source:** S01 ("Montag – ganztags, Dienstag – Freitag ab 10:00 Uhr").
- **Why dynamic:** most-asked question by parents of sick children; currently a sentence outside the hours table. Should be derived from the slot types in (1) so it can never contradict them.

## 4. Special opening hours / exceptions ("Sonderöffnungszeiten")

- **Current source:** none explicitly; implied by closures.
- **Shape:** date (or date range) → replaced slots or "geschlossen", with reason and optional note. Overrides (1) for that date.

## 5. Holidays / closures ("Urlaub / Schließzeiten")

- **Current source:** S02 (closure 20.07.–07.08.2026), S01 ("Urlaub" teaser).
- **Shape:** start date, end date, reason (Urlaub, Fortbildung, Feiertag/Brückentag …), public note, **auto-publish lead time** (e.g. show X days before), **auto-expiry** after end date.
- **Problem it solves:** the expired July/August closure is still online; Home teaser shows "Urlaub" without dates.
- Public holidays in Sachsen-Anhalt could be pre-filled, but whether the practice closes on them / Brückentage: **TO BE CONFIRMED WITH PRACTICE**.

## 6. Replacement practices ("Vertretung")

- **Current source:** S02.
- **Shape:** linked to a closure; per sub-period 1..n replacement practices; each practice: name(s) of physician(s), street, postcode, city, phone, email, optional note (e.g. "Bitte melden Sie Ihr Kind vorher per E-Mail oder Telefon an!").
- **Should be a reusable directory** of replacement practices (the same practices — Fuchs/Könnern, Teichler/Halle — recur across weeks) so that address/phone are entered once. This also prevents the current copy-paste error (week 1: "Dr. Dorothea Kreuter" with Dr. Fuchs's contact data; Dr. Reich without postcode/city).
- Contact data of third-party practices must be verified each time before publication.

## 7. Temporary notices ("Aktuelle Hinweise")

- **Current source:** S01 (mask rule for children over 6), S02 (Corona notice, trainee list).
- **Shape:** title, short text, priority/severity (info / wichtig / dringend), valid-from, valid-until (required or explicitly "unbefristet"), placement (start page banner vs. "Aktuell" list).
- **Problem it solves:** the 2020 Corona notice is still live and contradicts the current mask rule.

## 8. Physicians in training ("Ärztinnen und Ärzte in Weiterbildung")

- **Current source:** S02.
- **Shape:** name, start date, end date (optional); shown only while active.
- **Problem it solves:** Anne Horn's ended period (30.06.2026) is still displayed; trainees are disconnected from the Team page.

## 9. Team members

- **Current source:** S04 (edited 2026-05).
- **Why semi-dynamic:** staff change; currently edited a couple of times a year. Shape: name, role, qualifications, photo (+ alt text), display order, visible yes/no, consent recorded yes/no (internal).

## 10. Emergency directory ("Notfall")

- **Current source:** S01 (short list) and S06 (detailed), duplicated.
- **Shape:** facility name, address, phone, service type (KV-Notdienst / 24h Kinder-Notaufnahme / Giftnotruf / Notruf), opening times (if not 24/7), **last verified date**, verified by.
- **Why:** single source for both the start-page short list and the full emergency page; "last verified" makes staleness visible to editors. Low change frequency but very high importance.

## 11. Contact & practice master data

- **Current source:** S01, S07, S08 (three manual copies).
- **Shape:** practice name, legal name, street, postcode, city, phone, fax, email, telephone hours (missing).
- **Why:** single source for header, footer, contact page, Impressum, structured data (schema.org) — prevents spelling divergence ("Bahnhofstraße" vs. "Bahnhofsstraße").

---

## Derived real-time states (for PRAXIS PULS)

Combining 1–7 allows computing at any moment (time zone Europe/Berlin):

| State | Derived from |
|---|---|
| Geöffnet / Geschlossen | (1) + (4) + (5) |
| Current consultation type (e.g. "Jetzt: Akutsprechstunde") | (1) + (2) |
| Next opening / next acute window | (1) + (4) + (5) |
| Closure active → show replacement practices | (5) + (6) |
| Upcoming closure announcement | (5) lead time |
| Active notices | (7) validity window |
| Outside hours → emergency guidance | (10) |

## Priority for the CMS phase

| Priority | Items |
|---|---|
| Must | 1, 2, 3, 5, 6, 7, 10, 11 |
| Should | 4, 8, 9 |

## Safety constraints to carry forward

- A derived "open/acute now" status must never be shown if the underlying data is missing or ambiguous — fallback is to show the phone number.
- Emergency guidance (112 for life-threatening emergencies) must not depend on dynamic data.
- Editors should be warned about notices without end date and emergency entries not verified for a defined period (period **TO BE CONFIRMED WITH PRACTICE**).
