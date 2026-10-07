# Benchmark Study

Phase: 02 — World-Class Benchmark & Translation Research
Date checked (all references): 2026-10-07
Related: [transferable-patterns.md](transferable-patterns.md) (mechanisms M01–M30), [do-not-copy.md](do-not-copy.md) (what to learn / not copy per reference), [phase-02-recommendations.md](phase-02-recommendations.md).

Locked strategy ([strategy-lock.md](../product/strategy-lock.md)) is the frame. This study tests it; it does not redesign it.

---

## 1. Method

### 1.1 Inspection levels

Every reference carries an honest inspection level. Conclusions are drawn only from L2 and L3.

| Level | Meaning |
|---|---|
| **L3** | Live page loaded in a browser; DOM, landmarks, link names, text alternatives and canvas count inspected via script. |
| **L2** | Live HTML fetched and its visible text, headings, header/nav structure and key phrases (hours, status, emergency, booking, age, accessibility) extracted and read. |
| **L1** | Reachability and title verified only (page is JS-rendered, minimal, or not needed in depth). **Context only — no conclusion in this study rests on an L1 reference alone.** |
| **X** | Not inspectable: bot protection (HTTP 403 / challenge page), server error, redirect loop, or substantially changed/defunct. Recorded explicitly. |

### 1.2 Limitation: rendered 3D was not visually observed

The research browser pane was hidden during this session, so the page could not paint (rendering throttled). WebGL references (Igloo, Messenger, Lusion, Lando Norris, Bruno Simon, Persepolis) were therefore inspected at **DOM level**: what a user without WebGL / with a screen reader / before the 3D layer is ready receives. That is precisely the accessibility question this project must answer, but **visual motion quality of these sites was not judged first-hand in this session**. Where a mechanism's description depends on the 3D behaviour itself, it is marked "behaviour per award listing / widely documented; not visually re-observed".

### 1.3 Selection logic

Not "pretty websites", but references that answer the four research questions or that represent a specific risk. Negative examples were collected deliberately.

## 2. Reference register

79 references reviewed. Learn / must-not-copy per reference: [do-not-copy.md](do-not-copy.md).

