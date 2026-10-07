// Concept placeholders for the Mein Arztbesuch scenes (Phase 08).
// Deliberately geometric: established forms of the ENTDECKEN world (cobalt sphere, coral
// half-disc, yellow sphere, pale ring, measuring lines). They hold the composition from the
// asset brief (where subject, object and negative space sit) and are always labelled —
// they must never be mistaken for, or published as, the final D1 illustrations.

import s from "./placeholders.module.css";
import type { SceneVisual } from "@/content/discovery";

const LABEL: Record<SceneVisual["motif"], string> = {
  arrive: "Durchgang · Ankommen",
  wait: "Ruhiger Platz · Warten",
  measure: "Messstab · Messen & Wiegen",
  listen: "Stethoskop · Abhören",
  look: "Licht · Ohren & Hals",
  done: "Durchgang · Fertig",
};

export function ScenePlaceholder({ motif }: { motif: SceneVisual["motif"] }) {
  return (
    <figure className={`${s.frame} ${s[motif]}`} aria-hidden="true">
      <span className={s.floor} />
      <span className={s.a} />
      <span className={s.b} />
      <span className={s.c} />
      <span className={s.d} />
      <figcaption className={s.badge}>
        <span>Platzhalter · Konzept</span>
        <span className={s.motif}>{LABEL[motif]}</span>
      </figcaption>
    </figure>
  );
}
