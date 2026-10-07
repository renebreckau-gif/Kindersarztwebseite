# Existing Site Audit — kinderarztpraxis-probst.de

Audit date: 2026-10-07. Source IDs refer to [source-inventory.md](source-inventory.md).
Scope: content, information architecture, content quality, and legal/technical issues that affect the redesign. No visual design assessment in this phase.

---

## 1. Site structure

Main navigation: Home · Aktuell · Praxis · Team · Leistungen · Notfälle · Kontakt · Impressum

| Page | Last edited | Content state |
|---|---|---|
| Home (S01) | 2026-05-18 | Maintained. Carries the most important operational info. |
| Aktuell (S02) | 2026-07-19 | Mixed: one expired closure, one 2020 Corona notice, one trainee list. |
| Praxis (S03) | 2020-04-06 | **Empty page** in main navigation. |
| Team (S04) | 2026-05-18 | Maintained text, 2020 photos. |
| Leistungen (S05) | 2020-05-09 | Comprehensive but untouched for 6+ years. |
| Notfälle (S06) | 2020-05-05 | Safety-critical data untouched for 6+ years. |
| Kontakt (S07) | 2022-03-07 | Correct contact data, Google Maps iframe. |
| Impressum (S08) | 2025-09-18 | Incomplete and legally outdated. |
| Hello world! (S09) | 2016-05-10 | WordPress default post still public. |
| Datenschutz (S10) | — | **Does not exist (404).** |

Observation: the practice actively edits only Home, Aktuell and Team. Everything else has been frozen since 2020. This is the clearest signal for which content must be easy to edit in the new system.

## 2. Duplicated information

| Information | Appears on | Issue |
|---|---|---|
| Address, phone, fax, email | Home, Kontakt, Impressum | Three manual copies; spelling of street already diverges ("Bahnhofstraße" vs. "Bahnhofsstraße"). |
| Emergency facilities | Home (with phone numbers) and Notfälle (with addresses + times) | Two different shapes of the same data; Uniklinikum phone only on Home, opening times only on Notfälle. |
| Physician qualifications | Team, Kontakt | Two copies, currently identical. |
| Giftnotruf | Home ("+49 361 730730"), Notfälle ("0361 730 730") | Different formatting. |
| "Healthy children only in the morning" | Home (current rule, 08–10), Aktuell (2020 Corona rule, "Vormittagssprechstunde") | Two versions of the same rule with different scope. |

→ All of these should come from a single source of truth in the new system.

## 3. Outdated / expired information

| Item | Where | Why outdated |
|---|---|---|
| Summer closure 20.07.–07.08.2026 + replacements | Aktuell | Expired 2 months ago, still the top item. |
| "Urlaub — Näheres erfahren Sie unter Aktuell" | Home | Teaser for the expired closure; implies a current closure. |
| "Coronakrise" notice (mask for everyone entering, 1.5–2 m distance, morning only for healthy children) | Aktuell | From 2020. Contradicts the current Home notice (mask only for children over 6 with infection). |
| Anne Horn, "bis 30.06.2026" | Aktuell | Training period ended. |
| Emergency service times (Hettstedt + Halle) | Notfälle | Last edited 2020-05; KV emergency service structures change frequently. High risk of being wrong. |
| Leistungen | Leistungen | Last edited 2020-05; completeness unknown. |
| Team photos | Team | From 2020 (upload folder `2020/04`); 4 photos for 7 people. |
| Legal references "§ 5 TMG", "§ 55 RStV" | Impressum | TMG was replaced by the DDG (Digitale-Dienste-Gesetz) in May 2024; RStV by the Medienstaatsvertrag (MStV) in 2020. |
| "Hello world!" | /hello-world/ | WordPress default from 2016. |
| Footer "Copyright 2026" | all | Fine now, but is static text — verify it is auto-generated. |

## 4. Unclear or erroneous language

