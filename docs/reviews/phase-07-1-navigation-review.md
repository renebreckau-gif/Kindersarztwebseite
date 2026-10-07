# Phase 07.1 — Navigation & Mobile Usability Correction

Date: 2026-10-07 · Trigger: external user interview · Rule: **one intent = one tap**
Screenshots: [`phase-07-1/screenshots/`](phase-07-1/screenshots/)

## Root cause of the hero two-step navigation

`HeroStage` (shared by `/lab/final` and the start page) attached an `onClick` with `preventDefault()` to every path link and switched local selection state instead of following the `href`. On the public page the links already had real routes (`/heute`, `/mein-kind`, …). JavaScript cancelled them, showed the mobile's preview and offered a second "Zu …" link.

On phones the hero path row sits directly above the start page's "Heute" chapter (the large weekday, e.g. "Mittwoch"). A tap therefore appeared to "leave the user at Mittwoch": the page never navigated, and the user saw the next section. That is the current-day confusion.

## Changes

| Area | Change |
|---|---|
| START | "Start" → `/` is the first item of the primary navigation on the start page (`aria-current="page"`) and on all subpages. It is also the first entry of the menu/sitemap (`#menue`, reached via the dock's Menü). The wordmark link to `/` is kept. Not a PathKey. |
| Mobile dock | **Menü · Heute · Notfall · Anrufen** on all public pages (`SiteDock`, used by start and subpages) and in the lab dock (`EntryDock`), so no inconsistent order exists anywhere. |
| Hero paths (public) | No click interception: every path is a plain link and navigates on the first click/tap/Enter. The "Zu …" link and the public preview line are removed. The age rail is not shown on the public page; `/mein-kind` holds the age choice. |
| Desktop preview | Progressive enhancement only: mouse hover (`pointerType === "mouse"`) or keyboard focus (`:focus-visible`) previews the mobile's state (tilt, measuring ring, Mein Kind rod and lift); leaving or blurring resets it. Activation is never intercepted. |
| Touch | No preview at all (touch pointers are ignored; the tap navigates). |
| Lab | `/lab/final` keeps its in-place preview, `?pfad=` and age rail for internal demonstration. |
| Targets | Nav links get a 44 px minimum width (short labels such as "Start"); no visual change. |

Hero imagery, room, child, mobile design, PULS styling, the scene band and the desktop layout are untouched.

## Tests

- `npm test` 83/83 · production build ✓ · typecheck ✓.
- **Mobile route check** (real click events in isolated 360/390/430 px frames on `/`):
  - all four hero paths: `defaultPrevented=false` and land on `/heute`, `/mein-kind`, `/praxis`, `/entdecken`;
  - dock: Menü at position 1/4 → `/#menue` (sitemap starts with Start → `/`); Heute and Notfall → their routes (client-side via Next `Link`); Anrufen at position 4/4 → `tel:+493476851157`;
  - subpage dock has the same order.
- **Desktop check (1440):**
  - header nav reads Start → `/`, Heute, Mein Kind, Praxis, Entdecken;
  - hovering "Mein Kind" shows the rod and the lift, with no age rail and no "Zu …" link, and the URL stays `/`;
  - clicking "Mein Kind" goes straight to `/mein-kind`.
- **Keyboard:** Tab onto a hero path gives `:focus-visible` with a 3 px ring and shows the preview; Enter goes to `/mein-kind`.
- **Target size:** after the min-width fix, no target under 44 px on `/` (1440, 390, 360, 430) or `/heute` (1440, 390).

## Review questions

| Question | Answer |
|---|---|
| Can a first-time user find Home without knowing the logo convention? | Yes — "Start" is the first nav item on desktop and the first menu entry on phones. |
| Can a mobile user open the menu without risking an accidental phone action? | Yes — Menü is far left; Anrufen is far right, two cells away. |
| Does every hero path require only one tap? | Yes (verified at 360/390/430 and on desktop with mouse and keyboard). |
| Does MEIN KIND go directly to /mein-kind? | Yes. |
| Does HEUTE go directly to /heute? | Yes. |
| Does PRAXIS go directly to /praxis? | Yes. |
| Does ENTDECKEN go directly to /entdecken? | Yes. |
| Is the Growing Mobile interaction still present as progressive enhancement on desktop? | Yes — on mouse hover and keyboard focus; never blocking. |
| Has the current-day / Wednesday navigation confusion disappeared? | Yes — the root cause (cancelled navigation) is removed; no hero path resolves to a homepage anchor. |
