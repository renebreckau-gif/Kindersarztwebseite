# Value Proposition

Phase: 01 — Product Strategy
Date: 2026-10-07

---

## 1. Value model: three questions + one invitation

| # | Question (German UI working title) | Layer | Value delivered | Primary user |
|---|---|---|---|---|
| 1 | **Was brauche ich jetzt?** | JETZT + PRAXIS PULS | Certainty and speed in operational moments | Parent |
| 2 | **Was ist für mein Kind wichtig?** | MEIN KIND | Orientation by age: checks, vaccinations, development | Parent |
| 3 | **Wer ist diese Praxis?** | PRAXIS | Trust through real people and transparency | Parent |
| + | **Komm, wir entdecken!** | ENTDECKEN | Less fear, more understanding; memorability | Child (with parent) |

Questions 1–3 deliver the **utility value**. The invitation delivers **differentiation and memorability**. The order is also the priority order.

## 2. Parent situations → value

| Situation | What the parent needs | What the product does | Dependent facts / blockers |
|---|---|---|---|
| Child is ill, morning | Can I come now? Acute or appointment? | PRAXIS PULS shows the verified current state or a safe fallback + one-tap call | F35–F46; FB-01…FB-07 |
| Needs today's hours | Today's hours, not a weekly table first | "Heute" view first, week second | F35–F39, F40, F49 |
| Needs acute consultation info | When are acute patients seen? | Acute windows integrated in the hours, not hidden in prose | F44–F46 (TO_BE_CONFIRMED) |
| Needs the phone | The number, tappable | Persistent call action on every page | F15 |
| Needs directions | Address, route | Address + route link (no tracking map embed by default) | F13 (LB-03) |
| Emergency | Who to call/where to go now | Persistent "Notfall" access, 112 first, verified directory | F56–F64 (LB-10) |
| Practice on holiday | Who replaces? | Closure + replacement practices with tappable phone numbers | F53, F54 (FB-10) |
| Next preventive check | Which U/J is next, what happens | U/J orientation by age range 0–2 / 3–6 / 7–12 / 13–17 (no birthdate input) | F67; G-BA as source |
| Vaccinations | What is relevant at this age and why | Curated German explanation per age range (what it protects against, why now) + official STIKO/RKI source + "Stand" date; no individual status, no recommendation engine | F68; STIKO/RKI as source |
| Age-relevant guidance | What matters at this age | Curated, sourced topics per age range (Phase 2 beyond U/J) | source-policy §4 |
| Get to know doctors/team | Who will treat my child | Real names, verified qualifications, real photos when available | F20–F34 (LB-08, LB-09) |
| First visit | What to bring, what happens | "Erster Besuch" page | F77–F79 (FB-14, FB-15) |

## 3. Child value

| Child need | Experience | V1? |
|---|---|---|
| Know what happens at the doctor's | **Mein Arztbesuch** — step by step through a visit at this practice | Yes (SIGNATURE) |
| Understand why the doctor examines | **Warum macht die Ärztin das?** — stethoscope, otoscope, scale, measuring | Folded into Mein Arztbesuch in V1 |
| Explore the body | **Reise in deinen Körper** | Phase 2 (architecture prepared in V1) |
| Understand growth | **Wachstum** (playful, non-personal — no measuring of the real child) | Phase 2 (architecture prepared in V1) |
| Explore nutrition | **Ernährung** | Phase 2 (architecture prepared in V1) |

Mein Arztbesuch is chapter 1 of the ENTDECKEN world, not an isolated feature; the Growing Mobile foreshadows the larger world.

Child value is also parent value: a child who knows what to expect is easier to bring to the practice.

## 4. Practice value

- Fewer repetitive phone calls about hours, closures and replacements (not quantified — no baseline exists; to be assessed qualitatively with staff).
- Closures and notices maintained in minutes and expiring automatically — no more stale "Urlaub" notices (cf. F50–F52, F55).
- Professional, legally sound presence (Impressum, Datenschutz) — closes current gaps (F08–F10).
- A distinct identity in the region that families remember and recommend.

## 5. Value statement (internal)

> For families in and around Hettstedt, the website of Kinderarztpraxis Probst & Böhme is the fastest reliable answer to "Can we come, when, and who do we call?" — and the place where children learn that a visit to the doctor is something they can understand. Unlike typical practice websites, it never shows outdated information, it is honest about what it does not know, and it treats both parents and children with care.

The value statement is internal positioning, not public copy.

## 6. What we deliberately do not offer

No online diagnosis, no symptom checker, no AI medical chat, no accounts, no health-data upload, no testimonials. See [anti-patterns.md](anti-patterns.md). Saying no to these is part of the value: it keeps the product safe, private and trustworthy.
