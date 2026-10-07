// ENTDECKEN — chapter and scene content (Phase 08). All child-facing copy lives here.
// Approval uses the project's existing fact states (FactVerification: VERIFIED_CURRENT /
// TO_BE_CONFIRMED / OUTDATED_DO_NOT_PUBLISH) and media classes (REAL / PLACEHOLDER /
// AI_CONCEPTUAL) — no second status model. Release is decided in one place: RELEASE.
//
// Copy rules (docs/design/mein-arztbesuch-assets/00-overview.md, "Copy rules"): short sentences, concrete
// words, "du"; no promises about pain or fear ("tut nicht weh", "Angst", "mutig", "tapfer");
// no claims that every visit runs exactly like this; no unconfirmed practice details.

import type { FactVerification } from "../domain/verification.ts";
import type { MediaClass } from "../domain/content-types.ts";
import type { LocalDate } from "../domain/time.ts";
import { RELEASE } from "./release.ts";

const DRAFT: FactVerification = { status: "TO_BE_CONFIRMED", sourceIds: [], internalNotes: "Arbeitsstand Phase 08 – Freigabe ausstehend" };

export interface SceneVisual {
  /** Current asset class. PLACEHOLDER = concept composition, never published as final. */
  class: MediaClass | "ORIGINAL_ART";
  /** Brief in docs/design/mein-arztbesuch-assets/. */
  briefId: string;
  /** Placeholder motif (concept geometry only). */
  motif: "arrive" | "wait" | "measure" | "listen" | "look" | "done";
  /** German alt text for the future final image (informative). */
  alt: string;
}

export interface Scene {
  id: string;
  order: number;
  slug: string;
  title: string;
  childCopy: string[];
  parentContext?: string;
  why?: { title: string; copy: string };
  visual: SceneVisual;
  /** Wording and order approved for this story (editorial). */
  contentApproval: FactVerification;
  /** Required for scenes with medical explanations (measure, listen, ears/throat). */
  medicalApproval?: FactVerification;
  /** The practice confirms the scene matches visits there. */
  practiceApproval: FactVerification;
  sourceIds?: string[];
  lastReviewedAt: LocalDate;
  approvedBy?: string;
}

export type ChapterState = "AVAILABLE" | "IN_PREPARATION" | "COMING_LATER";

export interface Chapter {
  id: string;
  slug: string | null;
  title: string;
  teaser: string;
  /** Who it is for, in plain words. */
  audience?: string;
  parentIntro?: string;
  state: ChapterState;
  scenes: Scene[];
}

