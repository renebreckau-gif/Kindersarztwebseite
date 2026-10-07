# User Journeys

Phase: 03
Date: 2026-10-07
Page IDs: [information-architecture.md](information-architecture.md). Fallbacks: [data-confidence-behavior.md](data-confidence-behavior.md). Fact IDs: [fact-status-register.md](../research/fact-status-register.md).

Journeys describe intent and behaviour, not visual design. German strings are working copy. No journey diagnoses, triages symptoms, books appointments or stores personal data.

---

## 0. User groups → journeys

| User group | Primary journeys |
|---|---|
| Parent with a sick child | J2, J1, J3 |
| Parent checking opening hours | J1 |
| Parent needing urgent help | J3 |
| Parent preparing for a preventive examination | J4 |
| Parent checking vaccination information | J5 |
| Parent with a newborn | J6, J4, J7 |
| New patient / family visiting first time | J7, J9, J10 |
| Parent looking for a service | J8 |
| Parent looking for a specific doctor / team member | J9 |
| Child nervous about the doctor | J10 |
| Child who wants to explore / learn | J10 (ENTDECKEN) |
| Parent with low digital confidence | all — conventional routes, visible labels, phone fallback everywhere |
| Parent using one hand | J1, J2, J3 — dock in thumb zone |
| Parent using large system text | all — see mobile-priorities.md §8 |
| Parent visiting during vacation / special hours | J11, J1 |
| Parent visiting when data is unknown | J12 |

---

## J1 — Ist die Praxis heute geöffnet?

