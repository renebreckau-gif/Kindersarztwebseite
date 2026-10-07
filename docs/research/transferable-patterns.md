# Transferable Patterns

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
References (R01–R79): [benchmark-study.md](benchmark-study.md). Learn / not-copy per reference: [do-not-copy.md](do-not-copy.md).

Each mechanism uses the fixed translation format. Ratings are relative judgements for this project; complexity and risk are pre-prototype estimates. German strings are working examples only — final copy is defined later, and every operational string obeys the fail-safe rule ([source-policy.md](source-policy.md) §5).

Index:

| ID | Mechanism | Recommendation |
|---|---|---|
| M01 | Status as a plain sentence | USE |
| M02 | Today-first hours with the next transition | USE |
| M03 | Task-first quick actions | USE |
| M04 | Emergency decision guidance | USE |
| M05 | Fixed status vocabulary with a reason | USE |
| M06 | Dated, self-expiring notices | USE |
| M07 | Age-stage entry | USE |
| M08 | Local-only date calculator | PHASE 2 |
| M09 | Curated vaccination orientation | USE |
| M10 | Visit walkthrough / practice tour | USE |
| M11 | Kinetic balance object as identity and navigation | PROTOTYPE |
| M12 | Object transforms by user choice (instrument modes) | PROTOTYPE |
| M13 | Object mirrors live state, redundantly | PROTOTYPE |
| M14 | Short spatial transition between paths | PROTOTYPE |
| M15 | Pointer/touch-responsive perspective | USE |
| M16 | Scroll-linked reconfiguration | PHASE 2 |
| M17 | Explorable 3D world as primary navigation | REJECT |
| M18 | Preloader-gated entry | REJECT |
| M19 | Split-letter kinetic typography | REJECT |
| M20 | Bottom action dock (mobile) | USE |
| M21 | Persistent compact status rail | USE |
| M22 | Staged disclosure and intent selection | USE |
| M23 | In-experience accessibility and sound controls | USE |
| M24 | Accessible 3D layer with DOM labels and poster fallback | USE |
| M25 | Editorial restraint with dated precision | USE |
| M26 | Open-ended play without scoring | USE |
| M27 | Interactive 3D anatomy | PHASE 2 |
| M28 | AI assistant for appointments and questions | REJECT |
| M29 | Orbital arrangement of paths around the object | PROTOTYPE |
| M30 | Exploded view / assembly | PHASE 2 (ENTDECKEN) · REJECT as entry |

---

## M01 — Status as a plain sentence

**MECHANISM:** The current operating state is written as one human sentence including the time span, not as a badge or a table.
**REFERENCE:** R40 MoMA ("The museum is open 10:30 a.m.–5:30 p.m. today."), R38 Rijksmuseum ("OPEN TODAY · Open daily 9 to 17h"), R16 kinderarzt.at ("Heute geöffnet 08:00–13:00, 13:30–19:00"), R64 Flighty ("Your flight today is on time.")
**WHAT HAPPENS:** The homepage states today's state and hours in the first content block.
**WHY IT WORKS:** Answers the question users actually have ("can I go now?") without table parsing; readable by screen readers as one unit.
**USER NEED SERVED:** Parent needs to know instantly whether and until when the practice is open.
**EMOTIONAL EFFECT:** Calm certainty; the institution feels attentive.
**PEDIATRIC TRANSLATION:** PRAXIS PULS headline sentence, e.g. "Heute geöffnet · bis 12:00" — only when the facts are `VERIFIED_CURRENT`; otherwise "Aktuelle Sprechzeiten ansehen".
**HOW IT COULD APPLY TO:**
- HEUTE: primary content of the first viewport.
- MEIN KIND: —
- PRAXIS: repeated on Kontakt/Sprechzeiten.
- ENTDECKEN: compact version in the persistent rail.
- GROWING MOBILE: the sentence sits beside the object, never inside it.
- PRAXIS PULS: core output format.
**TECHNICAL COMPLEXITY:** LOW (the logic behind it is MEDIUM; see M05)
**LIKELY TECHNOLOGY:** OTHER (server-rendered HTML + structured data)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M02 — Today-first hours with the next transition

**MECHANISM:** Default to today; always state the next change ("öffnet morgen um 08:00"); the full week is secondary.
**REFERENCE:** R04 Cincinnati Children's ("Urgent Care Closed · Open 10/07/2026 at 9:00 AM"), R16, R40
**WHAT HAPPENS:** When closed, the next opening is shown instead of a dead end.
**WHY IT WORKS:** A closed state without a next step leaves the user stuck; a next transition turns it into a plan.
**USER NEED SERVED:** "When can I call / come?"
**EMOTIONAL EFFECT:** Reassurance even when closed.
**PEDIATRIC TRANSLATION:** "Heute geschlossen · öffnet morgen um 08:00" plus out-of-hours guidance (M04). Acute-specific transitions ("Akutsprechstunde ab 10:00") stay disabled until FB-01…FB-03 resolve.
**HOW IT COULD APPLY TO:**
- HEUTE: default view = today; week in disclosure (M22).
- MEIN KIND: —
- PRAXIS: Sprechzeiten page leads with today.
- ENTDECKEN: —
- GROWING MOBILE: —
- PRAXIS PULS: second line of every state.
**TECHNICAL COMPLEXITY:** MEDIUM (holidays, closures, DST, midnight)
**LIKELY TECHNOLOGY:** OTHER (server-side time logic, Europe/Berlin)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M03 — Task-first quick actions

