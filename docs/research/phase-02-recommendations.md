# Phase 02 Recommendations

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
Inputs: [benchmark-study.md](benchmark-study.md) (79 references, R01–R79), [transferable-patterns.md](transferable-patterns.md) (M01–M30), [signature-entry-research.md](signature-entry-research.md), [praxis-puls-benchmarks.md](praxis-puls-benchmarks.md), [mobile-benchmarks.md](mobile-benchmarks.md), [signature-experience-options.md](signature-experience-options.md), [do-not-copy.md](do-not-copy.md).

The locked strategy holds. No finding requires a change to strategy-lock.md. Two findings refine how locked elements are executed (Growing Mobile placement on mobile; PRAXIS PULS hybrid form).

---

## 1. Key findings

1. **The best healthcare sites win on task clarity, not on emotion.** Today's status with next opening (R04, R16), task verbs (R03, R05), emergency decision guidance (R22, R05) and age-stage entry (R08) set the utility bar. None of the inspected healthcare sites has a memorable signature — that space is open.
2. **The best award sites win on emotion, not on access.** Inspected SOTY winners deliver no text/navigation without the 3D layer (R30, R31, R36), break accessible names (R34) or lack navigation landmarks (R29, R34). Their mechanisms transfer; their architectures do not.
3. **Premium institutions put visit information first.** "Open today" is homepage content at Rijksmuseum and MoMA (R38, R40); every Tate exhibition carries its end date (R39). Precision is the premium signal that fits a practice.
4. **Currency fails even at the top.** RCH still shows a March maintenance banner and a COVID banner (R06); two German child-health digital projects are unavailable or defunct (R25, R26); 2 of the 3 SOTY 2024 winners no longer exist in their awarded form (R32, R33). Validity windows, auto-expiry and a durable architecture are a competitive advantage.
5. **The closest peer already does "Heute geöffnet" well** (R16). PRAXIS PULS must exceed it by fail-safe states, reasons, next transitions and replacement handling — not merely match it.

## 2. Answers to the four research questions (summary)

| Question | Answer |
|---|---|
| Q1 Utility + wow in first viewport | Two layers: server-rendered status sentence + actions, and the Growing Mobile as an enhanced stage — visible together, wow never gating utility |
| Q2 3D as functional interface | Few real choices, labelled in DOM, object reconfigures with the choice; no world navigation |
| Q3 No conventional header | Persistent utility layer (status, call, Notfall, route) + four paths always visible as text; mobile dock; overlay menu only as secondary |
| Q4 Complex info without overload | Smart default (today), intent selection (age range, task), state-driven primary action, staged disclosure |

Detail: benchmark-study.md §4.

## 3. Design direction validation (summary)
Warm Editorial + Cobalt can carry trust, warmth and premium quality on its own; child curiosity and innovation must come from the Growing Mobile and ENTDECKEN. Main risks: boutique/fashion feel, cold cobalt surfaces, cobalt colliding with status meanings, art-exhibition feel, tech-demo feel, and overcorrection into childish clichés. Detail: benchmark-study.md §5.

---

## TOP 10 MECHANISMS FOUND

| # | Mechanism | ID | Why |
|---|---|---|---|
| 1 | Status as a plain sentence | M01 | Answers the most urgent question in one line |
| 2 | Today-first hours with next transition | M02 | Turns "closed" into a plan |
| 3 | Fixed status vocabulary with a reason | M05 | Predictable, explainable states for PRAXIS PULS |
| 4 | Persistent compact status rail + bottom dock | M20 + M21 | Utility follows the user, in thumb reach |
| 5 | Emergency decision guidance | M04 | Situation → number, not a list of institutions |
| 6 | Dated, self-expiring notices | M06 | Structural fix for the industry's stale-content problem |
| 7 | Kinetic balance object as identity + navigation | M11 | The signature, with a real navigational job |
| 8 | Accessible 3D layer with DOM labels and poster | M24 | Makes the signature safe to ship |
| 9 | Age-stage entry + curated vaccination orientation | M07 + M09 | "Was ist für mein Kind wichtig?" without data entry |
| 10 | Visit walkthrough with open-ended play | M10 + M26 | Fear reduction; memorable for children |

## TOP 5 TO PROTOTYPE

| # | Prototype | Mechanisms | Question it must answer |
|---|---|---|---|
| 1 | **First viewport, Option A** (status headline + Growing Mobile beside it), desktop and 360 px mobile | M01, M02, M11, M15, M20, M21, M24 | Do parents read status + phone in < 5 s *and* react to the object? |
| 2 | **PRAXIS PULS state machine with all five states** incl. UNKNOWN, against mock data and a test matrix | M02, M05, M21 | Does every combination of data produce a correct state or the neutral fallback? |
| 3 | **Growing Mobile as navigation**: four DOM-labelled arms, tip-on-select, poster fallback, reduced motion | M11, M24, M29 | Can parents tell within 5 s that the arms are navigation (W1)? Performance on low-end Android (W3)? |
| 4 | **Mein Kind age instrument** (the first transformation) | M07, M12 | Is the transformation understandable and faster than a plain selector — or only prettier? |
| 5 | **Mein Arztbesuch, one step** (e.g. "Abhören") with play, sound off by default, accessibility options | M10, M23, M26 | Do children engage and can they retell the step; does it work as plain story without JS? |

