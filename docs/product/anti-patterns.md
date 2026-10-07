# Anti-Patterns

Phase: 01 — Product Strategy
Date: 2026-10-07

Anything on this list is rejected in review unless this document is explicitly changed. Each entry states why and what to do instead.

---

## A. Generic look and structure

| Anti-pattern | Why it is rejected | Instead |
|---|---|---|
| **Generic medical website** (stethoscope stock photos, blue-white-cross clichés, "Herzlich willkommen in unserer Praxis") | Interchangeable, signals template, builds no trust | Practice-specific content, own visual language built on "Gesund groß werden" |
| **Generic SaaS landing page** (hero + 3 feature columns + logos + CTA band) | A practice is not a product funnel | Structure driven by the three parent questions |
| **Repeated card grids** for every section | Flattens hierarchy; nothing is more important than anything else | Varied, purpose-built layouts; hierarchy by urgency |
| **Huge centered marketing hero** | Pushes critical utility below the fold | Status and phone first; signature object beside or after utility, never in front of it |
| **Generic large doctor photograph** as entry | Cliché; unavailable real photos would be replaced by stock | The Growing Mobile + JETZT layer |
| **Meaningless 3D decoration** | Cost without meaning, slows older phones | 3D only where it carries meaning (growth, discovery) and only as enhancement |
| **Excessive animation** | Distracts stressed parents, triggers vestibular issues | Purposeful, short motion; full reduced-motion path |
| **Cartoon children** / caricatured kids, clip-art doctors | Patronising, generic, culturally narrow | Abstract, sculptural, inclusive imagery; real photography of the real practice |

## B. Truth and trust

| Anti-pattern | Why | Instead |
|---|---|---|
| **Fake doctors** / AI-generated or stock "team" photos | Deception; violates truth principle | Real photos with consent, or a transparent placeholder ("Foto folgt") |
| **Fake testimonials** / invented reviews, star ratings | Deceptive; professional-law risk for physicians | No testimonials in V1 |
| **Invented medical claims** ("beste Versorgung", "modernste Geräte", unsourced health advice) | Unverifiable, potentially non-compliant with professional advertising rules | Sourced, approved, factual statements only |
| **Outdated information presented as current** | Directly harms families (cf. F50–F52, F55 on the old site) | Structured data with validity windows, auto-expiry, "Stand" dates |
| **Guessing to fill gaps** (e.g. inferring acute times, assuming weekend closure, "Parkplätze vorhanden") | Violates source policy | `TO_BE_CONFIRMED` → no claim, neutral fallback |
| **Placeholder text that looks real** (sample hours, example numbers, lorem ipsum doctors) on reachable URLs | May be mistaken for fact | Visibly marked placeholders, never on public production URLs |

## C. Interaction and accessibility

| Anti-pattern | Why | Instead |
|---|---|---|
| **Critical information hidden behind animation** (intro sequences, reveal-on-scroll, hover-only) | Delays or hides phone/hours/emergency | Critical utility rendered immediately in static HTML |
| **Autoplay audio** | Startling, inaccessible, embarrassing in a waiting room | Sound only on explicit request, always with visible controls; off by default |
| **Scroll hijacking** / scroll-jacked storytelling | Breaks one-handed use, assistive tech and older phones | Native scrolling; choreography only as optional enhancement |
| **Inaccessible experimental navigation** (navigation only via the 3D object, gesture-only, drag-only) | Excludes keyboard, screen reader, motor-impaired and low-confidence users | The Growing Mobile is an additional entry; a conventional, accessible navigation always exists |
| **Pointer-precision dependency** (tiny targets, drag puzzles for essential tasks) | Fails one-handed and motor-impaired use | Large targets; essential tasks need only a tap |
| **Modal overload** (pop-ups for notices, newsletter, cookies) | Interrupts urgent tasks | Inline notices; architecture that minimises consent friction (whether a consent banner is required is decided by the privacy review) |

## D. Data and medicine

| Anti-pattern | Why | Instead |
|---|---|---|
| **Unnecessary accounts** | Friction, data liability, no V1 need | No accounts |
| **Health-data collection** (forms asking symptoms, diagnoses, birthdates stored server-side) | GDPR Art. 9 special-category data, liability | No health input; age orientation by selecting an age range (0–2, 3–6, 7–12, 13–17), no birthdate collected or persisted |
| **Symptom checker** | Medical-device and liability risk; false reassurance | Clear guidance: call the practice, 116117, or 112 |
| **AI diagnosis** / AI medical chatbot | Unsafe, unverifiable, regulatory risk | None |
| **Prescription upload in V1** | Health data transfer, security and process questions open (F80) | Phase evaluation only after process is confirmed with the practice |
| **Online booking via unvetted third party** | Privacy and process not confirmed (F48) | Phone-first until the practice decides |
| **Tracking scripts / third-party embeds by default** (Google Fonts, Maps iframe, analytics, social widgets) | Data transfer without consent (current site's issue) | Self-hosted assets; click-to-load map or plain route link |
| **Medical content from blogs or unofficial sources** | Source policy violation | RKI, STIKO, G-BA, gesund.bund, BIÖG, 116117/KV, professional bodies |
| **Bare link instead of orientation** (e.g. vaccination = "see STIKO") | Leaves parents without understanding | Curated German explanation + official source + update governance |
| **Visually conservative "safe" design** | Utility first is not utility only; loses the project's ambition | Distinctive art direction, high-end motion, spatial/3D where it carries meaning — layered on indestructible utility |

## E. Child experience

| Anti-pattern | Why | Instead |
|---|---|---|
| **Gamification for retention** (points, streaks, rewards, timers) | Manipulative toward children | Self-paced exploration with a clear end |
| **Fear-inducing or dishonest content** ("Spritzen tun gar nicht weh") | Breaks trust at the real visit | Honest, calm, age-appropriate explanations approved by the physicians |
| **Ads, external links without warning, data collection in child areas** | Child protection | Closed, ad-free experience; parent-gated external links |
| **Child area blocking parents** | Parent in a hurry must exit instantly | Persistent, obvious exit back to JETZT and Notfall |

## F. Process

| Anti-pattern | Why | Instead |
|---|---|---|
| **Publishing features or claims without verified data** "to fill it later" | Placeholders leak into production | Build now with marked mock data, fallbacks and disabled states; the public claim waits behind its blocker |
| **English UI strings "for now"** | They ship | German from the first prototype |
| **Migrating old HTML content 1:1** | Carries errors (cf. existing-site-audit) | Re-enter as structured, confirmed data |
