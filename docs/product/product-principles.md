# Product Principles

Phase: 01 — Product Strategy
Date: 2026-10-07

These principles decide trade-offs in all later phases. When two principles conflict, the one listed first wins.

---

## P1 — Safety before cleverness

A wrong operational statement is worse than no statement. PRAXIS PULS and every operational display fail safe: if the underlying facts are not `VERIFIED_CURRENT`, the interface shows a neutral fallback ("Aktuelle Sprechzeiten ansehen", "Praxis kontaktieren", "Aktuelle Information prüfen"). 112 is always reachable and never depends on dynamic data.

## P2 — Truth is data, not copy

Operational information (hours, consultation types, closures, replacements, notices, emergency directory, contact) exists once, as structured data with validity windows and verification dates. Pages render it; nobody retypes it. Expired data disappears on its own.

## P3 — Utility first, wonder second

The first screen on any device answers "Was brauche ich jetzt?" before anything else. Wonder (the Growing Mobile, ENTDECKEN) is layered on top and can be ignored completely without losing anything critical.

**Utility first — not utility only.** The site must create an immediate emotional and visual reaction: distinctive art direction, international-level craft, high-end motion, spatial/3D interaction where it carries meaning. Safety constrains *where* wonder may sit, never *whether* it exists. A visually conservative result is a failure of this principle.

## P4 — Critical utility is indestructible

Phone, opening hours, practice status, emergency, route and contact:
- are server-rendered HTML that works without JavaScript,
- never depend on 3D, WebGL, animation, scroll position or precise pointing,
- are reachable in one tap/click from every page,
- remain readable at 200 % zoom and in Windows high-contrast / forced-colours mode.

## P5 — Designed for one hand and a bad day

Large touch targets in the thumb zone, short sentences, plain German, no jargon without explanation, no small-print rules. Assume an older mid-range phone, a weak mobile connection and a parent holding a crying child.

## P6 — Progressive enhancement, not graceful degradation

Build the plain, fast, accessible version first; add motion, 3D and play on capable devices and only when the user has not requested reduced motion. The enhanced version may add delight; it may never add information that the plain version lacks.

## P7 — One practice, not a template

Everything is specific to Kinderarztpraxis Probst & Böhme in Hettstedt: their people, their hours, their rooms, their region's emergency structure. No generic stock content, no "Ihre Gesundheit liegt uns am Herzen" filler.

## P8 — Earned trust

Trust comes from real people, verified qualifications, current information, visible sources and honest gaps — not from marketing language, testimonials or stock photography. See [trust-model.md](trust-model.md).

## P9 — Privacy by design

No accounts, no health-data input, no tracking without necessity, no advertising technology, no third-party embeds that leak visitor data by default, self-hosted fonts, privacy-conscious maps. Personalisation (e.g. "Mein Kind" by age range) happens through choices the user makes on the page, not through stored personal data. Goal: minimise tracking, third-party dependencies and consent friction. Whether a consent banner is needed is decided by the final privacy review, not assumed.

## P10 — Medical content is sourced and approved

General medical information comes only from authorities named in source-policy §4 (RKI, STIKO, G-BA, gesund.bund, BIÖG, 116117/KV …), carries a "Stand" date and source, and is approved by a physician of the practice. The website informs and orients; it never diagnoses or advises individually.

## P11 — Children are respected, not entertained at

Child experiences reduce fear and build understanding. They are honest (no "it won't hurt at all" if it might), inclusive, calm, and never manipulative (no points-chasing, no streaks, no ads, no dark patterns). No cartoon caricatures of children.

## P12 — Low-maintenance for the practice

Every feature that needs ongoing editorial effort must justify it. The practice edits only what changes (closures, notices, team); everything else is stable. Staff-facing labels are German and self-explanatory. Missing updates degrade to safe fallbacks, not to wrong information.

## P13 — Ruthless scope

V1 does fewer things, perfectly. Unverified facts never go public as placeholders — but they never stop design or development either: features are built with fallbacks, marked mock data and disabled states, and individual claims switch on as facts are confirmed. See [feature-priorities.md](feature-priorities.md).

## P14 — German everywhere the public or the practice sees

Navigation, headlines, buttons, labels, status messages, help texts, errors, accessible names, child experiences and CMS labels are German. Code and internal docs may be English.
