# Photography Direction

Phase: 05
Date: 2026-10-07
Policy: [media-policy.md](../architecture/media-policy.md) (REAL / PLACEHOLDER / AI_CONCEPTUAL). No media is generated in this phase.

## 1. Real practice photography (REAL)

- **Feel:** natural, warm, documentary, bright but not clinical, premium without luxury.
- **Light:** daylight or soft daylight-balanced light; warm white balance matching the paper canvas; no blue clinical cast, no hard flash.
- **Content:** real rooms, real details (scale, otoscope on a shelf, waiting area, entrance) — tidy but lived-in; no staged "medical drama".
- **Composition:** generous negative space for editorial layouts; horizon and verticals straight (architecture-like precision); close details allowed.
- **People in practice scenes:** only staff with consent; patients only with explicit consent and preferably not identifiable (hands, backs); never children in distress.
- **Post-processing:** gentle, consistent grade; no heavy filters, no vignette, no HDR look.
- **Never:** stock imagery, AI-generated rooms presented as the practice, retouching that changes what is real.

## 2. Real staff portraits (REAL)

- Real staff only, with documented consent (F33).
- One consistent setup for everyone: same background tone (warm light neutral or a real practice wall), same light, same lens/height.
- Framing: head-and-shoulders to half-body, 4 : 5, eye level; relaxed, approachable expression; work clothing as actually worn.
- Not corporate headshots: slight environmental context or a natural pose is welcome; no crossed-arms power poses, no stethoscope-as-prop.
- Alt text names the person ("Porträt Nadine Probst").

## 3. AI conceptual childhood imagery (AI_CONCEPTUAL)

- Allowed only for conceptual, educational or atmospheric use (e.g. ENTDECKEN illustrations, "growing up" moods).
- Must not appear to be actual patients; never combined with real staff or real rooms; never in testimonial-like contexts.
- Avoid uncanny perfection, glossy skin, stock-photo energy, staged smiles; prefer illustration-like or abstract treatments over photorealism.
- Never medical distress, injections, illness, nudity.
- Inclusive and varied without tokenism.
- Labelled internally as AI_CONCEPTUAL; public labelling decided with the legal review.

## 4. Treatment in the layout

Media sit in frames with `--radius-frame` (10 px), no shadows, no borders on real photos; captions in caption style. Aspect ratios: portraits 4 : 5, rooms/team 3 : 2, video 16 : 9, conceptual 4 : 3. Images are lazy-loaded below the fold, served in modern formats, sized per breakpoint.