### A — Healthcare

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R01 | Great Ormond Street Hospital | https://www.gosh.nhs.uk/ | L2 | Dismissible alert message at top ("…following London-wide power outage today"); "Your hospital visit" as primary path; accessibility statement |
| R02 | GOSH Patients and families | https://www.gosh.nhs.uk/patients-and-families/ | L2 | Old URL `/your-hospital-visit/` now redirects here — content restructured |
| R03 | Boston Children's Hospital | https://www.childrenshospital.org/ | L2 | "I Want To…" task menu (Make an Appointment, Find a Location …); construction-closure alert; marketing H1 "Trusted by families. Where the world comes for answers." |
| R04 | Cincinnati Children's | https://www.cincinnatichildrens.org/ | L2 | Per-location live status on homepage: "Urgent Care Closed · Open 10/07/2026 at 9:00 AM", "Open 365 days a year"; "Prepare for Your Visit" |
| R05 | Seattle Children's | https://www.seattlechildrens.org/ | L2 | "I want to…" list incl. "Visit ED or Urgent Care", "Get Driving Directions"; "Emergency Department · Open 24 hours, 7 days a week"; "If your child's illness or injury is life-threatening, call 911."; "Accessibility and Special Needs" |
| R06 | Royal Children's Hospital Melbourne | https://www.rch.org.au/ | L2 | "Emergency Department status — real time guide to how busy we are"; **also shows stale banners**: maintenance notice for "Monday 25 March" and COVID-19 banner (negative evidence) |
| R07 | RCH Kids Health Info | https://www.rch.org.au/kidsinfo/ | L2 | Fact sheets, visual guides, "RCH TV for kids", a public "Our editorial process" page |
| R08 | AboutKidsHealth (SickKids) | https://www.aboutkidshealth.ca/ | L2 | "Ages & Stages" / "Explore by ages and stages" navigation |
| R09 | NHS — vaccinations and when to have them | https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/ | L2 | Schedule as age-indexed table (8 weeks, 12 weeks …) plus catch-up sentence: "if you or your child missed a vaccine, contact your GP to catch up" |
| R10 | NHS 111 online | https://111.nhs.uk/ | L2 | "Get help for your symptoms" — national symptom triage; counter-reference for a single practice (X01) |
| R11 | One Medical | https://www.onemedical.com/ | L2 | Premium outpatient; "Same/next-day appointments … that start on time"; consumer tone; several security/enrollment banners |
| R12 | healthdirect Service Finder | https://www.healthdirect.gov.au/australian-health-services | L2 | Service finder by need + location; urgent-care entry |
| R13 | Children's Nebraska | https://www.childrensnebraska.org/ | L2 | 2025 eHealthcare Leadership Awards Gold, Best Site Design (per R14); slogan H1 "Believe in Better Care for Every Child"; "Book an Appointment" in header |
| R14 | eHealthcare Leadership Awards 2025 — Best Site Design | https://ehealthcareawards.com/2025-winners/best-site-design/ | L2 | Winners incl. Children's Nebraska, Dayton Children's, Care Options for Kids |
| R15 | NYX Awards — Pediatric Dentistry of San Jose | https://nyxawards.com/winner-info.php?id=7521 | L2 | 2025 Gold Website/Health; described with parallax clouds and airplane animations, hand-drawn iconography (award page only; the site itself not inspected) |
| R16 | Gruppenpraxis Kinderarzt DDr. Voitl, Wien | https://www.kinderarzt.at/ | L2 | **Closest peer.** First content block: "Heute geöffnet 08:00–13:00, 13:30–19:00 · Alle Kassen und privat · ! Terminvereinbarung immer notwendig"; "Rundgang" (tour); "Impfaufklärungsvideos"; child-health lexicon; dated news incl. "Technische Störung"; AI assistant "Kiara" for appointments |
| R17 | Children's Hospital of Philadelphia | https://www.chop.edu/ | X | HTTP 403 (bot protection) — not inspected |
| R18 | Mayo Clinic | https://www.mayoclinic.org/ | X | HTTP 403 — not inspected |
| R19 | kindergesundheit-info.de (BIÖG) | https://www.kindergesundheit-info.de/ | L2 | U-Termin-Rechner with explicit "Ihre Daten werden nicht gespeichert"; "Notfall-Infos"; Leichte Sprache and Gebärdensprache; Matomo analytics behind consent dialog |
| R20 | kindergesundheit-info.de — Früherkennung U1–U9, J1 | https://www.kindergesundheit-info.de/themen/frueherkennung-u1-u9-und-j1/ | L2 | Official German U/J explanation; "Terminrechner U-, Z- und J1-Untersuchungen … können ausgedruckt werden" |
| R21 | impfen-info.de → infektionsschutz.de | https://www.infektionsschutz.de/ | X/L1 | **Changed:** impfen-info.de now redirects to infektionsschutz.de. Source links must be re-verified in the content phase |
| R22 | 116117.de | https://www.116117.de/ | L2 | "Wen anrufen: 116117 oder 112?"; "24 Stunden, 7 Tage die Woche"; "(Rufnummer für Notfälle: 112)"; Leichte Sprache, Gebärdensprache, 10 languages |
| R23 | gesund.bund.de | https://gesund.bund.de/ | L1 | Official source per source-policy §4 — context only |
| R24 | RKI — Impfkalender | https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Impfkalender/impfkalender-node.html | L2 | "Impfkalender 2026 [PDF … barrierefrei/barrierearm]", multilingual colour version — current official source for S03 |
| R25 | Virtuelle Kinderklinik Tübingen | https://uni-tuebingen.de/es/241263 | X | HTTP 503 at check. Known only from search snippet (360° app, guide character "Pauline") — **unverified, no conclusions drawn** |
| R26 | MediZity | https://www.medizity.de/ | X | **Defunct as described:** formerly a virtual "medicine city" for children 8–14 (per Ärzteblatt archive search result); domain now serves unrelated gadget/health-blog content |
| R27 | Doctolib | https://www.doctolib.de/ | L1 | German booking norm; context for X08 only |

