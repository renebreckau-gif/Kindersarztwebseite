# Signature Experience Options

Phase: 02 — World-Class Benchmark & Translation Research
Date: 2026-10-07
Mechanisms: [transferable-patterns.md](transferable-patterns.md). Validation: [signature-entry-research.md](signature-entry-research.md).

These are **interaction/composition options** for the first viewport and the Growing Mobile, not a visual system. Art direction, form language, colour values and typography are defined in a later phase. All options share the invariants: utility in HTML first, DOM labels, poster fallback, reduced-motion path, no preloader.

---

## Option A — "Status headline, mobile beside it" (editorial asymmetric)

**Composition:** The PRAXIS PULS sentence is the typographic hero (left/top). The Growing Mobile hangs to the right (desktop) or below/partially cropped (mobile). The four paths are arm labels on desktop (M29) and in the dock on mobile (M20).
**Interaction:** Pointer sway (M15); focusing/hovering an arm previews the path in one line; selecting tips the balance (M11) and transitions briefly (M14).
**First 5 seconds:** status sentence and phone read instantly; the object moves once, gently, then rests.
**Strengths:** Utility and wonder visible together; most robust on mobile; simplest to make accessible.
**Risks:** Could feel like "a nice illustration next to text" if the object's function is not obvious (W1).
**Cost:** MEDIUM–HIGH.
**Assessment:** Best balance of the four questions. **Recommended baseline for prototyping.**

## Option B — "The mobile as instrument" (transformation-led)

**Composition:** As A, but each path transforms the object into an instrument (M12): Praxis → time instrument showing today's verified slots; Mein Kind → age instrument with 0–2 · 3–6 · 7–12 · 13–17; Entdecken → explorer.
**Interaction:** The age instrument is operable (backed by a radio group); the time instrument is display-only and derived from PRAXIS PULS data.
**First 5 seconds:** identical to A.
**Strengths:** Strongest "functional, not decorative" proof; most memorable.
**Risks:** VERY HIGH complexity; time instrument must never show unverified slots (falls back to plain "Sprechzeiten ansehen"); metaphor overload (W4).
**Cost:** HIGH–VERY HIGH.
**Assessment:** Build on top of A; **prototype only the Mein Kind age instrument first**.

## Option C — "Environment transforms, object stays" (calm stage)

**Composition:** The object remains almost still; choosing a path changes the environment — background tone, typography, content — while the object only re-balances.
**Interaction:** Minimal object motion; transitions are page-level (View Transitions), not camera moves.
**First 5 seconds:** quietest; utility dominant.
**Strengths:** Lowest motion and performance risk; very accessible; strongly editorial.
**Risks:** May not create the immediate "noch nie gesehen" reaction; risk of visual conservatism (strategy-lock 2.6).
**Cost:** MEDIUM.
**Assessment:** Becomes the **reduced-motion / low-power mode of A/B**, not the primary concept.

## Option D — "Assembled world" (rejected)

**Composition:** The mobile assembles on load (M30), the camera flies into a small world for each path (M17), scroll drives reconfiguration (M16).
**Assessment:** Maximum spectacle; violates P4 (utility indestructible), adds load time, motion-sickness and mobile risks; inspected analogues are inaccessible without WebGL. **Rejected.**

## Comparison

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Utility in first viewport | HIGH | HIGH | HIGH | LOW |
| Immediate visual reaction | MEDIUM–HIGH | HIGH | MEDIUM | HIGH |
| Functional object | MEDIUM | HIGH | LOW | MEDIUM |
| Accessibility risk | LOW | MEDIUM | LOW | HIGH |
| Mobile risk | LOW | MEDIUM | LOW | HIGH |
| Performance risk | MEDIUM | HIGH | LOW | HIGH |
| Maintenance by practice | none | data-driven | none | none |

## Recommended path
**A as baseline → B's age instrument as the first transformation → C as the reduced-motion/low-power rendering of the same composition.** D is excluded.