| Field | Definition |
|---|---|
| **User intent** | Know right now whether the practice is open and until when — or when it opens next. |
| **Entry point** | Start (most common), any page via PULS chip / dock "Heute", search result for "Kinderarzt Öffnungszeiten Hettstedt" → P-11. |
| **First information needed** | One state + one time ("Praxis geöffnet · Heute bis 12:00 Uhr"). |
| **Primary action** | Anrufen (when open) / Nächste Sprechzeit ansehen (when closed). |
| **Secondary action** | Sprechzeiten der Woche (P-11), Route (P-35#anfahrt). |
| **Decision points** | Open now? → call or go. Closed? → next opening, or Notfall if urgent. Special hours / vacation? → reason + replacement (J11). |
| **Possible failure states** | Schedule unverified; conflicting exception; holiday rule unknown; closure entered without end; clock doubt. |
| **Data dependencies** | F35–F39, F40, F41, F43, F49; exceptions; closures; LB-00; FB-05, FB-06, FB-09. |
| **Safe fallback** | PULS UNKNOWN: "Aktuelle Sprechzeiten · Informationen ansehen" → P-11 (verified weekly view or, if that is unavailable, Anrufen). |
| **Mobile differences** | Answer is in the first viewport above the object (verified in `/lab/final` at 360/390/430 px, incl. 200 % text). Dock "Heute" is reachable from every page with the thumb. |
| **Accessibility** | State conveyed by word (not colour); status is the page `h1` on Start; no live-region announcements on load; times written in 24 h format with "Uhr". |

## J2 — Mein Kind ist krank. Können wir heute kommen?

| Field | Definition |
|---|---|
| **User intent** | Find out whether a sick child can be seen today and how to arrange it. **Not** whether the child is "sick enough". |
| **Entry point** | Start → PULS; P-33 entry "Mein Kind ist krank"; P-10; search "Kinderarzt Akutsprechstunde Hettstedt". |
| **First information needed** | Is the practice open today, and is there verified information about seeing sick children (Akutsprechstunde)? |
| **Primary action** | Anrufen. |
| **Secondary action** | Akutsprechstunde details (P-11#akutsprechstunde, only verified parts); Notfall (P-15) when closed. |
| **Decision points** | Open + acute window verified → show window, "Anrufen". Open + acute unverified → fallback sentence + Anrufen. Closed → next opening + Notfall link. Life-threatening → 112 (always visible on P-15 and in the Notfall utility). |
| **Possible failure states** | Acute rules ambiguous (FB-01…03 — **current state**); "healthy children only" window misread as general closure; mask rule unconfirmed (F47). |
| **Data dependencies** | F35–F46, F47; FB-01…FB-04, FB-11. |
| **Safe fallback** | "Ob wir heute kranke Kinder ohne Termin sehen können, erfahren Sie telefonisch." + Anrufen; when closed: "Außerhalb der Sprechzeiten: Notfall-Hinweise". |
| **Mobile differences** | Anrufen in the first viewport and in the dock; acute details in a disclosure, not a long page. |
| **Accessibility** | No symptom questions, no forms; plain sentences; the call link has a full accessible name ("Praxis anrufen: 03476 851157"). |

## J3 — Wen rufe ich im Notfall an?

| Field | Definition |
|---|---|
| **User intent** | Know immediately which number or place applies. |
| **Entry point** | Notfall utility (every page, header/dock), P-10 when closed, search "Kinderarzt Notfall Hettstedt" → P-15. |
| **First information needed** | "Bei Lebensgefahr: 112" — first, largest, tappable. |
| **Primary action** | 112 anrufen (`tel:112`). |
| **Secondary action** | 116117 (if confirmed, F57); Giftnotruf (if verified, F58); verified emergency facilities (F59–F64); practice phone during opening hours. |
| **Decision points** | Life-threatening → 112. Urgent but not life-threatening, outside hours → 116117 / on-call service (verified only). Poisoning → Giftnotruf (verified only). During opening hours → practice. |
| **Possible failure states** | Facility data stale (all dated 2020 — **current state**); 116117 inclusion undecided; wording not physician-approved. |
| **Data dependencies** | F56–F65; LB-10; FB-17, FB-18. |
| **Safe fallback** | 112 (always) + "Weitere Notfallinformationen werden derzeit geprüft." Unverified facilities omitted. |
| **Mobile differences** | P-15 fits the first viewport with 112 at the top; numbers are large tap targets; no maps embedded. |
| **Accessibility** | Emergency colour never the only cue (icon + word); calm wording; `tel:` links with full names ("Notruf 112 anrufen"); no animation on this page. |

Not a content page: P-15 is a single, short decision page reachable in one tap from everywhere.

## J4 — Wann ist die nächste U-/J-Untersuchung?

| Field | Definition |
|---|---|
| **User intent** | Understand which preventive examination comes next for my child's age and what happens there. |
| **Entry point** | Mein Kind (Start arm / nav) → age range; search "Kinderarzt Vorsorgeuntersuchung" → P-25. |
| **First information needed** | For the chosen age range: which U/J examinations fall into it, roughly when, and what they are for. |
| **Primary action** | Choose age range (0–2 · 3–6 · 7–12 · 13–17). |
| **Secondary action** | Details on P-25; Termin: Anrufen; official date calculator (BIÖG, external, labelled) for exact dates. |
| **Decision points** | Which age range? → list of relevant U/J. Need exact dates → official calculator link (V1); local-only precise selector is Phase 2 (P15). Which U/J does this practice perform? → only once F67 is confirmed. |
| **Possible failure states** | Time windows copied without governance; insurer conditions for U10/U11/J2 unknown (F67). |
| **Data dependencies** | Official G-BA/BIÖG sources; F67; source-policy §4 governance. |
| **Safe fallback** | Entry shows name + official link + "Stand"; practice-specific line "Fragen Sie uns nach einem Termin" with Anrufen. |
| **Mobile differences** | Age ranges as a 2 × 2 or 4-column control at the top (≥ 48 px); U/J list as short cards in sequence. |
| **Accessibility** | Age range is a real radio group / link list; no birthdate entry in V1; abbreviations explained on first use (e.g. "U-Untersuchung = Vorsorgeuntersuchung"; age statements only from the official source). |

## J5 — Welche Impfungen sind in diesem Alter wichtig?

| Field | Definition |
|---|---|
| **User intent** | Orientation on vaccinations typically discussed at my child's age. |
| **Entry point** | Age page → "Impfungen in diesem Alter"; P-26; search "Kinderarzt Impfungen". |
| **First information needed** | Which vaccinations are typically relevant in this age range, what they protect against, why now. |
| **Primary action** | Read the curated explanation; verify at the official source (STIKO/RKI). |
| **Secondary action** | Anrufen for an appointment; "Nehmen Sie den Impfpass zum Termin mit" only if confirmed by the practice. |
| **Decision points** | Age range → topics. Missed vaccination worry → neutral catch-up sentence ("Fragen Sie uns, wenn eine Impfung ausgelassen wurde"). |
| **Possible failure states** | STIKO update not reflected; content implies knowledge of the child's status; outdated entry shown. |
| **Data dependencies** | Official source + version + verification date + approving physician (strategy-lock 2.3). |
| **Safe fallback** | Overdue entry → general explanation + official link, no age-specific detail. |
| **Mobile differences** | One topic per row, expandable; source line visible without expanding. |
| **Accessibility** | No checklist UI that suggests personal tracking; source links name the authority. |

## J6 — Wir haben ein Neugeborenes

| Field | Definition |
|---|---|
| **User intent** | Know what comes first with a baby: first examinations, contact with the practice, what the practice can help with. |
| **Entry point** | Mein Kind → "Neugeboren" (P-27); 0–2 page; Start (secondary link); search. |
| **First information needed** | The first preventive examinations (U2/U3 …, from P-25 data) and how to reach the practice. |
| **Primary action** | Anrufen (to arrange an appointment). |
| **Secondary action** | Neu bei uns? (P-34); Impfungen 0–2; Kontakt & Anfahrt. |
| **Decision points** | Is the practice accepting new patients/newborns? (F77, F79 — **unconfirmed**) → only show confirmed statement. |
| **Possible failure states** | Inventing a registration procedure; implying acceptance of new patients. |
| **Data dependencies** | P-25/P-26 official data; F77, F79; F15. |
| **Safe fallback** | "Bitte rufen Sie uns an, um alles Weitere zu besprechen." No acceptance claims. |
| **Mobile differences** | Short sequence of 3–4 blocks; Anrufen repeated at the end. |
| **Accessibility** | Plain language for tired parents; no dense tables. |

## J7 — Wir kommen zum ersten Mal

Detail model: [first-visit-flow.md](first-visit-flow.md).

| Field | Definition |
|---|---|
| **User intent** | Prepare a first visit: where, how to contact, how appointments work, what happens, what to bring, access, who we meet. |
| **Entry point** | Praxis → Neu bei uns? (P-34); footer; P-27; P-21; search. |
| **First information needed** | Address + route, phone, how to get an appointment. |
| **Primary action** | Anrufen. |
| **Secondary action** | Route; Team; Mein Arztbesuch for the child. |
| **Decision points** | Accepting new patients? Booking channel? What to bring? Accessible entrance? Parking? — each only if confirmed. |
| **Possible failure states** | Many items unconfirmed (F48, F77–F88) — page could look thin. |
| **Data dependencies** | F13–F15, F31, F48, F77–F88. |
| **Safe fallback** | Confirmed items only + "Weitere Fragen beantworten wir gern telefonisch." |
| **Mobile differences** | Ordered checklist-style sections, each one screen or less; route link opens the phone's map app. |
| **Accessibility** | Accessibility information (step-free access etc.) only when verified; never an "accessible" claim by default. |

## J8 — Wobei kann die Praxis helfen?

| Field | Definition |
|---|---|
| **User intent** | Find out whether the practice offers what I need, in my own words. |
| **Entry point** | Praxis → "Wobei können wir helfen?" (P-33); age pages ("In der Praxis"); search. |
| **First information needed** | Parent-language entry points: Mein Kind ist krank · Vorsorge · Impfungen · Entwicklung · Untersuchungen · Bescheinigungen — each only if backed by a confirmed service (F66–F74). |
| **Primary action** | Choose an entry point → structured service details on the same page. |
| **Secondary action** | Related age page; Anrufen. |
| **Decision points** | Service exists and is confirmed → shown. Not confirmed → not shown (no "auf Anfrage" invention). |
| **Possible failure states** | Service list from 2020 unconfirmed (FB-12); medical terminology without explanation. |
| **Data dependencies** | F66–F74; age tags per service. |
| **Safe fallback** | Page shows only confirmed services; if none confirmed by launch, P-33 is not published and Praxis shows "Fragen Sie uns gern telefonisch". |
| **Mobile differences** | Entry points as large chips at the top; structured list below. |
| **Accessibility** | Medical terms paired with plain explanations; no jargon-only headings. |

## J9 — Wer sind die Ärztinnen?

| Field | Definition |
|---|---|
| **User intent** | Know who will treat my child; build trust. |
| **Entry point** | Praxis → Ärztinnen (P-31) / Team (P-32); Neu bei uns; search with doctor name. |
| **First information needed** | Names, verified titles, photo (when available with consent). |
| **Primary action** | Read profiles. |
| **Secondary action** | Neu bei uns; Anrufen. |
| **Decision points** | Photo available + consent? → show; else designed neutral placeholder for confirmed persons only. Bio confirmed? → show; else name + title only. |
| **Possible failure states** | Unconfirmed qualifications (F23); missing consent (F33); outdated staff list. |
| **Data dependencies** | F20–F34; LB-05, LB-08, LB-09. |
| **Safe fallback** | Person omitted if not confirmed; never fictional or AI-generated people. |
| **Mobile differences** | One profile per row; photo above name. |
| **Accessibility** | Photos with meaningful alt text ("Porträt Nadine Probst"); titles as text, not images. |

## J10 — Mein Kind hat Angst vor dem Arzt

| Field | Definition |
|---|---|
| **User intent** | Parent: prepare the child. Child: understand what will happen. |
| **Entry point** | Start arm "Entdecken"; Neu bei uns ("Für Ihr Kind"); age pages 3–6 / 7–12. |
| **First information needed** | (Parent) What Mein Arztbesuch is, how long, sound off by default, no data collected — before handing over the device. |
| **Primary action** | "Gemeinsam starten". |
| **Secondary action** | Exit to Start / Neu bei uns; Notfall/Anrufen always in the dock. |
| **Decision points** | Read as text vs. interactive; sound on/off; reduced motion. |
| **Possible failure states** | Dishonest reassurance; content not physician-approved; future chapters looking available. |
| **Data dependencies** | Physician approval; photos of real rooms only if available. |
| **Safe fallback** | Illustrated story without real-room claims; future chapters shown as non-interactive "In Vorbereitung". |
| **Mobile differences** | Designed primarily for phone/tablet held by parent and child; large tap areas; portrait first, landscape supported. |
| **Accessibility** | "Als Text lesen", "Ton an/aus" (default aus), "Bewegung reduzieren"; no drag-only interactions; persistent exit. |

## J11 — Die Praxis hat Urlaub / ist geschlossen

| Field | Definition |
|---|---|
| **User intent** | Know the practice is closed, until when, and where to go instead. |
| **Entry point** | Start (PULS VACATION / TEMPORARILY_CLOSED), any page (chip/dock), P-10. |
| **First information needed** | "Praxisurlaub bis {Datum}" + "Vertretung anzeigen". |
| **Primary action** | Vertretung anzeigen → P-10#vertretung with tappable phone numbers per replacement practice and period. |
| **Secondary action** | Notfall; next opening ("Wir sind ab {Datum} wieder für Sie da"). |
| **Decision points** | Which week → which replacement (periods shown first); call replacement before visiting (only if that instruction is confirmed). |
| **Possible failure states** | Replacement data wrong/stale (F53 errors on old site); closure without end date; expired closure still shown (old site F50). |
| **Data dependencies** | Closure entries; FB-10 directory; F53, F54; FB-09. |
| **Safe fallback** | No verified replacement → "Bitte informieren Sie sich telefonisch über die Vertretung." + Notfall. Expired closure never shown (R4). |
| **Mobile differences** | Replacement entries as stacked blocks: period, practice, phone button, address on expand. |
| **Accessibility** | Dates in full ("bis Freitag, 7. August"); phone buttons with practice name in accessible label. |

## J12 — Informationen sind unbekannt oder ungeprüft

Detail rules: [data-confidence-behavior.md](data-confidence-behavior.md) §4.

| Field | Definition |
|---|---|
| **User intent** | (Any of the above) — the user does not know data is missing; they must still be able to act. |
| **Entry point** | Any. |
| **First information needed** | A neutral, honest route to the answer. |
| **Primary action** | Sprechzeiten ansehen / Anrufen. |
| **Secondary action** | Notfall (always). |
| **Decision points** | Hours conflict → UNKNOWN. Acute unconfirmed → fallback sentence. Replacement missing → phone fallback. Emergency stale → entry omitted, 112 stays. Contact uncertain → launch blocker (no public site). |
| **Possible failure states** | Fallbacks that read like errors; fallbacks that still imply a state (e.g. grey dot for UNKNOWN). |
| **Data dependencies** | All operational data. |
| **Safe fallback** | Defined per slot (fallback catalogue). |
| **Mobile differences** | Fallbacks are shorter than verified states, never longer. |
| **Accessibility** | Fallback text is a real link with a clear name; no "Fehler" vocabulary. |

---

## TOP 5 HIGHEST-VALUE JOURNEYS
1. **J1** Ist die Praxis heute geöffnet? — most frequent, answers in one glance.
2. **J2** Mein Kind ist krank — the moment parents need the site most.
3. **J3** Notfall — highest stakes, must be instant.
4. **J11** Urlaub / Vertretung — the old site's biggest failure (expired notices, data errors).
5. **J7** Neu bei uns — converts trust into first contact.

## TOP 5 HIGHEST-RISK JOURNEYS
1. **J3** Notfall — wrong facility/time can send a family to the wrong place (all data dated 2020).
2. **J2** Krankes Kind — ambiguous acute rules; temptation to drift into triage.
3. **J11** Vertretung — third-party data, recurring errors.
4. **J1** Öffnungszeiten — a wrong "geöffnet" is a trust destroyer.
5. **J5** Impfungen — medical content that must stay current with STIKO.

## TOP 5 JOURNEYS THAT DEPEND ON UNCONFIRMED DATA
1. **J2** — acute rules FB-01…03, F42, F47.
2. **J3** — emergency directory LB-10, F57.
3. **J11** — replacement directory FB-10, closures F54.
4. **J7** — F48, F77–F88 almost entirely unconfirmed.
5. **J8** — service list F66–F74 (FB-12).