### B — Award-winning digital

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R28 | Awwwards — Sites of the Year | https://www.awwwards.com/websites/sites_of_the_year/ | L2 | SOTY 2025: Lando Norris (OFF+BRAND), Messenger (Abeto); 2024: Igloo Inc (Abeto), Don't Board Me, Opal Tadpole; 2023: Lusion v3, Noomo, Mana Yerba Mate; 2022: KPR, The Other Side of Truth, Persepolis Reimagined |
| R29 | Lando Norris (SOTY 2025) | https://landonorris.com/ | L3 | Next race ("Singapore GP") surfaced directly in navigation; explicit interaction instructions ("TAP TO LOCK", "BACK TO SCROLL"); 21 canvas elements; no `<nav>` landmark |
| R30 | Messenger by Abeto (SOTY 2025) | https://messenger.abeto.co/ | L3 | Explorable 3D planet. DOM contained **no text and no buttons** before the 3D layer rendered |
| R31 | Igloo Inc (SOTY 2024) | https://www.igloo.inc/ | L3 | Preloader only for > 18 s in a throttled tab; empty DOM text; HTML shell 1.4 KB |
| R32 | Don't Board Me (SOTY 2024) | https://dontboardme.com/ | X | **Substantially changed:** domain now an unrelated in-home pet-care business |
| R33 | Opal Tadpole (SOTY 2024) | https://opalcamera.com/opal-tadpole | X | **Substantially changed:** redirects to company site op.al (editorial essay); SOTY product page no longer exists |
| R34 | Lusion v3 (SOTY 2023) | https://lusion.co/ | L3 | 3 canvases; "SCROLL TO EXPLORE"; project titles split into individual letters (each letter repeated 4× in link text, no `aria-label` and no `aria-hidden` — the accessible name is the letter sequence); no `<nav>` landmark |
| R35 | Persepolis Reimagined, Getty (SOTY 2022) | https://persepolis.getty.edu/ | L3 | Immersive 3D cultural storytelling **with visible "Accessibility options" and "Change sound volume" controls** and an "Open menu" button |
| R36 | Bruno Simon portfolio | https://bruno-simon.com/ | L3 | Drive-a-car 3D navigation; DOM text empty — content inaccessible without WebGL |
| R37 | Apple — AirPods Pro | https://www.apple.com/airpods-pro/ | L2 | Scroll-linked product-object reveal; dense factual copy remains in HTML |

### C — Luxury / architecture / culture

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R38 | Rijksmuseum | https://www.rijksmuseum.nl/en | L2 | "OPEN TODAY" + "Open daily 9 to 17h" on the homepage of a world-class cultural brand |
| R39 | Tate | https://www.tate.org.uk/ | L2 | "On Today"; every exhibition carries its end date ("Until 3 Jan 2027") |
| R40 | MoMA | https://www.moma.org/ | L2 | Status as sentence: "The museum is open 10:30 a.m.–5:30 p.m. today."; "Open today, 10:30 a.m.–5:30 p.m." for second location |
| R41 | Calder Foundation | https://calder.org/ | L2 | Primary conceptual reference for the kinetic mobile (balance, weight, air movement) — art, not a web mechanism |
| R42 | teenage engineering | https://teenage.engineering/ | L1/L2 | Tactile-instrument product language; minimal text site — context only |
| R43 | Bang & Olufsen | https://www.bang-olufsen.com/de/de | L1 | Premium object presentation — context only |
| R44 | Porsche Deutschland | https://www.porsche.com/germany/ | L2 | Model choice by plain facts ("2 Türen, 2+2 Sitze"); configurator itself not inspected this session |
| R45 | Aman | https://www.aman.com/ | L2 | Restraint; also exclusivity signals ("Opening 2028", "Opening 2030", "Reopening soon") — tone to avoid |
| R46 | Vitra | https://www.vitra.com/ | X | Bot challenge — not inspected |
| R47 | Aesop | https://www.aesop.com/ | X | Bot challenge — not inspected |
| R48 | Herzog & de Meuron | https://www.herzogdemeuron.com/ | X | Redirect loop for non-browser client — not inspected |
| R49 | Wellcome Collection | https://wellcomecollection.org/ | L1 | Medicine × culture museum — context only |
| R50 | citizenM | https://www.citizenm.com/ | X/L1 | **Changed:** now redirects into marriott.com brand page; former brand site gone |