**MECHANISM:** A short list of verbs for the most frequent tasks, visible without opening a menu.
**REFERENCE:** R03 Boston ("I Want To… Make an Appointment, Find a Location"), R05 Seattle ("I want to… Visit ED or Urgent Care, Get Driving Directions"), R68 Apple ("Find a store", "Or call")
**WHAT HAPPENS:** Users choose a task instead of navigating an org chart.
**WHY IT WORKS:** Matches intent vocabulary; reduces menu depth.
**USER NEED SERVED:** Phone, route, emergency, hours — in one tap.
**EMOTIONAL EFFECT:** Competence, speed.
**PEDIATRIC TRANSLATION:** Four fixed actions: Anrufen · Route · Sprechzeiten · Notfall. Hospitals list 10–15; a practice needs four.
**HOW IT COULD APPLY TO:**
- HEUTE: action row under the status sentence.
- MEIN KIND: —
- PRAXIS: same actions on Kontakt.
- ENTDECKEN: available via dock.
- GROWING MOBILE: never replaced by the object.
- PRAXIS PULS: state decides which action is primary (e.g. vacation → "Vertretung anzeigen").
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M04 — Emergency decision guidance

**MECHANISM:** Instead of a list of numbers, a decision: which number for which situation.
**REFERENCE:** R22 116117.de ("Wen anrufen: 116117 oder 112?", "Rufnummer für Notfälle: 112"), R05 Seattle ("If your child's illness or injury is life-threatening, call 911.")
**WHAT HAPPENS:** Severity is mapped to action in one short block.
**WHY IT WORKS:** Stressed users decide by situation, not by institution name.
**USER NEED SERVED:** Out-of-hours or emergency orientation.
**EMOTIONAL EFFECT:** Control in a frightening moment.
**PEDIATRIC TRANSLATION:** Notfall block: 112 first ("lebensbedrohlich"), then 116117 (if confirmed, F57), Giftnotruf and facilities only when verified (LB-10). Wording approved by the physicians.
**HOW IT COULD APPLY TO:**
- HEUTE: shown automatically when closed.
- MEIN KIND: —
- PRAXIS: —
- ENTDECKEN: Notfall reachable from the child area via the dock.
- GROWING MOBILE: never styled into the object.
- PRAXIS PULS: closed state links here.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M05 — Fixed status vocabulary with a reason

**MECHANISM:** A small closed set of states, each with a fixed word, plus the reason when the state deviates from normal.
**REFERENCE:** R67 GitHub Status ("Operational", "Degraded performance", "Partial outage", summary "No incidents reported today"), R64 Flighty ("See why you're delayed", "Changed to … Gate 7")
**WHAT HAPPENS:** Users learn the vocabulary once and can trust it.
**WHY IT WORKS:** Predictability; a reason ("Praxisurlaub", "Fortbildung") prevents follow-up calls.
**USER NEED SERVED:** Understand unusual situations without calling.
**EMOTIONAL EFFECT:** Transparency, trust.
**PEDIATRIC TRANSLATION:** States GEÖFFNET · GESCHLOSSEN · GEÄNDERTE SPRECHZEIT · PRAXISURLAUB · UNBEKANNT (neutral fallback); reason shown for deviations ("Praxisurlaub bis 24.07. · Vertretung anzeigen").
**HOW IT COULD APPLY TO:**
- HEUTE: the state model behind M01/M02.
- MEIN KIND: —
- PRAXIS: Sprechzeiten exceptions list.
- ENTDECKEN: —
- GROWING MOBILE: optional ambient echo (M13).
- PRAXIS PULS: the state machine itself.
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** OTHER (state machine + test matrix)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M06 — Dated, self-expiring notices

**MECHANISM:** Every notice has a visible date or validity and disappears when it ends.
**REFERENCE:** R39 Tate ("Until 3 Jan 2027" on every item), R16 (dated news "11.09.2026 Technische Störung"), R01 GOSH (dismissible current alert). Negative: R06 RCH still shows a March maintenance banner and a COVID banner.
**WHAT HAPPENS:** Currency is visible; stale items do not accumulate.
**WHY IT WORKS:** Even top institutions fail at manual removal (R06) — expiry must be structural.
**USER NEED SERVED:** Trust that what is shown is current.
**EMOTIONAL EFFECT:** Reliability.
**PEDIATRIC TRANSLATION:** Notices require "gültig bis" or explicit "unbefristet"; expired items vanish (C06). Directly addresses F50/F51/F55.
**HOW IT COULD APPLY TO:**
- HEUTE: active notices under the status.
- MEIN KIND: "Stand" dates on medical content.
- PRAXIS: team/training entries with periods (F24/F25 pattern).
- ENTDECKEN: —
- GROWING MOBILE: —
- PRAXIS PULS: notices feed state reasons.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** OTHER (CMS validity fields)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M07 — Age-stage entry