| Text | Where | Problem |
|---|---|---|
| "Wunderversorgung" | Leistungen | Typo for "Wundversorgung". |
| "bitte Beachten Sie" | Home | Capitalisation error. |
| "Kinder -und Jugendmedizin" | Team | Hyphen/space error. |
| "Aufgrund von Urlaub" | Aktuell | Capitalisation. |
| Heading "Schwestern" | Team | Staff are listed as Arzthelferin / Erzieherin / Praxisassistentin, not nurses. |
| "Montag – ganztags / Dienstag – Freitag ab 10:00 Uhr" | Home | Doesn't say until when, nor whether afternoons count (Thursday afternoon ambiguous; Tuesday afternoon is appointment-only). |
| "bitte nur gesunde Patienten" | Home | Doesn't explain what "healthy" visits are (the 2020 notice did: Vorsorge, Impfungen, Gewichtskontrollen). |
| "Ärzte in Weiterbildung" | Aktuell | Gendered "Ärzte" for two women; trainees are not on the Team page. |
| Replacement table | Aktuell | Built with whitespace-aligned columns — unreadable on mobile; week 1 lists "Dr. Dorothea Kreuter" with Dr. Fuchs's address, phone and email; Dr. Reich's address lacks postcode/city; a stray extra Fuchs entry with no date. |
| "Kinderarztpraxis BAG Probst/Böhme" vs. "Kinderarztpraxis Probst & Böhme" | Kontakt vs. elsewhere | Two names. |
| Photo credit link | Impressum | Text says www.thomasreinhardt.de, link goes to pexels.com. |

## 5. Information hidden too deeply

- **Acute consultation rule** is a free-text sentence in a welcome box on Home, not part of the Sprechzeiten table. Parents scanning the hours table won't see that acute visits are only possible from 10:00 Tue–Fri.
- **Holiday closure** is only on Aktuell; Home shows only "Urlaub" with no dates.
- **Replacement practices** only on Aktuell, buried in an unreadable table.
- **Emergency times** only on Notfälle; Home lists facilities without saying which ones are 24/7.
- **112** appears only near the bottom of Notfälle, as the 6th item.
- **Phone number** is not a tappable `tel:` link anywhere; email not a `mailto:` link.
- **Appointment-only Tuesday afternoon** is a parenthesis in the hours list.

## 6. Missing high-value information

(Detail in [missing-information.md](missing-information.md).)

- How to book an appointment / which channel.
- Telephone hours.
- New patients: accepted or not.
- What to bring (insurance card, U-Heft, Impfpass).
- Accessibility, stroller access, parking, public transport.
- 116117 (Ärztlicher Bereitschaftsdienst) — not mentioned.
- Repeat prescriptions, referrals, sick notes ("Krankschreibung Kind" for parents).
- Full privacy policy.
- Named responsible persons in Impressum.

## 7. Legal / compliance issues (flag for legal review — not legal advice)

1. **No privacy policy (Datenschutzerklärung).** Only a short paragraph in the Impressum, which also claims use is possible without personal data — while the site loads Google Fonts from Google servers (transmits visitor IP addresses) and embeds a Google Maps iframe. High risk.
2. **Impressum incomplete:** cites outdated laws (TMG/RStV), names no responsible person(s), lists only one professional title in the singular although there are two physicians with different qualifications, legal form "BAG" not stated in Impressum.
3. **Email via GMX** for patient contact (including the practice asking parents to register children via email during closures) — the new site should not encourage sending health data by unencrypted email without notice. Policy **TO BE CONFIRMED WITH PRACTICE**.
4. **Staff names and photos:** consent for continued publication needs confirmation.
5. **Accessibility (BFSG / barrier-free):** images have no alt text; layout via whitespace. The new site should meet WCAG 2.2 AA regardless of formal obligation.

## 8. Technical observations relevant to the rebuild

- WordPress 6.8.11 + Elementor 4.3.4 (PHP 8.2, Apache).
- HTTP is served without redirect to HTTPS.
- WordPress REST user endpoint publicly lists the admin username (user enumeration).
- No meta description; page title identical structure; `lang="de"` is set.
- All images lack `alt`.
- Content is unstructured (whitespace tables, `<br>` layouts) — content will need to be re-entered as structured data, not migrated as HTML.
- Logo/favicon file: `cropped-Liams-Tiere-1` (2020). Ownership/usage rights of the logo/illustration: **TO BE CONFIRMED WITH PRACTICE**.
- Home hero image uploaded 2026-05 (`2026/05/2-1024x396.jpg`).

## 9. Summary verdict

The factual core (contact data, hours, team, services) is sound and largely consistent. The problems are:
1. stale operational notices without expiry,
2. safety-critical emergency data not reviewed since 2020,
3. operational rules (acute consultation, healthy-children window, appointment-only) scattered as free text,
4. missing privacy policy and outdated Impressum,
5. empty/placeholder pages.

The redesign's biggest lever is turning operational information into structured, dated, self-expiring data (→ PRAXIS PULS; see [dynamic-content-candidates.md](dynamic-content-candidates.md)).