### D — Children / learning / science

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R51 | Exploratorium | https://www.exploratorium.edu/ | L2 | Hands-on science; visit info with weekday hours ("Monday: Closed"); programmes labelled by age ("ages 4–8 and their grown-ups") |
| R52 | Swiss Science Center Technorama | https://www.technorama.ch/de/home | L2 | German-language science centre; "Programm und Öffnungszeiten", "365 Tage im Jahr geöffnet" |
| R53 | NEMO Science Museum | https://www.nemosciencemuseum.nl/en | L1 | Context only |
| R54 | phaeno Wolfsburg | https://www.phaeno.de/ | L1 | Context only |
| R55 | Deutsches Museum | https://www.deutsches-museum.de/ | L1 | Context only |
| R56 | Science Museum London | https://www.sciencemuseum.org.uk/ | X | HTTP 403 — not inspected |
| R57 | BioDigital Human | https://www.biodigital.com/ | L2 | Interactive 3D anatomy platform "accessible on any device"; reference for Phase 2 "Reise in deinen Körper" |
| R58 | Toca Boca | https://www.tocaboca.com/ | L2 | Open-ended digital play studio (no scores/levels as core loop); site itself marketing-only |
| R59 | Khan Academy Kids | https://learn.khanacademy.org/khan-academy-kids/ | X | Client challenge — not inspected |
| R60 | Sesame Workshop | https://sesameworkshop.org/ | L2 | Resource topic "Doctor Appointments"; content labelled by age band ("Ages 3–6", "Ages 0–5") |

### E — Service businesses outside healthcare

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R61 | GOV.UK | https://www.gov.uk/ | L1 | Context for R62 |
| R62 | GOV.UK — UK bank holidays | https://www.gov.uk/bank-holidays | L2 | Single-purpose answer page for a date question; "Is this page useful?" feedback |
| R63 | Deutsche Bahn | https://www.bahn.de/ | L2 | Search-first homepage; strong time-sensitive intent; promotional content below |
| R64 | Flighty | https://flighty.com/ | L2 | Plain-language status ("Good morning! Your flight today is on time."), change notices ("Changed to ORD Terminal 2 • Gate 7"), reason for delay ("See why you're delayed") |
| R65 | Citymapper | https://citymapper.com/ | L2 | Marketing site of a next-departure product; context for "next event" |
| R66 | Monzo | https://monzo.com/ | L1 | Context only |
| R67 | GitHub Status | https://www.githubstatus.com/ | L2 | Status vocabulary per component ("Operational", "Degraded performance", "Partial outage", "Major outage"), summary line ("All Systems Operational", "No incidents reported today") |
| R68 | Apple — Find a store | https://www.apple.com/retail/ | L2 | "Find a store", "Or call", "Order Status" — action-first service hub |
| R69 | Lufthansa flight status | https://www.lufthansa.com/de/en/flight-status | X | Bot challenge — not inspected |

### F — Guidelines and technical enablers

| ID | Name | URL | Lvl | Why relevant / observed |
|---|---|---|---|---|
| R70 | Material Design 3 — Navigation bar | https://m3.material.io/components/navigation-bar/overview | L1 | JS-rendered; guideline content (3–5 bottom destinations) **not re-read this session**, used as corroboration only |
| R71 | Apple HIG — Tab bars | https://developer.apple.com/design/human-interface-guidelines/tab-bars | L1 | Same caveat |
| R72 | Apple HIG — Live Activities | https://developer.apple.com/design/human-interface-guidelines/live-activities | L1 | Same caveat; conceptual reference for a glanceable live status |
| R73 | NN/g — Beyond the Hamburger | https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/ | L2 | Study with 179 users on 6 sites: "visual salience, information scent, context, tappability signifiers, and user expectations also affect navigation discoverability on mobile" |
| R74 | NN/g — Progressive Disclosure | https://www.nngroup.com/articles/progressive-disclosure/ | L2 | Initial vs. secondary features chosen by frequency; "staged disclosure" variant |
| R75 | WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | L2 | 2.2.2 Pause/Stop/Hide, 2.3.3 Animation from Interactions, 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 2.4.11 Focus Not Obscured |
| R76 | MDN — prefers-reduced-motion | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion | L2 | Reduced-motion media feature |
| R77 | WAI-ARIA APG — Disclosure pattern | https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ | L2 | Accessible show/hide for progressive disclosure |
| R78 | `<model-viewer>` (Google) | https://modelviewer.dev/ | L2 | Accessible 3D model element with poster/fallback; repo active (last push 2026-10-06) |
| R79 | `@react-three/a11y` (pmndrs) | https://github.com/pmndrs/react-three-a11y | L2 | Focus, focus indication, tab index and screen-reader descriptions for objects in a React Three Fiber scene; last push 2026-08-20, 17 open issues |

