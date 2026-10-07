# Success Criteria

Phase: 01 — Product Strategy
Date: 2026-10-07

Criteria are acceptance targets for later phases. Numerical targets are proposals for this project and must be validated in the technical phase; they are not claims about the current site. No baseline exists for business metrics (calls, visits), so those are assessed qualitatively.

---

## 1. Utility (hard gates for launch)

| ID | Criterion | Target / test |
|---|---|---|
| U1 | Phone reachable from every page | One tap/click, visible without scrolling on mobile (360 × 640 viewport) |
| U2 | Today's status/hours | Visible on the start page without scrolling on mobile; no interaction needed |
| U3 | Emergency access | "Notfall" reachable in one tap from every page; 112 shown first |
| U4 | Route | Address and route link reachable in ≤ 2 taps from every page |
| U5 | Works without JavaScript | Phone, hours, status (or fallback), emergency, route, contact fully usable with JS disabled |
| U6 | Works without enhancement | Same with reduced motion, no WebGL, keyboard only, screen reader |
| U7 | Task test | In moderated tests with parents (incl. one-handed use), ≥ 9 of 10 find phone, today's hours and emergency info in < 10 s each |

## 2. Truth & safety (hard gates)

| ID | Criterion | Target / test |
|---|---|---|
| T1 | No outdated content | Zero `OUTDATED_DO_NOT_PUBLISH` items in content, metadata, structured data or seed data |
| T2 | Traceability | Every operational claim maps to a fact ID with `VERIFIED_CURRENT` and a confirmation record |
| T3 | PRAXIS PULS fail-safe | Automated test matrix: missing, conflicting, expired, unconfirmed, holiday, closure, DST change, midnight boundary, server/client clock skew → always correct state or neutral fallback, never a wrong specific claim |
| T4 | Auto-expiry | Closures and notices disappear after their end date without editor action |
| T5 | Launch blockers | All LB-00…LB-12 resolved and recorded |
| T6 | Medical content | Every medical text has source, "Stand" date and physician approval recorded |

## 3. Accessibility & performance (hard gates)

| ID | Criterion | Target |
|---|---|---|
| A1 | WCAG | 2.2 AA conformance for all pages incl. ENTDECKEN (equivalent accessible alternative where an interaction cannot be made accessible) |
| A2 | Motion | `prefers-reduced-motion` fully respected; no autoplay motion > 5 s without pause control |
| A3 | Language | `lang="de"`; all accessible names German |
| A4 | Performance (proposal) | Critical utility content rendered within ~1.5 s on a mid-range Android over slow 4G; LCP < 2.5 s; CLS < 0.1; INP < 200 ms |
| A5 | Weight (proposal) | Critical path (HTML + CSS + fonts) ≤ ~150 KB compressed; 3D/interactive assets loaded only on demand and never blocking utility |

## 4. Privacy & legal (hard gates)

| ID | Criterion |
|---|---|
| L1 | No third-party requests on page load by default (fonts self-hosted; maps and any media click-to-load or plain links) |
| L2 | Minimal consent friction: architecture avoids tracking, advertising technology and non-essential cookies where practical. Whether a consent banner is legally required is decided only after the final technical implementation and the legal/privacy review — not assumed in advance. |
| L3 | No input field collects health data |
| L4 | Impressum and Datenschutz complete and legally reviewed |

## 5. Operability for the practice

| ID | Criterion | Target |
|---|---|---|
| O1 | Enter a closure with replacements | ≤ 3 minutes for trained staff, German UI, no technical knowledge |
| O2 | Add/remove a notice with validity | ≤ 1 minute |
| O3 | Safe defaults | A notice without end date or an emergency entry past its re-verification date triggers a visible warning to editors |
| O4 | Preview | Editors can see how PRAXIS PULS will look on a given date before publishing |

## 6. Memorability & differentiation (qualitative)

| ID | Criterion | Method |
|---|---|---|
| M1 | Parents describe the site in their own words as "clear" / "quick" before "pretty" | Interviews after usability test |
| M2 | Children (with parent) can retell at least three steps of a visit after using Mein Arztbesuch | Small moderated sessions, with parental consent |
| M3 | The Growing Mobile is remembered and recognised without being necessary for any task | Recall question in tests |
| M4 | Practice staff report fewer routine calls about hours/closures | Staff interview ~3 months after launch (qualitative, no baseline) |

## 7. Quality bar for "€5,000–€10,000+ craft"

- Consistent, bespoke visual and motion language — no template feel (judged against [anti-patterns.md](anti-patterns.md)).
- Every screen has a reason; no filler sections.
- Editorial copy written for this practice, in clear German, reviewed by the practice.
- Documented design system, content model and editorial guide handed over to the practice.