**MECHANISM:** Content is entered by the child's age band, not by topic taxonomy.
**REFERENCE:** R08 AboutKidsHealth ("Explore by ages and stages"), R60 Sesame ("Ages 3–6"), R51 Exploratorium ("ages 4–8 and their grown-ups"), R09 NHS (age-indexed schedule)
**WHAT HAPPENS:** Parent selects an age; relevant content follows.
**WHY IT WORKS:** Parents think in "my child is 4", not in "Früherkennung".
**USER NEED SERVED:** What is relevant for my child now?
**EMOTIONAL EFFECT:** Personal relevance without data entry.
**PEDIATRIC TRANSLATION:** Locked ranges 0–2 · 3–6 · 7–12 · 13–17 (strategy-lock 2.4); nothing stored.
**HOW IT COULD APPLY TO:**
- HEUTE: —
- MEIN KIND: primary entry.
- PRAXIS: Erster Besuch may reference age (e.g. newborn).
- ENTDECKEN: chapters may be age-tagged for parents.
- GROWING MOBILE: age instrument mode (M12).
- PRAXIS PULS: —
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M08 — Local-only date calculator

**MECHANISM:** A calculator computes personal dates from a birthdate entirely on the page and says so explicitly.
**REFERENCE:** R19/R20 kindergesundheit-info.de U-Termin-Rechner ("Ihre Daten werden nicht gespeichert, sondern nur zur Terminberechnung auf dieser Seite verwendet.")
**WHAT HAPPENS:** Parent enters birthdate → U/J windows; printable.
**WHY IT WORKS:** High utility; privacy promise is explicit.
**USER NEED SERVED:** When is the next U-examination exactly?
**EMOTIONAL EFFECT:** Feeling organised.
**PEDIATRIC TRANSLATION:** Matches P15 (local-only precise age selector). The official BIÖG calculator already exists — linking to it may deliver the value without building it.
**HOW IT COULD APPLY TO:**
- HEUTE: —
- MEIN KIND: optional precise mode inside an age range.
- PRAXIS: —
- ENTDECKEN: —
- GROWING MOBILE: could set the age instrument precisely.
- PRAXIS PULS: —
**TECHNICAL COMPLEXITY:** MEDIUM (G-BA windows must be sourced and governed)
**LIKELY TECHNOLOGY:** OTHER (client-side JS, no storage)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** MEDIUM (date input) · **PERFORMANCE RISK:** LOW
**VALUE:** MEDIUM · **MEMORABILITY:** LOW
**RECOMMENDATION:** PHASE 2 (V1: link to the official calculator)

## M09 — Curated vaccination orientation

**MECHANISM:** Age-indexed explanation + official current calendar + catch-up advice, each with source and date.
**REFERENCE:** R09 NHS (age table + "if … missed a vaccine, contact your GP to catch up"), R24 RKI "Impfkalender 2026", R16 "Impfaufklärungsvideos"
**WHAT HAPPENS:** Parents see what is typically relevant at which age and where the binding version lives.
**WHY IT WORKS:** Orientation + authority; catch-up sentence prevents guilt and dead ends.
**USER NEED SERVED:** Current vaccination information for my child's age.
**EMOTIONAL EFFECT:** Understanding instead of anxiety.
**PEDIATRIC TRANSLATION:** Strategy-lock 2.3: what it protects against, why at this age, link to STIKO/RKI, "Stand"; "Fragen Sie uns beim nächsten Termin" instead of individual status.
**HOW IT COULD APPLY TO:**
- HEUTE: —
- MEIN KIND: per age range.
- PRAXIS: Leistungen links into it.
- ENTDECKEN: Mein Arztbesuch may explain "der kleine Pieks" honestly.
- GROWING MOBILE: —
- PRAXIS PULS: —
**TECHNICAL COMPLEXITY:** MEDIUM (governance, not code)
**LIKELY TECHNOLOGY:** OTHER (CMS with source/verification fields)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M10 — Visit walkthrough / practice tour

**MECHANISM:** Step-by-step preview of a real visit (rooms, people, sequence).
**REFERENCE:** R16 kinderarzt.at "Rundgang", R01/R02 GOSH "Your hospital visit", R60 Sesame "Doctor Appointments", R04 "Prepare for Your Visit"
**WHAT HAPPENS:** Families rehearse the visit before it happens.
**WHY IT WORKS:** Predictability reduces fear in children and stress in parents.
**USER NEED SERVED:** First visit; child anxiety.
**EMOTIONAL EFFECT:** Familiarity, courage.
**PEDIATRIC TRANSLATION:** Mein Arztbesuch (S04) as chapter 1 of ENTDECKEN; real rooms only once photographed; honest wording.
**HOW IT COULD APPLY TO:**
- HEUTE: —
- MEIN KIND: link from 0–2/3–6 ranges.
- PRAXIS: Erster Besuch links to the child version.
- ENTDECKEN: chapter 1.
- GROWING MOBILE: explorer mode entry.
- PRAXIS PULS: —
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** CSS, GSAP, SVG/illustration; optional CANVAS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW (story-first) · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** HIGH
**RECOMMENDATION:** USE