### Register summary

| Level | Count |
|---|---|
| L3 (browser DOM) | 6 |
| L2 (content inspected) | 46 |
| L1 (context only) | 13 |
| X (blocked / unavailable / changed) | 14 |
| **Total** | **79** |

Award galleries were not used as the only evidence: SOTY winners were opened live (R29–R36), which revealed that **2 of the 3 SOTY 2024 winners no longer exist in their awarded form** (R32, R33).

## 3. Findings by category

### A — Healthcare: what the best sites do better than the current practice site

| Topic | Best observed | Current site (S01–S08) |
|---|---|---|
| Opening hours | Live per-location status with next opening time (R04); today's hours as first content (R16) | Weekly list, acute rule in prose |
| Contact | Task menus ("I want to…") incl. directions and call (R03, R05) | No tappable phone |
| Emergency | Decision guidance "116117 oder 112?" (R22); "If life-threatening, call 911" next to ED hours (R05) | 112 sixth item on a 2020 page |
| Appointment prep / first visit | "Prepare for your visit" as primary path (R01, R04); practice tour (R16) | None |
| Age-based guidance | Ages & stages entry (R08, R60) | None |
| Preventive care | Official U/J explanations + date calculator without storage (R19, R20) | List of U's on services page |
| Vaccination | Age-indexed schedule + catch-up advice (R09); current official calendar (R24); explanation videos (R16) | Category list only |
| Accessibility | Accessibility statements (R01, R05, R13, R19); Leichte Sprache + Gebärdensprache (R19, R22, R24) | No alt text, no statement |
| Trust | Public editorial process (R07) | None |

Negative evidence from the same sector: stale banners on a top hospital (R06), marketing superlatives as H1 (R03, R13), dense mega-menus (R01, R03, R05), an AI chat assistant on a practice site (R16). The bar to beat is not high on emotion and craft — it is high on task clarity, which the best hospitals already reach.

### B — Award-winning digital
Strong, distinctive craft — but at DOM level the 2025/2024 SOTY winners offer **no content or navigation without the 3D layer** (R30, R31, R36), split typography that breaks accessible names (R34), and no navigation landmarks (R29, R34). The transferable lessons are mechanisms (explicit interaction hints in R29, next event in navigation in R29, accessibility and sound controls in R35), not architectures. Two SOTY winners are already gone (R32, R33): award-grade experiences are often short-lived campaigns; this project must be durable and maintainable for years.

### C — Luxury / architecture / culture: premium without luxurious, cold or exclusive
The most transferable insight: **premium cultural institutions treat visit information as first-class content** — "Open today" sits on the homepage of the Rijksmuseum and MoMA (R38, R40); every exhibition at Tate carries its end date (R39). Premium is signalled by restraint, confident typography and accurate, dated information — not by distance. Coldness/exclusivity comes from future-tense promises and scarcity (R45: "Opening 2030") and from withholding practical information. A paediatric practice can be premium by being *precise, calm and generous with information*.

### D — Children / learning / science
Effective children's experiences are hands-on and open-ended (R51, R58), labelled by age band for parents (R51, R60), and frequently paired with a grown-up ("ages 4–8 and their grown-ups", R51). Doctor-visit preparation exists as a distinct topic (R60) and as practice tours (R16). Two German child-health digital projects are unavailable or defunct (R25, R26) — **maintenance and longevity are a design requirement**, which supports the locked V1 scope of one chapter on a durable chapter architecture.

### E — Service businesses: what healthcare can learn
1. State the status as a sentence and give the reason when it is not normal (R64).
2. Use a small, fixed status vocabulary with a summary line (R67).
3. Put the single most likely task first; everything else is search/secondary (R63, R68).
4. A single-purpose answer page beats a paragraph inside another page (R62).

## 4. The four research questions