## TOP 3 FOR THE FIRST FIVE SECONDS

1. **Status sentence as typographic hero (M01 + M02)** — "Heute geöffnet · bis 12:00" or the neutral fallback, in HTML, at editorial scale. This is what the parent must understand.
2. **One-tap call and Notfall in reach (M03 + M20)** — visible without scrolling, in the thumb zone on mobile. This is what the parent must be able to do.
3. **The Growing Mobile's first gentle movement (M11 + M15)** — one calm sway that settles, beside (not in front of) the status. This is what makes the visitor think "Das habe ich auf einer Arztseite noch nie gesehen."

## RECOMMENDED PRAXIS PULS FORM

**Hybrid.**
- **Desktop:** inline status headline on Heute (beside the object) + slim persistent utility line at the top (status chip · phone number · Notfall · Route).
- **Tablet:** landscape like desktop; portrait like mobile.
- **Mobile:** inline status sentence + actions in the first viewport + bottom dock with status chip · Anrufen · Notfall · Menü; chip expands to a sheet with reason and action.
- **Initially visible:** state word + one time + one primary action.
- **States:** OPEN (functional green dot + word), CLOSED (neutral dot + next opening), SPECIAL HOURS (attention marker + reason), VACATION (distinct icon + "Vertretung anzeigen"), UNKNOWN (no status colour at all — plain link "Aktuelle Sprechzeiten ansehen"). Colour never alone; green never brand; cobalt never a state.
- Acute sub-state hidden until FB-01…FB-03 are resolved.

Detail: [praxis-puls-benchmarks.md](praxis-puls-benchmarks.md).

## GROWING MOBILE: KEEP / MODIFY / RECONSIDER

**KEEP — with MODIFICATIONS.**
- Keep: single central signature object; balance as the growth metaphor; arms = four primary paths; transformation into instruments.
- Modify:
  1. Not centred on mobile; asymmetric beside the status headline on desktop.
  2. Labels are DOM text; poster fallback is a designed first-class state.
  3. Transformation limited to two instrument modes (age, time); age first.
  4. The environment carries information; the object changes configuration; the camera stays mostly still.
  5. Idle motion settles to rest; nothing that carries utility ever moves.
- Reconsider only if prototype 3 fails both the 5-second navigation test and the low-end performance test.

## TOP 5 DESIGN RISKS

1. **Object reads as decoration or art piece** rather than navigation (W1) → the prototype must prove function.
2. **Cobalt and status colours collide** — UNKNOWN misread as OK, or blue mistaken for "info" status → strict colour roles.
3. **Editorial elegance tips into boutique/fashion or cold** → warmth must dominate surfaces; plain German; real people later.
4. **Overcorrection into childish clichés** to satisfy child appeal (R15) → child warmth comes from the object and ENTDECKEN, not from clouds and cartoons.
5. **Metaphor overload** (mobile + instruments + time + age + explorer) → maximum two instrument modes; one form language.

## TOP 5 TECHNICAL RISKS

1. **Mobile GPU/battery cost on older Android** (multi-canvas award patterns, R29) → one canvas, render-on-demand, capped DPR, poster-first.
2. **PRAXIS PULS time logic** (holidays, DST, midnight, client/server clock skew) → server-side state, exhaustive test matrix, UNKNOWN on doubt.
3. **3D accessibility layer maintenance** — `@react-three/a11y` is active but small (17 open issues, R79) → keep the DOM layer independent of any single library.
4. **Layout shift and load order** when the object initialises → reserved space, poster in HTML, 3D loaded only after utility and only on capable devices.
5. **Two renderings of one state drifting** (inline vs. chip) → single state function and snapshot tests.

## TOP 5 IDEAS WE SHOULD EXPLICITLY REJECT

1. **Explorable 3D world as navigation** (M17; R30, R36) — empty DOM without WebGL; unusable under stress.
2. **Preloader-gated entry** (M18; R31) — utility must render before any 3D asset.
3. **Split-letter kinetic typography** (M19; R34) — breaks accessible names and German screen-reader output.
4. **AI assistant for appointments and patient questions** (M28; R16) — conflicts with locked anti-patterns and privacy principle.
5. **Real-time "how busy are we" indicator** (R06) — no verified data source; simulated live data would violate the truth principle.