## M11 — Kinetic balance object as identity and navigation

**MECHANISM:** A hanging, balanced object whose arms carry the main destinations; it moves gently, responds to input, and re-balances when a destination is chosen.
**REFERENCE:** R41 Calder Foundation (kinetic mobiles — art reference for balance and air movement); single hero object organising a site: R29, R31, R37
**WHAT HAPPENS:** (Target behaviour) The visitor sees one sculptural object; four arms carry Heute · Mein Kind · Praxis · Entdecken; choosing one tips the balance toward it.
**WHY IT WORKS:** One memorable object is the strongest award pattern; balance/weight is a natural metaphor for growth and care ("Gesund groß werden").
**USER NEED SERVED:** Orientation to four paths + emotional first impression.
**EMOTIONAL EFFECT:** Wonder, lightness, childhood (a mobile above a crib) — without cartoon imagery.
**PEDIATRIC TRANSLATION:** The Growing Mobile. Labels are real DOM text; arms are large tap targets; an HTML list of the same four links always exists.
**HOW IT COULD APPLY TO:**
- HEUTE: arm leads to the Heute view; never covers the status.
- MEIN KIND: arm → age instrument (M12).
- PRAXIS: arm → time/status instrument.
- ENTDECKEN: arm → explorer.
- GROWING MOBILE: this is the concept.
- PRAXIS PULS: may echo state ambiently (M13).
**TECHNICAL COMPLEXITY:** HIGH
**LIKELY TECHNOLOGY:** THREE.JS / REACT THREE FIBER (physics-light spring simulation), SVG/CSS fallback
**MOBILE RISK:** MEDIUM · **ACCESSIBILITY RISK:** MEDIUM (mitigated by M24) · **PERFORMANCE RISK:** MEDIUM
**VALUE:** HIGH · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PROTOTYPE

## M12 — Object transforms by user choice (instrument modes)

**MECHANISM:** The same object reconfigures into a purpose-specific instrument based on the user's selection (configurator logic).
**REFERENCE:** R44 Porsche (model choice by plain facts; the configurator itself was not inspected this session), R37 Apple (object reconfigures with progress). The instrument metaphor is derived from the practice's own tools (scale, measuring rod, clock), not from a web reference.
**WHAT HAPPENS:** Choosing "Mein Kind" turns the mobile into a measuring/age instrument (four age ranges as stops); "Praxis" into a time instrument.
**WHY IT WORKS:** Transformation makes the choice visible and memorable; one object, many functions.
**USER NEED SERVED:** Selecting an age range / understanding time at a glance.
**EMOTIONAL EFFECT:** Delight, coherence.
**PEDIATRIC TRANSLATION:** Age instrument = 0–2 · 3–6 · 7–12 · 13–17 as real buttons; the instrument is the visual echo of a standard control (radio group), not a replacement.
**HOW IT COULD APPLY TO:**
- HEUTE: — (no transformation needed for utility)
- MEIN KIND: age instrument.
- PRAXIS: time instrument showing today's slots — only verified data.
- ENTDECKEN: explorer mode.
- GROWING MOBILE: core transformation logic.
- PRAXIS PULS: time instrument may visualise the PULS state.
**TECHNICAL COMPLEXITY:** VERY HIGH
**LIKELY TECHNOLOGY:** REACT THREE FIBER, GSAP; SVG fallback
**MOBILE RISK:** HIGH · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** HIGH
**VALUE:** MEDIUM · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PROTOTYPE (start with Mein Kind only)

## M13 — Object mirrors live state, redundantly

**MECHANISM:** A material/pose change of the object echoes the operational state (e.g. calm and settled when open; still when closed).
**REFERENCE:** Status-driven UI R64, R67; state-dependent visuals in hero objects (R29 — not visually re-observed)
**WHAT HAPPENS:** The entry object "breathes" the practice state.
**WHY IT WORKS:** Turns PRAXIS PULS into an ambient brand moment.
**USER NEED SERVED:** None on its own — only reinforcement.
**EMOTIONAL EFFECT:** "The website is alive."
**PEDIATRIC TRANSLATION:** Permitted only as a redundant echo of the text state; never the sole carrier; UNBEKANNT → neutral pose (no implied state); never green-as-brand.
**HOW IT COULD APPLY TO:**
- HEUTE: echo of the status sentence.
- MEIN KIND: —
- PRAXIS: —
- ENTDECKEN: —
- GROWING MOBILE: state layer.
- PRAXIS PULS: ambient channel.
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** THREE.JS shader/material parameters; CSS for fallback
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** MEDIUM (could imply meaning by colour/motion alone) · **PERFORMANCE RISK:** LOW
**VALUE:** LOW · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** PROTOTYPE (drop if it creates ambiguity)

