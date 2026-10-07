# Design System — Warm Editorial + Cobalt

Phase: 05 — Visual Design System & Interaction Language
Date: 2026-10-07
Code: [`src/design-system/tokens.css`](../../src/design-system/tokens.css) (tokens) · [`base.css`](../../src/design-system/base.css) · [`components/`](../../src/design-system/components/) · reference route `/design-system`
Related: [motion-system.md](motion-system.md) · [3d-language.md](3d-language.md) · [photography-direction.md](photography-direction.md) · [placeholder-system.md](placeholder-system.md) · [responsive-design.md](responsive-design.md)

## 0. Idea

**Gesund groß werden** is expressed as *measurement made gentle*: fine rules with ticks, scales that grow, instruments that orient — never charts, never clinical values. Paper and ink carry almost everything; cobalt means *action and selection*; the accents appear rarely and with a job. The memorable things are the **Messlinie** (measured hairline), the **status shapes**, the **ink key on a cobalt edge**, and — later — the Growing Mobile. Everything else stays quiet.

Components use semantic tokens only. Raw palette values exist only in `tokens.css`.

## 1. Colour tokens

| Semantic token | Value | Role | Contrast on paper |
|---|---|---|---|
| `--color-canvas` | #F3EFE7 | Page surface | — |
| `--color-surface-raised` | #F8F5EF | Notices | — |
| `--color-surface-sunken` | #E9E3D7 | Warnings, placeholders | — |
| `--color-surface-inverse` | #171A1D | Primary keys, dock, footer | — |
| `--color-text` | #171A1D | Text, structure | 15.2 : 1 |
| `--color-text-secondary` | #4A4F55 | Secondary text | 7.2 : 1 |
| `--color-text-inverse` | #F3EFE7 | Text on ink | 15.2 : 1 |
| `--color-rule` | ink 14 % | Hairlines | decorative |
| `--color-rule-strong` | ink | Strong rules, ticks | — |
| `--color-brand` | #4A5CFF | Graphics, large brand type, selection fills, focus | 4.3 : 1 (≥ 3 : 1 UI/large text only) |
| `--color-brand-text` | #3446E8 | Links, small brand text | 5.8 : 1 |
| `--color-focus` | #4A5CFF | Focus ring | 4.3 : 1 |
| `--color-status-open` | #3E9B72 | **Only** the OPEN dot | 3.0 : 1 (with word) |
| `--color-status-open-text` | #2C7553 | If green text is ever needed | 4.9 : 1 |
| `--color-emergency` / `-text` | #C63831 / #A82B25 | **Only** emergency | 4.6 / 6.0 : 1 |
| `--color-accent-human` | #F28B74 | Warmth, "jetzt" marker | never text |
| `--color-accent-discovery` | #F1CF68 | Discovery, growth, focus on ink | never text |
| `--color-accent-explore` | #D8CFF1 | Learning, AI-concept frames | never text |

Rules:
- **Balance** ≈ 70 % paper/ink · 20 % cobalt · 10 % accents — as a tendency, not per screen.
- **One accent per view.** Coral, yellow and lilac never appear together outside documentation and ENTDECKEN.
- **Cobalt never signals a state.** Green only as the OPEN dot next to the word. Red only for emergency. No traffic-light combinations.

## 2. Typography tokens

**Families:** Newsreader (editorial serif — statements, headings, lead text) + Instrument Sans (precise grotesk — UI, utility, numbers, body). Self-hosted via `next/font`, Latin subset (covers ä ö ü ß; capital ẞ falls back). The optical-size axis was dropped for performance (see [phase-05-decisions.md](phase-05-decisions.md)).