### Q1 — How do the best experiences combine immediate utility and visual wow in the first viewport?
Observed patterns, in order of evidence strength:
1. **Utility as the first sentence, wow as the stage** — museums and the closest peer put the status sentence in the first content block (R16, R38, R40) while the visual identity occupies the rest of the viewport. Utility is not a footer item; it is typographically primary.
2. **Wow from one object, not from many effects** — the strongest award work is organised around a single hero object/world (R29–R31, R35, R37); diluted multi-effect pages are weaker.
3. **Wow must not gate utility** — the inspected SOTY winners deliver nothing before the 3D layer is ready (R30, R31, R36). For a practice this is disqualifying.

Translation: the first viewport is a **two-layer composition**: an HTML status-and-action layer (instant, server-rendered) + the Growing Mobile as a progressively enhanced stage beside it. The reaction "Das habe ich auf einer Arztseite noch nie gesehen" must come from the object and the art direction; "Hier sehe ich sofort, wann die Praxis offen ist" from the sentence — both visible at once (M01, M02, M11, M24).

### Q2 — How do high-end sites use 3D objects as functional interface?
Functional uses found: object as route selector (R30, R31 — scroll/drag through a world), object that changes state with user choice (R44 configurator family, R37 scroll reveal), object/scene with interaction instructions (R29), objects focusable via accessibility layer (R79). Purely decorative 3D (rotating hero blobs, particle fields) offers no transferable function and is excluded. The functional and accessible version for this project: **an object with a small number of real, labelled choices (four paths), whose labels are DOM elements, and whose state changes reflect the choice** (M12, M13, M24). Driving/flying through a world as navigation is rejected (M17).

### Q3 — How to avoid a conventional header without losing orientation?
Award sites without `<nav>` landmarks (R29, R34) show the failure mode. NN/g's study (R73) shows that visible, salient navigation with clear information scent is found more readily on mobile. Viable approach: **no heavy header, but a persistent utility layer** (status + call + Notfall + route) and the four primary paths always visible as text — on mobile as a bottom dock (M20, M21), on desktop as a slim utility line plus path labels anchored to the object. Overlay menus only for secondary pages. Low-confidence users must always see words, not only icons or objects.

### Q4 — How to reveal complex information without overloading the first screen?
Smart default (today, not the week) (R04, R16, R40), intent selection (task menus R03, R05; age ranges R08, R60), state-driven content (status determines the primary action, R64), staged disclosure for detail (R74, R77), and persistent quick actions (M20). Translation: **the first screen answers "today" only; the week, acute rules, replacements, and explanations are one disclosure away** (M02, M22).

## 5. Design direction validation — Warm Editorial + Cobalt

Not a redesign; a capability check against evidence.

| Quality | Supported? | Evidence / reasoning |
|---|---|---|
| Trust | Yes | Editorial clarity + dated information is how R38–R40 and R07 earn trust; cobalt is a familiar trust/health hue (blue identities of R09, R22) |
| Warmth | Yes, if "warm" is real | Warm paper tones and humane typography counter the clinical blue; must be carried by photography of real people later |
| Premium quality | Yes | Editorial restraint is the common denominator of R38–R41 |
| Child curiosity | Conditional | Editorial direction alone reads adult; curiosity must come from the Growing Mobile and ENTDECKEN (R51, R58) |
| Digital innovation | Conditional | Depends on the object and motion, not on the palette |

Risks:
1. **Too fashion-like / boutique** — editorial layouts with large serif type can read like a lifestyle brand (luxury references R45); mitigate with plain German, practical content first.
2. **Too cold** — large cobalt fields and high-contrast minimalism read clinical/institutional; cobalt should be an accent and an interaction colour, warmth must dominate surface area.
3. **Colour-meaning collision** — cobalt (brand/interactive) vs. functional status colours (green = open) vs. emergency red; blue is also a common "info" status hue (R67). Status must never rely on cobalt.
4. **Too artistic** — immersive culture sites (R35) can feel like an exhibition; the object must stay legible as navigation.
5. **Too tech-driven** — WebGL showcase aesthetics (R30, R31, R34) signal "agency demo" rather than "our doctors".
6. **Too childish if overcorrected** — clouds/airplanes parallax (R15) is the cliché to avoid for child appeal.

Conclusion: the direction is capable of carrying all five qualities; child curiosity and innovation are not provided by the direction itself and depend on the signature object and ENTDECKEN.