## M14 — Short spatial transition between paths

**MECHANISM:** Moving from the entry to a path is a brief camera/space transition rather than a page cut.
**REFERENCE:** R30 Messenger, R31 Igloo, R35 Persepolis (behaviour per award listing — not visually re-observed)
**WHAT HAPPENS:** The object turns toward the chosen arm; the page content arrives.
**WHY IT WORKS:** Spatial continuity explains where you are.
**USER NEED SERVED:** Orientation.
**EMOTIONAL EFFECT:** Polish, flow.
**PEDIATRIC TRANSLATION:** ≤ ~600 ms, interruptible, skipped under reduced motion; content is real HTML and loads independently; no camera flights through worlds.
**HOW IT COULD APPLY TO:**
- HEUTE: no transition delays Heute content.
- MEIN KIND: entry into age instrument.
- PRAXIS: entry into time instrument.
- ENTDECKEN: entry into explorer.
- GROWING MOBILE: transitions belong to the object.
- PRAXIS PULS: never animated away.
**TECHNICAL COMPLEXITY:** HIGH
**LIKELY TECHNOLOGY:** REACT THREE FIBER, GSAP, View Transitions API (OTHER)
**MOBILE RISK:** MEDIUM · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** MEDIUM
**VALUE:** MEDIUM · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PROTOTYPE (desktop first)

## M15 — Pointer/touch-responsive perspective

**MECHANISM:** The object tilts or sways subtly toward the pointer / with touch drag; no tilt on devices without precise input unless touched.
**REFERENCE:** R34 Lusion, R29 Lando Norris (pointer-reactive 3D — not visually re-observed this session)
**WHAT HAPPENS:** The object feels physical and responsive.
**WHY IT WORKS:** Cheap way to make an object feel alive; signals interactivity.
**USER NEED SERVED:** Discoverability of the interactive object.
**EMOTIONAL EFFECT:** Tactility, curiosity.
**PEDIATRIC TRANSLATION:** Mobile "swings" a little as if moved by air from the pointer; no gyroscope (iOS permission prompts are friction); disabled under reduced motion.
**HOW IT COULD APPLY TO:**
- HEUTE: — (never affects text)
- MEIN KIND: —
- PRAXIS: —
- ENTDECKEN: kids can "blow" the mobile.
- GROWING MOBILE: base interaction.
- PRAXIS PULS: —
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** THREE.JS or CSS 3D transforms
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** MEDIUM · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M16 — Scroll-linked reconfiguration

**MECHANISM:** Scrolling drives the object's state (parts rotate, separate, recombine).
**REFERENCE:** R37 Apple AirPods Pro, R34 Lusion ("SCROLL TO EXPLORE")
**WHAT HAPPENS:** Page progress = object progress.
**WHY IT WORKS:** Storytelling with a single object.
**USER NEED SERVED:** Narrative content (e.g. growth story) — not utility.
**EMOTIONAL EFFECT:** Cinematic.
**PEDIATRIC TRANSLATION:** Could tell "Gesund groß werden" on an about/Haltung page later. Not on Heute; native scrolling only, no scroll-jacking.
**HOW IT COULD APPLY TO:**
- HEUTE: never.
- MEIN KIND: possibly a growth timeline later.
- PRAXIS: Haltung story (P03).
- ENTDECKEN: Wachstum chapter.
- GROWING MOBILE: secondary storytelling mode.
- PRAXIS PULS: never.
**TECHNICAL COMPLEXITY:** HIGH
**LIKELY TECHNOLOGY:** GSAP ScrollTrigger, THREE.JS
**MOBILE RISK:** HIGH · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** HIGH
**VALUE:** LOW · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** PHASE 2

## M17 — Explorable 3D world as primary navigation

**MECHANISM:** Users drive/fly/walk through a 3D world to reach content.
**REFERENCE:** R36 Bruno Simon (car), R30 Messenger (planet), R31 Igloo
**WHAT HAPPENS:** Navigation is a game.
**WHY IT WORKS:** Memorable for explorers with time and capable devices.
**USER NEED SERVED:** None for stressed parents.
**EMOTIONAL EFFECT:** Play — and frustration under time pressure.
**PEDIATRIC TRANSLATION:** None for primary navigation. Inspected examples expose empty DOM without WebGL (R30, R36).
**HOW IT COULD APPLY TO:**
- HEUTE: no.
- MEIN KIND: no.
- PRAXIS: no.
- ENTDECKEN: a bounded scene inside a chapter could be considered in Phase 2, never as site navigation.
- GROWING MOBILE: no.
- PRAXIS PULS: no.
**TECHNICAL COMPLEXITY:** VERY HIGH
**LIKELY TECHNOLOGY:** THREE.JS, WEBGL, physics
**MOBILE RISK:** HIGH · **ACCESSIBILITY RISK:** HIGH · **PERFORMANCE RISK:** HIGH
**VALUE:** LOW · **MEMORABILITY:** HIGH
**RECOMMENDATION:** REJECT

## M18 — Preloader-gated entry

