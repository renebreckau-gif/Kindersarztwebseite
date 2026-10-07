# Privacy Model

Phase: 04
Date: 2026-10-07
Status: architecture intent. **This document does not claim GDPR or legal compliance.** Items marked ⚖ require professional legal/privacy review before launch (LB-07).

---

## 1. What the public website processes

| Data | Purpose | Where | Notes |
|---|---|---|---|
| Server/access logs (IP address, user agent, URL, time) | Operation, security | Hosting provider | Retention period to define ⚖ |
| No cookies required for core functionality (target) | — | — | Whether any consent mechanism is needed is decided after the final implementation ⚖ |
| UI preferences (reduced motion, sound off in ENTDECKEN, selected age range) | Usability | Browser memory / URL only; no persistent storage by default | Not personal health data; no tracking |
| Self-hosted fonts and assets | Rendering | Own server | No third-party requests on load |
| Map/route | Directions | Link to the visitor's map app (no embedded map in V1) | Embedded maps only click-to-load, if ever ⚖ |
| `tel:` / `mailto:` links | Contact | Visitor's device | Email use for patient matters needs a policy (F18, LB-11) ⚖ |

## 2. What the public website must not process (V1)

Patient accounts · health records · medical uploads · prescription requests · appointment data · symptom input or history · stored birthdates · child profiles · contact forms carrying health information · analytics profiles · advertising identifiers · third-party chat widgets · AI chat.

None of these exist in the content model ([content-model.md](content-model.md) §21).

## 3. Mein Kind age selection

- Default: age **ranges** (0–2, 3–6, 7–12, 13–17) as navigation (URL path) — not personal data.
- Future precise-age selector (P15): computes locally in the browser, no transmission, no persistent storage by default; if a "remember" option is ever offered it must be opt-in, local-only and clearly explained ⚖.
- The official BIÖG date calculator may be linked instead of building one.

## 4. CMS / editorial data (internal)

| Data | Sensitivity | Rule |
|---|---|---|
| Editor accounts (name, email, role) | Personal data of staff | CMS only; access-controlled ⚖ |
| `verifiedBy`, internal notes, confirmation channel | Internal | Never exposed via public API; requires a private data store (decisive in CMS choice) |
| Staff names/photos + consent records | Personal data, consent-based | Consent stored with asset/person; withdrawal removes publication ⚖ |
| Replacement practices' contact persons | Third-party professional data | Only what the practices publish themselves / agree to ⚖ |
| Audit trail | Internal | Retention period to define ⚖ |

## 5. Potentially sensitive areas

1. **Email to the practice** — parents may send health data by unencrypted email (current site encourages it during closures). Needs a practice policy and a visible note (LB-11) ⚖.
2. **ENTDECKEN** — child users: no data collection, no external links, no tracking; sound only on request.
3. **Staff photos** — consent, withdrawal, rights expiry (media-policy).
4. **Hosting / CMS vendor** — DPA, location of data, sub-processors ⚖.
5. **Logs** — IP retention ⚖.
6. **Future features** (booking, forms, video consultation) — each requires a separate privacy assessment before design.

## 6. Engineering rules

- No third-party scripts on public pages without a documented decision.
- No `localStorage`/cookies for anything personal; UI preferences in memory or URL.
- Public API/queries never return internal verification fields.
- Error monitoring (if added) must not capture personal data or full URLs with query strings containing user input.
- Privacy policy text is generated from an inventory of actually used processing, not from a template ⚖.