| Role | Token | Family / weight | Size (360 → 1440+) | Line height | Tracking |
|---|---|---|---|---|---|
| Display XL | `--text-display-xl` | Serif 400 | 44 → 128 px | 0.96 | −0.03 em |
| Display L | `--text-display-l` | Serif 400 | 38 → 84 px | 0.96 | −0.03 em |
| H1 | `--text-h1` | Serif 400 | 32 → 56 px | 1.1 | −0.015 em |
| H2 | `--text-h2` | Serif 400 | 26 → 40 px | 1.1 | −0.015 em |
| H3 | `--text-h3` | Serif 400 | 19 → 22 px | 1.25 | 0 |
| Body Large | `--text-body-l` | Serif 400 | 19 → 23 px | 1.45 | 0 |
| Body | `--text-body` | Sans 400 | 17 px | 1.55 | 0 |
| Small | `--text-small` | Sans 400–500 | 15 px | 1.45 | 0 |
| Label | `--text-label` | Sans 600 | 13 px | 1.25 | +0.015 em (sentence case, never all caps) |
| Utility | `--text-small` | Sans 500, tabular | 15 px | 1.2 | 0 |
| Status | `--text-status` | Sans 600, tabular | 17 → 19 px | 1.2 | 0 |
| Caption | `--text-caption` | Sans 400 | 13 px | 1.4 | 0 |
| Action | `--text-action` | Sans 600 | 17 px | 1.2 | +0.005 em |

- Sizes are fluid `clamp()` values on one scale (≈ 1.2 ratio on phones, ≈ 1.33 on desktop); no ad-hoc sizes in components.
- Times and phone numbers use `font-variant-numeric: tabular-nums`.
- German: `lang="de"`, `hyphens: auto`, `overflow-wrap: break-word`; words may wrap, never clip; status headlines sized so "Akutsprechstunde" fits a 360 px line at default size.
- Serif italic is used for one purpose: the *detail line* under a status ("Heute bis 12:00 Uhr").

## 3. Spacing tokens

4-px base: `--space-1` 2 · `--space-2` 4 · `--space-3` 8 · `--space-4` 12 · `--space-5` 16 · `--space-6` 24 · `--space-7` 32 · `--space-8` 48 · `--space-9` 64 · `--space-10` 96 · `--space-11` 128 px; plus `--space-section` (64 → 144 px) and `--space-gutter` (16 px on 360 → 56 px).
Dense utility uses 8–16; editorial whitespace 48–144; components never invent pixel values.

## 4. Layout grid

| | Phone (< 600) | Tablet (600–899) | Desktop (≥ 900) |
|---|---|---|---|
| Columns | 4 | 6 | 12 |
| Gap | 16 | 24 | 24 |
| Gutter | 16–24 | 24–40 | 40–56 |

Widths: reading 38 rem (≈ 66 characters sans), serif reading 40 rem, content 76 rem, wide 90 rem (entries only). Asymmetry comes from column choice (e.g. 7 + 5, 8 + 4), not from random offsets. Section intros use a 1 + 7 + 4 rhythm on desktop (index · title · lede).
**Every grid track is `minmax(0, 1fr)`** — auto tracks let one long word or a no-wrap chip widen the whole page (a bug found and fixed during this phase at 200 % text).

## 5. Breakpoint principles

Content-led, not device-led: 600 px (tablet layouts), 900 px (desktop chrome: header instead of dock). A large-text rule (`max-width: 20em`) switches the dock to 2 × 2 when the user's base font size is enlarged. Details: [responsive-design.md](responsive-design.md).

## 6. Radii, borders, surfaces

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Rules, tables, lists |
| `--radius-control` | 4 px | Buttons, tags, inputs, chips |
| `--radius-frame` | 10 px | Media frames, sheets, ENTDECKEN cards |
| `--radius-round` | 999 px | Status dots only |
| `--border-hairline` | 1 px | Dividers (14 % ink) |
| `--border-strong` | 1.5 px | Controls, section starts |
| `--border-focus` | 3 px | Focus ring |
| `--edge-press` | 2–3 px solid edge | The only "shadow": a physical key edge |

No soft drop shadows, no glass, no gradients as decoration. Surfaces: canvas → raised (notices) → sunken (warnings, placeholders) → inverse (keys, dock, footer).

## 7. Buttons (actions)