**MECHANISM:** Nothing is usable until assets have loaded.
**REFERENCE:** R31 Igloo (loader > 18 s in a throttled tab, empty DOM), R30 Messenger (empty DOM)
**WHAT HAPPENS:** Users wait, watching a progress indicator.
**WHY IT WORKS:** Guarantees a perfect first frame for the showcase.
**USER NEED SERVED:** None.
**EMOTIONAL EFFECT:** Anticipation for fans; abandonment for everyone else.
**PEDIATRIC TRANSLATION:** Incompatible with P4. Status, phone and Notfall render before any 3D asset is requested.
**HOW IT COULD APPLY TO:**
- HEUTE / MEIN KIND / PRAXIS / ENTDECKEN / GROWING MOBILE / PRAXIS PULS: no.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** WEBGL asset pipeline
**MOBILE RISK:** HIGH · **ACCESSIBILITY RISK:** HIGH · **PERFORMANCE RISK:** HIGH
**VALUE:** LOW · **MEMORABILITY:** LOW
**RECOMMENDATION:** REJECT

## M19 — Split-letter kinetic typography

**MECHANISM:** Headlines/links are split into individual letter elements for animation.
**REFERENCE:** R34 Lusion (each letter repeated 4× in link text; no `aria-label`/`aria-hidden` override — verified)
**WHAT HAPPENS:** Letters animate individually.
**WHY IT WORKS:** Visually rich type motion.
**USER NEED SERVED:** None.
**EMOTIONAL EFFECT:** Showcase energy.
**PEDIATRIC TRANSLATION:** Breaks accessible names and German screen-reader output. If type motion is wanted: animate whole words/lines with the accessible text intact and decorative copies `aria-hidden`.
**HOW IT COULD APPLY TO:**
- All paths: no.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** GSAP SplitText, CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** HIGH · **PERFORMANCE RISK:** MEDIUM
**VALUE:** LOW · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** REJECT

## M20 — Bottom action dock (mobile)

**MECHANISM:** A persistent bar at the bottom of the screen with 3–5 labelled actions.
**REFERENCE:** R70 Material navigation bar, R71 Apple tab bars (corroboration — not re-read), R73 NN/g (visible, salient navigation is more discoverable)
**WHAT HAPPENS:** Key actions are always in the thumb zone.
**WHY IT WORKS:** One-handed reach; constant orientation.
**USER NEED SERVED:** Phone, Notfall, route in one tap while holding a child.
**EMOTIONAL EFFECT:** Safety net.
**PEDIATRIC TRANSLATION:** Dock: status chip · Anrufen · Notfall · Menü (paths). Icons always with German labels; ≥ 44–48 px targets; respects safe areas; does not hide on scroll.
**HOW IT COULD APPLY TO:**
- HEUTE: primary actions.
- MEIN KIND / PRAXIS / ENTDECKEN: identical everywhere.
- GROWING MOBILE: object never overlaps the dock.
- PRAXIS PULS: compact chip in the dock (M21).
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW (watch WCAG 2.4.11 focus obscuring) · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M21 — Persistent compact status rail

**MECHANISM:** A glanceable, always-present summary of a live state that expands on tap.
**REFERENCE:** R72 Apple Live Activities (concept), R64 Flighty, R29 Lando Norris (next event surfaced in the navigation)
**WHAT HAPPENS:** The state follows the user through the site.
**WHY IT WORKS:** The question "is it open?" can arise on any page.
**USER NEED SERVED:** Status without returning to the homepage.
**EMOTIONAL EFFECT:** The practice feels present.
**PEDIATRIC TRANSLATION:** PRAXIS PULS chip: one word + one time ("Geöffnet · bis 12:00"); tap → disclosure with reason and action. UNBEKANNT → "Sprechzeiten" as plain link.
**HOW IT COULD APPLY TO:**
- HEUTE: expanded version inline; rail collapses when the inline version is visible.
- MEIN KIND / PRAXIS / ENTDECKEN: rail visible.
- GROWING MOBILE: independent of the object.
- PRAXIS PULS: persistent form.
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** CSS, small client refresh of server state
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW (no live-region spam; announce only on user request) · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M22 — Staged disclosure and intent selection

**MECHANISM:** Show the default answer; reveal detail on request; let the user pick an intent before detail.
**REFERENCE:** R74 NN/g progressive & staged disclosure, R77 APG disclosure pattern, R03/R05 task menus
**WHAT HAPPENS:** First screen stays light; detail is one accessible step away.
**WHY IT WORKS:** Reduces cognitive load while keeping everything reachable.
**USER NEED SERVED:** Complex rules (acute, healthy-only window, replacements) without overload.
**EMOTIONAL EFFECT:** Clarity.
**PEDIATRIC TRANSLATION:** Heute: today → "Ganze Woche" disclosure → slot types explained. Vertretung: practice name + phone → address and notes on expand.
**HOW IT COULD APPLY TO:**
- HEUTE: week, rules.
- MEIN KIND: age range → topics → detail.
- PRAXIS: team member → qualifications.
- ENTDECKEN: chapter steps.
- GROWING MOBILE: arms preview paths on focus/hover (preview only, not required).
- PRAXIS PULS: chip → detail.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS, native `<details>` / APG disclosure
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M23 — In-experience accessibility and sound controls