export const MEIN_ARZTBESUCH: Chapter = {
  id: "mein-arztbesuch",
  slug: "mein-arztbesuch",
  title: "Mein Arztbesuch",
  teaser: "Was bei einem Arztbesuch passieren kann – Schritt für Schritt erklärt.",
  audience: "Für Kinder zum gemeinsamen Anschauen und Vorlesen.",
  parentIntro:
    "So kann ein Arztbesuch aussehen. Nicht jeder Besuch läuft genau so ab – manches entfällt, manches kommt dazu. Lesen Sie die kurzen Sätze gern vor; die Bilder erzählen mit.",
  state: "IN_PREPARATION",
  scenes: [
    {
      id: "ankommen",
      order: 1,
      slug: "ankommen",
      title: "Ankommen",
      childCopy: ["Wir sind da.", "Wir gehen hinein und sagen Hallo.", "Jetzt beginnt der Besuch."],
      parentContext: "Erzählen Sie Ihrem Kind ruhig vorher, wer mitkommt und wie Sie zur Praxis kommen.",
      visual: { class: "PLACEHOLDER", briefId: "01-ankommen", motif: "arrive", alt: "Ein Kind steht an der Hand einer erwachsenen Person vor einem hellen, offenen Durchgang." },
      contentApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
    {
      id: "warten",
      order: 2,
      slug: "warten",
      title: "Warten",
      childCopy: ["Manchmal wartet man ein bisschen, bis man dran ist.", "Warten gehört dazu."],
      parentContext: "Ein Buch oder ein Lieblingsspielzeug von zu Hause kann beim Warten helfen.",
      visual: { class: "PLACEHOLDER", briefId: "02-warten", motif: "wait", alt: "Ein Kind sitzt auf einer langen Bank und schaut in ein Buch. Neben ihm sitzt eine erwachsene Person." },
      contentApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
    {
      id: "messen-wiegen",
      order: 3,
      slug: "messen-wiegen",
      title: "Messen & Wiegen",
      childCopy: ["Manchmal wird geschaut, wie groß du gerade bist.", "Und wie schwer.", "Dafür gibt es einen Messstab und eine Waage."],
      why: { title: "Warum wird gemessen?", copy: "So sieht man, wie ein Kind wächst." },
      visual: { class: "PLACEHOLDER", briefId: "03-messen-wiegen", motif: "measure", alt: "Ein Kind steht gerade vor einem Messstab. Eine gelbe Markierung zeigt, wie groß es ist." },
      contentApproval: DRAFT,
      medicalApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
    {
      id: "abhoeren",
      order: 4,
      slug: "abhoeren",
      title: "Abhören",
      childCopy: ["Die Ärztin hat ein Stethoskop.", "Damit kann sie hören, wie dein Herz und deine Atmung klingen.", "Das Stethoskop kann sich etwas kühl anfühlen."],
      why: { title: "Warum wird abgehört?", copy: "Herz und Lunge machen Geräusche. Mit dem Stethoskop kann man sie gut hören." },
      visual: { class: "PLACEHOLDER", briefId: "04-abhoeren", motif: "listen", alt: "Ein Stethoskop liegt auf dem T-Shirt eines Kindes. Das Kind schaut neugierig darauf." },
      contentApproval: DRAFT,
      medicalApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
    {
      id: "ohren-hals",
      order: 5,
      slug: "ohren-hals",
      title: "Ohren & Hals",
      childCopy: ["Mit einer kleinen Lampe kann die Ärztin in deine Ohren schauen.", "Manchmal schaut sie auch in deinen Hals.", "Dafür machst du den Mund weit auf."],
      why: { title: "Warum schaut man in die Ohren?", copy: "Mit dem Licht kann man sehen, wie es im Ohr aussieht." },
      visual: { class: "PLACEHOLDER", briefId: "05-ohren-hals", motif: "look", alt: "Eine kleine Lampe leuchtet neben dem Ohr eines Kindes." },
      contentApproval: DRAFT,
      medicalApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
    {
      id: "fertig",
      order: 6,
      slug: "fertig",
      title: "Fertig",
      childCopy: ["Geschafft.", "Jetzt weißt du ein bisschen besser, wie ein Arztbesuch aussehen kann.", "Jeder Besuch ist ein bisschen anders."],
      parentContext: "Wenn Ihr Kind Fragen hat, nehmen Sie sie mit in die Praxis – dort kann man sie in Ruhe beantworten.",
      visual: { class: "PLACEHOLDER", briefId: "06-fertig", motif: "done", alt: "Ein Kind geht an der Hand einer erwachsenen Person zurück durch den hellen Durchgang." },
      contentApproval: DRAFT,
      practiceApproval: DRAFT,
      lastReviewedAt: "2026-10-07",
    },
  ],
};

/** Future chapters: titles only — no routes, no dates, no simulated features. */
export const CHAPTERS: Chapter[] = [
  MEIN_ARZTBESUCH,
  { id: "reise-in-deinen-koerper", slug: null, title: "Reise in deinen Körper", teaser: "Wie Herz, Lunge und Gehirn zusammenarbeiten.", state: "COMING_LATER", scenes: [] },
  { id: "wachstum", slug: null, title: "Wachstum", teaser: "Wie Kinder größer werden.", state: "COMING_LATER", scenes: [] },
  { id: "ernaehrung", slug: null, title: "Ernährung", teaser: "Was der Körper zum Wachsen braucht.", state: "COMING_LATER", scenes: [] },
];

// ---------------------------------------------------------------- publication

const ok = (v?: FactVerification) => v?.status === "VERIFIED_CURRENT";

/** Is the chapter fully approved for public release (gate + every scene + final art)? */
export function chapterPublishable(c: Chapter): boolean {
  if (c.id !== "mein-arztbesuch" || !RELEASE.meinArztbesuchApproved) return false;
  return c.scenes.every(
    (s) =>
      ok(s.contentApproval) &&
      ok(s.practiceApproval) &&
      (s.medicalApproval === undefined || ok(s.medicalApproval)) &&
      s.visual.class !== "PLACEHOLDER",
  );
}

export type ChapterView = { mode: "PUBLIC" | "PREVIEW"; chapter: Chapter } | { mode: "GATED"; chapter: Omit<Chapter, "scenes"> };

/** What a visitor may see. Preview (?vorschau=freigabe) shows drafts, clearly labelled. */
export function chapterView(c: Chapter, preview: boolean): ChapterView {
  if (chapterPublishable(c)) return { mode: "PUBLIC", chapter: c };
  if (preview) return { mode: "PREVIEW", chapter: c };
  const { scenes: _scenes, ...meta } = c;
  return { mode: "GATED", chapter: meta };
}

/** Phrases the child copy must never use (fear/pain/bravery mechanics). */
export const FORBIDDEN_CHILD_PHRASES = [/angst/i, /tut (gar |überhaupt )?nicht weh/i, /\bweh\b/i, /mutig/i, /tapfer/i, /keine sorge/i, /schmerz/i];
