# Source Inventory

Phase: Research / Content Audit
Crawl date: 2026-10-07
Method: Rendered HTML of every page in the main navigation and the WordPress sitemap, cross-checked against the public WordPress REST API (`/wp-json/wp/v2/pages`, `/wp-json/wp/v2/posts`), which also provides the "last modified" timestamp of each page.

The site is a WordPress 6.8.11 + Elementor 4.3.4 installation. The sitemap lists 8 pages and 1 post. No other content exists.

Source IDs (S01 …) are referenced from the other research documents.

Confidence scale:
- **HIGH** — stated verbatim on the official site, consistent across pages, recently edited.
- **MEDIUM** — stated on the official site but old (not edited for years), or inconsistent between pages.
- **LOW** — stated on the site but very likely outdated or contradicted elsewhere.

---

## S01 — Home

- **TITLE:** Home
- **URL:** https://kinderarztpraxis-probst.de/
- **LAST MODIFIED (CMS):** 2026-05-18
- **INFORMATION FOUND:** Welcome text; notice on acute consultation times ("Akutsprechstundenzeit": Mon all day, Tue–Fri from 10:00); mask notice for children over 6 with infections; "Urlaub" teaser pointing to "Aktuell"; weekly consultation hours (Sprechzeiten) with "healthy patients only" and "appointment only" windows; address, phone, fax, email; list of 5 emergency facilities with phone numbers (Aschersleben, Sangerhausen, Halle St. Elisabeth, Uniklinikum Halle, Giftnotruf Erfurt).
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH for hours/contact (edited 2026-05). MEDIUM for emergency facility list (not cross-verified externally).

## S02 — Aktuell

- **TITLE:** Aktuell
- **URL:** https://kinderarztpraxis-probst.de/aktuell/
- **LAST MODIFIED (CMS):** 2026-07-19
- **INFORMATION FOUND:** Summer closure 20.07.2026–07.08.2026 with weekly replacement practices (names, addresses, phones, emails); a 2020 "Coronakrise" notice; list of "Ärzte in Weiterbildung" (physicians in training) with date ranges.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH that it was published; LOW for current relevance — the closure is **expired**, the Corona notice is **outdated** (2020).

## S03 — Praxis

- **TITLE:** Praxis
- **URL:** https://kinderarztpraxis-probst.de/praxis/
- **LAST MODIFIED (CMS):** 2020-04-06
- **INFORMATION FOUND:** **None.** Page is empty but linked in the main navigation.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** n/a

## S04 — Team

- **TITLE:** Team
- **URL:** https://kinderarztpraxis-probst.de/team/
- **LAST MODIFIED (CMS):** 2026-05-18
- **INFORMATION FOUND:** 2 physicians (Nadine Probst; Dr. med. Elke Böhme) with specialist titles; 5 staff members with job titles; 4 team photos (2020, no alt text, not matched to names).
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH (edited 2026-05).

## S05 — Leistungen

- **TITLE:** Leistungen
- **URL:** https://kinderarztpraxis-probst.de/leistungen/
- **LAST MODIFIED (CMS):** 2020-05-09
- **INFORMATION FOUND:** Full list of services: general paediatrics, U2–U9/J1 (+U10, U11, J2 depending on insurer), vaccinations, Kita/school accidents, travel medicine advice, youth labour-protection exams, Kita/sports fitness certificates (except diving), lab diagnostics, naturopathy, wound care, pulmonology/allergology (prick test, lung function, SLIT/SCIT, DMP asthma, atopic dermatitis), ultrasound (hip screening up to week 8, abdomen, kidneys), enuresis, basic psychosomatic care.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** MEDIUM — official, but untouched for 6+ years.

## S06 — Notfälle

- **TITLE:** Notfälle
- **URL:** https://kinderarztpraxis-probst.de/notfaelle/
- **LAST MODIFIED (CMS):** 2020-05-05
- **INFORMATION FOUND:** KV emergency service Hettstedt (Helios Klinik, Robert-Koch-Straße 8) with times; 24/7 paediatric emergency service at AMEOS Aschersleben and Helios Sangerhausen; KV emergency service Halle at St. Elisabeth Krankenhaus with times and phone; 24/7 paediatric + paediatric-surgery service at Uniklinikum Halle (Kröllwitz) and St. Elisabeth; 112; Giftnotruf Erfurt; link to aponet.de pharmacy emergency search.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** LOW–MEDIUM — emergency service times are 6+ years old and must be re-verified.

## S07 — Kontakt

- **TITLE:** Kontakt
- **URL:** https://kinderarztpraxis-probst.de/kontakt/
- **LAST MODIFIED (CMS):** 2022-03-07
- **INFORMATION FOUND:** Practice name as "Kinderarztpraxis BAG Probst/Böhme"; both physicians with qualifications; address, phone, fax, email; embedded Google Maps iframe.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH for contact data (consistent with S01, S08).

## S08 — Impressum

- **TITLE:** Impressum
- **URL:** https://kinderarztpraxis-probst.de/impressum/
- **LAST MODIFIED (CMS):** 2025-09-18
- **INFORMATION FOUND:** Legal notice citing § 5 TMG / § 55 RStV; address (spelled "Untere Bahnhofsstraße"); phone, fax, email; professional title; Ärztekammer Sachsen-Anhalt; KV Sachsen-Anhalt; professional code; photo credit (Thomas Reinhardt); disclaimer; a short "Datenschutz" paragraph (no full privacy policy).
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** MEDIUM — facts likely correct, but legal references outdated and mandatory content incomplete (see audit).

## S09 — "Hello world!" (default WordPress post)

- **TITLE:** Hello world!
- **URL:** https://kinderarztpraxis-probst.de/hello-world/
- **LAST MODIFIED (CMS):** 2016-05-10
- **INFORMATION FOUND:** WordPress placeholder text. Publicly reachable and listed in the sitemap.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** n/a — not practice content.

## S10 — Datenschutz (probe)

- **TITLE:** (none)
- **URL:** https://kinderarztpraxis-probst.de/datenschutz/
- **INFORMATION FOUND:** **HTTP 404.** No standalone privacy policy exists anywhere in the sitemap.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH (absence confirmed via sitemap + REST API page list).

## S11 — Technical metadata

- **TITLE:** HTML head, HTTP headers, REST API, sitemap
- **URL:** https://kinderarztpraxis-probst.de/wp-sitemap.xml, https://kinderarztpraxis-probst.de/wp-json/wp/v2/pages
- **INFORMATION FOUND:** WordPress 6.8.11, Elementor 4.3.4, PHP 8.2, Apache. Google Fonts (Roboto, Roboto Slab) loaded from `fonts.googleapis.com`. Google Maps iframe on Kontakt. `lang="de"`. No meta description. No `tel:`/`mailto:` links. HTTP is served without redirect to HTTPS. Public REST user endpoint exposes the WordPress admin username.
- **LAST CHECKED:** 2026-10-07
- **CONFIDENCE:** HIGH

## External links referenced by the site (not crawled for facts)

| Link | Referenced from | Purpose |
|---|---|---|
| https://www.aponet.de/service/notdienstapotheke-finden/suchergebnis/0/06333++hettstedt.html | S06 | Pharmacy emergency service search |
| http://www.aeksa.de/ | S08 | Ärztekammer Sachsen-Anhalt |
| http://www.kvsa.de/ | S08 | KV Sachsen-Anhalt |
| http://www.pexels.com/ | S08 | Linked under "www.thomasreinhardt.de" — **link target does not match link text** |