**MECHANISM:** Immersive experiences expose an accessibility options button and explicit sound control.
**REFERENCE:** R35 Persepolis Reimagined ("Accessibility options", "Change sound volume", "Open menu")
**WHAT HAPPENS:** Users can reduce motion, adjust sound, or switch to text inside the experience.
**WHY IT WORKS:** Immersion without exclusion; control builds trust.
**USER NEED SERVED:** Children with sensitivities; parents in a waiting room; screen-reader users.
**EMOTIONAL EFFECT:** Respect.
**PEDIATRIC TRANSLATION:** ENTDECKEN has "Ton an/aus" (default aus), "Bewegung reduzieren", "Als Text lesen", and a persistent exit to Heute/Notfall.
**HOW IT COULD APPLY TO:**
- ENTDECKEN: mandatory.
- GROWING MOBILE: motion toggle shared.
- Others: —
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS, OTHER (preferences in memory/session only)
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M24 — Accessible 3D layer with DOM labels and poster fallback

**MECHANISM:** Every interactive 3D element has a DOM counterpart (focusable, named); a static poster renders first and remains when WebGL is unavailable.
**REFERENCE:** R79 `@react-three/a11y` (focus, focus indication, screen-reader descriptions), R78 `<model-viewer>` (poster/fallback); negative evidence R30, R31, R36
**WHAT HAPPENS:** Keyboard and screen-reader users operate the same choices; no-WebGL users see a designed still.
**WHY IT WORKS:** Separates meaning (DOM) from rendering (canvas).
**USER NEED SERVED:** Everyone, especially low-performance devices and assistive tech.
**EMOTIONAL EFFECT:** None visible — invisible quality.
**PEDIATRIC TRANSLATION:** Growing Mobile: arms are DOM buttons/links positioned over the canvas; poster = high-quality still/SVG of the same composition.
**HOW IT COULD APPLY TO:**
- GROWING MOBILE: mandatory foundation.
- ENTDECKEN: same for any 3D chapter.
- Others: —
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** REACT THREE FIBER (+ a11y layer), SVG, CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** LOW
**RECOMMENDATION:** USE

## M25 — Editorial restraint with dated precision

**MECHANISM:** Generous space, confident typography, few elements — combined with exact, dated practical information.
**REFERENCE:** R38 Rijksmuseum, R39 Tate, R40 MoMA; contrast R45 Aman (restraint turning into exclusivity)
**WHAT HAPPENS:** The institution feels premium and approachable at once.
**WHY IT WORKS:** Precision is a form of care; restraint gives the object room.
**USER NEED SERVED:** Trust; readability.
**EMOTIONAL EFFECT:** Quiet confidence.
**PEDIATRIC TRANSLATION:** Warm Editorial: paper-warm surfaces, large readable type, practical facts set as editorial headlines ("Heute bis 12:00"). Avoid scarcity/future-tense tone.
**HOW IT COULD APPLY TO:**
- HEUTE: status sentence as typographic hero.
- MEIN KIND: calm reading layouts.
- PRAXIS: people presented with dignity, no marketing copy.
- ENTDECKEN: contrast — more colour and play inside a calm frame.
- GROWING MOBILE: given space; not surrounded by widgets.
- PRAXIS PULS: typographically integrated, not a widget.
**TECHNICAL COMPLEXITY:** LOW
**LIKELY TECHNOLOGY:** CSS
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** LOW · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** MEDIUM
**RECOMMENDATION:** USE

## M26 — Open-ended play without scoring

**MECHANISM:** Children explore and manipulate freely; no points, timers, streaks.
**REFERENCE:** R58 Toca Boca (open-ended play studio), R51 Exploratorium (hands-on), R60 Sesame (age-banded, grown-up companion)
**WHAT HAPPENS:** Curiosity drives the experience; it ends naturally.
**WHY IT WORKS:** Learning through agency; no manipulation.
**USER NEED SERVED:** Child understands the visit and the body.
**EMOTIONAL EFFECT:** Safety, curiosity.
**PEDIATRIC TRANSLATION:** Mein Arztbesuch: child can "try" the stethoscope, scale, otoscope; each step ends with a calm explanation; a gentle closing ("Gut gemacht — so läuft ein Besuch bei uns.") instead of rewards.
**HOW IT COULD APPLY TO:**
- ENTDECKEN: core interaction principle.
- GROWING MOBILE: explorer mode invites play.
- Others: —
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** CSS, GSAP, CANVAS/SVG
**MOBILE RISK:** LOW · **ACCESSIBILITY RISK:** MEDIUM (manipulation must have tap alternatives; WCAG 2.5.7) · **PERFORMANCE RISK:** LOW
**VALUE:** HIGH · **MEMORABILITY:** HIGH
**RECOMMENDATION:** USE

## M27 — Interactive 3D anatomy

