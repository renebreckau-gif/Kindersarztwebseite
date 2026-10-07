# Signature Entry Research — Growing Mobile

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
Mechanism details: [transferable-patterns.md](transferable-patterns.md). References: [benchmark-study.md](benchmark-study.md).

Purpose: test the locked concept (strategy-lock #6) honestly — not confirm it blindly, not replace it casually.

---

## 1. Candidate mechanisms evaluated

| Candidate | Mechanism | Verdict | Reasoning |
|---|---|---|---|
| Kinetic sculpture | M11 | **PROTOTYPE — core** | Balance/weight is a precise metaphor for "Gesund groß werden"; a mobile is also a real object of early childhood. Strongest identity potential. |
| Object transformation | M12 | **PROTOTYPE — one mode first** | Gives the object a function per path; highest cost. Start with the Mein Kind age instrument, where transformation maps to a real choice (age range). |
| Physical instrument metaphor | M12 | **PROTOTYPE (inside M12)** | Instruments (scale, ruler, clock) are already present in a paediatric practice; makes transformations legible. Risk: too many metaphors — limit to two (time, age). |
| Pointer-responsive perspective | M15 | **USE** | Cheap, low-risk aliveness; tap/drag on touch; no gyroscope. |
| State-dependent material changes | M13 | **PROTOTYPE, drop if ambiguous** | Nice echo of PRAXIS PULS; must be redundant to text and neutral when state is UNBEKANNT. |
| Radial navigation | M29 | **PROTOTYPE as static orbital layout** | Arms carrying real labels = navigation as signature. Rotating/drag radial menus rejected (moving targets, WCAG 2.5.7). |
| Camera transitions | M14 | **PROTOTYPE, short** | Continuity between entry and path; ≤ ~600 ms, interruptible, off under reduced motion. No camera flights. |
| Scroll-linked reconfiguration | M16 | **PHASE 2** | Storytelling only; never on Heute. |
| Exploded object | M30 | **REJECT for entry · PHASE 2 for ENTDECKEN** | Explains inner structure — perfect for the body chapter, wrong as a repeated entry ritual. |
| Object assembly / disassembly | M30 | **REJECT for entry** | Load-time assembly delays utility and repeats on every visit. |
| Depth-based information | — | **REJECT for essential info** | Information placed "behind" or "inside" the object is undiscoverable and inaccessible; depth may only stage decoration. |
| Explorable world | M17 | **REJECT** | Inspected examples have empty DOM without WebGL (R30, R36). |
| Preloader | M18 | **REJECT** | Utility must render first (P4). |

## 2. Validation questions

### 2.1 Does a central interactive object remain the strongest concept?
**Yes — with two modifications.**
- Evidence for: the strongest award work is organised around one hero object or world (R29–R31, R35, R37); no inspected healthcare site has a signature object at all (R01–R16) — the differentiation potential is real.
- Evidence against / weaknesses:
  1. The inspected SOTY objects are spectacle first and deliver no content without the 3D layer (R30, R31, R36). An object can easily become something to *look at* instead of something to *use*.
  2. "Central" competes with the status sentence for the first glance; on mobile it would push utility below the fold.
  3. Two of five 2024–2025 SOTY winners are already gone (R32, R33) — showpieces age fast; the object must be durable and editable, not a campaign.

### 2.2 What makes it functional rather than decorative?
1. Its arms **are** the four primary paths (M29), labelled with real text.
2. Choosing a path **changes its configuration** (M11/M12) — the object records the choice.
3. In Mein Kind it **becomes the age selector** (M12); in Praxis it **visualises today's time** (only with verified data).
4. It never carries information that exists only in the object (M24).
If a prototype cannot achieve at least 1 and 2, the object is decorative and must be reduced to a static brand illustration.

### 2.3 How much movement is enough?
- Idle: a slow, small sway (air movement), not continuous spinning; motion that lasts longer than 5 s needs a pause mechanism (WCAG 2.2.2, R75) — simplest: idle motion settles to rest after a few seconds and only resumes on interaction.
- Response: immediate, physical, short (spring settles < 1 s).
- Transitions: ≤ ~600 ms, interruptible.
- Reduced motion (R76): static pose, instant state changes, no sway.
Rule of thumb: the object should be *capable* of a lot of motion and *use* very little.

### 2.4 How should it behave on mobile?
- Not centred in the first viewport. Order: status sentence + actions → object.
- Smaller, cropped composition (e.g. one or two arms entering from the edge), full object in the path views.
- Paths live in the bottom dock (M20); the object is an *additional* entry, never the only one.
- Touch: tap on labels; drag optional for play; no gyroscope permission prompts.
- Budget: render the object only when in view; pause rendering when off-screen or the tab is hidden.
Details: [mobile-benchmarks.md](mobile-benchmarks.md).

### 2.5 How should it behave without WebGL?
A designed **poster** of the same composition (SVG or optimised still), with the same DOM labels positioned identically (M24). Optional CSS 2.5D sway on capable devices. The no-WebGL version must look *intentional*, not broken — it is also the reduced-motion and low-power version.

### 2.6 Should it remain centred?
- Desktop/tablet landscape: **asymmetric**, sharing the stage with the editorial status headline (status left/top, object right/above). Centring makes it a poster; asymmetry makes it part of an editorial layout (Warm Editorial).
- Mobile: not centred (see 2.4).
- Inside a path (e.g. Mein Kind): may move to centre when it becomes the instrument the user is operating.

### 2.7 Should it interact with typography?
**Yes, carefully.** The arm labels are typographic elements (DOM text, editorial typeface) — the object "holds" the words. Headlines may react to the object (e.g. a word aligns with the arm that was chosen), but text is never rendered into the 3D scene as texture, never split into letters (M19), and never moves while it is being read or tapped.

### 2.8 Should it transform, or should the environment transform around it?
**Both, with a clear division of labour:**
- The **object** transforms its *configuration* (balance tips toward the chosen path; instrument mode).
- The **environment** (background tone, typography, content) carries *information* and changes per path.
- The **camera** stays mostly still — environment change replaces camera flights, which keeps cost, motion sickness and disorientation low.

### 2.9 What should NOT move?
- Status sentence, phone number, Notfall, route, dock, utility line
- The four path labels while hover/focus/tap targeting is possible
- Body text, hours tables, any form control
- Layout (no shift caused by object loading — reserve its space; CLS < 0.1)
- Anything during the first interaction of a stressed user: no motion triggered by the status area

## 3. Weaknesses to carry into prototyping

| # | Weakness | Test in prototype |
|---|---|---|
| W1 | Object might read as a toy or an art piece rather than navigation | 5-second test: can parents name what the arms do? |
| W2 | Mobile composition may not hold four labelled arms | Compare cropped-object vs. dock-only variants |
| W3 | Cost/perf on older Android | Measure on a low-end device; frame budget and battery |
| W4 | Too many metaphors (mobile + instruments + time + age) | Limit to balance + two instruments; drop others |
| W5 | State echo (M13) could imply open/closed by motion alone | Check with users whether pose is misread |
| W6 | Calder association too literal | Art direction must develop its own form language (see do-not-copy.md) |

## 4. Verdict

**KEEP the Growing Mobile — MODIFY its placement and role:** asymmetric on desktop, secondary to status on mobile, labels as DOM text, transformation limited to two instrument modes, environment carries information, camera mostly still. Reconsider only if prototypes fail W1 (parents cannot tell it is navigation) and W3 (unacceptable performance) together.