| Variant | Look | Use |
|---|---|---|
| **Primary** | Ink key resting on a 3 px **cobalt edge**; presses down 3 px on `:active` | One per view: Anrufen, Vertretung anzeigen |
| **Secondary** | 1.5 px drawn ink outline, transparent | Sprechzeiten ansehen; UNKNOWN status action |
| **Quiet / utility** | Text with a measured underline (45 % → 100 % on hover) | Secondary actions next to a primary |
| **Emergency** | Deep red (#A82B25) key, white text, ink edge | Only emergency calls (112) |

All: ≥ 48 px high (44 px small), 4 px radius, icon optional (20 px), label may wrap to two lines, `meta` slot for numbers (tabular). Cobalt is *not* the button colour — it is the edge and the focus.

## 8. Links

Running-text links: `--color-brand-text`, 1 px underline at 0.2 em offset, 2 px on hover; external official sources are named in the link text ("Ständige Impfkommission beim RKI"). No "→" suffixes, no "hier".

## 9. Cards and grouping

Not everything is a box.
- **InfoBlock** — hairline + label + content (default grouping).
- **Notice** — raised surface + 3 px ink rule (+ validity line); **Warning** — sunken surface + half-filled status mark.
- **HelpTopic list** — rows separated by rules, serif label + description; hover nudges 4 px.
- **Card** — reserved for people (portrait frame + name + role) and ENTDECKEN chapters.

## 10. Status system (PRAXIS PULS)

| State | Mark (shape carries meaning) | Word | Primary action |
|---|---|---|---|
| OPEN | Filled green dot with halo | Geöffnet · bis 12:00 | Anrufen (primary key) |
| CLOSED | Empty ink ring — calm, not alarming | Geschlossen · ab 14:00 | Sprechzeiten ansehen |
| SPECIAL HOURS | Half-filled ring ("part of the day") | Geänderte Zeit | Details ansehen |
| VACATION / CLOSURE | Ring with a bar ("paused") | Praxisurlaub | Vertretung anzeigen |
| UNKNOWN | **No mark, no colour**; styled as a link | Sprechzeiten | Sprechzeiten ansehen (secondary outline) |
| EMERGENCY | Separate block: red top border 6 px, triangle icon, "Bei Lebensgefahr: 112" | — | Notruf 112 anrufen (emergency key) |

Forms: **header chip** (word + time), **inline** (rule-topped block on content pages), **hero** (status as Display L headline + italic detail + actions), **dock** (mark on the "Heute" icon). Colour is never the only signal; the mark shapes survive greyscale and forced colours.

## 11. Navigation

- **Desktop header** (≥ 900 px, sticky, grows with text): practice name · four paths as text (current = short cobalt measure line under the label) · PULS chip · Anrufen + number · Notfall (red text).
- **Mobile dock** (< 900 px, fixed, early in DOM): Anrufen · Heute (status mark) · Notfall (light red on ink) · Menü; 52 px cells; 2 × 2 with large system text.
- **Menü sheet**: serif path rows (56 px) with all V1 subpages (48 px), no accordions.
- **Footer**: ink surface, full sitemap, contact, legal.
- **Section navigation / breadcrumbs**: per [navigation-model.md](../ux/navigation-model.md).

## 12. Focus

3 px `--color-focus` outline, 3 px offset, on every interactive element — on ink surfaces the ring is yellow (`--palette-yellow`) for contrast. Focus is never removed for aesthetics. Radio-based controls (age scale) show focus on the label via `:has(:focus-visible)`.

## 13. Age system (Mein Kind)

The **Altersskala**: a graduated horizontal scale with four segments (0–2 · 3–6 · 7–12 · 13–17) whose widths follow the number of years and whose tick heights rise with age. The selected segment turns ink (cobalt ticks). It is a real radio group (works without JS). No nursery imagery, no growth percentiles, no centimetre values tied to ages.

## 14. Graphic language

- **Messlinie** — 1 px baseline with long ticks every 48 px and short ticks every 8 px; starts every section.
- **Tageslineal** — hours 7–19 with the verified span as a 5 px bar and a coral "jetzt" marker (only for verified data).
- **Source note** — a small corner tick with "Stand" and "Quelle".
- **Annotation marks** — corner brackets on placeholder frames.
Never: charts, percentile curves, clinical thresholds, numbers that could be read as measurements of a child.

## 15. Icons

Functional pictograms only (phone, today/clock, alert, menu, close, route, back): 24-unit grid, 1.6 stroke, round caps/joins, drawn at 20–22 px, always paired with a word. No medical icons (no stethoscopes, syringes, plasters, hearts).

## 16. ENTDECKEN mode

`.mode-entdecken` re-maps the same semantic tokens: canvas #0F1220, raised #181C30, text #E9E6F2, secondary #A9ADC4, luminous cobalt #8C9BFF (7.3 : 1), inverse flips (primary keys become paper with a luminous edge). Same typography, rules and components; warmth from a single coral/yellow glow. It is applied to a subtree (the chapter), never to the whole site; the dock stays ink and visible.