**MECHANISM:** A manipulable 3D body with labelled systems.
**REFERENCE:** R57 BioDigital Human
**WHAT HAPPENS:** Users rotate, peel and label anatomy.
**WHY IT WORKS:** Spatial understanding of the body.
**USER NEED SERVED:** Child curiosity about the body.
**EMOTIONAL EFFECT:** Wonder.
**PEDIATRIC TRANSLATION:** "Reise in deinen Körper" (Phase 2): child-scale, simplified, non-clinical, physician-reviewed; not a medical tool.
**HOW IT COULD APPLY TO:**
- ENTDECKEN: Phase 2 chapter.
- GROWING MOBILE: explorer foreshadowing only.
- Others: —
**TECHNICAL COMPLEXITY:** VERY HIGH
**LIKELY TECHNOLOGY:** REACT THREE FIBER, WEBGL
**MOBILE RISK:** HIGH · **ACCESSIBILITY RISK:** HIGH · **PERFORMANCE RISK:** HIGH
**VALUE:** MEDIUM · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PHASE 2

## M28 — AI assistant for appointments and questions

**MECHANISM:** A chat/voice assistant handles appointments and patient questions.
**REFERENCE:** R16 kinderarzt.at ("Kiara – unsere virtuelle Ordinationsassistentin … Alle Patientenanfragen", voice line from 1.6.2026)
**WHAT HAPPENS:** Patients type or speak requests to an AI.
**WHY IT WORKS:** Relieves phone load in a large group practice.
**USER NEED SERVED:** Appointments.
**EMOTIONAL EFFECT:** Convenience for some; uncertainty for others.
**PEDIATRIC TRANSLATION:** Conflicts with locked anti-patterns (AI medical chat, health-data collection, X02/X12). Note: shows peers are moving here — revisit only as a documented practice decision.
**HOW IT COULD APPLY TO:**
- All paths: no.
**TECHNICAL COMPLEXITY:** HIGH
**LIKELY TECHNOLOGY:** OTHER (third-party AI service)
**MOBILE RISK:** MEDIUM · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** MEDIUM
**VALUE:** LOW (for V1 under current constraints) · **MEMORABILITY:** LOW
**RECOMMENDATION:** REJECT

## M29 — Orbital arrangement of paths around the object

**MECHANISM:** The primary destinations are laid out around (or hang from) the central object instead of in a top bar.
**REFERENCE:** R29 (navigation integrated into the hero composition, next event in the nav), R03/R05 task menus as the fallback logic; radial menus as a general interaction family (no single benchmark inspected)
**WHAT HAPPENS:** The object becomes the navigation hub; labels sit at the ends of its arms.
**WHY IT WORKS:** Navigation becomes part of the signature instead of chrome.
**USER NEED SERVED:** Orientation with fewer UI elements.
**EMOTIONAL EFFECT:** Distinctiveness.
**PEDIATRIC TRANSLATION:** Allowed as a **layout of real links** (static positions, readable text, logical DOM order Heute → Mein Kind → Praxis → Entdecken). Rejected: drag-to-rotate radial menus, labels that move while you try to tap them.
**HOW IT COULD APPLY TO:**
- HEUTE / MEIN KIND / PRAXIS / ENTDECKEN: the four arm labels.
- GROWING MOBILE: desktop/tablet composition.
- PRAXIS PULS: not part of the orbit (stays in the utility layer).
**TECHNICAL COMPLEXITY:** MEDIUM
**LIKELY TECHNOLOGY:** CSS (positioned DOM labels) + THREE.JS object
**MOBILE RISK:** HIGH (narrow screens) · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** LOW
**VALUE:** MEDIUM · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PROTOTYPE (desktop/tablet; mobile uses dock)

## M30 — Exploded view / assembly

**MECHANISM:** An object separates into parts or assembles from parts.
**REFERENCE:** R37 Apple (product reveal), R34 Lusion (3D storytelling)
**WHAT HAPPENS:** Inner structure becomes visible.
**WHY IT WORKS:** Explains how something works.
**USER NEED SERVED:** Understanding (body, growth) — not orientation.
**EMOTIONAL EFFECT:** Revelation.
**PEDIATRIC TRANSLATION:** Strong for "Reise in deinen Körper" (layers of the body) in Phase 2. As an entry sequence (mobile assembling on load) it delays utility and repeats on every visit → rejected for the entry.
**HOW IT COULD APPLY TO:**
- ENTDECKEN: Phase 2 body chapter.
- GROWING MOBILE: no load-time assembly; at most a one-off subtle settle (< 1 s, skipped under reduced motion).
- Others: —
**TECHNICAL COMPLEXITY:** HIGH
**LIKELY TECHNOLOGY:** THREE.JS, GSAP
**MOBILE RISK:** MEDIUM · **ACCESSIBILITY RISK:** MEDIUM · **PERFORMANCE RISK:** HIGH
**VALUE:** MEDIUM (ENTDECKEN) / LOW (entry) · **MEMORABILITY:** HIGH
**RECOMMENDATION:** PHASE 2 for ENTDECKEN · REJECT as entry
